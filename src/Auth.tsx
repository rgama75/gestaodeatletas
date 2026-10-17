import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [modo, setModo] = useState<"entrar" | "criar">("criar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } =
      modo === "criar"
        ? await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } })
        : await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) setErro(error.message);
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <h1>Gestão de Atletas</h1>
      <h2>{modo === "criar" ? "Criar conta" : "Entrar"}</h2>
      {modo === "criar" && (
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      )}
      <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha (mín. 6 caracteres)" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required />
      {erro && <p className="erro">{erro}</p>}
      <button disabled={enviando}>{modo === "criar" ? "Criar conta" : "Entrar"}</button>
      <button type="button" className="link" onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}>
        {modo === "criar" ? "Já tenho conta" : "Criar uma conta"}
      </button>
    </form>
  );
}
