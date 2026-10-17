import { birthDate } from "./athlete-import";
import { validateRecord, type FieldDef, type SectionDef } from "./schema";

type Rec = Record<string, any> & { id: string };
const uid = () => crypto.randomUUID();

export interface RecordRow { line: number; record: Rec; errors: string[] }

/** Campos de arquivo não podem vir de planilha. */
export const importableFields = (def: SectionDef): FieldDef[] => def.fields.filter((f) => f.type !== "file");

/** Uma seção só aceita importação se nenhum campo obrigatório for um arquivo (ex.: Documentos). */
export const canImportSection = (def: SectionDef): boolean => !def.fields.some((f) => f.type === "file" && f.required);

/** Cabeçalho do modelo: o rótulo do campo, com a unidade entre parênteses quando houver. */
export const headerOf = (f: FieldDef): string => (f.unit ? `${f.label} (${f.unit})` : f.label);

const norm = (v: unknown) => String(v ?? "").replace(/^﻿/, "").trim().toLocaleLowerCase("pt-BR");
const empty = (v: unknown) => v == null || String(v).trim() === "";
const YES = ["sim", "s", "true", "1", "x", "verdadeiro"];
const NO = ["não", "nao", "n", "false", "0", "falso"];

export function mapRecordRows(def: SectionDef, matrix: unknown[][], date1904 = false): RecordRow[] {
  const fields = importableFields(def);
  const headers = (matrix[0] ?? []).map(norm);
  const colOf = new Map<string, number>();
  for (const f of fields) {
    const keys = [...new Set([norm(headerOf(f)), norm(f.label)])];
    const cols = headers.flatMap((h, i) => (keys.includes(h) ? [i] : []));
    if (cols.length > 1) throw new Error(`Cabeçalho duplicado: ${headerOf(f)}.`);
    if (cols.length === 1) colOf.set(f.key, cols[0]);
  }
  const missing = fields.filter((f) => f.required && !colOf.has(f.key));
  if (missing.length) throw new Error(`Cabeçalho obrigatório ausente: ${missing.map(headerOf).join(", ")}.`);
  if (colOf.size === 0) throw new Error("Nenhuma coluna reconhecida. Use o modelo para baixar os cabeçalhos corretos.");

  return matrix.slice(1).flatMap((cells, index) => {
    if (cells.every(empty)) return [];
    const record: Rec = { id: uid() };
    const errors: string[] = [];
    for (const f of fields) {
      const col = colOf.get(f.key);
      const raw = col === undefined ? undefined : cells[col];
      if (empty(raw)) continue;
      const text = String(raw).trim();
      const label = headerOf(f);
      if (f.type === "date") {
        const date = birthDate(raw, date1904);
        if (!date) errors.push(`${label}: data inválida (DD/MM/AAAA).`);
        else record[f.key] = date;
      } else if (f.type === "number") {
        const n = Number(text.replace(",", "."));
        if (!Number.isFinite(n)) errors.push(`${label}: número inválido.`);
        else record[f.key] = n;
      } else if (f.type === "select") {
        const option = f.options?.find((o) => norm(o) === norm(text));
        if (!option) errors.push(`${label}: opção inválida "${text}".`);
        else record[f.key] = option;
      } else if (f.type === "boolean") {
        if (YES.includes(norm(text))) record[f.key] = true;
        else if (NO.includes(norm(text))) record[f.key] = false;
        else errors.push(`${label}: use Sim ou Não.`);
      } else record[f.key] = text;
    }
    for (const [key, reason] of Object.entries(validateRecord(fields, record))) {
      const f = fields.find((x) => x.key === key);
      errors.push(`${f ? headerOf(f) : key}: ${reason}.`);
    }
    return [{ line: index + 2, record, errors }];
  });
}

/** Opções aceitas por cada campo de seleção, para a aba de ajuda do modelo. */
export const selectOptions = (def: SectionDef) =>
  importableFields(def).filter((f) => f.type === "select").map((f) => [headerOf(f), f.options ?? []] as const);

export async function buildTemplate(def: SectionDef): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Modelo");
  const fields = importableFields(def);
  ws.addRow(fields.map(headerOf));
  ws.getRow(1).font = { bold: true };
  fields.forEach((f, i) => { ws.getColumn(i + 1).width = Math.max(16, headerOf(f).length + 4); });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const help = wb.addWorksheet("Ajuda");
  help.addRow(["Coluna", "Como preencher"]);
  help.getRow(1).font = { bold: true };
  for (const f of fields) {
    const how = f.type === "date" ? "Data no formato DD/MM/AAAA"
      : f.type === "number" ? `Número${f.unit ? ` em ${f.unit}` : ""}${f.min !== undefined || f.max !== undefined ? ` (${f.min ?? "…"} a ${f.max ?? "…"})` : ""}`
      : f.type === "select" ? `Uma das opções: ${(f.options ?? []).join(", ")}`
      : f.type === "boolean" ? "Sim ou Não"
      : f.type === "url" ? "Link começando com http:// ou https://"
      : "Texto livre";
    help.addRow([headerOf(f) + (f.required ? " *" : ""), how]);
  }
  help.addRow([]);
  help.addRow(["* campo obrigatório"]);
  help.getColumn(1).width = 34; help.getColumn(2).width = 90;
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
