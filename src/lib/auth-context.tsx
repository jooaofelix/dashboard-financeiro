"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { useLocalStorage } from "./use-local-storage";
import { useMontado } from "./use-montado";

/**
 * Duas realidades sob a mesma interface:
 *
 * - **Com Firebase**: autenticação real (e-mail/senha ou convidado anônimo).
 * - **Sem Firebase**: um perfil guardado no navegador. Serve para avaliar o
 *   produto sem infraestrutura — e é apresentado como tal na tela, porque um
 *   cadeado que não tranca nada é pior do que nenhum.
 */

export interface Usuario {
  uid: string;
  email: string | null;
  nome: string | null;
  convidado: boolean;
}

interface AuthContextValue {
  usuario: Usuario | null;
  autenticado: boolean;
  carregando: boolean;
  /** `true` quando não há Firebase: a sessão é só local. */
  modoLocal: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  criarConta: (nome: string, email: string, senha: string) => Promise<void>;
  entrarComoConvidado: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** O Firebase devolve códigos; a tela precisa de português. */
function mensagemDeErro(erro: unknown): string {
  const codigo =
    typeof erro === "object" && erro !== null && "code" in erro
      ? String((erro as { code: string }).code)
      : "";

  switch (codigo) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com este e-mail.";
    case "auth/weak-password":
      return "A senha precisa de pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos.";
    case "auth/network-request-failed":
      return "Sem conexão com o servidor. Verifique sua internet.";
    case "auth/operation-not-allowed":
      return "Este método de login não está habilitado no Firebase.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}

export class ErroDeAutenticacao extends Error {}

function validarLocal(email: string, senha: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErroDeAutenticacao("E-mail inválido.");
  }
  if (senha.length < 6) {
    throw new ErroDeAutenticacao("A senha precisa de pelo menos 6 caracteres.");
  }
}

interface SessaoLocal {
  uid: string;
  email: string;
  nome: string | null;
  convidado: boolean;
}

/**
 * Identidade estável por e-mail: no modo local é ela que separa o workspace de
 * cada conta no mesmo navegador. Não é segredo nem credencial — só uma chave.
 */
function uidLocal(email: string) {
  return `local-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/* -------------------------------------------------------------------------- */

function useAuthFirebase(): AuthContextValue {
  const [usuarioFirebase, setUsuarioFirebase] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Assinatura de sistema externo — o setState acontece no callback do Firebase,
  // não no corpo do efeito.
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (atual) => {
      setUsuarioFirebase(atual);
      setCarregando(false);
    });
  }, []);

  const executar = useCallback(async (acao: () => Promise<unknown>) => {
    try {
      await acao();
    } catch (erro) {
      throw new ErroDeAutenticacao(mensagemDeErro(erro));
    }
  }, []);

  return useMemo<AuthContextValue>(() => {
    const usuario: Usuario | null = usuarioFirebase
      ? {
          uid: usuarioFirebase.uid,
          email: usuarioFirebase.email,
          nome: usuarioFirebase.displayName,
          convidado: usuarioFirebase.isAnonymous,
        }
      : null;

    return {
      usuario,
      autenticado: usuario !== null,
      carregando,
      modoLocal: false,
      entrar: (email, senha) =>
        executar(() => signInWithEmailAndPassword(auth!, email.trim(), senha)),
      criarConta: (nome, email, senha) =>
        executar(async () => {
          const credencial = await createUserWithEmailAndPassword(
            auth!,
            email.trim(),
            senha
          );
          if (nome.trim()) {
            await updateProfile(credencial.user, { displayName: nome.trim() });
            setUsuarioFirebase({ ...credencial.user });
          }
        }),
      entrarComoConvidado: () => executar(() => signInAnonymously(auth!)),
      recuperarSenha: (email) =>
        executar(() => sendPasswordResetEmail(auth!, email.trim())),
      sair: () => executar(() => signOut(auth!)),
    };
  }, [usuarioFirebase, carregando, executar]);
}

function useAuthLocal(): AuthContextValue {
  const [sessao, setSessao] = useLocalStorage<SessaoLocal | null>("df:sessao", null);
  const montado = useMontado();

  return useMemo<AuthContextValue>(() => {
    const usuario: Usuario | null = sessao
      ? {
          uid: sessao.uid,
          email: sessao.email,
          nome: sessao.nome,
          convidado: sessao.convidado,
        }
      : null;

    return {
      usuario,
      autenticado: usuario !== null,
      carregando: !montado,
      modoLocal: true,
      entrar: async (email, senha) => {
        const limpo = email.trim();
        validarLocal(limpo, senha);
        setSessao({ uid: uidLocal(limpo), email: limpo, nome: null, convidado: false });
      },
      criarConta: async (nome, email, senha) => {
        const limpo = email.trim();
        validarLocal(limpo, senha);
        setSessao({
          uid: uidLocal(limpo),
          email: limpo,
          nome: nome.trim() || null,
          convidado: false,
        });
      },
      entrarComoConvidado: async () => {
        setSessao({
          uid: "local-convidado",
          email: "convidado@base.local",
          nome: "Convidado",
          convidado: true,
        });
      },
      recuperarSenha: async () => {
        throw new ErroDeAutenticacao(
          "A recuperação de senha exige o Firebase configurado."
        );
      },
      sair: async () => setSessao(null),
    };
  }, [sessao, montado, setSessao]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const remoto = useAuthFirebase();
  const local = useAuthLocal();
  const valor = isFirebaseConfigured ? remoto : local;

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
