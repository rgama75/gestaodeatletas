import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StoredImage } from "@/components/StoredImage";
import { TeamPitch } from "@/components/TeamPitch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDB } from "@/lib/store";
import { playerName, teamAthletes, teamFromParam } from "@/lib/teams";

export const Route = createFileRoute("/_authenticated/times/$nome")({
  head: () => ({
    meta: [
      { title: "Time — ScoutHub" },
      { name: "description", content: "Jogadores do time e escalação por posição em campo." },
      { property: "og:title", content: "Time — ScoutHub" },
      { property: "og:description", content: "Elenco do time com os jogadores posicionados no campo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { nome } = Route.useParams();
  const db = useDB();
  const team = teamFromParam(nome);
  const athletes = teamAthletes(db.athletes, team);
  return (
    <AppShell>
      <Link to="/atletas" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Times</Link>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">Time</p>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">{team}</h1>
        <p className="text-muted-foreground">{athletes.length} {athletes.length === 1 ? "atleta" : "atletas"}</p>
      </div>
      {!db.ready ? <p className="py-20 text-center text-muted-foreground">Carregando…</p>
        : athletes.length === 0 ? <p className="py-20 text-center text-muted-foreground">Nenhum atleta neste time. <Link to="/atletas" className="text-primary underline">Voltar</Link></p>
        : (
          <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
            <Card className="h-fit overflow-hidden lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              <ul className="divide-y">
                {athletes.map((a) => (
                  <li key={a.id}>
                    <Link to="/atletas/$id" params={{ id: a.id }} className="flex min-h-14 items-center gap-3 p-3 transition-colors hover:bg-secondary/60">
                      <span className="size-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {a.photo ? <StoredImage path={a.photo} alt={playerName(a)} className="size-full object-cover" /> : <UserRound className="m-auto mt-2 size-6 text-muted-foreground" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{playerName(a)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.profile.posicao || "Posição não informada"}</span>
                      </span>
                      {a.profile.camisa ? <Badge variant="secondary" className="font-display text-base">{a.profile.camisa}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <TeamPitch athletes={athletes} />
          </div>
        )}
    </AppShell>
  );
}
