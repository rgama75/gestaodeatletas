import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, BarChart3, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScoutHub — Gestão de Atletas de Futebol" },
      { name: "description", content: "Cadastro, análise esportiva, biomédica, financeira e de mercado de atletas de futebol." },
      { property: "og:title", content: "ScoutHub — Gestão de Atletas de Futebol" },
      { property: "og:description", content: "Plataforma centralizada para clubes, agentes e scouts acompanharem jogadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/atletas", replace: true }); });
  }, [navigate]);
  const items = [
    [Users, "Perfil completo", "Dados pessoais, carreira, títulos, seleções e documentos."],
    [Activity, "Físico e bioimpedância", "Histórico de avaliações com gráficos de evolução."],
    [BarChart3, "Desempenho e mercado", "Estatísticas, atuações, comparação e valor de negociação."],
    [Lock, "Financeiro protegido", "Contratos e valores visíveis só para quem tem permissão."],
  ] as const;
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center">
        <span className="grid size-14 place-items-center rounded-lg bg-primary font-display text-3xl font-bold text-primary-foreground">GA</span>
        <h1 className="mt-6 font-display text-6xl font-bold uppercase sm:text-7xl">Scout<span className="text-primary">Hub</span></h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">Gestão profissional de atletas de futebol para clubes, agentes, gestores e scouts.</p>
        <Button size="lg" className="mt-8" asChild><Link to="/auth">Entrar ou criar conta</Link></Button>
        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-2">
          {items.map(([Icon, t, d]) => (
            <div key={t} className="rounded-lg border bg-card p-5">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-3 font-display text-xl font-bold uppercase">{t}</h2>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
