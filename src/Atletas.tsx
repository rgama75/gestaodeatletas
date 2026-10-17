import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Atleta = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  modalidade: string | null;
  posicao: string | null;
  observacoes: string | null;
};

export default function Atletas({ session }: { session: Session }) {
  const [lista, setLista] = useState<Atleta[]>([]);
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [posicao, setPosicao] = useState("");
  const [erro, setErro] = useState("");

  async function carregar() {
    const { data, error } = await supabase.from("atletas").select("*").order("nome");
    if (error) setErro(error.message);
    else setLista(data as Atleta[]);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const { error } = await supabase.from("atletas").insert({
      nome,
      data_nascimento: nascimento || null,
      modalidade: modalidade || null,
      posicao: posicao || null,
    });
    if (error) return setErro(error.message);
    setNome("");
    setNascimento("");
    setModalidade("");
    setPosicao("");
    carregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("atletas").delete().eq("id", id);
    if (error) setErro(error.message);
    else carregar();
  }

  return (
    <main className="pagina">
      <header>
        <h1>Atletas</h1>
        <span>{session.user.email}</span>
        <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>

      <form className="linha" onSubmit={adicionar}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
        <input placeholder="Modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value)} />
        <input placeholder="Posição" value={posicao} onChange={(e) => setPosicao(e.target.value)} />
        <button>Adicionar</button>
      </form>
      {erro && <p className="erro">{erro}</p>}

      <table>
        <thead>
          <tr><th>Nome</th><th>Nascimento</th><th>Modalidade</th><th>Posição</th><th /></tr>
        </thead>
        <tbody>
          {lista.map((a) => (
            <tr key={a.id}>
              <td>{a.nome}</td>
              <td>{a.data_nascimento ?? "—"}</td>
              <td>{a.modalidade ?? "—"}</td>
              <td>{a.posicao ?? "—"}</td>
              <td><button className="link" onClick={() => remover(a.id)}>Remover</button></td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={5}>Nenhum atleta cadastrado.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
