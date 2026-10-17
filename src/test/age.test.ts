import { describe, expect, it } from "vitest";
import { calcAge } from "@/lib/age";
import { validateRecord } from "@/lib/schema";
import { PROFILE_FIELDS } from "@/lib/schema";

describe("calcAge", () => {
  it("15/08/2004 tem 22 anos após o aniversário em 2026", () => {
    expect(calcAge("2004-08-15", new Date(2026, 9, 17))).toBe(22);
  });
  it("ainda 21 anos antes do aniversário em 2026", () => {
    expect(calcAge("2004-08-15", new Date(2026, 7, 14))).toBe(21);
  });
  it("completa 22 exatamente no dia do aniversário", () => {
    expect(calcAge("2004-08-15", new Date(2026, 7, 15))).toBe(22);
  });
});

describe("validação", () => {
  it("rejeita data de nascimento no futuro", () => {
    const e = validateRecord(PROFILE_FIELDS, { nomeCompleto: "A", dataNascimento: "2999-01-01" });
    expect(e.dataNascimento).toBeTruthy();
  });
  it("rejeita altura implausível", () => {
    const e = validateRecord(PROFILE_FIELDS, { nomeCompleto: "A", altura: 3.5 });
    expect(e.altura).toBeTruthy();
  });
  it("exige nome completo", () => {
    const e = validateRecord(PROFILE_FIELDS, {});
    expect(e.nomeCompleto).toBeTruthy();
  });
});
