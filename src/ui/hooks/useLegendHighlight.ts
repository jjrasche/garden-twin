import { useState, useCallback } from 'react';

/** Shared legend hover state for Recharts — dims non-hovered series. */
export function useLegendHighlight() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const onLegendEnter = useCallback((e: any) => {
    setHoveredKey(e?.dataKey ?? e?.value ?? null);
  }, []);

  const onLegendLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  /** Returns opacity for a given series key. 1.0 if no hover or if this is the hovered key, dimmed otherwise. */
  function seriesOpacity(key: string): { fillOpacity: number; strokeOpacity: number } {
    const dimmed = hoveredKey !== null && hoveredKey !== key;
    return {
      fillOpacity: dimmed ? 0.15 : 1,
      strokeOpacity: dimmed ? 0.2 : 1,
    };
  }

  return { hoveredKey, onLegendEnter, onLegendLeave, seriesOpacity };
}
