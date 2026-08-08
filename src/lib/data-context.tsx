"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

const COLECOES = ["clientes", "servicos", "profissionais", "atendimentos", "transacoes"] as const;
type NomeColecao = (typeof COLECOES)[number];

/** Gerar 12 meses de histórico não é barato — memoriza por segmento. */
const cacheDemo = new Map<string, BaseDados>();
function baseDemo(segmentoId: string): BaseDados {
  const existente = cacheDemo.get(segmentoId);
  if (existente) return existente;
  const nova = gerarBaseDemo(segmentoId);
  cacheDemo.set(segmentoId, nova);
  return nova;
}

interface Crud<T extends { id: string }> {
  add: (item: Omit<T, "id">) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
}

export interface DataContextValue extends BaseDados {
  config: Configuracao;
  segmento: Segmento;
  salvarConfig: (patch: Partial<Configuracao>) => void;
  clientesCrud: Crud<Cliente>;
  servicosCrud: Crud<Servico>;
  profissionaisCrud: Crud<Profissional>;
  atendimentosCrud: Crud<Atendimento>;
  transacoesCrud: Crud<Transacao>;
  /** Recria a base inteira com os dados de exemplo do segmento escolhido. */
  recarregarDemo: (segmentoId: string) => Promise<void>;
  limparTudo: () => Promise<void>;
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
  const [itens, setItens] = useLocalStorage<T[]>(`df:${chave}`, inicial);

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

function useDadosLocais() {
  const demo = baseDemo(SEGMENTO_PADRAO);
  const clientes = useColecaoLocal<Cliente>("clientes", demo.clientes);
  const servicos = useColecaoLocal<Servico>("servicos", demo.servicos);
  const profissionais = useColecaoLocal<Profissional>("profissionais", demo.profissionais);
  const atendimentos = useColecaoLocal<Atendimento>("atendimentos", demo.atendimentos);
  const transacoes = useColecaoLocal<Transacao>("transacoes", demo.transacoes);
  const [config, setConfig] = useLocalStorage<Configuracao>(
    "df:config",
    configuracaoPadrao(SEGMENTO_PADRAO)
  );

  const salvarConfig = useCallback(
    (patch: Partial<Configuracao>) => setConfig((prev) => ({ ...prev, ...patch })),
    [setConfig]
  );

  const recarregarDemo = useCallback(
    async (segmentoId: string) => {
      const base = gerarBaseDemo(segmentoId);
      cacheDemo.set(segmentoId, base);
      clientes.substituir(base.clientes);
      servicos.substituir(base.servicos);
      profissionais.substituir(base.profissionais);
      atendimentos.substituir(base.atendimentos);
      transacoes.substituir(base.transacoes);
      setConfig(configuracaoPadrao(segmentoId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setConfig]
  );

  const limparTudo = useCallback(async () => {
    clientes.substituir([]);
    servicos.substituir([]);
    profissionais.substituir([]);
    atendimentos.substituir([]);
    transacoes.substituir([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  operacoes: { colecao: NomeColecao; dados: Record<string, unknown> }[]
) {
  if (!db) return;
  const database = db;
  for (let i = 0; i < operacoes.length; i += 450) {
    const lote = writeBatch(database);
    for (const op of operacoes.slice(i, i + 450)) {
      const referencia = firestoreDoc(collection(database, op.colecao));
      lote.set(referencia, op.dados);
    }
    await lote.commit();
  }
}

async function apagarColecoes() {
  if (!db) return;
  const database = db;
  for (const nome of COLECOES) {
    const snapshot = await getDocs(collection(database, nome));
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

function useDadosFirestore(authReady: boolean, setOcupado: (v: boolean) => void) {
  const clientes = useFirestoreCollection<Cliente>("clientes", authReady);
  const servicos = useFirestoreCollection<Servico>("servicos", authReady);
  const profissionais = useFirestoreCollection<Profissional>("profissionais", authReady);
  const atendimentos = useFirestoreCollection<Atendimento>("atendimentos", authReady);
  const transacoes = useFirestoreCollection<Transacao>("transacoes", authReady);
  const configDoc = useFirestoreDoc<Configuracao>(
    ["configuracao", "workspace"],
    configuracaoPadrao(SEGMENTO_PADRAO),
    authReady
  );

  const semeado = useRef(false);

  const recarregarDemo = useCallback(
    async (segmentoId: string) => {
      setOcupado(true);
      try {
        await apagarColecoes();
        await gravarEmLotes(paraOperacoes(gerarBaseDemo(segmentoId)));
        configDoc.salvar(configuracaoPadrao(segmentoId));
      } finally {
        setOcupado(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setOcupado]
  );

  const limparTudo = useCallback(async () => {
    setOcupado(true);
    try {
      await apagarColecoes();
    } finally {
      setOcupado(false);
    }
  }, [setOcupado]);

  // Primeira execução: popula o Firestore com a base de demonstração.
  useEffect(() => {
    if (!authReady || !db || semeado.current || !clientes.carregado) return;
    semeado.current = true;
    if (clientes.items.length > 0 || atendimentos.items.length > 0) return;
    void recarregarDemo(configDoc.valor.segmentoId || SEGMENTO_PADRAO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, clientes.carregado, clientes.items.length, atendimentos.items.length]);

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
  // Só conversa com o Firestore depois que existe sessão — antes disso as
  // regras negariam a leitura de qualquer jeito.
  const { autenticado } = useAuth();
  const authReady = autenticado;
  const [ocupado, setOcupado] = useState(false);

  const locais = useDadosLocais();
  const remotos = useDadosFirestore(authReady, setOcupado);
  const dados = isFirebaseConfigured ? remotos : locais;

  // Os dados só existem no navegador; renderizar antes de montar causaria
  // divergência de hidratação (e formatação de moeda inconsistente).
  const montado = useMontado();

  const value = useMemo<DataContextValue>(
    () => ({
      clientes: dados.clientes,
      servicos: dados.servicos,
      profissionais: dados.profissionais,
      atendimentos: dados.atendimentos,
      transacoes: dados.transacoes,
      config: dados.config,
      segmento: getSegmento(dados.config.segmentoId),
      salvarConfig: dados.salvarConfig,
      clientesCrud: dados.clientesCrud,
      servicosCrud: dados.servicosCrud,
      profissionaisCrud: dados.profissionaisCrud,
      atendimentosCrud: dados.atendimentosCrud,
      transacoesCrud: dados.transacoesCrud,
      recarregarDemo: dados.recarregarDemo,
      limparTudo: dados.limparTudo,
      usandoFirebase: isFirebaseConfigured,
      pronto: montado && dados.carregado,
      ocupado,
    }),
    [dados, montado, ocupado]
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
