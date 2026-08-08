"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { firstDayOfMonth, todayISO } from "./format";
import {
  Periodo,
  PresetPeriodo,
  periodoAnterior,
  resolverPeriodo,
} from "./periodo";

/**
 * Um único filtro de período para o app inteiro: todas as telas leem a mesma
 * fatia de tempo, em vez de cada gráfico ter o seu recorte.
 */

interface EstadoPeriodo {
  preset: PresetPeriodo;
  inicio: string;
  fim: string;
}

interface PeriodoContextValue {
  preset: PresetPeriodo;
  periodo: Periodo;
  anterior: Periodo;
  definirPreset: (preset: PresetPeriodo) => void;
  definirIntervalo: (inicio: string, fim: string) => void;
}

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

export function PeriodoProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useLocalStorage<EstadoPeriodo>("df:periodo", {
    preset: "ultimos-6-meses",
    inicio: firstDayOfMonth(todayISO()),
    fim: todayISO(),
  });

  const definirPreset = useCallback(
    (preset: PresetPeriodo) => {
      const resolvido = resolverPeriodo(preset, { inicio: estado.inicio, fim: estado.fim });
      setEstado({ preset, inicio: resolvido.inicio, fim: resolvido.fim });
    },
    [estado.inicio, estado.fim, setEstado]
  );

  const definirIntervalo = useCallback(
    (inicio: string, fim: string) => {
      setEstado({
        preset: "personalizado",
        inicio,
        fim: fim < inicio ? inicio : fim,
      });
    },
    [setEstado]
  );

  const value = useMemo<PeriodoContextValue>(() => {
    const periodo = resolverPeriodo(estado.preset, {
      inicio: estado.inicio,
      fim: estado.fim,
    });
    return {
      preset: estado.preset,
      periodo,
      anterior: periodoAnterior(periodo),
      definirPreset,
      definirIntervalo,
    };
  }, [estado, definirPreset, definirIntervalo]);

  return <PeriodoContext.Provider value={value}>{children}</PeriodoContext.Provider>;
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error("usePeriodo deve ser usado dentro de PeriodoProvider");
  return ctx;
}
