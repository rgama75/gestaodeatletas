import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canSeeFinance, latest, useDB, type Athlete } from "@/lib/store";
import { calcAge } from "@/lib/age";

export const Route = createFileRoute("/_authenticated/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar atletas — ScoutHub" },
      { name: "description", content: "Compare idade, físico, estatísticas, características e valor de mercado entre atletas." },
      { property: "og:title", content: "Comparar atletas — ScoutHub" },
      { property: "og:description", content: "Comparação lado a lado em tabela e gráficos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const COLORS = ["var(--primary)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];
const sum = (a: Athlete, s: string, k: string) => (a.sections[s] ?? []).reduce((t, r) => t + (Number(r[k]) || 0), 0);

function Page() {
  const db = useDB();
  const [ids, setIds] = useState<string[]>([]);
  const sel = db.athletes.filter((a) => ids.includes(a.id));
  const fin = canSeeFinance(db.role);
  const name = (a: Athlete) => a.profile.nomeEsportivo || a.profile.nomeCompleto;
  const rows: [string, (a: Athlete) => string | number][] = [
    ["Idade", (a) => calcAge(a.profile.dataNascimento) ?? "—"],
    ["Altura (m)", (a) => a.profile.altura ?? "—"], ["Peso (kg)", (a) => a.profile.peso ?? "—"],
    ["Posição", (a) => a.profile.posicao ?? "—"], ["Perna dominante", (a) => a.profile.perna ?? "—"],
    ["Clube atual", (a) => a.profile.clube ?? "—"],
    ["Gordura corporal (última, %)", (a) => latest(a, "physical")?.gordura ?? latest(a, "bio")?.gordura ?? "—"],
    ["Massa muscular (última, kg)", (a) => latest(a, "physical")?.massaMuscular ?? latest(a, "bio")?.massaMuscular ?? "—"],
    ["Jogos (estatísticas)", (a) => sum(a, "stats", "jogos")], ["Gols", (a) => sum(a, "stats", "gols")],
    ["Assistências", (a) => sum(a, "stats", "assistencias")], ["Minutos", (a) => sum(a, "stats", "minutos")],
    ["Títulos", (a) => (a.sections.titles ?? []).length], ["Atuações registradas", (a) => (a.sections.performances ?? []).length],
    ["Clubes na carreira", (a) => (a.sections.clubs ?? []).length],
    ...(fin ? [["Valor de negociação", (a: Athlete) => { const m = latest(a, "market"); return m?.valorAtual ? `${m.moeda ?? ""} ${Number(m.valorAtual).toLocaleString("pt-BR")}` : "Valor não informado."; }] as [string, (a: Athlete) => string]] : []),
  ];
  const traitNames = [...new Set(sel.flatMap((a) => Object.entries(a.traits).filter(([, t]) => t.score != null).map(([n]) => n)))];
  const radar = traitNames.map((n) => ({ trait: n, ...Object.fromEntries(sel.map((a) => [a.id, a.traits[n]?.score ?? 0])) }));

  return (
    <AppShell>
      <h1 className="mb-6 font-display text-5xl font-bold uppercase">Comparar atletas</h1>
      <Card className="mb-6"><CardContent className="flex flex-wrap gap-3 p-4">
        {db.athletes.length === 0 && <p className="text-sm text-muted-foreground">Cadastre atletas para comparar.</p>}
        {db.athletes.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox checked={ids.includes(a.id)} onCheckedChange={(c) => setIds((x) => (c ? [...x, a.id] : x.filter((i) => i !== a.id)))} />{name(a)}
          </label>
        ))}
      </CardContent></Card>
      {sel.length < 2 ? <p className="text-center text-muted-foreground">Selecione dois ou mais atletas.</p> : (
        <div className="space-y-6">
          <Card className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Indicador</TableHead>{sel.map((a) => <TableHead key={a.id}>{name(a)}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{rows.map(([l, fn]) => <TableRow key={l}><TableCell className="text-muted-foreground">{l}</TableCell>{sel.map((a) => <TableCell key={a.id} className="font-medium">{fn(a)}</TableCell>)}</TableRow>)}</TableBody>
          </Table></Card>
          <Card><CardHeader><CardTitle className="font-display text-xl uppercase">Características técnicas</CardTitle></CardHeader>
            <CardContent className="h-96">
              {traitNames.length < 3 ? <p className="text-sm text-muted-foreground">É preciso ao menos 3 características avaliadas para o gráfico.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar}><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="trait" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                    {sel.map((a, i) => <Radar key={a.id} name={name(a)} dataKey={a.id} stroke={COLORS[i % 5]} fill={COLORS[i % 5]} fillOpacity={0.2} />)}
                    <Legend /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} /></RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent></Card>
        </div>
      )}
    </AppShell>
  );
}
