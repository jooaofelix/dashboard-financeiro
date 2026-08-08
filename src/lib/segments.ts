import { NaturezaCusto } from "./types";

/**
 * Um segmento é um "preset de negócio": ele traduz o vocabulário da interface e
 * traz um catálogo de serviços, categorias de despesa e centros de custo que
 * fazem sentido para aquela área. Trocar de segmento nas configurações muda o
 * app inteiro sem tocar em uma linha de lógica financeira.
 */

export interface SegmentoLabels {
  cliente: string;
  clientes: string;
  atendimento: string;
  atendimentos: string;
  /** Como o menu chama a tela de faturamento. */
  receitaOperacional: string;
  servico: string;
  servicos: string;
  profissional: string;
  profissionais: string;
}

export interface ModeloServico {
  nome: string;
  categoria: string;
  valorPadrao: number;
  custoDireto: number;
  duracaoMin: number;
}

export interface ModeloDespesa {
  descricao: string;
  categoria: string;
  centroCusto: string;
  natureza: NaturezaCusto;
  valorBase: number;
  /** Despesa recorrente entra todo mês na projeção de caixa. */
  recorrente: boolean;
}

export interface Segmento {
  id: string;
  nome: string;
  descricao: string;
  labels: SegmentoLabels;
  papeis: string[];
  centrosCusto: string[];
  categoriasDespesa: string[];
  origensCliente: string[];
  servicos: ModeloServico[];
  despesas: ModeloDespesa[];
  /** Sugestões aplicadas ao trocar de segmento. */
  aliquotaImpostos: number;
  metaReceitaMensal: number;
  tetoDespesaMensal: number;
  /** Volume médio de atendimentos por mês usado na base de demonstração. */
  volumeMensal: number;
  clientesPessoaJuridica: boolean;
}

export const SEGMENTOS: Segmento[] = [
  {
    id: "clinica",
    nome: "Clínica & Saúde",
    descricao:
      "Consultórios, clínicas e profissionais de saúde. Fatura por consulta ou procedimento, com repasse para a equipe.",
    labels: {
      cliente: "Paciente",
      clientes: "Pacientes",
      atendimento: "Atendimento",
      atendimentos: "Atendimentos",
      receitaOperacional: "Atendimentos",
      servico: "Procedimento",
      servicos: "Procedimentos",
      profissional: "Profissional",
      profissionais: "Equipe clínica",
    },
    papeis: ["Médico(a)", "Dentista", "Fisioterapeuta", "Psicólogo(a)", "Enfermagem"],
    centrosCusto: ["Consultório", "Equipe", "Administrativo", "Marketing"],
    categoriasDespesa: [
      "Estrutura",
      "Pessoal",
      "Materiais",
      "Equipamentos",
      "Software",
      "Marketing",
      "Impostos e taxas",
    ],
    origensCliente: ["Indicação", "Convênio", "Instagram", "Google", "Retorno"],
    servicos: [
      { nome: "Consulta inicial", categoria: "Consultas", valorPadrao: 320, custoDireto: 18, duracaoMin: 50 },
      { nome: "Consulta de retorno", categoria: "Consultas", valorPadrao: 190, custoDireto: 12, duracaoMin: 30 },
      { nome: "Sessão de terapia", categoria: "Terapias", valorPadrao: 240, custoDireto: 10, duracaoMin: 50 },
      { nome: "Procedimento ambulatorial", categoria: "Procedimentos", valorPadrao: 780, custoDireto: 165, duracaoMin: 60 },
      { nome: "Avaliação com laudo", categoria: "Exames", valorPadrao: 450, custoDireto: 90, duracaoMin: 45 },
      { nome: "Pacote mensal de acompanhamento", categoria: "Planos", valorPadrao: 890, custoDireto: 60, duracaoMin: 0 },
    ],
    despesas: [
      { descricao: "Aluguel do consultório", categoria: "Estrutura", centroCusto: "Consultório", natureza: "fixo", valorBase: 4200, recorrente: true },
      { descricao: "Folha da equipe", categoria: "Pessoal", centroCusto: "Equipe", natureza: "fixo", valorBase: 9800, recorrente: true },
      { descricao: "Prontuário eletrônico", categoria: "Software", centroCusto: "Administrativo", natureza: "fixo", valorBase: 349, recorrente: true },
      { descricao: "Energia, água e internet", categoria: "Estrutura", centroCusto: "Consultório", natureza: "fixo", valorBase: 780, recorrente: true },
      { descricao: "Contabilidade", categoria: "Impostos e taxas", centroCusto: "Administrativo", natureza: "fixo", valorBase: 690, recorrente: true },
      { descricao: "Materiais e descartáveis", categoria: "Materiais", centroCusto: "Consultório", natureza: "variavel", valorBase: 1450, recorrente: false },
      { descricao: "Anúncios e captação", categoria: "Marketing", centroCusto: "Marketing", natureza: "variavel", valorBase: 1200, recorrente: false },
      { descricao: "Manutenção de equipamentos", categoria: "Equipamentos", centroCusto: "Consultório", natureza: "variavel", valorBase: 620, recorrente: false },
    ],
    aliquotaImpostos: 11,
    metaReceitaMensal: 38000,
    tetoDespesaMensal: 22000,
    volumeMensal: 78,
    clientesPessoaJuridica: false,
  },
  {
    id: "juridico",
    nome: "Advocacia & Jurídico",
    descricao:
      "Escritórios e advogados autônomos. Combina honorários fixos, contratos mensais e êxito.",
    labels: {
      cliente: "Cliente",
      clientes: "Clientes",
      atendimento: "Honorário",
      atendimentos: "Honorários",
      receitaOperacional: "Honorários",
      servico: "Serviço jurídico",
      servicos: "Serviços jurídicos",
      profissional: "Advogado(a)",
      profissionais: "Equipe jurídica",
    },
    papeis: ["Sócio(a)", "Advogado(a) sênior", "Advogado(a) pleno", "Estagiário(a)", "Paralegal"],
    centrosCusto: ["Contencioso", "Consultivo", "Administrativo", "Novos negócios"],
    categoriasDespesa: [
      "Estrutura",
      "Pessoal",
      "Custas e diligências",
      "Software",
      "Marketing",
      "Impostos e taxas",
      "Viagens",
    ],
    origensCliente: ["Indicação", "Site", "LinkedIn", "Parceria", "Recorrente"],
    servicos: [
      { nome: "Consultoria avulsa", categoria: "Consultivo", valorPadrao: 1500, custoDireto: 0, duracaoMin: 90 },
      { nome: "Contrato mensal (assessoria)", categoria: "Recorrente", valorPadrao: 4500, custoDireto: 120, duracaoMin: 0 },
      { nome: "Ação trabalhista", categoria: "Contencioso", valorPadrao: 6800, custoDireto: 850, duracaoMin: 0 },
      { nome: "Ação cível", categoria: "Contencioso", valorPadrao: 5200, custoDireto: 640, duracaoMin: 0 },
      { nome: "Elaboração de contrato", categoria: "Consultivo", valorPadrao: 2400, custoDireto: 0, duracaoMin: 0 },
      { nome: "Audiência / sustentação", categoria: "Contencioso", valorPadrao: 1800, custoDireto: 260, duracaoMin: 120 },
    ],
    despesas: [
      { descricao: "Aluguel do escritório", categoria: "Estrutura", centroCusto: "Administrativo", natureza: "fixo", valorBase: 7500, recorrente: true },
      { descricao: "Folha e pró-labore", categoria: "Pessoal", centroCusto: "Administrativo", natureza: "fixo", valorBase: 24000, recorrente: true },
      { descricao: "Sistema jurídico e jurisprudência", categoria: "Software", centroCusto: "Administrativo", natureza: "fixo", valorBase: 890, recorrente: true },
      { descricao: "Contabilidade e OAB", categoria: "Impostos e taxas", centroCusto: "Administrativo", natureza: "fixo", valorBase: 1400, recorrente: true },
      { descricao: "Custas processuais", categoria: "Custas e diligências", centroCusto: "Contencioso", natureza: "variavel", valorBase: 3800, recorrente: false },
      { descricao: "Correspondentes e diligências", categoria: "Custas e diligências", centroCusto: "Contencioso", natureza: "variavel", valorBase: 2100, recorrente: false },
      { descricao: "Viagens e audiências", categoria: "Viagens", centroCusto: "Contencioso", natureza: "variavel", valorBase: 1600, recorrente: false },
      { descricao: "Marketing jurídico", categoria: "Marketing", centroCusto: "Novos negócios", natureza: "variavel", valorBase: 2200, recorrente: false },
    ],
    aliquotaImpostos: 16,
    metaReceitaMensal: 96000,
    tetoDespesaMensal: 48000,
    volumeMensal: 26,
    clientesPessoaJuridica: true,
  },
  {
    id: "consultoria",
    nome: "Consultoria & Agência",
    descricao:
      "Projetos, retainers e squads. Foco em receita recorrente, margem por projeto e alocação de time.",
    labels: {
      cliente: "Cliente",
      clientes: "Clientes",
      atendimento: "Faturamento",
      atendimentos: "Faturamentos",
      receitaOperacional: "Projetos & contratos",
      servico: "Serviço",
      servicos: "Serviços",
      profissional: "Consultor(a)",
      profissionais: "Time",
    },
    papeis: ["Sócio(a)", "Consultor(a) sênior", "Consultor(a)", "Designer", "Desenvolvedor(a)"],
    centrosCusto: ["Delivery", "Comercial", "Administrativo", "Produto"],
    categoriasDespesa: [
      "Pessoal",
      "Ferramentas",
      "Infraestrutura",
      "Terceiros",
      "Marketing",
      "Impostos e taxas",
      "Estrutura",
    ],
    origensCliente: ["Indicação", "Inbound", "Outbound", "Evento", "Parceria"],
    servicos: [
      { nome: "Retainer mensal", categoria: "Recorrente", valorPadrao: 12000, custoDireto: 900, duracaoMin: 0 },
      { nome: "Projeto de implantação", categoria: "Projetos", valorPadrao: 38000, custoDireto: 5200, duracaoMin: 0 },
      { nome: "Diagnóstico / assessment", categoria: "Projetos", valorPadrao: 9500, custoDireto: 400, duracaoMin: 0 },
      { nome: "Sprint de design", categoria: "Projetos", valorPadrao: 16000, custoDireto: 1800, duracaoMin: 0 },
      { nome: "Treinamento in company", categoria: "Educação", valorPadrao: 7400, custoDireto: 1100, duracaoMin: 480 },
      { nome: "Hora técnica avulsa", categoria: "Sob demanda", valorPadrao: 380, custoDireto: 0, duracaoMin: 60 },
    ],
    despesas: [
      { descricao: "Folha do time", categoria: "Pessoal", centroCusto: "Delivery", natureza: "fixo", valorBase: 62000, recorrente: true },
      { descricao: "Coworking e estrutura", categoria: "Estrutura", centroCusto: "Administrativo", natureza: "fixo", valorBase: 5400, recorrente: true },
      { descricao: "Licenças e SaaS", categoria: "Ferramentas", centroCusto: "Delivery", natureza: "fixo", valorBase: 3200, recorrente: true },
      { descricao: "Cloud e infraestrutura", categoria: "Infraestrutura", centroCusto: "Produto", natureza: "variavel", valorBase: 2800, recorrente: true },
      { descricao: "Contabilidade e jurídico", categoria: "Impostos e taxas", centroCusto: "Administrativo", natureza: "fixo", valorBase: 2100, recorrente: true },
      { descricao: "Freelancers e parceiros", categoria: "Terceiros", centroCusto: "Delivery", natureza: "variavel", valorBase: 9500, recorrente: false },
      { descricao: "Mídia paga e eventos", categoria: "Marketing", centroCusto: "Comercial", natureza: "variavel", valorBase: 6800, recorrente: false },
    ],
    aliquotaImpostos: 14,
    metaReceitaMensal: 220000,
    tetoDespesaMensal: 95000,
    volumeMensal: 16,
    clientesPessoaJuridica: true,
  },
  {
    id: "estetica",
    nome: "Estética & Bem-estar",
    descricao:
      "Salões, clínicas de estética e studios. Alto volume, pacotes e comissionamento por profissional.",
    labels: {
      cliente: "Cliente",
      clientes: "Clientes",
      atendimento: "Sessão",
      atendimentos: "Sessões",
      receitaOperacional: "Sessões",
      servico: "Procedimento",
      servicos: "Procedimentos",
      profissional: "Profissional",
      profissionais: "Profissionais",
    },
    papeis: ["Esteticista", "Cabeleireiro(a)", "Manicure", "Massoterapeuta", "Recepção"],
    centrosCusto: ["Salão", "Estética avançada", "Administrativo", "Marketing"],
    categoriasDespesa: [
      "Estrutura",
      "Pessoal",
      "Produtos",
      "Equipamentos",
      "Marketing",
      "Software",
      "Impostos e taxas",
    ],
    origensCliente: ["Instagram", "Indicação", "Passante", "Google", "Retorno"],
    servicos: [
      { nome: "Limpeza de pele", categoria: "Facial", valorPadrao: 220, custoDireto: 45, duracaoMin: 60 },
      { nome: "Massagem relaxante", categoria: "Corporal", valorPadrao: 180, custoDireto: 22, duracaoMin: 60 },
      { nome: "Drenagem linfática", categoria: "Corporal", valorPadrao: 160, custoDireto: 18, duracaoMin: 50 },
      { nome: "Aplicação de toxina", categoria: "Avançado", valorPadrao: 1250, custoDireto: 480, duracaoMin: 40 },
      { nome: "Pacote 10 sessões", categoria: "Pacotes", valorPadrao: 1400, custoDireto: 260, duracaoMin: 0 },
      { nome: "Design e coloração", categoria: "Cabelo", valorPadrao: 340, custoDireto: 85, duracaoMin: 120 },
    ],
    despesas: [
      { descricao: "Aluguel do espaço", categoria: "Estrutura", centroCusto: "Salão", natureza: "fixo", valorBase: 6200, recorrente: true },
      { descricao: "Folha e comissões fixas", categoria: "Pessoal", centroCusto: "Salão", natureza: "fixo", valorBase: 14500, recorrente: true },
      { descricao: "Sistema de agenda", categoria: "Software", centroCusto: "Administrativo", natureza: "fixo", valorBase: 290, recorrente: true },
      { descricao: "Energia, água e gás", categoria: "Estrutura", centroCusto: "Salão", natureza: "fixo", valorBase: 1350, recorrente: true },
      { descricao: "Contabilidade", categoria: "Impostos e taxas", centroCusto: "Administrativo", natureza: "fixo", valorBase: 520, recorrente: true },
      { descricao: "Compra de produtos", categoria: "Produtos", centroCusto: "Salão", natureza: "variavel", valorBase: 5400, recorrente: false },
      { descricao: "Tráfego pago e influenciadores", categoria: "Marketing", centroCusto: "Marketing", natureza: "variavel", valorBase: 2600, recorrente: false },
      { descricao: "Manutenção de aparelhos", categoria: "Equipamentos", centroCusto: "Estética avançada", natureza: "variavel", valorBase: 980, recorrente: false },
    ],
    aliquotaImpostos: 8,
    metaReceitaMensal: 65000,
    tetoDespesaMensal: 34000,
    volumeMensal: 110,
    clientesPessoaJuridica: false,
  },
  {
    id: "educacao",
    nome: "Educação & Cursos",
    descricao:
      "Escolas, cursos e mentorias. Receita majoritariamente recorrente com mensalidades e turmas.",
    labels: {
      cliente: "Aluno",
      clientes: "Alunos",
      atendimento: "Matrícula",
      atendimentos: "Matrículas",
      receitaOperacional: "Matrículas & mensalidades",
      servico: "Curso",
      servicos: "Cursos",
      profissional: "Professor(a)",
      profissionais: "Corpo docente",
    },
    papeis: ["Professor(a)", "Coordenador(a)", "Tutor(a)", "Secretaria"],
    centrosCusto: ["Ensino", "Secretaria", "Marketing", "Plataforma"],
    categoriasDespesa: [
      "Pessoal",
      "Estrutura",
      "Plataforma",
      "Material didático",
      "Marketing",
      "Impostos e taxas",
    ],
    origensCliente: ["Instagram", "Indicação", "Google", "Feira", "Renovação"],
    servicos: [
      { nome: "Mensalidade regular", categoria: "Recorrente", valorPadrao: 690, custoDireto: 45, duracaoMin: 0 },
      { nome: "Curso intensivo", categoria: "Cursos", valorPadrao: 2400, custoDireto: 280, duracaoMin: 0 },
      { nome: "Mentoria individual", categoria: "Mentoria", valorPadrao: 850, custoDireto: 0, duracaoMin: 60 },
      { nome: "Workshop", categoria: "Eventos", valorPadrao: 390, custoDireto: 60, duracaoMin: 240 },
      { nome: "Turma in company", categoria: "Corporativo", valorPadrao: 14000, custoDireto: 2200, duracaoMin: 0 },
      { nome: "Taxa de matrícula", categoria: "Matrícula", valorPadrao: 420, custoDireto: 30, duracaoMin: 0 },
    ],
    despesas: [
      { descricao: "Folha docente", categoria: "Pessoal", centroCusto: "Ensino", natureza: "fixo", valorBase: 38000, recorrente: true },
      { descricao: "Aluguel das salas", categoria: "Estrutura", centroCusto: "Ensino", natureza: "fixo", valorBase: 8900, recorrente: true },
      { descricao: "Plataforma EAD", categoria: "Plataforma", centroCusto: "Plataforma", natureza: "fixo", valorBase: 1800, recorrente: true },
      { descricao: "Contabilidade", categoria: "Impostos e taxas", centroCusto: "Secretaria", natureza: "fixo", valorBase: 950, recorrente: true },
      { descricao: "Material didático", categoria: "Material didático", centroCusto: "Ensino", natureza: "variavel", valorBase: 4200, recorrente: false },
      { descricao: "Campanha de captação", categoria: "Marketing", centroCusto: "Marketing", natureza: "variavel", valorBase: 7500, recorrente: false },
    ],
    aliquotaImpostos: 9,
    metaReceitaMensal: 150000,
    tetoDespesaMensal: 64000,
    volumeMensal: 50,
    clientesPessoaJuridica: false,
  },
  {
    id: "servicos",
    nome: "Serviços em geral",
    descricao:
      "Preset neutro para autônomos e pequenas empresas de serviço: arquitetura, TI, manutenção, contabilidade.",
    labels: {
      cliente: "Cliente",
      clientes: "Clientes",
      atendimento: "Serviço prestado",
      atendimentos: "Serviços prestados",
      receitaOperacional: "Serviços prestados",
      servico: "Serviço",
      servicos: "Catálogo de serviços",
      profissional: "Colaborador(a)",
      profissionais: "Equipe",
    },
    papeis: ["Titular", "Técnico(a)", "Assistente", "Administrativo"],
    centrosCusto: ["Operação", "Administrativo", "Comercial"],
    categoriasDespesa: [
      "Estrutura",
      "Pessoal",
      "Materiais",
      "Transporte",
      "Software",
      "Marketing",
      "Impostos e taxas",
    ],
    origensCliente: ["Indicação", "Site", "Redes sociais", "Marketplace", "Recorrente"],
    servicos: [
      { nome: "Visita técnica", categoria: "Sob demanda", valorPadrao: 450, custoDireto: 60, duracaoMin: 120 },
      { nome: "Contrato de manutenção", categoria: "Recorrente", valorPadrao: 1800, custoDireto: 180, duracaoMin: 0 },
      { nome: "Projeto sob medida", categoria: "Projetos", valorPadrao: 9800, custoDireto: 1400, duracaoMin: 0 },
      { nome: "Orçamento e diagnóstico", categoria: "Sob demanda", valorPadrao: 280, custoDireto: 0, duracaoMin: 60 },
      { nome: "Suporte mensal", categoria: "Recorrente", valorPadrao: 950, custoDireto: 40, duracaoMin: 0 },
      { nome: "Hora técnica", categoria: "Sob demanda", valorPadrao: 190, custoDireto: 0, duracaoMin: 60 },
    ],
    despesas: [
      { descricao: "Aluguel e contas", categoria: "Estrutura", centroCusto: "Administrativo", natureza: "fixo", valorBase: 3200, recorrente: true },
      { descricao: "Folha da equipe", categoria: "Pessoal", centroCusto: "Operação", natureza: "fixo", valorBase: 11500, recorrente: true },
      { descricao: "Ferramentas e assinaturas", categoria: "Software", centroCusto: "Administrativo", natureza: "fixo", valorBase: 540, recorrente: true },
      { descricao: "Contabilidade", categoria: "Impostos e taxas", centroCusto: "Administrativo", natureza: "fixo", valorBase: 480, recorrente: true },
      { descricao: "Materiais e insumos", categoria: "Materiais", centroCusto: "Operação", natureza: "variavel", valorBase: 3600, recorrente: false },
      { descricao: "Combustível e deslocamento", categoria: "Transporte", centroCusto: "Operação", natureza: "variavel", valorBase: 1400, recorrente: false },
      { descricao: "Anúncios", categoria: "Marketing", centroCusto: "Comercial", natureza: "variavel", valorBase: 900, recorrente: false },
    ],
    aliquotaImpostos: 10,
    metaReceitaMensal: 48000,
    tetoDespesaMensal: 24000,
    volumeMensal: 22,
    clientesPessoaJuridica: false,
  },
];

export const SEGMENTO_PADRAO = "clinica";

export function getSegmento(id: string): Segmento {
  return SEGMENTOS.find((s) => s.id === id) ?? SEGMENTOS[0];
}
