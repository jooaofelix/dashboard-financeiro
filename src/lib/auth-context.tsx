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
  GoogleAuthProvider,
  User,
  linkWithPopup,
  reauthenticateWithPopup,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  entrarComGoogle: () => Promise<void>;
  /** O botão do Google só existe com Firebase: sem ele não há o que autenticar. */
  googleDisponivel: boolean;
  /**
   * Autorização da agenda, pedida à parte do login. Devolve o token de acesso,
   * que vive só em memória: guardá-lo no `localStorage` seria entregar acesso à
   * agenda do usuário a qualquer script injetado na página.
   */
  conectarAgenda: () => Promise<string>;
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
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login com o Google cancelado.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Libere o pop-up e tente de novo.";
    case "auth/account-exists-with-different-credential":
      return "Já existe uma conta com este e-mail criada por outro método. Entre com e-mail e senha.";
    case "auth/unauthorized-domain":
      return "Este domínio não está autorizado no Firebase Authentication.";
    case "auth/credential-already-in-use":
      return "Esta conta do Google já está vinculada a outro usuário da BASE.";
    case "auth/provider-already-linked":
      return "Esta conta do Google já está vinculada.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}

export class ErroDeAutenticacao extends Error {}

/** Permissão mínima para criar eventos — não dá acesso de leitura à agenda. */
const ESCOPO_AGENDA = "https://www.googleapis.com/auth/calendar.events";

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
      entrarComGoogle: () =>
        executar(() => {
          const provedor = new GoogleAuthProvider();
          // Sempre pedir a conta: sem isso o Google reusa a última sessão em
          // silêncio, e quem tem mais de uma conta não consegue trocar.
          provedor.setCustomParameters({ prompt: "select_account" });
          return signInWithPopup(auth!, provedor);
        }),
      googleDisponivel: true,
      conectarAgenda: async () => {
        const atual = auth?.currentUser;
        if (!atual) throw new ErroDeAutenticacao("Entre na sua conta primeiro.");

        const provedor = new GoogleAuthProvider();
        provedor.addScope(ESCOPO_AGENDA);
        provedor.setCustomParameters({ prompt: "consent" });

        try {
          // Quem já entrou com o Google reautentica; quem entrou por e-mail
          // vincula a conta. Um `signInWithPopup` aqui trocaria a sessão pela
          // conta do Google e derrubaria quem usa e-mail e senha.
          const jaEhGoogle = atual.providerData.some((p) => p.providerId === "google.com");
          const resultado = jaEhGoogle
            ? await reauthenticateWithPopup(atual, provedor)
            : await linkWithPopup(atual, provedor);

          const token = GoogleAuthProvider.credentialFromResult(resultado)?.accessToken;
          if (!token) {
            throw new ErroDeAutenticacao(
              "O Google não devolveu permissão para a agenda. Tente novamente."
            );
          }
          return token;
        } catch (erro) {
          if (erro instanceof ErroDeAutenticacao) throw erro;
          throw new ErroDeAutenticacao(mensagemDeErro(erro));
        }
      },
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
      entrarComGoogle: async () => {
        throw new ErroDeAutenticacao(
          "Entrar com o Google exige o Firebase configurado."
        );
      },
      googleDisponivel: false,
      conectarAgenda: async () => {
        throw new ErroDeAutenticacao(
          "Conectar o Google Agenda exige o Firebase configurado. O arquivo .ics e o link do Google funcionam sem isso."
        );
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
