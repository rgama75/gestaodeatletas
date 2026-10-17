import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { actions, useDB } from "@/lib/store";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { role, user, ready } = useDB();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const nav = [
    { to: "/atletas", label: "Atletas" },
    { to: "/comparar", label: "Comparar" },
    { to: "/historico", label: "Histórico" },
    ...(role === "Administrador" ? [{ to: "/usuarios", label: "Equipe" }] : []),
  ] as const;
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/atletas" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-primary font-display text-xl font-bold text-primary-foreground">GA</span>
            <span className="font-display text-xl font-bold uppercase tracking-wider">Scout<span className="text-primary">Hub</span></span>
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-secondary !text-foreground" }}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {ready && <Input aria-label="Seu nome" className="h-8 w-36" defaultValue={user} key={user}
              onBlur={(e) => actions.setUser(e.target.value.trim()).catch((err) => toast.error(err.message))} />}
            {role && <Badge variant="outline">{role}</Badge>}
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="size-4" />Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {ready && !role ? <p className="py-20 text-center text-muted-foreground">Sua conta ainda não tem acesso. Peça a um administrador para liberar seu perfil.</p> : children}
      </main>
    </div>
  );
}