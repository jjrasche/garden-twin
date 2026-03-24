import { LifecycleSpec } from '../../types/LifecycleSpec';

/** Trailing nasturtium — direct sow, trap crop for aphids. Large seeds, fast germination. */
export const NASTURTIUM_TRAILING_LIFECYCLE: LifecycleSpec = {
  species_id: 'nasturtium_trailing',
  activities: [
    {
      activity_id: 'direct_sow',
      name: 'Direct sow seeds',
      task_type: 'sow',
      trigger: { type: 'days_after_planting', days: 0 },
      duration_minutes_per_plant: 0.5,
      duration_minutes_fixed: 10,
      equipment: [],
      skill_level: 'beginner',
      labor_type: 'manual',
      instructions: 'Soak seeds overnight. Sow 1" deep at spacing marks after last frost. Large seeds, easy to handle. Germinates in 7-10 days. Prefers poor soil — do not fertilize.',
      priority: 5,
    },
    {
      activity_id: 'pull_dead',
      name: 'Remove after frost',
      task_type: 'weed',
      trigger: { type: 'growth_stage', stage: 'done' },
      duration_minutes_per_plant: 0.25,
      duration_minutes_fixed: 5,
      equipment: [],
      skill_level: 'beginner',
      labor_type: 'either',
      instructions: 'Pull dead vines after frost. Check for self-seeded seeds to save for next year.',
      priority: 2,
    },
  ],
};
