"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, HardDrive, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BaseMark, BaseWordmark } from "@/components/BaseLogo";
import CampoParticulas from "@/components/CampoParticulas";
import TaglineRotativa from "@/components/TaglineRotativa";
import ThemeToggle from "@/components/ThemeToggle";

type Modo = "entrar" | "criar" | "recuperar";

const TITULOS: Record<Modo, { acao: string; alternativa: string; link: string }> = {
  entrar: { acao: "Entrar", alternativa: "Ainda não tem conta?", link: "Criar conta" },
  criar: { acao: "Criar conta", alternativa: "Já tem conta?", link: "Entrar" },
  recuperar: { acao: "Enviar link de recuperação", alternativa: "Lembrou a senha?", link: "Entrar" },
};

/** Marca do Google, nas cores oficiais exigidas pelas diretrizes do botão. */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export default function EntrarPage() {
  const router = useRouter();
  const {
    entrar,
    criarConta,
    entrarComGoogle,
    googleDisponivel,
    entrarComoConvidado,
    recuperarSenha,
    modoLocal,
  } = useAuth();

  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function trocarModo(proximo: Modo) {
    setModo(proximo);
    setErro(null);
    setAviso(null);
  }

  /**
   * Validação no formulário, não no navegador: o balão nativo vem no idioma do
   * browser e com outra aparência. Com `noValidate` toda mensagem sai daqui, em
   * português e no mesmo estilo do resto da tela.
   */
  function validar(): string | null {
    if (modo === "criar" && !nome.trim()) return "Informe seu nome.";
    if (!email.trim()) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "E-mail inválido.";
    if (modo !== "recuperar") {
      if (!senha) return "Informe sua senha.";
      if (senha.length < 6) return "A senha precisa de pelo menos 6 caracteres.";
    }
    return null;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    const invalido = validar();
    if (invalido) {
      setErro(invalido);
      return;
    }

    setEnviando(true);
    try {
      if (modo === "entrar") {
        await entrar(email, senha);
        router.replace("/");
      } else if (modo === "criar") {
        await criarConta(nome, email, senha);
        router.replace("/");
      } else {
        await recuperarSenha(email);
        setAviso("Se existir uma conta com este e-mail, o link de recuperação foi enviado.");
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  /** Google e convidado seguem o mesmo caminho: autentica e entra. */
  async function entrarPor(acao: () => Promise<void>) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await acao();
      router.replace("/");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  const textos = TITULOS[modo];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-entrada px-5 py-12">
      <CampoParticulas />

      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
        {/* Selo da marca flutuando sobre o fundo. */}
        <div className="flex h-[104px] w-[104px] items-center justify-center rounded-[28px] bg-surface text-brand shadow-[0_18px_44px_-14px_rgb(11_127_224/0.45)]">
          <BaseMark size={54} />
        </div>

        <BaseWordmark tamanho="lg" className="mt-7 text-marca-tipo" />

        <TaglineRotativa className="mt-3" />

        <form onSubmit={enviar} noValidate className="mt-9 flex w-full flex-col gap-3.5">
          {modo === "criar" && (
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              aria-label="Seu nome"
              className="campo-entrada"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            autoComplete="email"
            aria-label="Seu e-mail"
            className="campo-entrada"
          />

          {modo !== "recuperar" && (
            <div className="relative">
              <input
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                autoComplete={modo === "criar" ? "new-password" : "current-password"}
                aria-label="Sua senha"
                className="campo-entrada pr-14"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-3 transition-colors hover:text-ink-2"
              >
                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {modo === "entrar" && (
            <button
              type="button"
              onClick={() => trocarModo("recuperar")}
              className="-mt-0.5 self-end text-sm font-semibold text-brand hover:underline"
            >
              Esqueci minha senha
            </button>
          )}

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-crit-soft px-4 py-3 text-sm text-crit-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {erro}
            </p>
          )}

          {aviso && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm text-good-ink"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
              {aviso}
            </p>
          )}

          <button type="submit" disabled={enviando} className="botao-entrada mt-1">
            {enviando ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              textos.acao
            )}
          </button>
        </form>

        <div className="my-6 flex w-full items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-3">ou</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex w-full flex-col gap-3">
          {googleDisponivel && (
            <button
              type="button"
              onClick={() => entrarPor(entrarComGoogle)}
              disabled={enviando}
              className="botao-entrada-secundario"
            >
              <LogoGoogle />
              Entrar com Google
            </button>
          )}

          <button
            type="button"
            onClick={() => entrarPor(entrarComoConvidado)}
            disabled={enviando}
            className="botao-entrada-secundario"
          >
            Entrar como convidado
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-ink-2">
          {textos.alternativa}{" "}
          <button
            type="button"
            onClick={() => trocarModo(modo === "entrar" ? "criar" : "entrar")}
            className="font-bold text-brand hover:underline"
          >
            {textos.link}
          </button>
        </p>

        {modoLocal && (
          <p className="mt-8 flex max-w-[340px] items-start gap-2 text-center text-xs leading-relaxed text-ink-3">
            <HardDrive size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span className="text-left">
              Modo demonstração: sem Firebase configurado, a sessão fica só neste
              navegador, não protege os dados de verdade e o login com Google
              fica indisponível.
            </span>
          </p>
        )}
      </div>
    </main>
  );
}
