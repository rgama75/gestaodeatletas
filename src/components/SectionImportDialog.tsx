import { useRef, useState } from "react";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readSheetFile } from "@/lib/athlete-import";
import { buildTemplate, headerOf, importableFields, mapRecordRows, type RecordRow } from "@/lib/record-import";
import { SECTIONS } from "@/lib/schema";
import { actions, useDB, type Athlete } from "@/lib/store";
import { showValue } from "./fields";

const PREVIEW_ROWS = 10;
const PREVIEW_COLS = 6;

export function SectionImportDialog({ athlete, section }: { athlete: Athlete; section: string }) {
  const def = SECTIONS[section];
  const { userId } = useDB();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; failed: RecordRow[] } | null>(null);
  const fields = importableFields(def);
  const shown = fields.slice(0, PREVIEW_COLS);
  const valid = rows.filter((r) => !r.errors.length);
  const failures = result?.failed ?? rows.filter((r) => r.errors.length);

  function reset() { setRows([]); setFilename(""); setError(""); setResult(null); }

  async function choose(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setRows([]); setResult(null); setFilename(file.name);
    try {
      const { matrix, date1904 } = await readSheetFile(file);
      const parsed = mapRecordRows(def, matrix, date1904);
      setRows(parsed);
      if (!parsed.length) setError("Nenhuma linha encontrada na planilha.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!userId || busy || result || !valid.length) return;
    setBusy(true);
    try {
      await actions.importRecords(athlete.id, section, valid.map((r) => r.record), def.title);
      setResult({ imported: valid.length, failed: failures });
      toast.success(`${valid.length} registro(s) importado(s) · ${failures.length} com erro`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally { setBusy(false); }
  }

  async function downloadTemplate() {
    try {
      const url = URL.createObjectURL(await buildTemplate(def));
      const a = document.createElement("a");
      a.href = url; a.download = `modelo-${section}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Não foi possível gerar o modelo."); }
  }

  return <>
    <Button variant="outline" className="min-h-11" onClick={() => { reset(); setOpen(true); }}><Upload className="size-4" />Importar dados</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onInteractOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">Importar · {def.title}</DialogTitle>
          <DialogDescription>Excel (.xlsx) ou CSV com os mesmos campos desta seção. Os registros são adicionados ao atleta, sem substituir os existentes.</DialogDescription>
        </DialogHeader>
        <input ref={input} type="file" accept=".xlsx,.csv" className="hidden" aria-label="Arquivo da planilha" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="min-h-11" disabled={busy || !!result} onClick={() => input.current?.click()}><Upload className="size-4" />Escolher arquivo</Button>
          <Button variant="link" className="min-h-11" onClick={() => void downloadTemplate()}><Download className="size-4" />Baixar modelo</Button>
          <span className="min-w-0 break-all text-sm text-muted-foreground">{filename}</span>
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{rows.length ? "Importando…" : "Lendo arquivo…"}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!!rows.length && <>
          <p role="status" className="font-medium">{result ? `${result.imported} importados · ${result.failed.length} com erro` : `${rows.length} linhas · ${valid.length} válidas · ${failures.length} com erro`}</p>
          {!result && <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Situação</TableHead>{shown.map((f) => <TableHead key={f.key} className="whitespace-nowrap">{headerOf(f)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{rows.slice(0, PREVIEW_ROWS).map((r) => (
                <TableRow key={r.line}>
                  <TableCell>{r.line}</TableCell>
                  <TableCell className={r.errors.length ? "text-destructive" : "text-primary"}>{r.errors.length ? "Com erro" : "Válida"}</TableCell>
                  {shown.map((f) => <TableCell key={f.key} className="max-w-48 truncate">{showValue(f, r.record[f.key])}</TableCell>)}
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>}
          {!result && rows.length > PREVIEW_ROWS && <p className="text-xs text-muted-foreground">Mostrando as primeiras {PREVIEW_ROWS} linhas e {shown.length} de {fields.length} colunas.</p>}
          {!!failures.length && <section className="space-y-2"><h3 className="font-medium">Linhas não importadas</h3><ul className="max-h-52 space-y-2 overflow-y-auto text-sm">{failures.map((r) => <li key={r.line} className="break-words"><span className="font-medium">Linha {r.line}:</span> <span className="text-muted-foreground">{r.errors.join(" ")}</span></li>)}</ul></section>}
        </>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setOpen(false)}>{result ? "Fechar" : "Cancelar"}</Button>
          {!result && <Button className="min-h-11" disabled={busy || !valid.length || !userId} onClick={() => void confirm()}><Upload className="size-4" />Importar {valid.length ? `(${valid.length})` : ""}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
