import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — ScoutHub" },
      { name: "description", content: "Defina uma nova senha para sua conta ScoutHub." },
      { property: "og:title", content: "Redefinir senha — ScoutHub" },
      { property: "og:description", content: "Defina uma nova senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-4 font-display text-3xl font-bold uppercase">Nova senha</h1>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) { toast.error("Mínimo de 8 caracteres"); return; }
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) { toast.error("Link inválido ou expirado. Solicite outro."); return; }
          toast.success("Senha atualizada");
          navigate({ to: "/atletas" });
        }}>
          <div className="space-y-1"><Label htmlFor="pw">Nova senha</Label><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>Salvar senha</Button>
        </form>
      </Card>
    </div>
  );
}
