import type { Athlete } from "./store";

export const NO_TEAM = "Sem clube";
/** Valor usado na URL para atletas sem clube (evita colidir com um clube real). */
export const NO_TEAM_PARAM = "_sem-clube";

export interface Team {
  name: string;
  param: string;
  athletes: Athlete[];
}

export const teamName = (a: Athlete): string => String(a.profile.clube ?? "").trim() || NO_TEAM;
export const teamParam = (name: string): string => (name === NO_TEAM ? NO_TEAM_PARAM : name);
export const teamFromParam = (param: string): string => (param === NO_TEAM_PARAM ? NO_TEAM : param);

const byName = (x: string, y: string) => x.localeCompare(y, "pt-BR", { sensitivity: "base" });

/** Agrupa por clube (sem diferenciar maiúsculas); times com mais atletas primeiro, "Sem clube" por último. */
export function groupByTeam(athletes: Athlete[]): Team[] {
  const map = new Map<string, Team>();
  for (const a of athletes) {
    const name = teamName(a);
    const key = name.toLocaleLowerCase("pt-BR");
    const team = map.get(key) ?? { name, param: teamParam(name), athletes: [] };
    team.athletes.push(a);
    map.set(key, team);
  }
  return [...map.values()]
    .map((t) => ({ ...t, athletes: [...t.athletes].sort((a, b) => byName(playerName(a), playerName(b))) }))
    .sort((a, b) => Number(a.name === NO_TEAM) - Number(b.name === NO_TEAM) || b.athletes.length - a.athletes.length || byName(a.name, b.name));
}

export const playerName = (a: Athlete): string => String(a.profile.nomeEsportivo || a.profile.nomeCompleto || "").trim();

export function teamAthletes(athletes: Athlete[], name: string): Athlete[] {
  const key = name.toLocaleLowerCase("pt-BR");
  return athletes
    .filter((a) => teamName(a).toLocaleLowerCase("pt-BR") === key)
    .sort((a, b) => byName(playerName(a), playerName(b)));
}
