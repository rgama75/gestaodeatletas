import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuditTable } from "@/components/AuditTable";
import { Input } from "@/components/ui/input";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de alterações — ScoutHub" },
      { name: "description", content: "Registro de quem alterou, quando, qual campo, valor anterior e novo valor." },
      { property: "og:title", content: "Histórico de alterações — ScoutHub" },
      { property: "og:description", content: "Auditoria completa das alterações nos cadastros de atletas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const [q, setQ] = useState("");
  const names = Object.fromEntries(db.athletes.map((a) => [a.id, a.profile.nomeEsportivo || a.profile.nomeCompleto]));
  const rows = db.audit.filter((e) => !q || `${names[e.athleteId] ?? ""} ${e.field} ${e.area} ${e.user}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell>
      <h1 className="mb-2 font-display text-5xl font-bold uppercase">Histórico de alterações</h1>
      <p className="mb-6 text-muted-foreground">Todas as inclusões, edições e exclusões. <Link to="/atletas" className="text-primary underline">Voltar aos atletas</Link></p>
      <Input className="mb-4 max-w-sm" placeholder="Filtrar por atleta, campo ou usuário" value={q} onChange={(e) => setQ(e.target.value)} />
      <AuditTable rows={rows} names={names} />
    </AppShell>
  );
}
