import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Expand, Lock, Plus, Star, Trash2, Trophy, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StoredImage } from "@/components/StoredImage";
import { RecordForm } from "@/components/fields";
import { Confidential, RecordSection } from "@/components/RecordSection";
import { SeasonBars, TrendChart, seasonData, seriesFrom } from "@/components/TrendChart";
import { AuditTable } from "@/components/AuditTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { actions, canSeeFinance, latest, uploadFile, useDB, type Athlete, type Trait } from "@/lib/store";
import { DEFAULT_TRAITS, PROFILE_FIELDS } from "@/lib/schema";
import { calcAge, fmtDate } from "@/lib/age";

export const Route = createFileRoute("/_authenticated/atletas/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Atleta — ScoutHub" },
      { name: "description", content: "Perfil completo do atleta: dados físicos, bioimpedância, carreira, contratos, mercado e desempenho." },
      { property: "og:title", content: "Perfil do Atleta — ScoutHub" },
      { property: "og:description", content: "Dashboard individual do jogador com histórico e evolução." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const TABS = [
  ["dashboard", "Dashboard"], ["perfil", "Perfil"], ["fisico", "Dados Físicos"], ["bio", "Bioimpedância"], ["carreira", "Carreira"],
  ["contratos", "Contratos"], ["mercado", "Mercado"], ["patrocinadores", "Patrocinadores"], ["caracteristicas", "Características"],
  ["atuacoes", "Atuações"], ["titulos", "Títulos"], ["estatisticas", "Estatísticas"], ["selecoes", "Seleções"], ["documentos", "Documentos"], ["historico", "Histórico"],
] as const;

function Page() {
  const { id } = Route.useParams();
  const db = useDB();
  const a = db.athletes.find((x) => x.id === id);
  if (!a) return <AppShell><p className="py-20 text-center text-muted-foreground">{db.ready ? "Atleta não encontrado." : "Carregando…"} <Link to="/atletas" className="text-primary underline">Voltar</Link></p></AppShell>;
  return (
    <AppShell>
      <Link to="/atletas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Atletas</Link>
      <Header a={a} />
      <Tabs defaultValue="dashboard" className="mt-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">{TABS.map(([v, l]) => <TabsTrigger key={v} value={v} className="min-h-10 flex-none">{l}</TabsTrigger>)}</TabsList>
        <TabsContent value="dashboard"><Dashboard a={a} /></TabsContent>
        <TabsContent value="perfil"><ProfileTab a={a} /></TabsContent>
        <TabsContent value="fisico" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <TrendChart title="Evolução do peso" unit="kg" data={seriesFrom(a.sections.physical, "peso")} />
            <TrendChart title="Percentual de gordura" unit="%" color="var(--chart-4)" data={seriesFrom(a.sections.physical, "gordura")} />
            <TrendChart title="Massa muscular" unit="kg" color="var(--chart-2)" data={seriesFrom(a.sections.physical, "massaMuscular")} />
          </div>
          <TrendChart title="Evolução da altura" unit="m" color="var(--chart-5)" data={seriesFrom(a.sections.physical, "altura")} />
          <RecordSection athlete={a} section="physical" addLabel="Nova avaliação" />
        </TabsContent>
        <TabsContent value="bio" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TrendChart title="Gordura corporal (bioimpedância)" unit="%" color="var(--chart-4)" data={seriesFrom(a.sections.bio, "gordura")} />
            <TrendChart title="Massa muscular esquelética" unit="kg" color="var(--chart-2)" data={seriesFrom(a.sections.bio, "musculoEsqueletico")} />
          </div>
          <RecordSection athlete={a} section="bio" addLabel="Nova avaliação" />
          <RecordSection athlete={a} section="bioCustom" addLabel="Adicionar indicador" />
        </TabsContent>
        <TabsContent value="carreira"><RecordSection athlete={a} section="clubs" addLabel="Adicionar passagem por clube" chronological="asc" /></TabsContent>
        <TabsContent value="contratos"><RecordSection athlete={a} section="contracts" addLabel="Adicionar contrato" /></TabsContent>
        <TabsContent value="mercado" className="space-y-4"><MarketTab a={a} /></TabsContent>
        <TabsContent value="patrocinadores"><RecordSection athlete={a} section="sponsors" addLabel="Adicionar patrocinador" /></TabsContent>
        <TabsContent value="caracteristicas"><TraitsTab a={a} key={JSON.stringify(a.traits) + a.customTraits.join()} /></TabsContent>
        <TabsContent value="atuacoes"><RecordSection athlete={a} section="performances" addLabel="Adicionar atuação" /></TabsContent>
        <TabsContent value="titulos"><RecordSection athlete={a} section="titles" addLabel="Adicionar título" /></TabsContent>
        <TabsContent value="estatisticas" className="space-y-4">
          <SeasonBars data={seasonData(a.sections.stats)} />
          <RecordSection athlete={a} section="stats" addLabel="Adicionar estatística" />
        </TabsContent>
        <TabsContent value="selecoes"><RecordSection athlete={a} section="national" addLabel="Adicionar convocação" /></TabsContent>
        <TabsContent value="documentos"><RecordSection athlete={a} section="documents" addLabel="Enviar documento" /></TabsContent>
        <TabsContent value="historico"><AuditTable rows={db.audit.filter((e) => e.athleteId === a.id)} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("imagem"))), "image/jpeg", 0.88));
}

function Header({ a }: { a: Athlete }) {
  const p = a.profile; const age = calcAge(p.dataNascimento);
  const input = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(false);
  const navigate = useNavigate();
  return (
    <Card className="relative overflow-hidden">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
      <CardContent className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="relative size-36 shrink-0 overflow-hidden rounded-lg border-2 border-primary/60 bg-secondary">
          {a.photo ? <StoredImage path={a.photo} alt={p.nomeCompleto} className="size-full object-cover" /> : <UserRound className="m-auto mt-8 size-16 text-muted-foreground" />}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/80 p-1">
            <Button size="icon" variant="ghost" className="size-7" aria-label={a.photo ? "Substituir foto" : "Enviar foto"} onClick={() => input.current?.click()}><Camera className="size-4" /></Button>
            {a.photo && <>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Ampliar foto" onClick={() => setZoom(true)}><Expand className="size-4" /></Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Remover foto" onClick={() => actions.setPhoto(a.id, undefined).catch((e) => toast.error(e.message))}><Trash2 className="size-4" /></Button>
            </>}
          </div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const up = await uploadFile(await resizeImage(f), a.id, false, "foto.jpg"); await actions.setPhoto(a.id, up.path); toast.success("Fotografia atualizada"); } catch (err) { toast.error((err as Error).message || "Não foi possível ler a imagem"); }
            e.target.value = "";
          }} />
        </div>
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">{p.posicao || "Posição não informada"}{p.camisa ? ` · #${p.camisa}` : ""}</p>
          <h1 className="break-words font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{p.nomeEsportivo || p.nomeCompleto}</h1>
          <p className="mt-1 text-muted-foreground">{p.nomeCompleto}{p.apelido ? ` · "${p.apelido}"` : ""}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {age !== null && <Badge variant="secondary">{age} anos</Badge>}
            {p.nacionalidade && <Badge variant="secondary">{p.nacionalidade}</Badge>}
            {p.clube && <Badge variant="secondary">{p.clube}</Badge>}
            {p.status && <Badge>{p.status}</Badge>}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="self-start text-muted-foreground"><Trash2 className="size-4" />Excluir atleta</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir este atleta?</AlertDialogTitle><AlertDialogDescription>Todos os dados e documentos do atleta serão removidos.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { try { await actions.deleteAthlete(a.id); navigate({ to: "/atletas" }); } catch (e) { toast.error((e as Error).message); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
      <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="max-w-2xl p-2"><DialogTitle className="sr-only">Fotografia</DialogTitle>{a.photo && <StoredImage path={a.photo} alt={p.nomeCompleto} className="w-full rounded" />}</DialogContent></Dialog>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border bg-secondary/40 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div>;
}

function Dashboard({ a }: { a: Athlete }) {
  const { role } = useDB(); const p = a.profile; const fin = canSeeFinance(role);
  const m = latest(a, "market"); const c = latest(a, "contracts", "inicio");
  const traits = Object.entries(a.traits).filter(([, t]) => t.score != null).sort((x, y) => (y[1].score ?? 0) - (x[1].score ?? 0)).slice(0, 6);
  const titles = [...(a.sections.titles ?? [])].slice(0, 5);
  const perfs = [...(a.sections.performances ?? [])].sort((x, y) => Number(!!y.destaqueFlag) - Number(!!x.destaqueFlag) || (Number(y.nota) || 0) - (Number(x.nota) || 0)).slice(0, 5);
  const age = calcAge(p.dataNascimento);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Idade" value={age !== null ? `${age} anos` : "—"} />
        <Stat label="Altura" value={p.altura ? `${Number(p.altura).toFixed(2)} m` : "—"} />
        <Stat label="Peso" value={p.peso ? `${p.peso} kg` : "—"} />
        <Stat label="Perna" value={p.perna || "—"} />
        <Stat label="Nacionalidade" value={<span className="text-lg">{p.nacionalidade || "—"}</span>} />
        <Stat label="Clube" value={<span className="text-lg">{p.clube || "—"}</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="font-display text-xl uppercase">Valor para negociação</CardTitle></CardHeader><CardContent>
          {!fin ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" />Confidencial</p>
            : m?.valorAtual ? <><p className="font-display text-4xl font-bold text-primary">{m.moeda} {Number(m.valorAtual).toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground">Avaliado em {fmtDate(m.data)}{m.fonte ? ` · ${m.fonte}` : ""}</p></>
            : <p className="text-muted-foreground">Valor não informado.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="font-display text-xl uppercase">Contrato atual</CardTitle></CardHeader><CardContent>
          {!fin ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" />Confidencial</p>
            : c ? <div className="text-sm"><p className="text-lg font-semibold">{c.clube}</p><p className="text-muted-foreground">{fmtDate(c.inicio)} → {fmtDate(c.fim)}</p>{c.multa ? <p className="mt-1">Multa: {c.moeda} {Number(c.multa).toLocaleString("pt-BR")}</p> : null}</div>
            : <p className="text-muted-foreground">Nenhum contrato cadastrado.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="font-display text-xl uppercase">Principais características</CardTitle></CardHeader><CardContent className="space-y-2">
          {traits.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma característica avaliada.</p>}
          {traits.map(([n, t]) => (
            <div key={n}><div className="flex justify-between text-sm"><span>{n}</span><span className="font-bold">{t.score}</span></div>
              <div className="h-1.5 rounded bg-secondary"><div className="h-full rounded bg-primary" style={{ width: `${(t.score ?? 0) * 10}%` }} /></div></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="font-display text-xl uppercase">Principais títulos</CardTitle></CardHeader><CardContent className="space-y-2">
          {titles.length === 0 && <p className="text-sm text-muted-foreground">Nenhum título cadastrado.</p>}
          {titles.map((t) => <p key={t.id} className="flex items-center gap-2 text-sm"><Trophy className="size-4 text-warning" />{t.nome} <span className="text-muted-foreground">· {t.clube} {t.temporada}</span></p>)}
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="font-display text-xl uppercase">Principais atuações</CardTitle></CardHeader><CardContent className="space-y-2">
          {perfs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atuação cadastrada.</p>}
          {perfs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              {r.destaqueFlag && <Star className="size-4 fill-primary text-primary" />}
              <span className="text-muted-foreground">{fmtDate(r.data)}</span><span>vs {r.adversario}</span><span className="text-muted-foreground">{r.competicao}</span>
              <span className="ml-auto">{r.gols ?? 0}G · {r.assistencias ?? 0}A</span>{r.nota !== undefined && r.nota !== "" && <Badge>{r.nota}</Badge>}
            </div>
          ))}
        </CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TrendChart title="Evolução do peso" unit="kg" data={seriesFrom(a.sections.physical, "peso")} />
        <SeasonBars data={seasonData(a.sections.stats)} />
        <TrendChart title="Desempenho (nota por atuação)" color="var(--chart-2)" data={seriesFrom(a.sections.performances, "nota")} />
        {fin && <TrendChart title="Evolução do valor de mercado" color="var(--chart-4)" data={seriesFrom(a.sections.market, "valorAtual")} />}
      </div>
    </div>
  );
}

function ProfileTab({ a }: { a: Athlete }) {
  const age = calcAge(a.profile.dataNascimento);
  const [at, setAt] = useState("");
  return (
    <Card><CardHeader><CardTitle className="font-display text-2xl uppercase">Perfil do Atleta</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-secondary/40 p-4 text-sm">
          <div><p className="text-xs uppercase text-muted-foreground">Idade (calculada automaticamente)</p><p className="font-display text-3xl font-bold">{age !== null ? `${age} anos` : "Informe a data de nascimento"}</p></div>
          {a.profile.dataNascimento && <div className="flex items-end gap-2">
            <div><p className="text-xs text-muted-foreground">Idade em uma data histórica</p><Input type="date" value={at} onChange={(e) => setAt(e.target.value)} /></div>
            {at && <p className="pb-2 font-semibold">{calcAge(a.profile.dataNascimento, new Date(at + "T12:00:00")) ?? "—"} anos</p>}
          </div>}
        </div>
        <RecordForm key={JSON.stringify(a.profile)} fields={PROFILE_FIELDS} initial={a.profile} onSave={(r) => actions.updateProfile(a.id, r)} />
      </CardContent>
    </Card>
  );
}

function MarketTab({ a }: { a: Athlete }) {
  const { role } = useDB();
  if (!canSeeFinance(role)) return <Confidential />;
  const m = latest(a, "market");
  return <>
    <Card><CardContent className="flex flex-wrap items-center gap-6 p-6">
      <div><p className="text-xs uppercase text-muted-foreground">Valor atual para negociação</p>
        <p className="font-display text-4xl font-bold text-primary">{m?.valorAtual ? `${m.moeda ?? ""} ${Number(m.valorAtual).toLocaleString("pt-BR")}` : "Valor não informado."}</p></div>
      {m?.valorEstimado ? <div><p className="text-xs uppercase text-muted-foreground">Estimado de mercado</p><p className="font-display text-2xl font-bold">{m.moeda} {Number(m.valorEstimado).toLocaleString("pt-BR")}</p></div> : null}
      {m?.statusNegociacao && <Badge>{m.statusNegociacao}</Badge>}
    </CardContent></Card>
    <TrendChart title="Histórico do valor para negociação" color="var(--chart-4)" data={seriesFrom(a.sections.market, "valorAtual")} />
    <RecordSection athlete={a} section="market" addLabel="Nova avaliação de mercado" />
  </>;
}

function TraitsTab({ a }: { a: Athlete }) {
  const [traits, setTraits] = useState<Record<string, Trait>>(a.traits);
  const [custom, setCustom] = useState<string[]>(a.customTraits);
  const [name, setName] = useState("");
  const dirty = JSON.stringify(traits) !== JSON.stringify(a.traits) || custom.join() !== a.customTraits.join();
  const all = [...DEFAULT_TRAITS, ...custom];
  const set = (n: string, t: Partial<Trait>) => setTraits((x) => ({ ...x, [n]: { score: x[n]?.score ?? null, note: x[n]?.note, ...t } }));
  return (
    <Card><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
      <CardTitle className="font-display text-2xl uppercase">Características Técnicas</CardTitle>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n || all.includes(n)) return; setCustom([...custom, n]); setName(""); }}>
        <Input placeholder="Característica personalizada" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <Button type="submit" variant="outline"><Plus className="size-4" />Adicionar</Button>
      </form>
    </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {all.map((n) => (
            <div key={n} className="grid grid-cols-[1fr_8rem] items-center gap-2 rounded-md border bg-secondary/30 p-2">
              <div className="flex items-center gap-1 text-sm font-medium">{n}{custom.includes(n) && <button aria-label={`Remover ${n}`} onClick={() => { setCustom(custom.filter((c) => c !== n)); setTraits((x) => { const y = { ...x }; delete y[n]; return y; }); }}><Trash2 className="size-3 text-muted-foreground" /></button>}</div>
              <Select value={traits[n]?.score == null ? "na" : String(traits[n].score)} onValueChange={(v) => set(n, { score: v === "na" ? null : Number(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="na">Não avaliado</SelectItem>{Array.from({ length: 10 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="col-span-2 h-8 text-xs" placeholder="Observação" value={traits[n]?.note ?? ""} onChange={(e) => set(n, { note: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 border-t bg-card/95 py-3">
          {dirty && <span className="mr-auto inline-flex items-center gap-2 text-sm text-warning"><span className="size-2 animate-pulse rounded-full bg-warning" />Alterações não salvas</span>}
          <Button variant="outline" onClick={() => { setTraits(a.traits); setCustom(a.customTraits); }}>Cancelar</Button>
          <Button disabled={!dirty} onClick={() => actions.saveTraits(a.id, traits, custom).then(() => toast.success("Características salvas"), (e) => toast.error(e.message))}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
