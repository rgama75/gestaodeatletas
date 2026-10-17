import { todayISO } from "./age";

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "file" | "boolean" | "url";
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  required?: boolean;
  noFuture?: boolean;
  after?: string; // a data deve ser >= campo indicado
  wide?: boolean;
}

export const POSITIONS = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo", "Volante", "Meio-campista",
  "Meia Ofensivo", "Ponta Direita", "Ponta Esquerda", "Segundo Atacante", "Centroavante",
];
export const FEET = ["Direita", "Esquerda", "Ambidestro"];
export const STATUS = ["Ativo", "Lesionado", "Emprestado", "Em negociação", "Livre", "Aposentado"];
export const CATEGORIES = ["Sub-15", "Sub-17", "Sub-20", "Sub-23", "Profissional"];
export const CURRENCIES = ["BRL", "EUR", "USD", "GBP"];

const pct = (key: string, label: string): FieldDef => ({ key, label, type: "number", unit: "%", min: 0, max: 100 });
const kg = (key: string, label: string, max = 150): FieldDef => ({ key, label, type: "number", unit: "kg", min: 0, max });
const evalDate: FieldDef = { key: "data", label: "Data da avaliação", type: "date", required: true, noFuture: true };
const notes: FieldDef = { key: "observacoes", label: "Observações", type: "textarea", wide: true };
const money = (key: string, label: string): FieldDef => ({ key, label, type: "number", min: 0 });
const currency: FieldDef = { key: "moeda", label: "Moeda", type: "select", options: CURRENCIES };
const contractDoc: FieldDef = { key: "documento", label: "Documento do contrato", type: "file" };

export const PROFILE_FIELDS: FieldDef[] = [
  { key: "nomeCompleto", label: "Nome completo", type: "text", required: true },
  { key: "nomeEsportivo", label: "Nome esportivo", type: "text" },
  { key: "apelido", label: "Apelido", type: "text" },
  { key: "nacionalidade", label: "Nacionalidade", type: "text" },
  { key: "segundaNacionalidade", label: "Segunda nacionalidade", type: "text" },
  { key: "dataNascimento", label: "Data de nascimento", type: "date", noFuture: true },
  { key: "cidadeNascimento", label: "Cidade de nascimento", type: "text" },
  { key: "paisNascimento", label: "País de nascimento", type: "text" },
  { key: "altura", label: "Altura", type: "number", unit: "m", min: 1.2, max: 2.3 },
  { key: "peso", label: "Peso", type: "number", unit: "kg", min: 35, max: 150 },
  { key: "posicao", label: "Posição principal", type: "select", options: POSITIONS },
  { key: "posicoesSecundarias", label: "Posições secundárias (separadas por vírgula)", type: "text" },
  { key: "perna", label: "Perna dominante", type: "select", options: FEET },
  { key: "camisa", label: "Número da camisa", type: "number", min: 1, max: 99 },
  { key: "status", label: "Status atual", type: "select", options: STATUS },
  { key: "clube", label: "Clube atual", type: "text" },
  { key: "categoria", label: "Categoria", type: "select", options: CATEGORIES },
  notes,
];

export interface SectionDef {
  key: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  sortKey?: string;
  confidential?: boolean;
  summary: string[]; // campos mostrados no cabeçalho do card
}

export const SECTIONS: Record<string, SectionDef> = {
  physical: {
    key: "physical", title: "Dados Físicos", description: "Cada avaliação é registrada separadamente — nada é substituído.",
    sortKey: "data", summary: ["data", "peso", "gordura"],
    fields: [
      evalDate,
      { key: "altura", label: "Altura", type: "number", unit: "m", min: 1.2, max: 2.3 },
      { key: "peso", label: "Peso", type: "number", unit: "kg", min: 35, max: 150 },
      { key: "envergadura", label: "Envergadura", type: "number", unit: "cm", min: 100, max: 260 },
      pct("gordura", "Percentual de gordura"),
      kg("massaMuscular", "Massa muscular"), kg("massaMagra", "Massa magra"), kg("massaOssea", "Massa óssea", 20),
      pct("agua", "Água corporal"),
      { key: "gorduraVisceral", label: "Gordura visceral", type: "number", unit: "nível", min: 0, max: 60 },
      { key: "tmb", label: "Taxa metabólica basal", type: "number", unit: "kcal", min: 500, max: 5000 },
      { key: "idadeMetabolica", label: "Idade metabólica", type: "number", unit: "anos", min: 5, max: 100 },
      { key: "circAbdominal", label: "Circunferência abdominal", type: "number", unit: "cm", min: 40, max: 200 },
      { key: "outrasMedidas", label: "Outras medidas corporais", type: "textarea", wide: true },
    ],
  },
  bio: {
    key: "bio", title: "Avaliação de Bioimpedância", sortKey: "data", summary: ["data", "equipamento", "gordura"],
    description: "Preencha apenas os indicadores que o seu equipamento fornece.",
    fields: [
      evalDate,
      { key: "equipamento", label: "Equipamento", type: "text" },
      { key: "peso", label: "Peso", type: "number", unit: "kg", min: 35, max: 150 },
      { key: "imc", label: "IMC", type: "number", unit: "kg/m²", min: 10, max: 50 },
      pct("gordura", "Gordura corporal"), kg("massaGordura", "Massa de gordura"),
      kg("massaMuscular", "Massa muscular"), kg("musculoEsqueletico", "Massa muscular esquelética"),
      kg("massaMagra", "Massa magra"), { key: "aguaTotal", label: "Água corporal total", type: "number", unit: "L", min: 0, max: 100 },
      pct("aguaPct", "Percentual de água"), kg("massaOssea", "Massa óssea", 20),
      { key: "gorduraVisceral", label: "Gordura visceral", type: "number", unit: "nível", min: 0, max: 60 },
      { key: "tmb", label: "Taxa metabólica basal", type: "number", unit: "kcal", min: 500, max: 5000 },
      kg("proteina", "Proteína corporal", 50),
      { key: "idadeMetabolica", label: "Idade metabólica", type: "number", unit: "anos", min: 5, max: 100 },
      kg("massaCelular", "Massa celular"),
      { key: "rcq", label: "Relação cintura/quadril", type: "number", min: 0.4, max: 2 },
      { key: "arquivo", label: "Laudo (arquivo)", type: "file" },
      notes,
    ],
  },
  bioCustom: {
    key: "bioCustom", title: "Indicadores personalizados", sortKey: "data", summary: ["nome", "valor", "unidade", "data"],
    fields: [
      { key: "nome", label: "Nome do indicador", type: "text", required: true },
      { key: "unidade", label: "Unidade", type: "text" },
      { key: "valor", label: "Valor", type: "number", required: true },
      { key: "data", label: "Data", type: "date", required: true, noFuture: true },
      { key: "observacao", label: "Observação", type: "textarea", wide: true },
    ],
  },
  clubs: {
    key: "clubs", title: "Carreira / Clubes", sortKey: "entrada", summary: ["clube", "temporada", "categoria"],
    fields: [
      { key: "clube", label: "Clube", type: "text", required: true },
      { key: "pais", label: "País", type: "text" }, { key: "cidade", label: "Cidade", type: "text" },
      { key: "entrada", label: "Data de entrada", type: "date", required: true },
      { key: "saida", label: "Data de saída", type: "date", after: "entrada" },
      { key: "temporada", label: "Temporada", type: "text" },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIES },
      { key: "posicao", label: "Posição", type: "select", options: POSITIONS },
      { key: "camisa", label: "Número de camisa", type: "number", min: 1, max: 99 },
      { key: "vinculo", label: "Tipo de vínculo", type: "select", options: ["Definitivo", "Empréstimo", "Formação", "Amador", "Outro"] },
      { key: "statusVinculo", label: "Status do vínculo", type: "select", options: ["Vigente", "Encerrado", "Rescindido"] },
      { key: "jogos", label: "Jogos", type: "number", min: 0 }, { key: "gols", label: "Gols", type: "number", min: 0 },
      { key: "assistencias", label: "Assistências", type: "number", min: 0 },
      { key: "minutos", label: "Minutos jogados", type: "number", min: 0 },
      { key: "titulos", label: "Títulos no período", type: "text", wide: true }, notes,
    ],
  },
  contracts: {
    key: "contracts", title: "Contratos e Informações Financeiras", confidential: true, sortKey: "inicio",
    summary: ["clube", "inicio", "fim", "salario"],
    fields: [
      { key: "clube", label: "Clube", type: "text", required: true },
      { key: "inicio", label: "Início do contrato", type: "date", required: true },
      { key: "fim", label: "Término", type: "date", after: "inicio" },
      money("valor", "Valor do contrato"), currency, money("salario", "Salário"),
      { key: "periodicidade", label: "Periodicidade do salário", type: "select", options: ["Mensal", "Semanal", "Anual"] },
      money("luvas", "Luvas"), money("bonus", "Bônus"), money("premios", "Prêmios"), money("multa", "Multa rescisória"),
      pct("direitosEconomicos", "Direitos econômicos"), pct("direitosFederativos", "Direitos federativos"),
      money("transferencia", "Valor de transferência"), money("comissao", "Comissão"), contractDoc, notes,
    ],
  },
  market: {
    key: "market", title: "Mercado", confidential: true, sortKey: "data", summary: ["data", "valorAtual", "moeda", "statusNegociacao"],
    fields: [
      evalDate, money("valorAtual", "Valor atual para negociação"), currency,
      money("valorMinimo", "Valor mínimo aceitável"), money("valorDesejado", "Valor desejado"),
      money("valorEstimado", "Valor estimado de mercado"),
      { key: "fonte", label: "Fonte da avaliação", type: "text" },
      { key: "statusNegociacao", label: "Status de negociação", type: "select", options: ["Sem negociação", "Sondagem", "Em negociação", "Proposta recebida", "Concluída", "Recusada"] },
      { key: "clubeInteressado", label: "Clube interessado", type: "text" },
      { key: "dataInteresse", label: "Data do interesse", type: "date" },
      { key: "condicoes", label: "Condições da negociação", type: "textarea", wide: true }, notes,
    ],
  },
  sponsors: {
    key: "sponsors", title: "Patrocinadores", confidential: true, sortKey: "inicio", summary: ["empresa", "marca", "status"],
    fields: [
      { key: "empresa", label: "Nome da empresa", type: "text", required: true },
      { key: "marca", label: "Marca", type: "text" }, { key: "categoria", label: "Categoria", type: "text" },
      { key: "inicio", label: "Data de início", type: "date" }, { key: "fim", label: "Data de término", type: "date", after: "inicio" },
      money("valor", "Valor do contrato"), currency, { key: "tipo", label: "Tipo de contrato", type: "text" },
      { key: "produtos", label: "Produtos/serviços", type: "text" },
      { key: "obrigacoes", label: "Obrigações do atleta", type: "textarea", wide: true },
      { key: "status", label: "Status", type: "select", options: ["Ativo", "Encerrado", "Em negociação"] },
      { key: "logo", label: "Logotipo", type: "file" }, contractDoc, notes,
    ],
  },
  performances: {
    key: "performances", title: "Principais Atuações", sortKey: "data", summary: ["data", "adversario", "competicao", "nota"],
    fields: [
      { key: "data", label: "Data", type: "date", required: true, noFuture: true },
      { key: "clube", label: "Clube", type: "text" }, { key: "adversario", label: "Adversário", type: "text", required: true },
      { key: "competicao", label: "Competição", type: "text" }, { key: "local", label: "Local", type: "text" },
      { key: "titular", label: "Titular ou reserva", type: "select", options: ["Titular", "Reserva"] },
      { key: "minutos", label: "Minutos jogados", type: "number", min: 0, max: 130 },
      { key: "gols", label: "Gols", type: "number", min: 0 }, { key: "assistencias", label: "Assistências", type: "number", min: 0 },
      { key: "nota", label: "Nota da atuação", type: "number", min: 0, max: 10 },
      { key: "destaqueFlag", label: "Atuação de destaque", type: "boolean" },
      { key: "destaques", label: "Destaques", type: "textarea", wide: true },
      { key: "video", label: "Vídeo/Link", type: "url" }, notes,
    ],
  },
  titles: {
    key: "titles", title: "Títulos", sortKey: "data", summary: ["nome", "clube", "temporada"],
    fields: [
      { key: "nome", label: "Nome do título", type: "text", required: true },
      { key: "competicao", label: "Competição", type: "text" }, { key: "clube", label: "Clube", type: "text" },
      { key: "temporada", label: "Temporada", type: "text" }, { key: "data", label: "Data", type: "date", noFuture: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIES },
      { key: "funcao", label: "Função do atleta na conquista", type: "text" },
      { key: "arquivo", label: "Foto/documento", type: "file" }, notes,
    ],
  },
  stats: {
    key: "stats", title: "Estatísticas", sortKey: "temporada", summary: ["temporada", "clube", "competicao"],
    fields: [
      { key: "temporada", label: "Temporada", type: "text", required: true },
      { key: "clube", label: "Clube", type: "text" }, { key: "competicao", label: "Competição", type: "text" },
      { key: "posicao", label: "Posição", type: "select", options: POSITIONS },
      ...[
        ["jogos", "Jogos"], ["titular", "Jogos como titular"], ["reserva", "Jogos como reserva"], ["minutos", "Minutos"],
        ["gols", "Gols"], ["assistencias", "Assistências"], ["finalizacoes", "Finalizações"], ["finalizacoesAlvo", "Finalizações no alvo"],
        ["passes", "Passes"], ["passesCertos", "Passes certos"], ["cruzamentos", "Cruzamentos"], ["dribles", "Dribles"],
        ["driblesCertos", "Dribles certos"], ["desarmes", "Desarmes"], ["interceptacoes", "Interceptações"],
        ["faltasSofridas", "Faltas sofridas"], ["faltasCometidas", "Faltas cometidas"], ["amarelos", "Cartões amarelos"],
        ["vermelhos", "Cartões vermelhos"],
      ].map(([key, label]) => ({ key, label, type: "number" as const, min: 0 })),
      { key: "personalizadas", label: "Estatísticas personalizadas (ex.: Pênaltis: 3)", type: "textarea", wide: true },
    ],
  },
  national: {
    key: "national", title: "Seleções", sortKey: "data", summary: ["selecao", "categoria", "data"],
    fields: [
      { key: "selecao", label: "Seleção", type: "text", required: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIES },
      { key: "data", label: "Data da convocação", type: "date", noFuture: true },
      { key: "competicao", label: "Competição", type: "text" },
      { key: "jogos", label: "Jogos", type: "number", min: 0 }, { key: "gols", label: "Gols", type: "number", min: 0 },
      { key: "assistencias", label: "Assistências", type: "number", min: 0 },
      { key: "titulos", label: "Títulos", type: "text" }, notes,
    ],
  },
  documents: {
    key: "documents", title: "Documentos", sortKey: "data", summary: ["nome", "tipo", "data"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "select", required: true, options: ["Contrato", "Documento pessoal", "Documento esportivo", "Exame", "Avaliação física", "Avaliação biomédica", "Transferência", "Patrocinador", "Outro"] },
      { key: "data", label: "Data", type: "date" },
      { key: "descricao", label: "Descrição", type: "textarea", wide: true },
      { key: "arquivo", label: "Arquivo", type: "file", required: true },
    ],
  },
};

export const DEFAULT_TRAITS = [
  "Drible", "Chute forte", "Finalização", "Chute de média distância", "Chute de longa distância", "Batedor de falta",
  "Batedor de pênalti", "Cruzamento", "Passe curto", "Passe longo", "Visão de jogo", "Assistência", "Velocidade",
  "Aceleração", "Explosão", "Condução de bola", "Controle de bola", "Jogo aéreo", "Cabeceio", "Marcação", "Desarme",
  "Interceptação", "Posicionamento", "Antecipação", "Força física", "Resistência", "Equilíbrio", "Inteligência tática",
  "Tomada de decisão", "Liderança", "Versatilidade",
];

export function validateRecord(fields: FieldDef[], rec: Record<string, any>): Record<string, string> {
  const errs: Record<string, string> = {};
  const today = todayISO();
  for (const f of fields) {
    const v = rec[f.key];
    const empty = v === undefined || v === null || v === "";
    if (f.required && empty) { errs[f.key] = "Campo obrigatório"; continue; }
    if (empty) continue;
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) errs[f.key] = "Número inválido";
      else if (f.min !== undefined && n < f.min) errs[f.key] = `Mínimo ${f.min}${f.unit ? " " + f.unit : ""}`;
      else if (f.max !== undefined && n > f.max) errs[f.key] = `Máximo ${f.max}${f.unit ? " " + f.unit : ""}`;
    }
    if (f.type === "date") {
      if (f.noFuture && v > today) errs[f.key] = "A data não pode estar no futuro";
      if (f.after && rec[f.after] && v < rec[f.after]) errs[f.key] = "Deve ser posterior à data inicial";
    }
    if (f.type === "url" && !/^https?:\/\//i.test(String(v))) errs[f.key] = "Informe um link começando com http(s)://";
  }
  return errs;
}