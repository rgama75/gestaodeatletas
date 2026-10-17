import Papa from "papaparse";
import { PROFILE_FIELDS, validateRecord } from "./schema";

export const IMPORT_COLUMNS = [
  ["Nome Completo", "nomeCompleto"], ["Nome Esportivo", "nomeEsportivo"], ["Apelido", "apelido"],
  ["Nacionalidade", "nacionalidade"], ["Segunda Nacionalidade", "segundaNacionalidade"],
  ["Data de Nascimento", "dataNascimento"], ["Cidade de Nascimento", "cidadeNascimento"],
  ["País de Nascimento", "paisNascimento"], ["Altura (m)", "altura"], ["Peso (kg)", "peso"],
  ["Posição Principal", "posicao"], ["Posições Secundárias", "posicoesSecundarias"],
  ["Perna Dominante", "perna"], ["Número da Camisa", "camisa"], ["Status Atual", "status"],
  ["Clube Atual", "clube"], ["Categoria", "categoria"], ["Observações", "observacoes"],
] as const;
export type ImportProfile = Record<string, string | number>;
export interface ImportRow { line: number; profile: ImportProfile; errors: string[] }

function birthDate(value: unknown, date1904: boolean): string | null {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "number" && Number.isFinite(value)) {
    if (!date1904 && Math.floor(value) === 60) return null;
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, value < 60 ? 31 : 30);
    date = new Date(epoch + Math.floor(value) * 86400000);
  } else {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value).trim());
    if (!match) return null;
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
    date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  }
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function mapImportRows(matrix: unknown[][], date1904 = false): ImportRow[] {
  const headers = (matrix[0] ?? []).map((v) => String(v ?? "").replace(/^﻿/, ""));
  if (!headers.includes("Nome Completo")) throw new Error('Cabeçalho obrigatório ausente: "Nome Completo".');
  for (const [header] of IMPORT_COLUMNS) {
    if (headers.filter((v) => v === header).length > 1) throw new Error(`Cabeçalho duplicado: ${header}.`);
  }
  return matrix.slice(1).flatMap((cells, index) => {
    if (cells.every((v) => v == null || String(v).trim() === "")) return [];
    const profile: ImportProfile = {};
    const errors: string[] = [];
    for (const [header, key] of IMPORT_COLUMNS) {
      const col = headers.indexOf(header);
      const raw = col < 0 ? undefined : cells[col];
      if (raw == null || String(raw).trim() === "") continue;
      const field = PROFILE_FIELDS.find((f) => f.key === key);
      const text = String(raw).trim();
      if (field?.type === "date") {
        const date = birthDate(raw, date1904);
        if (!date) errors.push(`${header}: data inválida (DD/MM/AAAA).`);
        else profile[key] = date;
      } else if (field?.type === "number") {
        const number = Number(text.replace(",", "."));
        if (!Number.isFinite(number)) errors.push(`${header}: número inválido.`);
        else profile[key] = number;
      } else if (field?.type === "select") {
        const option = field.options?.find((o) => o.toLocaleLowerCase("pt-BR") === text.toLocaleLowerCase("pt-BR"));
        if (!option) errors.push(`${header}: opção inválida "${text}".`);
        else profile[key] = option;
      } else profile[key] = key === "posicoesSecundarias" ? text.split(",").map((p) => p.trim()).filter(Boolean).join(", ") : text;
    }
    for (const [key, reason] of Object.entries(validateRecord(PROFILE_FIELDS, profile))) {
      errors.push(`${IMPORT_COLUMNS.find((c) => c[1] === key)?.[0] ?? key}: ${reason}.`);
    }
    return [{ line: index + 2, profile, errors }];
  });
}

export async function readImportFile(file: File): Promise<ImportRow[]> {
  if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: false });
    if (parsed.errors.length) throw new Error(`CSV inválido: ${parsed.errors[0]?.message}`);
    return mapImportRows(parsed.data);
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Escolha um arquivo .xlsx ou .csv.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("A planilha não contém uma aba.");
  const matrix: unknown[][] = [];
  for (let row = 1; row <= sheet.rowCount; row++) {
    const values: unknown[] = [];
    for (let col = 1; col <= sheet.columnCount; col++) {
      const cell = sheet.getCell(row, col);
      const value = cell.value;
      values.push(value && typeof value === "object" && !(value instanceof Date) ? cell.text : value);
    }
    matrix.push(values);
  }
  return mapImportRows(matrix, workbook.properties.date1904);
}

export async function importValidRows(rows: ImportRow[], create: (profile: ImportProfile) => Promise<unknown>) {
  let imported = 0;
  const failed = rows.filter((r) => r.errors.length > 0);
  for (const row of rows.filter((r) => r.errors.length === 0)) {
    try { await create(row.profile); imported++; }
    catch (error) { failed.push({ ...row, errors: [error instanceof Error ? error.message : "Não foi possível salvar."] }); }
  }
  return { imported, failed: failed.sort((a, b) => a.line - b.line) };
}