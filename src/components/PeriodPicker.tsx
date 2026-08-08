"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { usePeriodo } from "@/lib/periodo-context";
import { PRESETS, PresetPeriodo } from "@/lib/periodo";
import { formatDate } from "@/lib/format";
import { Input } from "./ui";

export default function PeriodPicker() {
  const { preset, periodo, definirPreset, definirIntervalo } = usePeriodo();
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (!container.current?.contains(e.target as Node)) setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const rotulo =
    preset === "personalizado"
      ? `${formatDate(periodo.inicio)} – ${formatDate(periodo.fim)}`
      : periodo.label;

  return (
    <div ref={container} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <CalendarRange size={15} className="text-ink-3" aria-hidden />
        <span className="max-w-[190px] truncate">{rotulo}</span>
        <ChevronDown size={14} className="text-ink-3" aria-hidden />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Selecionar período"
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        >
          <ul className="p-1.5">
            {PRESETS.filter((p) => p.id !== "personalizado").map((opcao) => (
              <li key={opcao.id}>
                <button
                  onClick={() => {
                    definirPreset(opcao.id as PresetPeriodo);
                    setAberto(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
                >
                  {opcao.label}
                  {preset === opcao.id && (
                    <Check size={16} strokeWidth={2.5} className="text-brand" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-line bg-raised p-3">
            <p className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Personalizado
              {preset === "personalizado" && (
                <Check size={14} strokeWidth={2.5} className="text-brand" aria-hidden />
              )}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Data inicial"
                value={periodo.inicio}
                max={periodo.fim}
                onChange={(e) => definirIntervalo(e.target.value, periodo.fim)}
              />
              <span className="text-xs text-ink-3">até</span>
              <Input
                type="date"
                aria-label="Data final"
                value={periodo.fim}
                min={periodo.inicio}
                onChange={(e) => definirIntervalo(periodo.inicio, e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
