import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GitCompare, History, LogOut, Menu, Settings, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";

function Logo() {
  return (
    <Link to="/atletas" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-md bg-primary font-display text-xl font-bold text-primary-foreground">GA</span>
      <span className="font-display text-xl font-bold uppercase tracking-wider">Scout<span className="text-primary">Hub</span></span>
    </Link>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useDB();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const nav = [
    { to: "/atletas", label: "Atletas", Icon: Users },
    { to: "/comparar", label: "Comparar", Icon: GitCompare },
    { to: "/historico", label: "Histórico", Icon: History },
    ...(role === "Administrador" ? [{ to: "/usuarios", label: "Configurações", Icon: Settings }] : []),
  ] as const;
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex h-full flex-col gap-6">
      <Logo />
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {nav.map(({ to, label, Icon }) => (
          <Link key={to} to={to} onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary !text-foreground" }}>
            <Icon className="size-4" aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <ThemeToggle />
        {role && <Badge variant="outline" className="self-start">{role}</Badge>}
        <Button variant="ghost" className="min-h-11 justify-start gap-3 px-3 text-muted-foreground" onClick={signOut}><LogOut className="size-4" />Sair</Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, ready } = useDB();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r bg-sidebar p-4 text-sidebar-foreground md:block">
        <SideNav />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/85 px-3 py-2 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="size-11" aria-label="Abrir menu"><Menu className="size-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4 text-sidebar-foreground">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navegação principal</SheetDescription>
              <SideNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          {ready && !role ? <p className="py-20 text-center text-muted-foreground">Sua conta ainda não tem acesso. Peça a um administrador para liberar seu perfil.</p> : children}
        </main>
      </div>
    </div>
  );
}
