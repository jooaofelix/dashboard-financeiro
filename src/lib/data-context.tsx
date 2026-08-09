"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  collection,
  getDocs,
  writeBatch,
  doc as firestoreDoc,
} from "firebase/firestore";
import { useLocalStorage } from "./use-local-storage";
import { useFirestoreCollection } from "./use-firestore-collection";
import { useFirestoreDoc } from "./use-firestore-doc";
import { useAuth } from "./auth-context";
import { configuracaoPadrao, gerarBaseDemo } from "./demo-data";
import { getSegmento, Segmento, SEGMENTO_PADRAO } from "./segments";
import {
  Atendimento,
  BaseDados,
  Cliente,
  Configuracao,
  Profissional,
  Servico,
  Transacao,
} from "./types";
import { db, isFirebaseConfigured } from "./firebase";
import { useMontado } from "./use-montado";

/**
 * Multi-inquilino: cada conta tem o próprio workspace, isolado de todas as
 * outras.
 *
 * - **Firestore**: `usuarios/{uid}` guarda perfil e configuração, e as coleções
 *   ficam abaixo dele (`usuarios/{uid}/atendimentos`, ...). As regras casam o
 *   `uid` do caminho com o da sessão, então o isolamento é garantido no
 *   servidor, não só no cliente.
 * - **Local**: as chaves do `localStorage` levam o id da sessão, para duas
 *   contas no mesmo navegador não enxergarem uma a outra.
 */

const COLECOES = ["clientes", "servicos", "profissionais", "atendimentos", "transacoes"] as const;
type NomeColecao = (typeof COLECOES)[number];

export function caminhoWorkspace(uid: string) {
  return `usuarios/${uid}`;
}

interface Crud<T extends { id: string }> {
  add: (item: Omit<T, "id">) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
}

/** Referência estável: um `[]` novo a cada render invalidaria o cache do hook. */
const VAZIO: never[] = [];

const CRUD_INERTE: Crud<{ id: string }> = {
  add: () => {},
  update: () => {},
  remove: () => {},
};

export interface DataContextValue extends BaseDados {
  config: Configuracao;
  segmento: Segmento;
  salvarConfig: (patch: Partial<Configuracao>) => void;
  clientesCrud: Crud<Cliente>;
  servicosCrud: Crud<Servico>;
  profissionaisCrud: Crud<Profissional>;
  atendimentosCrud: Crud<Atendimento>;
  transacoesCrud: Crud<Transacao>;
  /** Recria a base do workspace atual com os dados de exemplo do segmento. */
  recarregarDemo: (segmentoId: string) => Promise<void>;
  limparTudo: () => Promise<void>;
  /** Workspace ainda não configurado: a tela de boas-vindas assume. */
  precisaOnboarding: boolean;
  concluirOnboarding: (opcoes: {
    segmentoId: string;
    empresa: string;
    comExemplo: boolean;
    /** Parâmetros financeiros e plano de crescimento definidos nas boas-vindas. */
    parametros?: Partial<Configuracao>;
  }) => Promise<void>;
  usandoFirebase: boolean;
  pronto: boolean;
  ocupado: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

function gerarId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* -------------------------------------------------------------------------- */
/* Modo local (localStorage)                                                   */
/* -------------------------------------------------------------------------- */

function useColecaoLocal<T extends { id: string }>(chave: string, inicial: T[]) {
  const [itens, setItens] = useLocalStorage<T[]>(chave, inicial);

  const crud = useMemo<Crud<T>>(
    () => ({
      add: (item) => setItens((prev) => [...prev, { ...item, id: gerarId() } as T]),
      update: (id, patch) =>
        setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
      remove: (id) => setItens((prev) => prev.filter((i) => i.id !== id)),
    }),
    [setItens]
  );

  return { itens, crud, substituir: setItens };
}

function useDadosLocais(uid: string | null) {
  // Sem sessão a chave é descartável: o conteúdo nunca chega à tela porque o
  // AppShell só monta o app autenticado.
  const prefixo = `base:${uid ?? "anonimo"}`;

  // Workspace novo nasce vazio nos dois modos. Quem decide se entra com a base
  // de exemplo é o onboarding — encher a conta de alguém com dados fictícios
  // sem perguntar não é aceitável num produto de verdade.
  const clientes = useColecaoLocal<Cliente>(`${prefixo}:clientes`, VAZIO as Cliente[]);
  const servicos = useColecaoLocal<Servico>(`${prefixo}:servicos`, VAZIO as Servico[]);
  const profissionais = useColecaoLocal<Profissional>(
    `${prefixo}:profissionais`,
    VAZIO as Profissional[]
  );
  const atendimentos = useColecaoLocal<Atendimento>(
    `${prefixo}:atendimentos`,
    VAZIO as Atendimento[]
  );
  const transacoes = useColecaoLocal<Transacao>(`${prefixo}:transacoes`, VAZIO as Transacao[]);
  const [config, setConfig] = useLocalStorage<Configuracao>(
    `${prefixo}:config`,
    configuracaoPadrao(SEGMENTO_PADRAO)
  );

  const salvarConfig = useCallback(
    (patch: Partial<Configuracao>) => setConfig((prev) => ({ ...prev, ...patch })),
    [setConfig]
  );

  const recarregarDemo = useCallback(
    async (segmentoId: string) => {
      const base = gerarBaseDemo(segmentoId);
      clientes.substituir(base.clientes);
      servicos.substituir(base.servicos);
      profissionais.substituir(base.profissionais);
      atendimentos.substituir(base.atendimentos);
      transacoes.substituir(base.transacoes);
      // Mesma semântica do Firestore (merge): recarregar o exemplo troca os
      // padrões do segmento, mas não apaga o nome do negócio nem a marca de
      // onboarding — senão limpar a base depois jogaria o usuário de volta na
      // tela de boas-vindas.
      setConfig((anterior) => ({
        ...configuracaoPadrao(segmentoId, base),
        empresa: anterior.empresa || configuracaoPadrao(segmentoId).empresa,
        onboardingConcluido: anterior.onboardingConcluido,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setConfig, prefixo]
  );

  const limparTudo = useCallback(async () => {
    clientes.substituir([]);
    servicos.substituir([]);
    profissionais.substituir([]);
    atendimentos.substituir([]);
    transacoes.substituir([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefixo]);

  return {
    clientes: clientes.itens,
    servicos: servicos.itens,
    profissionais: profissionais.itens,
    atendimentos: atendimentos.itens,
    transacoes: transacoes.itens,
    config,
    salvarConfig,
    clientesCrud: clientes.crud,
    servicosCrud: servicos.crud,
    profissionaisCrud: profissionais.crud,
    atendimentosCrud: atendimentos.crud,
    transacoesCrud: transacoes.crud,
    recarregarDemo,
    limparTudo,
    carregado: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Modo Firestore                                                              */
/* -------------------------------------------------------------------------- */

/** O Firestore aceita no máximo 500 operações por lote. */
async function gravarEmLotes(
  raiz: string,
  operacoes: { colecao: NomeColecao; dados: Record<string, unknown> }[]
) {
  if (!db) return;
  const database = db;
  for (let i = 0; i < operacoes.length; i += 450) {
    const lote = writeBatch(database);
    for (const op of operacoes.slice(i, i + 450)) {
      const referencia = firestoreDoc(collection(database, `${raiz}/${op.colecao}`));
      lote.set(referencia, op.dados);
    }
    await lote.commit();
  }
}

async function apagarColecoes(raiz: string) {
  if (!db) return;
  const database = db;
  for (const nome of COLECOES) {
    const snapshot = await getDocs(collection(database, `${raiz}/${nome}`));
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const lote = writeBatch(database);
      for (const d of docs.slice(i, i + 450)) lote.delete(d.ref);
      await lote.commit();
    }
  }
}

function semUndefined<T extends object>(objeto: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  );
}

function paraOperacoes(base: BaseDados) {
  const operacoes: { colecao: NomeColecao; dados: Record<string, unknown> }[] = [];
  for (const nome of COLECOES) {
    for (const item of base[nome] as { id: string }[]) {
      const { id: _ignorado, ...resto } = item;
      void _ignorado;
      operacoes.push({ colecao: nome, dados: semUndefined(resto) });
    }
  }
  return operacoes;
}

function useDadosFirestore(uid: string | null, setOcupado: (v: boolean) => void) {
  const raiz = uid ? caminhoWorkspace(uid) : null;

  const clientes = useFirestoreCollection<Cliente>(raiz && `${raiz}/clientes`);
  const servicos = useFirestoreCollection<Servico>(raiz && `${raiz}/servicos`);
  const profissionais = useFirestoreCollection<Profissional>(
    raiz && `${raiz}/profissionais`
  );
  const atendimentos = useFirestoreCollection<Atendimento>(raiz && `${raiz}/atendimentos`);
  const transacoes = useFirestoreCollection<Transacao>(raiz && `${raiz}/transacoes`);
  const configDoc = useFirestoreDoc<Configuracao>(
    raiz,
    configuracaoPadrao(SEGMENTO_PADRAO)
  );

  const recarregarDemo = useCallback(
    async (segmentoId: string) => {
      if (!raiz) return;
      setOcupado(true);
      try {
        const base = gerarBaseDemo(segmentoId);
        await apagarColecoes(raiz);
        await gravarEmLotes(raiz, paraOperacoes(base));
        configDoc.salvar(configuracaoPadrao(segmentoId, base));
      } finally {
        setOcupado(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raiz, setOcupado]
  );

  const limparTudo = useCallback(async () => {
    if (!raiz) return;
    setOcupado(true);
    try {
      await apagarColecoes(raiz);
    } finally {
      setOcupado(false);
    }
  }, [raiz, setOcupado]);

  return {
    clientes: clientes.items,
    servicos: servicos.items,
    profissionais: profissionais.items,
    atendimentos: atendimentos.items,
    transacoes: transacoes.items,
    config: configDoc.valor,
    salvarConfig: configDoc.salvar,
    clientesCrud: clientes.crud,
    servicosCrud: servicos.crud,
    profissionaisCrud: profissionais.crud,
    atendimentosCrud: atendimentos.crud,
    transacoesCrud: transacoes.crud,
    recarregarDemo,
    limparTudo,
    carregado: clientes.carregado && configDoc.carregado,
  };
}

/* -------------------------------------------------------------------------- */

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const uid = usuario?.uid ?? null;
  const [ocupado, setOcupado] = useState(false);

  const locais = useDadosLocais(uid);
  const remotos = useDadosFirestore(uid, setOcupado);
  const dados = isFirebaseConfigured ? remotos : locais;

  // Os dados só existem no navegador; renderizar antes de montar causaria
  // divergência de hidratação (e formatação de moeda inconsistente).
  const montado = useMontado();

  const semDados =
    dados.clientes.length === 0 &&
    dados.atendimentos.length === 0 &&
    dados.transacoes.length === 0;

  /**
   * Só pede configuração inicial quando o workspace nunca foi configurado *e*
   * está vazio. A segunda condição protege quem já usava o sistema antes da
   * tela existir: com dados lá dentro, ninguém é mandado para o onboarding.
   */
  const precisaOnboarding =
    montado && uid !== null && dados.carregado && !dados.config.onboardingConcluido && semDados;

  const concluirOnboarding = useCallback(
    async ({
      segmentoId,
      empresa,
      comExemplo,
      parametros,
    }: {
      segmentoId: string;
      empresa: string;
      comExemplo: boolean;
      parametros?: Partial<Configuracao>;
    }) => {
      // A base de exemplo entra antes: `recarregarDemo` reescreve a
      // configuração com os padrões do segmento, então o nome da empresa, os
      // parâmetros escolhidos e a marca de concluído precisam vir depois para
      // não serem sobrescritos.
      if (comExemplo) await dados.recarregarDemo(segmentoId);
      dados.salvarConfig({
        ...(comExemplo ? {} : configuracaoPadrao(segmentoId)),
        ...parametros,
        segmentoId,
        empresa: empresa.trim(),
        onboardingConcluido: true,
      });
    },
    [dados]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      // Sem sessão nada é exposto — nem o resíduo do último workspace aberto.
      clientes: uid ? dados.clientes : [],
      servicos: uid ? dados.servicos : [],
      profissionais: uid ? dados.profissionais : [],
      atendimentos: uid ? dados.atendimentos : [],
      transacoes: uid ? dados.transacoes : [],
      config: dados.config,
      segmento: getSegmento(dados.config.segmentoId),
      salvarConfig: uid ? dados.salvarConfig : () => {},
      clientesCrud: uid ? dados.clientesCrud : (CRUD_INERTE as Crud<Cliente>),
      servicosCrud: uid ? dados.servicosCrud : (CRUD_INERTE as Crud<Servico>),
      profissionaisCrud: uid
        ? dados.profissionaisCrud
        : (CRUD_INERTE as Crud<Profissional>),
      atendimentosCrud: uid ? dados.atendimentosCrud : (CRUD_INERTE as Crud<Atendimento>),
      transacoesCrud: uid ? dados.transacoesCrud : (CRUD_INERTE as Crud<Transacao>),
      recarregarDemo: dados.recarregarDemo,
      limparTudo: dados.limparTudo,
      precisaOnboarding,
      concluirOnboarding,
      usandoFirebase: isFirebaseConfigured,
      pronto: montado && uid !== null && dados.carregado,
      ocupado,
    }),
    [dados, uid, montado, ocupado, precisaOnboarding, concluirOnboarding]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de DataProvider");
  return ctx;
}

/** Atalho para as telas que só precisam das coleções. */
export function useBase(): BaseDados {
  const { clientes, servicos, profissionais, atendimentos, transacoes } = useData();
  return useMemo(
    () => ({ clientes, servicos, profissionais, atendimentos, transacoes }),
    [clientes, servicos, profissionais, atendimentos, transacoes]
  );
}
