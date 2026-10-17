import { describe, expect, it, vi } from "vitest";
import { IMPORT_COLUMNS, importValidRows, mapImportRows } from "@/lib/athlete-import";

describe("athlete spreadsheet import", () => {
  it("requires only Nome Completo and maps by exact header, not column order", () => {
    const rows = mapImportRows([["Apelido", "Nome Completo"], ["JG", "João Gama"], ["Sem nome", ""]]);
    expect(rows[0].profile).toEqual({ apelido: "JG", nomeCompleto: "João Gama" });
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toEqual(["Nome Completo: Campo obrigatório."]);
    expect(() => mapImportRows([["nome completo"], ["João"]])).toThrow();
  });
  it("maps all 18 requested headers to the profile fields", () => {
    const rows = mapImportRows([IMPORT_COLUMNS.map((c) => c[0]), ["João", "JG", "J", "Brasil", "Portugal", "15/08/2004", "Rio", "Brasil", "1,85", "80", "goleiro", "Zagueiro, Volante", "direita", "10", "ativo", "Clube", "profissional", "Nota"]]);
    expect(rows[0].errors).toEqual([]);
    expect(Object.keys(rows[0].profile)).toHaveLength(18);
    expect(rows[0].profile).toMatchObject({ altura: 1.85, peso: 80, posicoesSecundarias: "Zagueiro, Volante", dataNascimento: "2004-08-15" });
  });
  it.each([["Posição Principal", "posicao", "cEnTrOaVaNtE", "Centroavante"], ["Perna Dominante", "perna", "ESQUERDA", "Esquerda"], ["Status Atual", "status", "ATIVO", "Ativo"], ["Categoria", "categoria", "sub-20", "Sub-20"]])("matches %s case-insensitively and rejects unknown options", (header, key, input, expected) => {
    const rows = mapImportRows([["Nome Completo", header], ["João", input], ["Pedro", "desconhecida"]]);
    expect(rows[0].profile[key]).toBe(expected);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toHaveLength(1);
  });
  it("accepts DD/MM/YYYY, Excel serial dates, and Excel dates", () => {
    const rows = mapImportRows([["Nome Completo", "Data de Nascimento"], ["A", "15/08/2004"], ["B", 38214], ["C", new Date("2004-08-15T00:00:00Z")]]);
    expect(rows.map((r) => r.profile.dataNascimento)).toEqual(["2004-08-15", "2004-08-15", "2004-08-15"]);
    expect(mapImportRows([["Nome Completo", "Data de Nascimento"], ["D", 36752]], true)[0].profile.dataNascimento).toBe("2004-08-15");
  });
  it("rejects impossible or future dates and invalid numeric values", () => {
    const rows = mapImportRows([["Nome Completo", "Data de Nascimento", "Peso (kg)"], ["A", "31/02/2004", "abc"], ["B", "15/08/2999", "80"]]);
    expect(rows[0].errors).toHaveLength(2);
    expect(rows[1].errors).toContain("Data de Nascimento: A data não pode estar no futuro.");
  });
  it("ignores empty rows but retains source line numbers", () => {
    const rows = mapImportRows([["Nome Completo"], ["A"], [], ["B"]]);
    expect(rows.map((r) => r.line)).toEqual([2, 4]);
  });
  it("saves only valid profiles and reports validation and write failures", async () => {
    const rows = mapImportRows([["Nome Completo", "Categoria"], ["A", "Profissional"], ["B", "bad"], ["C", ""]]);
    const create = vi.fn().mockResolvedValueOnce("id-a").mockRejectedValueOnce(new Error("Sem permissão"));
    const result = await importValidRows(rows, create);
    expect(create.mock.calls.map((c) => c[0].nomeCompleto)).toEqual(["A", "C"]);
    expect(result.imported).toBe(1);
    expect(result.failed.map((r) => r.line)).toEqual([3, 4]);
  });
});