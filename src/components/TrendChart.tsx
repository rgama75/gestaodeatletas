import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" } };

export function TrendChart({ title, data, unit, color = "var(--primary)" }: { title: string; data: { x: string; y: number }[]; unit?: string; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="h-56">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground px-4">
            Dados insuficientes para gráfico (mínimo de 2 registros).
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} unit={unit} width={56} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="y" name={title} stroke={color} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function SeasonBars({ data }: { data: { x: string; jogos: number; gols: number; assistencias: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Jogos, gols e assistências por temporada</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Sem estatísticas cadastradas.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip {...tip} />
              <Legend />
              <Bar dataKey="jogos" name="Jogos" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gols" name="Gols" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assistencias" name="Assistências" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function seriesFrom(list: Record<string, any>[] | undefined, key: string, dateKey = "data") {
  return [...(list ?? [])]
    .filter((r) => r[key] !== undefined && r[key] !== "" && r[key] !== null && r[dateKey])
    .sort((a, b) => String(a[dateKey]).localeCompare(String(b[dateKey])))
    .map((r) => ({ x: String(r[dateKey]).split("-").reverse().join("/"), y: Number(r[key]) }));
}

export function seasonData(stats: Record<string, any>[] | undefined) {
  const m = new Map<string, { x: string; jogos: number; gols: number; assistencias: number }>();
  for (const s of stats ?? []) {
    const k = String(s.temporada);
    const e = m.get(k) ?? { x: k, jogos: 0, gols: 0, assistencias: 0 };
    e.jogos += Number(s.jogos) || 0; e.gols += Number(s.gols) || 0; e.assistencias += Number(s.assistencias) || 0;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => a.x.localeCompare(b.x));
}