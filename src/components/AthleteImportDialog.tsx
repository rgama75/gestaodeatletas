import { useRef, useState } from "react";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actions, useDB } from "@/lib/store";
import { IMPORT_COLUMNS, importValidRows, readImportFile, type ImportRow } from "@/lib/athlete-import";
import template from "@/assets/modelo-atletas.xlsx.asset.json";

export function AthleteImportDialog() {
  const { userId } = useDB();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; failed: ImportRow[] } | null>(null);
  const valid = rows.filter((r) => !r.errors.length);
  const failures = result?.failed ?? rows.filter((r) => r.errors.length);

  async function choose(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setRows([]); setResult(null); setFilename(file.name);
    try {
      const parsed = await readImportFile(file);
      setRows(parsed);
      if (!parsed.length) setError("Nenhuma linha de atleta encontrada.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!userId || busy || result || !valid.length) return;
    setBusy(true);
    try {
      const outcome = await importValidRows(rows, actions.createAthlete);
      setResult(outcome);
      toast.success(`${outcome.imported} atletas importados · ${outcome.failed.length} falharam`);
    } finally { setBusy(false); }
  }

  return <>
    <Button size="lg" variant="outline" onClick={() => { setRows([]); setFilename(""); setError(""); setResult(null); setOpen(true); }}><Upload className="size-4" />Importar dados</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onInteractOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">Importar dados</DialogTitle><DialogDescription>Atletas · Excel (.xlsx) ou CSV</DialogDescription></DialogHeader>
        <input ref={input} type="file" accept=".xlsx,.csv" className="hidden" aria-label="Arquivo de atletas" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={busy || !!result} onClick={() => input.current?.click()}><Upload className="size-4" />Escolher arquivo</Button>
          <Button asChild variant="link"><a href={template.url} download="modelo-atletas.xlsx"><Download className="size-4" />Baixar modelo</a></Button>
          <span className="min-w-0 break-all text-sm text-muted-foreground">{filename}</span>
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{rows.length ? "Importando atletas…" : "Lendo arquivo…"}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!!rows.length && <>
          <p role="status" className="font-medium">{result ? `${result.imported} importados · ${result.failed.length} falharam` : `${rows.length} linhas · ${valid.length} válidas · ${failures.length} com erro`}</p>
          {!result && <div className="overflow-x-auto rounded-md border">
            <Table><TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Situação</TableHead>{IMPORT_COLUMNS.map(([header]) => <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{rows.slice(0, 10).map((row) => <TableRow key={row.line}><TableCell>{row.line}</TableCell><TableCell className={row.errors.length ? "text-destructive" : "text-primary"}>{row.errors.length ? "Com erro" : "Válida"}</TableCell>{IMPORT_COLUMNS.map(([, key]) => <TableCell key={key} className="max-w-64 whitespace-nowrap">{row.profile[key] ?? "—"}</TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </div>}
          {!!failures.length && <section className="space-y-2"><h3 className="font-medium">Linhas não importadas</h3><ul className="max-h-52 space-y-2 overflow-y-auto text-sm">{failures.map((r) => <li key={r.line} className="break-words"><span className="font-medium">Linha {r.line}{r.profile.nomeCompleto ? ` · ${r.profile.nomeCompleto}` : ""}:</span> <span className="text-muted-foreground">{r.errors.join(" ")}</span></li>)}</ul></section>}
        </>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{result ? "Fechar" : "Cancelar"}</Button>{!result && <Button disabled={busy || !valid.length || !userId} onClick={() => void confirm()}><Upload className="size-4" />Importar</Button>}</div>
      </DialogContent>
    </Dialog>
  </>;
}