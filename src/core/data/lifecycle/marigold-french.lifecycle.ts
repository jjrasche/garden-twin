import { LifecycleSpec } from '../../types/LifecycleSpec';

/** French marigold — direct sow alongside tomato transplant for whitefly deterrence via limonene. */
export const MARIGOLD_FRENCH_LIFECYCLE: LifecycleSpec = {
  species_id: 'marigold_french',
  activities: [
    {
      activity_id: 'direct_sow',
      name: 'Direct sow seeds',
      task_type: 'sow',
      trigger: { type: 'days_after_planting', days: 0 },
      duration_minutes_per_plant: 0.25,
      duration_minutes_fixed: 10,
      equipment: [],
      skill_level: 'beginner',
      labor_type: 'manual',
      instructions: 'Sow seeds 1/4" deep at spacing marks after last frost. Water gently. Germinates in 5-7 days. Plant alongside tomatoes for whitefly deterrence.',
      priority: 5,
    },
    {
      activity_id: 'deadhead',
      name: 'Deadhead spent blooms',
      task_type: 'prune',
      trigger: { type: 'growth_stage', stage: 'flowering' },
      recurrence: { interval_days: 14, end_condition: 'frost' },
      duration_minutes_per_plant: 0.25,
      duration_minutes_fixed: 5,
      equipment: [],
      skill_level: 'beginner',
      labor_type: 'either',
      instructions: 'Pinch or snip spent flower heads to encourage continuous blooming and limonene production.',
      priority: 3,
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
      instructions: 'Pull dead plants after frost. Compost.',
      priority: 2,
    },
  ],
};
