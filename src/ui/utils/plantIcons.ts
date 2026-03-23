/**
 * Plant Icons Utility
 *
 * Maps species IDs to visual icons for rendering.
 * Currently uses emoji icons; v2 will use sprite sheets for better performance.
 */

const PLANT_ICONS: Record<string, string> = {
  // Corn varieties
  'corn_wapsie_valley': '🌽',
  'corn_golden_bantam': '🌽',
  'corn_stowells_evergreen': '🌽',
  'corn_dent': '🌽',
  'corn_nothstine_dent': '🌽',

  // Tomato varieties
  'tomato_better_boy': '🍅',
  'tomato_beefsteak': '🍅',
  'tomato_cherry': '🍅',
  'tomato_san_marzano': '🍅',
  'tomato_sun_gold': '🍅',
  'tomato_amish_paste': '🍅',

  // Potato varieties
  'potato_russet_burbank': '🥔',
  'potato_red_norland': '🥔',
  'potato_yukon_gold': '🥔',
  'potato_kennebec': '🥔',

  // Lettuce varieties
  'lettuce_romaine': '🥬',
  'lettuce_butterhead': '🥬',
  'lettuce_iceberg': '🥬',
  'lettuce_nevada': '🥬',
  'lettuce_bss': '🥬',

  // Greens
  'kale_red_russian': '🥬',
  'spinach_bloomsdale': '🥬',

  // Bean varieties
  'bean_pole': '🫘',

  // Squash varieties
  'squash_winter': '🎃',

  // Companion plants
  'marigold_french': '🌼',
  'nasturtium': '🌺',
  'calendula': '🌼',
  'catnip': '🌿',

  // Herbs
  'mint_spearmint': '🌿',
  'parsley_italian': '🌿',
  'cilantro_slow_bolt': '🌿',

  // Other vegetables
  'carrot': '🥕',
  'onion': '🧅',
  'pepper': '🫑',
  'cucumber': '🥒',
  'squash': '🫛',
  'pumpkin': '🎃',
  'zucchini': '🥒',

  // Default fallback
  default: '🌱'
};

/**
 * Get icon for a plant species
 *
 * @param speciesId - Species ID (e.g., "corn_wapsie_valley")
 * @returns Emoji icon character
 */
export function getPlantIcon(speciesId: string): string {
  return PLANT_ICONS[speciesId] || PLANT_ICONS.default || '🌱';
}

/**
 * Draw plant icon on canvas
 *
 * @param ctx - Canvas 2D context
 * @param speciesId - Species ID
 * @param pos - Screen position (pixels)
 * @param size - Icon size in pixels
 */
export function drawPlantIcon(
  ctx: CanvasRenderingContext2D,
  speciesId: string,
  pos: { x: number; y: number },
  size: number
) {
  const emoji = getPlantIcon(speciesId);

  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw emoji centered at position
  ctx.fillText(emoji, pos.x, pos.y);
}

/**
 * Get color for a plant species (fallback when icons too small)
 *
 * @param speciesId - Species ID
 * @returns CSS color string
 */
export function getPlantColor(speciesId: string): string {
  // Simple color mapping by plant family
  if (speciesId.startsWith('corn')) return '#FBBF24'; // amber-400
  if (speciesId.startsWith('tomato')) return '#EF4444'; // red-500
  if (speciesId.startsWith('potato')) return '#A78BFA'; // purple-400
  if (speciesId.startsWith('lettuce')) return '#86EFAC'; // green-300 (light green)
  if (speciesId.startsWith('carrot')) return '#FB923C'; // orange-400
  if (speciesId.startsWith('onion')) return '#FDE047'; // yellow-300
  if (speciesId.startsWith('pepper')) return '#22C55E'; // green-500
  if (speciesId.startsWith('cucumber')) return '#10B981'; // green-500
  if (speciesId.startsWith('kale')) return '#2DD4BF'; // teal-400
  if (speciesId.startsWith('spinach')) return '#166534'; // green-800 (dark leafy)
  if (speciesId.startsWith('marigold')) return '#FF8C00'; // dark orange
  if (speciesId.startsWith('nasturtium')) return '#FF6347'; // tomato-red-orange
  if (speciesId.startsWith('calendula')) return '#FFD700'; // gold
  if (speciesId.startsWith('catnip')) return '#6B8E23'; // olive drab
  if (speciesId.startsWith('mint')) return '#3CB371'; // medium sea green
  if (speciesId.startsWith('parsley')) return '#228B22'; // forest green
  if (speciesId.startsWith('cilantro')) return '#32CD32'; // lime green
  if (speciesId.startsWith('bean')) return '#65A30D'; // lime-600
  if (speciesId.startsWith('squash')) return '#F59E0B'; // amber-500
  if (speciesId.startsWith('pumpkin')) return '#F97316'; // orange-500

  // Default green
  return '#22C55E'; // green-500
}

// ── Stage-based color modulation ─────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

function scaleColor(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * factor, g * factor, b * factor);
}

function desaturate(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = amount; // 0 = original, 1 = full gray
  return toHex(r + (gray - r) * t, g + (gray - g) * t, b + (gray - b) * t);
}

/** Species color modulated by growth stage and lifecycle. */
export function getStageColor(speciesId: string, stage: string, lifecycle: string): string {
  if (lifecycle === 'dead' || lifecycle === 'pulled') return desaturate(scaleColor(getPlantColor(speciesId), 0.3), 0.8);
  if (lifecycle === 'senescent') return desaturate(scaleColor(getPlantColor(speciesId), 0.5), 0.5);
  if (lifecycle === 'stressed') return scaleColor(getPlantColor(speciesId), 0.7);

  const base = getPlantColor(speciesId);
  switch (stage) {
    case 'seed':        return scaleColor(base, 0.2);
    case 'germinated':  return scaleColor(base, 0.35);
    case 'vegetative':  return scaleColor(base, 0.6);
    case 'flowering':   return scaleColor(base, 0.85);
    case 'fruiting':    return base;
    case 'harvest':     return base;
    case 'done':        return desaturate(scaleColor(base, 0.25), 0.7);
    default:            return base;
  }
}
