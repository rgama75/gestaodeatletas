create type public.app_role as enum ('admin', 'gestor', 'scout');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário',
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id) $$;

create or replace function public.can_see_finance(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','gestor')) $$;

create policy "Members read profiles" on public.profiles for select to authenticated using (public.is_member(auth.uid()) or id = auth.uid());
create policy "Update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Read own or admin reads all roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins add roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins remove roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin') and user_id <> auth.uid());

-- Novo usuário: perfil + papel (primeiro usuário vira administrador; demais, scout)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1), 'Usuário'));
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'scout');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  profile jsonb not null default '{}'::jsonb,
  photo_path text,
  sections jsonb not null default '{}'::jsonb,
  traits jsonb not null default '{}'::jsonb,
  custom_traits jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.athletes to authenticated;
grant all on public.athletes to service_role;
alter table public.athletes enable row level security;
create policy "Members read athletes" on public.athletes for select to authenticated using (public.is_member(auth.uid()));
create policy "Members insert athletes" on public.athletes for insert to authenticated with check (public.is_member(auth.uid()));
create policy "Members update athletes" on public.athletes for update to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "Admins/gestores delete athletes" on public.athletes for delete to authenticated using (public.can_see_finance(auth.uid()));

create table public.athlete_finance (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.athlete_finance to authenticated;
grant all on public.athlete_finance to service_role;
alter table public.athlete_finance enable row level security;
create policy "Finance read" on public.athlete_finance for select to authenticated using (public.can_see_finance(auth.uid()));
create policy "Finance insert" on public.athlete_finance for insert to authenticated with check (public.can_see_finance(auth.uid()));
create policy "Finance update" on public.athlete_finance for update to authenticated using (public.can_see_finance(auth.uid())) with check (public.can_see_finance(auth.uid()));
create policy "Finance delete" on public.athlete_finance for delete to authenticated using (public.can_see_finance(auth.uid()));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid,
  at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  user_name text not null default '',
  area text not null,
  field text not null,
  before text not null default '',
  after text not null default '',
  confidential boolean not null default false
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "Read audit" on public.audit_log for select to authenticated
  using (public.is_member(auth.uid()) and (not confidential or public.can_see_finance(auth.uid())));
create policy "Write own audit" on public.audit_log for insert to authenticated
  with check (public.is_member(auth.uid()) and user_id = auth.uid() and (not confidential or public.can_see_finance(auth.uid())));
create index audit_log_athlete_idx on public.audit_log (athlete_id, at desc);

-- Arquivos: caminhos "geral/<atleta>/..." para membros, "financeiro/<atleta>/..." só admin/gestor
create policy "Members read general files" on storage.objects for select to authenticated
  using (bucket_id = 'athlete-files' and ((storage.foldername(name))[1] = 'geral' and public.is_member(auth.uid())
    or (storage.foldername(name))[1] = 'financeiro' and public.can_see_finance(auth.uid())));
create policy "Members upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-files' and ((storage.foldername(name))[1] = 'geral' and public.is_member(auth.uid())
    or (storage.foldername(name))[1] = 'financeiro' and public.can_see_finance(auth.uid())));
create policy "Members delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-files' and ((storage.foldername(name))[1] = 'geral' and public.is_member(auth.uid())
    or (storage.foldername(name))[1] = 'financeiro' and public.can_see_finance(auth.uid())));
