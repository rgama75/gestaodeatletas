import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";
import { AthleteImportDialog } from "@/components/AthleteImportDialog";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Configurações — ScoutHub" },
      { name: "description", content: "Defina quem é administrador, gestor ou scout." },
      { property: "og:title", content: "Configurações — ScoutHub" },
      { property: "og:description", content: "Controle de acesso da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Row = { id: string; name: string; role: string };
const LABEL: Record<string, string> = { admin: "Administrador", gestor: "Gestor", scout: "Scout (sem financeiro)", none: "Sem acesso" };

function Page() {
  const { role, userId } = useDB();
  const [rows, setRows] = useState<Row[]>([]);
  async function load() {
    const [p, r] = await Promise.all([supabase.from("profiles").select("id, display_name"), supabase.from("user_roles").select("user_id, role")]);
    const rm = new Map<string, string>();
    for (const x of r.data ?? []) { const cur = rm.get(x.user_id); if (!cur || x.role === "admin" || (x.role === "gestor" && cur === "scout")) rm.set(x.user_id, x.role); }
    setRows((p.data ?? []).map((x) => ({ id: x.id, name: x.display_name, role: rm.get(x.id) ?? "none" })));
  }
  useEffect(() => { if (role === "Administrador") load(); }, [role]);
  if (role !== "Administrador") return <AppShell><p className="py-20 text-center text-muted-foreground">Apenas administradores acessam esta página.</p></AppShell>;

  async function change(id: string, next: string) {
    const del = await supabase.from("user_roles").delete().eq("user_id", id);
    if (del.error) { toast.error(del.error.message); return; }
    if (next !== "none") {
      const ins = await supabase.from("user_roles").insert({ user_id: id, role: next as "admin" | "gestor" | "scout" });
      if (ins.error) { toast.error(ins.error.message); return; }
    }
    toast.success("Permissão atualizada");
    load();
  }

  return (
    <AppShell>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Configurações</h1><AthleteImportDialog /></div>
      <p className="mb-6 text-muted-foreground">Equipe e permissões. Novos cadastros entram como Scout. Administradores e gestores veem contratos, mercado e patrocinadores.</p>
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Permissão</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}{r.id === userId && <span className="text-muted-foreground"> (você)</span>}</TableCell>
            <TableCell>
              <Select value={r.role} disabled={r.id === userId} onValueChange={(v) => change(r.id, v)}>
                <SelectTrigger className="w-full min-w-44 sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>
    </AppShell>
  );
}
