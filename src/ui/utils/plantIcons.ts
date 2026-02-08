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

  // Tomato varieties
  'tomato_better_boy': '🍅',
  'tomato_beefsteak': '🍅',
  'tomato_cherry': '🍅',
  'tomato_san_marzano': '🍅',

  // Potato varieties
  'potato_russet_burbank': '🥔',
  'potato_red_norland': '🥔',
  'potato_yukon_gold': '🥔',

  // Lettuce varieties
  'lettuce_romaine': '🥬',
  'lettuce_butterhead': '🥬',
  'lettuce_iceberg': '🥬',
  'lettuce_nevada': '🥬',

  // Bean varieties
  'bean_pole': '🫘',

  // Squash varieties
  'squash_winter': '🎃',

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
  if (speciesId.startsWith('lettuce')) return '#34D399'; // emerald-400
  if (speciesId.startsWith('carrot')) return '#FB923C'; // orange-400
  if (speciesId.startsWith('onion')) return '#FDE047'; // yellow-300
  if (speciesId.startsWith('pepper')) return '#22C55E'; // green-500
  if (speciesId.startsWith('cucumber')) return '#10B981'; // green-500
  if (speciesId.startsWith('bean')) return '#65A30D'; // lime-600
  if (speciesId.startsWith('squash')) return '#F59E0B'; // amber-500
  if (speciesId.startsWith('pumpkin')) return '#F97316'; // orange-500

  // Default green
  return '#22C55E'; // green-500
}
