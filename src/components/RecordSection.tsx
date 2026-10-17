import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { SECTIONS } from "@/lib/schema";
import { actions, canSeeFinance, uid, useDB, type Athlete, type Rec } from "@/lib/store";
import { FileCtx, RecordForm, showValue } from "./fields";
import { SectionImportDialog } from "./SectionImportDialog";
import { canImportSection } from "@/lib/record-import";
import { openFile } from "@/lib/store";
import { toast } from "sonner";

export function Confidential() {
  return (
    <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <p className="font-medium">Informação confidencial</p>
      <p className="text-sm text-muted-foreground">Seu perfil de acesso não permite visualizar dados financeiros.</p>
    </CardContent></Card>
  );
}

export function RecordSection({ athlete, section, addLabel, chronological = "desc", title }: {
  athlete: Athlete; section: string; addLabel?: string; chronological?: "asc" | "desc"; title?: string;
}) {
  const def = SECTIONS[section];
  const { role, user } = useDB();
  const [editing, setEditing] = useState<Rec | null>(null);
  if (def.confidential && !canSeeFinance(role)) return <Confidential />;
  const list = [...(athlete.sections[section] ?? [])].sort((a, b) => {
    const c = String(a[def.sortKey ?? "id"] ?? "").localeCompare(String(b[def.sortKey ?? "id"] ?? ""));
    return chronological === "asc" ? c : -c;
  });
  const fieldMap = Object.fromEntries(def.fields.map((f) => [f.key, f]));
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-display text-2xl flex items-center gap-2">{title ?? def.title}{def.confidential && <Badge variant="outline" className="gap-1"><Lock className="size-3" />Confidencial</Badge>}</CardTitle>
          {def.description && <CardDescription>{def.description}</CardDescription>}
        </div>
        <div className="flex flex-wrap gap-2">{canImportSection(def) && <SectionImportDialog athlete={athlete} section={section} />}<Button className="min-h-11" onClick={() => setEditing({ id: uid() })}><Plus className="size-4" />{addLabel ?? "Adicionar"}</Button></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 && <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Nenhum registro cadastrado.</p>}
        {list.map((r) => {
          const filled = def.fields.filter((f) => !def.summary.includes(f.key) && r[f.key] !== undefined && r[f.key] !== "" && r[f.key] !== null && f.type !== "boolean");
          return (
            <div key={r.id} className="rounded-lg border bg-secondary/40 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {r.destaqueFlag && <Badge className="gap-1"><Star className="size-3" />Atuação de destaque</Badge>}
                {def.summary.map((k) => <span key={k} className="text-sm"><span className="text-muted-foreground">{fieldMap[k].label}: </span><strong>{showValue(fieldMap[k], r[k])}</strong></span>)}
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Excluir"><Trash2 className="size-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>A exclusão ficará registrada no histórico de alterações.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => actions.deleteRecord(athlete.id, section, r.id, def.title).catch((e) => toast.error(e.message))}>Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {filled.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  {filled.map((f) => (
                    <div key={f.key} className={f.wide ? "col-span-full" : ""}>
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="whitespace-pre-wrap">{f.type === "file" ? <button type="button" className="underline text-left" onClick={() => openFile(r[f.key]).catch((e) => toast.error(e.message))}>{r[f.key].name}</button> : f.type === "url" ? <a className="underline text-primary" href={r[f.key]} target="_blank" rel="noreferrer">Abrir link</a> : showValue(f, r[f.key])}</dd>
                    </div>
                  ))}
                  {r._uploadedAt && <div><dt className="text-xs text-muted-foreground">Enviado em / por</dt><dd>{new Date(r._uploadedAt).toLocaleString("pt-BR")} · {r._uploadedBy}</dd></div>}
                </dl>
              )}
            </div>
          );
        })}
      </CardContent>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{def.title}</DialogTitle></DialogHeader>
          {editing && (
            <FileCtx.Provider value={{ athleteId: athlete.id, confidential: !!def.confidential }}>
            <RecordForm fields={def.fields} initial={editing} onCancel={() => setEditing(null)}
              onSave={async (r) => {
                const rec = { ...r, id: editing.id } as Rec;
                if (section === "documents" && !rec._uploadedAt) { rec._uploadedAt = new Date().toISOString(); rec._uploadedBy = user; }
                await actions.saveRecord(athlete.id, section, rec, def.title);
                setEditing(null);
              }} />
            </FileCtx.Provider>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
