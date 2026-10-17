/**
 * Posição de cada jogador no campo ilustrativo (coordenadas em %, gol próprio embaixo).
 * Jogadores da mesma posição são distribuídos lado a lado, em mais de uma linha se necessário.
 */
export interface PitchPlayer { id: string; posicao?: string | null }
export interface Placed { id: string; x: number; y: number }

interface Spot { x: number; y: number; spread: "x" | "y" }

const SPOTS: Record<string, Spot> = {
  Goleiro: { x: 50, y: 91, spread: "x" },
  Zagueiro: { x: 50, y: 78, spread: "x" },
  "Lateral Direito": { x: 88, y: 66, spread: "y" },
  "Lateral Esquerdo": { x: 12, y: 66, spread: "y" },
  Volante: { x: 50, y: 56, spread: "x" },
  "Meio-campista": { x: 50, y: 45, spread: "x" },
  "Meia Ofensivo": { x: 50, y: 34, spread: "x" },
  "Ponta Direita": { x: 87, y: 22, spread: "y" },
  "Ponta Esquerda": { x: 13, y: 22, spread: "y" },
  "Segundo Atacante": { x: 50, y: 24, spread: "x" },
  Centroavante: { x: 50, y: 10, spread: "x" },
};

const PER_ROW = 5;
const ROW_GAP = 9;
const SIDE_GAP = 10;

export function layoutPitch(players: PitchPlayer[]): { placed: Placed[]; unplaced: string[] } {
  const groups = new Map<string, string[]>();
  const unplaced: string[] = [];
  for (const p of players) {
    if (p.posicao && SPOTS[p.posicao]) groups.set(p.posicao, [...(groups.get(p.posicao) ?? []), p.id]);
    else unplaced.push(p.id);
  }
  const placed: Placed[] = [];
  for (const [pos, ids] of groups) {
    const spot = SPOTS[pos];
    if (spot.spread === "y") {
      ids.forEach((id, i) => placed.push({ id, x: spot.x, y: spot.y + (i - (ids.length - 1) / 2) * SIDE_GAP }));
      continue;
    }
    const rows = Math.ceil(ids.length / PER_ROW);
    for (let r = 0; r < rows; r++) {
      const row = ids.slice(r * PER_ROW, (r + 1) * PER_ROW);
      const step = row.length > 1 ? Math.min(22, 72 / (row.length - 1)) : 0;
      row.forEach((id, i) => placed.push({
        id,
        x: spot.x + (i - (row.length - 1) / 2) * step,
        y: spot.y + (r - (rows - 1) / 2) * ROW_GAP,
      }));
    }
  }
  return { placed, unplaced };
}
