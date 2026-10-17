import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Shield, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/components/fields";
import { actions, canSeeFinance, latest, useDB, type Athlete } from "@/lib/store";
import { groupByTeam, playerName } from "@/lib/teams";
import { CATEGORIES, DEFAULT_TRAITS, FEET, POSITIONS, PROFILE_FIELDS, STATUS } from "@/lib/schema";
import { calcAge } from "@/lib/age";

const uniq = (vals: unknown[]) => [...new Set(vals.map((v) => String(v ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

export const Route = createFileRoute("/_authenticated/atletas/")({
  head: () => ({
    meta: [
      { title: "Atletas — ScoutHub" },
      { name: "description", content: "Cadastro, análise esportiva, biomédica, financeira e de mercado de atletas de futebol." },
      { property: "og:title", content: "Atletas — ScoutHub" },
      { property: "og:description", content: "Plataforma centralizada para clubes, agentes e scouts acompanharem jogadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Filters = Record<string, string>;
const ALL = "__all";

function marketValue(a: Athlete) { const m = latest(a, "market"); return m?.valorAtual !== undefined && m?.valorAtual !== "" ? Number(m.valorAtual) : null; }

function matches(a: Athlete, f: Filters) {
  const p = a.profile;
  const num = (k: string) => (f[k] ? Number(f[k]) : null);
  const inRange = (v: any, lo: number | null, hi: number | null) => {
    if (lo === null && hi === null) return true;
    if (v === undefined || v === "" || v === null) return false;
    const n = Number(v); return (lo === null || n >= lo) && (hi === null || n <= hi);
  };
  const text = (f.q ?? "").toLowerCase();
  if (text && ![p.nomeCompleto, p.nomeEsportivo, p.apelido].some((x) => String(x ?? "").toLowerCase().includes(text))) return false;
  const has = (k: string, val: string) => !f[k] || f[k] === ALL || String(val ?? "").toLowerCase().includes(f[k].toLowerCase());
  if (!has("clube", p.clube) || !has("nacionalidade", `${p.nacionalidade ?? ""} ${p.segundaNacionalidade ?? ""}`) || !has("pais", p.paisNascimento) || !has("cidade", p.cidadeNascimento)) return false;
  if (f.posicao && f.posicao !== ALL && p.posicao !== f.posicao && !String(p.posicoesSecundarias ?? "").includes(f.posicao)) return false;
  for (const k of ["perna", "status", "categoria"]) if (f[k] && f[k] !== ALL && p[k] !== f[k]) return false;
  if (!inRange(calcAge(p.dataNascimento), num("idadeMin"), num("idadeMax"))) return false;
  if (!inRange(p.altura, num("alturaMin"), num("alturaMax"))) return false;
  if (!inRange(p.peso, num("pesoMin"), num("pesoMax"))) return false;
  if (!inRange(marketValue(a), num("valorMin"), num("valorMax"))) return false;
  if (f.trait && f.trait !== ALL) { const s = a.traits[f.trait]?.score; if (s == null || s < (num("traitMin") ?? 1)) return false; }
  if (f.temporada && ![...(a.sections.stats ?? []), ...(a.sections.clubs ?? [])].some((r) => String(r.temporada ?? "").includes(f.temporada))) return false;
  return true;
}

function Index() {
  const db = useDB();
  const navigate = useNavigate();
  const [f, setF] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => db.athletes.filter((a) => matches(a, f)), [db.athletes, f]);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const traits = [...new Set([...DEFAULT_TRAITS, ...db.athletes.flatMap((a) => a.customTraits)])];
  const fin = canSeeFinance(db.role);
  const teams = useMemo(() => groupByTeam(list), [list]);
  const opts = useMemo(() => ({
    clube: uniq(db.athletes.map((a) => a.profile.clube)),
    nacionalidade: uniq(db.athletes.flatMap((a) => [a.profile.nacionalidade, a.profile.segundaNacionalidade])),
    pais: uniq(db.athletes.map((a) => a.profile.paisNascimento)),
    cidade: uniq(db.athletes.map((a) => a.profile.cidadeNascimento)),
    temporada: uniq(db.athletes.flatMap((a) => [...(a.sections.stats ?? []), ...(a.sections.clubs ?? [])].map((r) => r.temporada))),
  }), [db.athletes]);

  const sel = (k: string, label: string, opts: string[]) => (
    <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={f[k] ?? ALL} onValueChange={set(k)}><SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={ALL}>Todos</SelectItem>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
  );
  const combo = (k: keyof typeof opts, label: string) => (
    <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>
      <Input list={`opcoes-${k}`} placeholder="Digite ou escolha" value={f[k] ?? ""} onChange={(e) => set(k)(e.target.value)} />
      <datalist id={`opcoes-${k}`}>{opts[k].map((o) => <option key={o} value={o} />)}</datalist></div>
  );
  const txt = (k: string, label: string, type = "text") => (
    <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label><Input type={type} step="any" value={f[k] ?? ""} onChange={(e) => set(k)(e.target.value)} /></div>
  );

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Elenco & Scouting</p>
          <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Atletas</h1>
          <p className="text-muted-foreground">{db.athletes.length} cadastrados · {list.length} no filtro atual · {teams.length} {teams.length === 1 ? "time" : "times"}</p>
        </div>
        <Button size="lg" className="min-h-11" onClick={() => setCreating(true)}><Plus className="size-4" />Cadastrar atleta</Button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome, nome esportivo ou apelido" value={f.q ?? ""} onChange={(e) => set("q")(e.target.value)} />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters((s) => !s)}><SlidersHorizontal className="size-4" />Filtros</Button>
        {Object.keys(f).length > 0 && <Button variant="ghost" onClick={() => setF({})}>Limpar</Button>}
      </div>

      {showFilters && (
        <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {combo("clube", "Clube")}{combo("nacionalidade", "Nacionalidade")}{combo("pais", "País de nascimento")}{combo("cidade", "Cidade de nascimento")}{combo("temporada", "Temporada")}
          {sel("posicao", "Posição", POSITIONS)}{sel("perna", "Perna dominante", FEET)}{sel("status", "Status", STATUS)}{sel("categoria", "Categoria", CATEGORIES)}
          <div className="grid grid-cols-2 gap-2">{txt("idadeMin", "Idade mín.", "number")}{txt("idadeMax", "Idade máx.", "number")}</div>
          <div className="grid grid-cols-2 gap-2">{txt("alturaMin", "Altura mín. (m)", "number")}{txt("alturaMax", "Altura máx. (m)", "number")}</div>
          <div className="grid grid-cols-2 gap-2">{txt("pesoMin", "Peso mín. (kg)", "number")}{txt("pesoMax", "Peso máx. (kg)", "number")}</div>
          {fin && <div className="grid grid-cols-2 gap-2">{txt("valorMin", "Valor mín.", "number")}{txt("valorMax", "Valor máx.", "number")}</div>}
          <div className="grid grid-cols-[2fr_1fr] gap-2 sm:col-span-2">{sel("trait", "Característica", traits)}{txt("traitMin", "Nota mínima", "number")}</div>
        </Card>
      )}

      {!db.ready ? <p className="py-20 text-center text-muted-foreground">Carregando…</p> : db.athletes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-20 text-center">
          <UserRound className="size-12 text-muted-foreground" />
          <h2 className="font-display text-2xl font-bold uppercase">Nenhum atleta cadastrado</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Comece cadastrando o primeiro jogador. Todos os dados podem ser editados depois.</p>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" />Cadastrar atleta</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const ages = t.athletes.map((a) => calcAge(a.profile.dataNascimento)).filter((x): x is number => x !== null);
            const avg = ages.length ? Math.round(ages.reduce((x, y) => x + y, 0) / ages.length) : null;
            return (
              <Link key={t.param} to="/times/$nome" params={{ nome: t.param }} className="group">
                <Card className="flex h-full flex-col gap-3 p-4 transition-colors group-hover:border-primary">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Shield className="size-6" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-xl font-bold uppercase leading-tight">{t.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.athletes.length} {t.athletes.length === 1 ? "atleta" : "atletas"}{avg !== null ? ` · média ${avg} anos` : ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.athletes.slice(0, 4).map((a) => <Badge key={a.id} variant="secondary" className="max-w-full truncate">{playerName(a)}</Badge>)}
                    {t.athletes.length > 4 && <Badge variant="outline">+{t.athletes.length - 4}</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
          {teams.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">Nenhum atleta corresponde aos filtros.</p>}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl uppercase">Novo atleta</DialogTitle></DialogHeader>
          <RecordForm fields={PROFILE_FIELDS} initial={{}} saveLabel="Cadastrar" onCancel={() => setCreating(false)}
            onSave={async (r) => { const id = await actions.createAthlete(r); setCreating(false); navigate({ to: "/atletas/$id", params: { id } }); }} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
