import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safePath = (p?: string) => {
  if (!p) return "/atletas";
  try { const u = new URL(p, window.location.origin); return u.origin === window.location.origin ? u.pathname + u.search : "/atletas"; } catch { return "/atletas"; }
};

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s.redirect === "string" ? { redirect: s.redirect } : {}),
  head: () => ({
    meta: [
      { title: "Entrar — ScoutHub" },
      { name: "description", content: "Acesse a plataforma de gestão de atletas ScoutHub." },
      { property: "og:title", content: "Entrar — ScoutHub" },
      { property: "og:description", content: "Acesse a plataforma de gestão de atletas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
  name: z.string().trim().max(80).optional(),
});

export function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const go = () => navigate({ to: safePath(redirect) as "/atletas", replace: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) go(); });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const em = z.string().trim().email().safeParse(form.email);
        if (!em.success) throw new Error("E-mail inválido");
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setMode("in");
        return;
      }
      const v = schema.safeParse(form);
      if (!v.success) throw new Error(v.error.issues[0].message);
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: v.data.email, password: v.data.password,
          options: { data: { display_name: v.data.name } },
        });
        if (error) throw error;
        if (!data.session) throw new Error("Não foi possível iniciar sua sessão. Tente entrar com seu e-mail e senha.");
        await go();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: v.data.email, password: v.data.password });
        if (error) throw new Error("E-mail ou senha incorretos.");
      }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  async function oauth(p: "google" | "lovable") {
    if (redirect) sessionStorage.setItem("after-login", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar. Tente novamente.");
  }

  const title = mode === "up" ? "Criar conta" : mode === "forgot" ? "Recuperar senha" : "Entrar";
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-30" />
      <Card className="relative w-full max-w-sm p-6">
        <h1 className="font-display text-4xl font-bold uppercase">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">Scout<span className="text-primary">Hub</span> · Gestão de Atletas</p>
        {mode !== "forgot" && (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continuar com Google</Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
            <div className="py-2 text-center text-xs text-muted-foreground">ou com e-mail</div>
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <div className="space-y-1"><Label htmlFor="name">Nome</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>}
          <div className="space-y-1"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          {mode !== "forgot" && <div className="space-y-1"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Aguarde…" : mode === "up" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          {mode === "in" ? <>
            <button className="text-primary underline" onClick={() => setMode("up")}>Criar conta</button>
            <button className="text-muted-foreground underline" onClick={() => setMode("forgot")}>Esqueci a senha</button>
          </> : <button className="text-primary underline" onClick={() => setMode("in")}>Já tenho conta</button>}
        </div>
      </Card>
    </div>
  );
}
