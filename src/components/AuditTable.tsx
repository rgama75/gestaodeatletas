import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEntry } from "@/lib/store";
import { PROFILE_FIELDS, SECTIONS } from "@/lib/schema";

const labels: Record<string, string> = Object.fromEntries([...PROFILE_FIELDS, ...Object.values(SECTIONS).flatMap((s) => s.fields)].map((f) => [f.key, f.label]));

export function AuditTable({ rows, names }: { rows: AuditEntry[]; names?: Record<string, string> }) {
  if (rows.length === 0) return <Card className="py-10 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</Card>;
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Data</TableHead><TableHead>Usuário</TableHead>{names && <TableHead>Atleta</TableHead>}
          <TableHead>Área</TableHead><TableHead>Campo</TableHead><TableHead>Valor anterior</TableHead><TableHead>Novo valor</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.slice(0, 500).map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap text-xs">{new Date(e.at).toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-xs">{e.user}</TableCell>
              {names && <TableCell>{names[e.athleteId] ?? "(excluído)"}</TableCell>}
              <TableCell>{e.area}</TableCell>
              <TableCell>{labels[e.field] ?? e.field}</TableCell>
              <TableCell className="max-w-48 truncate text-muted-foreground">{e.before}</TableCell>
              <TableCell className="max-w-48 truncate">{e.after}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}