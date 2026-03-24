import { LifecycleSpec } from '../../types/LifecycleSpec';

/** Calendula — direct sow or 3-4 week block start. Beneficial insect attractor, mild pest deterrent. */
export const CALENDULA_ALPHA_LIFECYCLE: LifecycleSpec = {
  species_id: 'calendula_alpha',
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
      instructions: 'Sow seeds 1/4" deep at spacing marks. Can tolerate light frost. Germinates in 7-14 days. Self-sows readily.',
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
      instructions: 'Pinch spent flowers to promote continuous blooming. Save some seed heads for next year if desired.',
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
      instructions: 'Pull dead plants. Leave some seed heads on ground for self-seeding if desired.',
      priority: 2,
    },
  ],
};
