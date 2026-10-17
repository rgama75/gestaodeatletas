import { describe, expect, it } from "vitest";
import { layoutPitch } from "@/lib/formation";
import { NO_TEAM, NO_TEAM_PARAM, groupByTeam, teamAthletes, teamFromParam, teamParam } from "@/lib/teams";
import type { Athlete } from "@/lib/store";

const ath = (id: string, profile: Record<string, any>): Athlete => ({ id, createdAt: "", profile, sections: {}, traits: {}, customTraits: [] });

describe("teams", () => {
  const list = [
    ath("1", { nomeCompleto: "Bruno", clube: "Santos" }), ath("2", { nomeCompleto: "Caio", clube: "santos " }),
    ath("3", { nomeCompleto: "Davi", clube: "Flamengo" }), ath("4", { nomeCompleto: "Edu" }),
  ];
  it("groups by club ignoring case, largest first, athletes without club last", () => {
    const teams = groupByTeam(list);
    expect(teams.map((t) => [t.name, t.athletes.length])).toEqual([["Santos", 2], ["Flamengo", 1], [NO_TEAM, 1]]);
  });
  it("round-trips the URL param, including athletes without club", () => {
    expect(teamParam(NO_TEAM)).toBe(NO_TEAM_PARAM);
    expect(teamFromParam(NO_TEAM_PARAM)).toBe(NO_TEAM);
    expect(teamAthletes(list, "SANTOS").map((a) => a.id)).toEqual(["1", "2"]);
    expect(teamAthletes(list, NO_TEAM).map((a) => a.id)).toEqual(["4"]);
  });
});

describe("pitch layout", () => {
  it("puts goalkeeper behind defenders and the striker in front, within the field", () => {
    const { placed } = layoutPitch([{ id: "gk", posicao: "Goleiro" }, { id: "cb", posicao: "Zagueiro" }, { id: "st", posicao: "Centroavante" }]);
    const y = (id: string) => placed.find((p) => p.id === id)!.y;
    expect(y("gk")).toBeGreaterThan(y("cb"));
    expect(y("cb")).toBeGreaterThan(y("st"));
    for (const p of placed) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(100); }
  });
  it("spreads players of the same position without overlapping and wraps long rows", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, posicao: "Meio-campista" }));
    const { placed } = layoutPitch(many);
    const spots = new Set(placed.map((p) => `${p.x.toFixed(1)}:${p.y.toFixed(1)}`));
    expect(spots.size).toBe(7);
    expect(new Set(placed.map((p) => p.y)).size).toBe(2);
  });
  it("separates right and left sides and reports players without a known position", () => {
    const { placed, unplaced } = layoutPitch([{ id: "r", posicao: "Lateral Direito" }, { id: "l", posicao: "Lateral Esquerdo" }, { id: "x" }, { id: "z", posicao: "Libero" }]);
    expect(placed.find((p) => p.id === "r")!.x).toBeGreaterThan(placed.find((p) => p.id === "l")!.x);
    expect(unplaced).toEqual(["x", "z"]);
  });
});
