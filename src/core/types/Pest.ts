import { z } from 'zod';

/**
 * Pest — first-class garden threat.
 *
 * Independent of any crop or companion. Describes the organism itself:
 * what it is, when it's active, how to detect it.
 */
export const PestSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['insect', 'nematode', 'fungal', 'bacterial', 'mammal', 'bird']),
  /** Months when this pest is active in Zone 6a (1=Jan, 12=Dec). */
  active_months: z.array(z.number().int().min(1).max(12)),
  /** How to identify presence in the garden. */
  detection_method: z.string(),
  /** What damage looks like on affected crops. */
  damage_description: z.string(),
});

export type Pest = z.infer<typeof PestSchema>;

/**
 * CropVulnerability — pest → crop link.
 *
 * Describes how a specific pest damages a specific crop:
 * which plant parts, how severe, and during which growth stages.
 */
export const CropVulnerabilitySchema = z.object({
  pest_id: z.string(),
  crop_species_id: z.string(),
  damage_type: z.enum(['foliage', 'root', 'fruit', 'stem', 'whole_plant']),
  severity: z.enum(['cosmetic', 'yield_reducing', 'plant_killing']),
  /** Growth stages during which this crop is vulnerable. Empty = all stages. */
  vulnerable_stages: z.array(z.string()),
});

export type CropVulnerability = z.infer<typeof CropVulnerabilitySchema>;

/**
 * Mechanism by which a companion plant mitigates a pest.
 *
 * Each value maps to a distinct biological pathway with different
 * evidence quality and management requirements.
 */
export const CompanionMechanismSchema = z.enum([
  'visual_confusion',
  'chemical_repellent',
  'trap_crop',
  'predator_attraction',
  'nematode_suppression',
  'physical_barrier',
]);

export type CompanionMechanism = z.infer<typeof CompanionMechanismSchema>;

/**
 * CompanionBenefit — companion → pest link.
 *
 * How a companion species mitigates a specific pest. This is the
 * middle of the chain: Companion →(benefit)→ Pest →(vulnerability)→ Crop.
 *
 * The layout optimizer uses this chain: for each crop, find its
 * vulnerabilities, find companions that benefit against those pests,
 * score placements by coverage radius and efficacy.
 */
export const CompanionBenefitSchema = z.object({
  companion_species_id: z.string(),
  pest_id: z.string(),
  mechanism: CompanionMechanismSchema,
  /** Distance in inches from companion plant center where effect operates. */
  effective_radius_in: z.number().min(0),
  /** Evidence quality for this specific companion-pest claim. */
  efficacy: z.enum(['proven', 'probable', 'folklore']),
  /** Active management needed for benefit to work (e.g., "remove infested foliage weekly"). */
  management_required: z.string().optional(),
  /** Citation for this specific benefit claim. */
  source: z.string().optional(),
});

export type CompanionBenefit = z.infer<typeof CompanionBenefitSchema>;

// ---------------------------------------------------------------------------
// Query helpers — traverse the Companion → Pest → Crop chain
// ---------------------------------------------------------------------------

/** Find all pests that threaten a crop. */
export function findCropThreats(
  cropId: string,
  vulnerabilities: CropVulnerability[],
): CropVulnerability[] {
  return vulnerabilities.filter((v) => v.crop_species_id === cropId);
}

/** Find all companions that help against a pest. */
export function findCompanionsForPest(
  pestId: string,
  benefits: CompanionBenefit[],
): CompanionBenefit[] {
  return benefits.filter((b) => b.pest_id === pestId);
}

/** Find all companions that protect a given crop (full chain traversal). */
export function findProtectorsForCrop(
  cropId: string,
  vulnerabilities: CropVulnerability[],
  benefits: CompanionBenefit[],
): Array<{ vulnerability: CropVulnerability; benefit: CompanionBenefit }> {
  const threats = findCropThreats(cropId, vulnerabilities);
  const results: Array<{ vulnerability: CropVulnerability; benefit: CompanionBenefit }> = [];

  for (const vuln of threats) {
    for (const ben of findCompanionsForPest(vuln.pest_id, benefits)) {
      results.push({ vulnerability: vuln, benefit: ben });
    }
  }

  return results;
}
