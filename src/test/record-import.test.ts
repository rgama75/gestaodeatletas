import { describe, expect, it } from "vitest";
import { canImportSection, headerOf, importableFields, mapRecordRows } from "@/lib/record-import";
import { SECTIONS } from "@/lib/schema";

describe("section spreadsheet import", () => {
  const physical = SECTIONS.physical;
  it("uses field labels (with unit) as headers and skips file fields", () => {
    expect(importableFields(SECTIONS.contracts).some((f) => f.type === "file")).toBe(false);
    expect(headerOf(physical.fields.find((f) => f.key === "peso")!)).toBe("Peso (kg)");
  });
  it("maps a physical assessment row by header, with comma decimals and DD/MM/YYYY dates", () => {
    const rows = mapRecordRows(physical, [["Data da avaliação", "Altura (m)", "Peso (kg)", "Percentual de gordura (%)"], ["15/08/2024", "1,85", "80,5", "12"]]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].record).toMatchObject({ data: "2024-08-15", altura: 1.85, peso: 80.5, gordura: 12 });
    expect(rows[0].record.id).toBeTruthy();
  });
  it("also accepts the plain label without the unit", () => {
    const rows = mapRecordRows(physical, [["Data da avaliação", "Peso"], ["15/08/2024", "80"]]);
    expect(rows[0].record.peso).toBe(80);
  });
  it("reports missing required headers and unknown sheets", () => {
    expect(() => mapRecordRows(physical, [["Peso (kg)"], ["80"]])).toThrow(/Data da avaliação/);
    expect(() => mapRecordRows(physical, [["Qualquer"], ["x"]])).toThrow();
  });
  it("validates required values, numeric limits, future dates and select options", () => {
    const rows = mapRecordRows(physical, [["Data da avaliação", "Peso (kg)"], ["", "80"], ["15/08/2999", "80"], ["15/08/2024", "999"]]);
    expect(rows[0].errors).toContain("Data da avaliação: Campo obrigatório.");
    expect(rows[1].errors).toContain("Data da avaliação: A data não pode estar no futuro.");
    expect(rows[2].errors.join(" ")).toMatch(/Máximo 150/);
    const market = mapRecordRows(SECTIONS.market, [["Data da avaliação", "Moeda", "Status de negociação"], ["15/08/2024", "eur", "sondagem"], ["15/08/2024", "XYZ", ""]]);
    expect(market[0].record).toMatchObject({ moeda: "EUR", statusNegociacao: "Sondagem" });
    expect(market[1].errors).toEqual(['Moeda: opção inválida "XYZ".']);
  });
  it("reads booleans and keeps source line numbers, ignoring blank rows", () => {
    const rows = mapRecordRows(SECTIONS.performances, [["Data", "Adversário", "Atuação de destaque"], ["10/05/2024", "A", "Sim"], [], ["11/05/2024", "B", "talvez"]]);
    expect(rows.map((r) => r.line)).toEqual([2, 4]);
    expect(rows[0].record.destaqueFlag).toBe(true);
    expect(rows[1].errors).toEqual(["Atuação de destaque: use Sim ou Não."]);
  });
  it("does not offer import where a file is mandatory (documents)", () => {
    expect(canImportSection(SECTIONS.documents)).toBe(false);
    expect(canImportSection(SECTIONS.physical)).toBe(true);
  });
});
