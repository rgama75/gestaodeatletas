import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS } from "./schema";

export type Rec = Record<string, any> & { id: string };
export interface Trait { score: number | null; note?: string }
export interface Athlete {
  id: string;
  createdAt: string;
  profile: Record<string, any>;
  photo?: string; // caminho no armazenamento
  sections: Record<string, Rec[]>;
  traits: Record<string, Trait>;
  customTraits: string[];
}
export interface AuditEntry {
  id: string; at: string; user: string; athleteId: string; area: string; field: string; before: string; after: string;
}
export type Role = "Administrador" | "Gestor" | "Scout";
export interface DB { athletes: Athlete[]; audit: AuditEntry[]; role: Role | null; user: string; userId: string | null; ready: boolean }

const ROLE_LABEL: Record<string, Role> = { admin: "Administrador", gestor: "Gestor", scout: "Scout" };
const FINANCE_KEYS = Object.values(SECTIONS).filter((s) => s.confidential).map((s) => s.key);
export const isFinanceSection = (k: string) => FINANCE_KEYS.includes(k);

const EMPTY: DB = { athletes: [], audit: [], role: null, user: "", userId: null, ready: false };
let db: DB = EMPTY;
let loading: Promise<void> | null = null;
let subscribed = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<DB>) => { db = { ...db, ...patch }; listeners.forEach((l) => l()); };

export const uid = () => crypto.randomUUID();
export const canSeeFinance = (role: Role | null) => role === "Administrador" || role === "Gestor";

function mapAudit(r: any): AuditEntry {
  return { id: r.id, at: r.at, user: r.user_name, athleteId: r.athlete_id, area: r.area, field: r.field, before: r.before, after: r.after };
}

export async function reload() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { set({ ...EMPTY, ready: true }); return; }
  const [roles, prof, ath, fin, aud] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("athletes").select("*").order("created_at", { ascending: false }),
    supabase.from("athlete_finance").select("*"),
    supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(1000),
  ]);
  const rs = (roles.data ?? []).map((r) => r.role as string);
  const role = rs.includes("admin") ? "Administrador" : rs.includes("gestor") ? "Gestor" : rs.includes("scout") ? "Scout" : null;
  const finMap = new Map((fin.data ?? []).map((f: any) => [f.athlete_id, f.sections ?? {}]));
  const athletes: Athlete[] = (ath.data ?? []).map((a: any) => ({
    id: a.id, createdAt: a.created_at, profile: a.profile ?? {}, photo: a.photo_path ?? undefined,
    sections: { ...(a.sections ?? {}), ...(finMap.get(a.id) ?? {}) }, traits: a.traits ?? {}, customTraits: a.custom_traits ?? [],
  }));
  set({ athletes, audit: (aud.data ?? []).map(mapAudit), role, user: prof.data?.display_name ?? user.email ?? "Usuário", userId: user.id, ready: true });
}

function ensure() {
  if (typeof window === "undefined") return;
  if (!subscribed) {
    subscribed = true;
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") { loading = reload(); }
    });
  }
  if (!loading) loading = reload();
}

export function useDB(): DB {
  return useSyncExternalStore(
    (l) => { listeners.add(l); ensure(); return () => listeners.delete(l); },
    () => db,
    () => EMPTY,
  );
}

const show = (v: any) => (v === undefined || v === null || v === "" ? "—" : typeof v === "object" ? v.name ?? "[arquivo]" : String(v));

async function audit(entries: { athleteId: string | null; area: string; field: string; before: any; after: any; confidential?: boolean }[]) {
  if (!entries.length) return;
  const rows = entries.map((e) => ({
    athlete_id: e.athleteId, user_id: db.userId!, user_name: `${db.user} (${db.role})`, area: e.area, field: e.field,
    before: show(e.before), after: show(e.after), confidential: !!e.confidential,
  }));
  const { data } = await supabase.from("audit_log").insert(rows).select();
  if (data) set({ audit: [...data.map(mapAudit), ...db.audit] });
}

function fail(error: { message: string } | null) { if (error) throw new Error("Não foi possível salvar: " + error.message); }
const find = (id: string) => db.athletes.find((x) => x.id === id);
const replace = (a: Athlete) => set({ athletes: db.athletes.map((x) => (x.id === a.id ? a : x)) });

export const actions = {
  async setUser(name: string) {
    if (!db.userId || !name || name === db.user) return;
    fail((await supabase.from("profiles").update({ display_name: name }).eq("id", db.userId)).error);
    set({ user: name });
  },
  async createAthlete(profile: Record<string, any>) {
    const { data, error } = await supabase.from("athletes").insert({ profile, created_by: db.userId }).select().single();
    fail(error);
    const a: Athlete = { id: data!.id, createdAt: data!.created_at, profile, sections: {}, traits: {}, customTraits: [] };
    set({ athletes: [a, ...db.athletes] });
    await audit([{ athleteId: a.id, area: "Perfil", field: "Cadastro", before: "", after: profile.nomeCompleto }]);
    return a.id;
  },
  async deleteAthlete(id: string) {
    const a = find(id);
    fail((await supabase.from("athletes").delete().eq("id", id)).error);
    set({ athletes: db.athletes.filter((x) => x.id !== id) });
    await audit([{ athleteId: id, area: "Perfil", field: "Exclusão do atleta", before: a?.profile.nomeCompleto, after: "" }]);
  },
  async updateProfile(id: string, next: Record<string, any>) {
    const a = find(id); if (!a) return;
    fail((await supabase.from("athletes").update({ profile: next, updated_at: new Date().toISOString() }).eq("id", id)).error);
    const keys = new Set([...Object.keys(a.profile), ...Object.keys(next)]);
    replace({ ...a, profile: next });
    await audit([...keys].filter((k) => show(a.profile[k]) !== show(next[k])).map((k) => ({ athleteId: id, area: "Perfil", field: k, before: a.profile[k], after: next[k] })));
  },
  async setPhoto(id: string, photo?: string) {
    const a = find(id); if (!a) return;
    fail((await supabase.from("athletes").update({ photo_path: photo ?? null }).eq("id", id)).error);
    if (a.photo && a.photo !== photo) await supabase.storage.from(BUCKET).remove([a.photo]);
    replace({ ...a, photo });
    await audit([{ athleteId: id, area: "Perfil", field: "Fotografia", before: "", after: photo ? "Atualizada" : "Removida" }]);
  },
  async writeSection(a: Athlete, section: string, list: Rec[]) {
    const fin = isFinanceSection(section);
    const sections = { ...a.sections, [section]: list };
    const pick = (keep: (k: string) => boolean) => Object.fromEntries(Object.entries(sections).filter(([k]) => keep(k)));
    if (fin) fail((await supabase.from("athlete_finance").upsert({ athlete_id: a.id, sections: pick(isFinanceSection), updated_at: new Date().toISOString() })).error);
    else fail((await supabase.from("athletes").update({ sections: pick((k) => !isFinanceSection(k)), updated_at: new Date().toISOString() }).eq("id", a.id)).error);
    replace({ ...a, sections });
  },
  async saveRecord(id: string, section: string, rec: Rec, title: string) {
    const a = find(id); if (!a) return;
    const list = a.sections[section] ?? [];
    const old = list.find((r) => r.id === rec.id);
    await actions.writeSection(a, section, old ? list.map((r) => (r.id === rec.id ? rec : r)) : [...list, rec]);
    const confidential = isFinanceSection(section);
    await audit(old
      ? Object.keys({ ...old, ...rec }).filter((k) => k !== "id" && show(old[k]) !== show(rec[k])).map((k) => ({ athleteId: id, area: title, field: k, before: old[k], after: rec[k], confidential }))
      : [{ athleteId: id, area: title, field: "Novo registro", before: "", after: "Adicionado", confidential }]);
  },
  async importRecords(id: string, section: string, recs: Rec[], title: string) {
    const a = find(id); if (!a || !recs.length) return;
    await actions.writeSection(a, section, [...(a.sections[section] ?? []), ...recs]);
    await audit([{ athleteId: id, area: title, field: "Importação de planilha", before: "", after: `${recs.length} registro(s) adicionado(s)`, confidential: isFinanceSection(section) }]);
  },
  async deleteRecord(id: string, section: string, recId: string, title: string) {
    const a = find(id); if (!a) return;
    const rec = (a.sections[section] ?? []).find((r) => r.id === recId);
    await actions.writeSection(a, section, (a.sections[section] ?? []).filter((r) => r.id !== recId));
    const paths = Object.values(rec ?? {}).filter((v: any) => v && typeof v === "object" && v.path).map((v: any) => v.path);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await audit([{ athleteId: id, area: title, field: "Registro excluído", before: "", after: "", confidential: isFinanceSection(section) }]);
  },
  async saveTraits(id: string, traits: Record<string, Trait>, customTraits: string[]) {
    const a = find(id); if (!a) return;
    fail((await supabase.from("athletes").update({ traits: traits as any, custom_traits: customTraits }).eq("id", id)).error);
    replace({ ...a, traits, customTraits });
    const names = new Set([...Object.keys(a.traits), ...Object.keys(traits)]);
    await audit([...names].filter((n) => a.traits[n]?.score !== traits[n]?.score || (a.traits[n]?.note ?? "") !== (traits[n]?.note ?? ""))
      .map((n) => ({ athleteId: id, area: "Características", field: n, before: a.traits[n]?.score ?? "Não avaliado", after: traits[n]?.score ?? "Não avaliado" })));
  },
};

export function latest(a: Athlete, section: string, key = "data"): Rec | undefined {
  const l = [...(a.sections[section] ?? [])].sort((x, y) => String(y[key] ?? "").localeCompare(String(x[key] ?? "")));
  return l[0];
}

// ---------- Arquivos ----------
export const BUCKET = "athlete-files";
export interface StoredFile { name: string; size: number; path: string }

export async function uploadFile(file: File | Blob, athleteId: string, confidential: boolean, name: string): Promise<StoredFile> {
  const safe = name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${confidential ? "financeiro" : "geral"}/${athleteId}/${uid()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error("Falha no envio do arquivo: " + error.message);
  return { name, size: file.size, path };
}

const urlCache = new Map<string, { url: string; exp: number }>();
export async function signedUrl(path: string) {
  const c = urlCache.get(path);
  if (c && c.exp > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw new Error("Arquivo indisponível");
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3500_000 });
  return data.signedUrl;
}
export async function openFile(f: StoredFile) {
  const w = window.open("", "_blank");
  try { const url = await signedUrl(f.path); if (w) w.location.href = url; else window.location.href = url; }
  catch (e) { w?.close(); throw e; }
}