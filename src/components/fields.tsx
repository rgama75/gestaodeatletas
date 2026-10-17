import { createContext, useContext, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { validateRecord, type FieldDef } from "@/lib/schema";
import { fmtDate } from "@/lib/age";
import { cn } from "@/lib/utils";
import { openFile, uploadFile } from "@/lib/store";

export const FileCtx = createContext<{ athleteId: string; confidential: boolean } | null>(null);

export const MAX_FILE = 20 * 1024 * 1024;

export function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function FieldInput({ f, value, onChange, error }: { f: FieldDef; value: any; onChange: (v: any) => void; error?: string }) {
  const id = `f-${f.key}`;
  const ctx = useContext(FileCtx);
  const [uploading, setUploading] = useState(false);
  let input;
  if (f.type === "textarea") input = <Textarea id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />;
  else if (f.type === "select")
    input = (
      <Select value={value ?? ""} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger id={id}><SelectValue placeholder="Selecionar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— Não informado —</SelectItem>
          {f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  else if (f.type === "boolean") input = <div className="h-9 flex items-center"><Switch id={id} checked={!!value} onCheckedChange={onChange} /></div>;
  else if (f.type === "file")
    input = value ? (
      <div className="flex items-center gap-2 rounded-md border border-input px-3 h-9 text-sm">
        <Paperclip className="size-4 text-muted-foreground" />
        <button type="button" onClick={() => openFile(value).catch((e) => toast.error(e.message))} className="truncate underline flex-1 text-left">{value.name}</button>
        <button type="button" onClick={() => onChange(null)} aria-label="Remover arquivo"><X className="size-4" /></button>
      </div>
    ) : (
      <Input id={id} type="file" disabled={uploading || !ctx} onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file || !ctx) return;
        if (file.size > MAX_FILE) { toast.error("Arquivo acima de 20 MB"); return; }
        setUploading(true);
        try { onChange(await uploadFile(file, ctx.athleteId, ctx.confidential, file.name)); }
        catch (err) { toast.error((err as Error).message); }
        finally { setUploading(false); }
      }} />
    );
  else
    input = (
      <div className="flex">
        <Input id={id} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
          step="any" value={value ?? ""} className={cn(f.unit && "rounded-r-none")}
          onChange={(e) => onChange(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />
        {f.unit && <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-xs text-muted-foreground">{f.unit}</span>}
      </div>
    );
  return (
    <div className={cn("space-y-1.5", f.wide && "sm:col-span-2 lg:col-span-3")}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}{f.required && <span className="text-primary"> *</span>}</Label>
      {input}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function showValue(f: FieldDef, v: any) {
  if (v === undefined || v === null || v === "") return "—";
  if (f.type === "date") return fmtDate(v);
  if (f.type === "boolean") return v ? "Sim" : "Não";
  if (f.type === "file") return v.name;
  if (f.type === "number") return `${Number(v).toLocaleString("pt-BR")}${f.unit ? " " + f.unit : ""}`;
  return String(v);
}

export function RecordForm({ fields, initial, onSave, onCancel, saveLabel = "Salvar" }: {
  fields: FieldDef[]; initial: Record<string, any>; onSave: (r: Record<string, any>) => void | Promise<unknown>; onCancel?: () => void; saveLabel?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const errs = validateRecord(fields, draft);
      setErrors(errs);
      if (Object.keys(errs).length) { toast.error("Corrija os campos destacados"); return; }
      setSaving(true);
      try { await onSave(draft); toast.success("Alterações salvas"); } catch (err) { toast.error((err as Error).message); }
      finally { setSaving(false); }
    }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => <FieldInput key={f.key} f={f} value={draft[f.key]} error={errors[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />)}
      </div>
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-end gap-2 border-t bg-card/95 py-3 backdrop-blur">
        {dirty && <span className="mr-auto inline-flex items-center gap-2 text-sm text-warning"><span className="size-2 rounded-full bg-warning animate-pulse" />Alterações não salvas</span>}
        <Button type="button" variant="outline" onClick={() => { setDraft(initial); setErrors({}); onCancel?.(); }}>Cancelar</Button>
        <Button type="submit" disabled={!dirty || saving}>{saving ? "Salvando…" : saveLabel}</Button>
      </div>
    </form>
  );
}