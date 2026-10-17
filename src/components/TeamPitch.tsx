import { Link } from "@tanstack/react-router";
import { layoutPitch } from "@/lib/formation";
import { playerName } from "@/lib/teams";
import type { Athlete } from "@/lib/store";

/** Linhas do campo (ilustrativo). Cores fixas: o gramado é verde nos temas dia e noite. */
function PitchLines() {
  return (
    <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <pattern id="mow" width="100" height="25" patternUnits="userSpaceOnUse">
          <rect width="100" height="12.5" fill="#2f8f46" />
          <rect y="12.5" width="100" height="12.5" fill="#2a8340" />
        </pattern>
      </defs>
      <rect width="100" height="125" fill="url(#mow)" />
      <g fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="0.6" vectorEffect="non-scaling-stroke">
        <rect x="4" y="4" width="92" height="117" />
        <line x1="4" y1="62.5" x2="96" y2="62.5" />
        <ellipse cx="50" cy="62.5" rx="12" ry="9.6" />
        <rect x="23" y="4" width="54" height="19" />
        <rect x="36" y="4" width="28" height="7" />
        <rect x="23" y="102" width="54" height="19" />
        <rect x="36" y="114" width="28" height="7" />
        <path d="M 40 23 A 12 9.6 0 0 0 60 23" />
        <path d="M 40 102 A 12 9.6 0 0 1 60 102" />
      </g>
      <g fill="#ffffff" fillOpacity="0.85">
        <circle cx="50" cy="62.5" r="0.7" />
        <circle cx="50" cy="15" r="0.6" />
        <circle cx="50" cy="110" r="0.6" />
      </g>
    </svg>
  );
}

export function TeamPitch({ athletes }: { athletes: Athlete[] }) {
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const { placed, unplaced } = layoutPitch(athletes.map((a) => ({ id: a.id, posicao: a.profile.posicao })));
  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-xl overflow-hidden rounded-xl border border-white/20 bg-[#2f8f46] shadow-sm">
        <PitchLines />
        {placed.map(({ id, x, y }) => {
          const a = byId.get(id)!;
          return (
            <Link key={id} to="/atletas/$id" params={{ id }}
              title={`${playerName(a)} · ${a.profile.posicao}`}
              className="group absolute flex w-[19%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 focus-visible:outline-none"
              style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-primary font-display text-base font-bold leading-none text-primary-foreground shadow transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-white sm:size-9">
                {a.profile.camisa || "–"}
              </span>
              <span className="max-w-full truncate rounded bg-black/55 px-1 text-[10px] font-semibold leading-tight text-white sm:text-xs">{playerName(a)}</span>
            </Link>
          );
        })}
      </div>
      {unplaced.length > 0 && (
        <div className="rounded-lg border bg-secondary/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Sem posição definida</p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((id) => {
              const a = byId.get(id)!;
              return (
                <Link key={id} to="/atletas/$id" params={{ id }} className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-card px-2 text-sm hover:border-primary">
                  <span className="font-display font-bold text-primary">{a.profile.camisa || "–"}</span>{playerName(a)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
