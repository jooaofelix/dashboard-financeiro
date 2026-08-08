"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { SEGMENTOS } from "@/lib/segments";
import { BaseMark, BaseWordmark } from "./BaseLogo";
import CampoParticulas from "./CampoParticulas";

/**
 * Configuração inicial do workspace, logo depois de criar a conta.
 *
 * O segmento é a decisão que molda o app inteiro (vocabulário, catálogo,
 * categorias, metas), então ela vem antes do primeiro uso — e não escondida nas
 * configurações, onde só seria encontrada por quem já sabia procurar.
 */
export default function Onboarding() {
  const { usuario } = useAuth();
  const { concluirOnboarding, ocupado } = useData();

  const [segmentoId, setSegmentoId] = useState(SEGMENTOS[0].id);
  const [empresa, setEmpresa] = useState("");
  const [comExemplo, setComExemplo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const primeiroNome = usuario?.nome?.split(" ")[0];

  async function concluir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!empresa.trim()) {
      setErro("Dê um nome ao seu negócio — ele aparece no menu e nos relatórios.");
      return;
    }
    setEnviando(true);
    try {
      await concluirOnboarding({ segmentoId, empresa, comExemplo });
    } catch {
      setErro("Não foi possível criar o workspace. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const ocupadoAgora = enviando || ocupado;

  return (
    <main className="relative min-h-screen overflow-hidden bg-entrada px-5 py-12">
      <CampoParticulas />

      <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-col items-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-surface shadow-[0_14px_34px_-12px_rgb(11_127_224/0.45)]">
          <BaseMark size={38} />
        </div>

        <BaseWordmark tamanho="md" className="mt-5 text-marca-tipo" />

        <h1 className="mt-6 text-center text-2xl font-semibold text-ink">
          {primeiroNome ? `Boas-vindas, ${primeiroNome}!` : "Boas-vindas!"}
        </h1>
        <p className="mt-2 max-w-[440px] text-center text-[15px] leading-relaxed text-ink-2">
          Escolha o tipo do seu negócio: a BASE ajusta o vocabulário, o catálogo
          de serviços e as categorias financeiras ao seu dia a dia.
        </p>

        <form onSubmit={concluir} noValidate className="mt-9 flex w-full flex-col gap-7">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ink">
              Qual é o seu negócio?
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SEGMENTOS.map((s) => {
                const ativo = s.id === segmentoId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSegmentoId(s.id)}
                    aria-pressed={ativo}
                    className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors ${
                      ativo
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{s.nome}</span>
                      {ativo && (
                        <Check size={16} strokeWidth={2.5} className="shrink-0 text-brand" />
                      )}
                    </span>
                    <span className="text-xs leading-relaxed text-ink-3">
                      {s.labels.cliente} · {s.labels.atendimento} · {s.labels.servico}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink">Nome do seu negócio</span>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ex: Clínica Núcleo Saúde"
              aria-label="Nome do seu negócio"
              className="campo-entrada"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
            <input
              type="checkbox"
              checked={comExemplo}
              onChange={(e) => setComExemplo(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[var(--brand)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Começar com dados de exemplo
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">
                Doze meses de operação fictícia para você explorar os relatórios
                antes de lançar o que é seu. Dá para apagar tudo depois em
                Configurações › Dados.
              </span>
            </span>
          </label>

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-crit-soft px-4 py-3 text-sm text-crit-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {erro}
            </p>
          )}

          <button type="submit" disabled={ocupadoAgora} className="botao-entrada">
            {ocupadoAgora ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Preparando seu workspace…
              </>
            ) : (
              "Criar meu workspace"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
