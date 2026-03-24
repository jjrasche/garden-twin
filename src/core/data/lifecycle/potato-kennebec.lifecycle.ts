import { LifecycleSpec } from '../../types/LifecycleSpec';
import { GATHER_TOOLS, CLEANUP, WATER_IN_ROW } from './shared-steps';

export const POTATO_KENNEBEC_LIFECYCLE: LifecycleSpec = {
  species_id: 'potato_kennebec',
  activities: [
    {
      activity_id: 'cut_seed',
      name: 'Cut seed potatoes',
      task_type: 'prepare',
      trigger: { type: 'days_after_planting', days: -1 },
      steps: [
        GATHER_TOOLS,
        { name: 'Cut seed pieces', scale: 'plant', minutes: 0.33, instructions: 'Cut so each piece has 2-3 eyes and weighs ~2 oz. Let cut faces dry overnight.' },
        CLEANUP,
      ],
      equipment: ['knife', 'cutting board'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 7,
    },
    {
      activity_id: 'plant',
      name: 'Plant seed pieces',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: 0 },
      steps: [
        { name: 'Dig trench', scale: 'row', minutes: 8, instructions: 'Dig 6" trench along row line with shovel.' },
        { name: 'Place seed pieces', scale: 'plant', minutes: 0.167, instructions: 'Place cut-side down, 12" apart in trench.' },
        { name: 'Cover with soil', scale: 'row', minutes: 4, instructions: 'Cover with 4" soil. Do not fill trench completely — leaves room for hilling.' },
        WATER_IN_ROW,
      ],
      equipment: ['shovel', 'rake'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 9,
    },
    {
      activity_id: 'hill_first',
      name: 'Hill (first)',
      task_type: 'mulch',
      trigger: { type: 'growth_stage', stage: 'vegetative' },
      steps: [
        { name: 'Mound soil around stems', scale: 'plant', minutes: 0.25, instructions: 'When sprouts are 8-10" tall, mound 4-6" of soil up stems from both sides. Bury lower leaves.' },
        { name: 'Rake and shape mound', scale: 'row', minutes: 3, instructions: 'Shape mound with hoe. Firm gently.' },
      ],
      equipment: ['hoe'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 7,
    },
    {
      activity_id: 'hill_second',
      name: 'Hill (second)',
      task_type: 'mulch',
      trigger: { type: 'growth_stage', stage: 'flowering' },
      steps: [
        { name: 'Mound additional soil', scale: 'plant', minutes: 0.25, instructions: 'Add another 4-6" around stems. Final hill should be 8-12" above original trench.' },
        { name: 'Rake and shape mound', scale: 'row', minutes: 3, instructions: 'Shape mound. Ensure no tubers are exposed to light.' },
      ],
      equipment: ['hoe'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 7,
    },
    {
      activity_id: 'harvest',
      name: 'Harvest tubers',
      task_type: 'harvest',
      trigger: { type: 'growth_stage', stage: 'harvest' },
      steps: [
        GATHER_TOOLS,
        { name: 'Fork and lever tubers', scale: 'plant', minutes: 1, instructions: 'Insert fork 12" from plant base. Lever up soil to expose tubers.' },
        { name: 'Hand-gather tubers', scale: 'plant', minutes: 0.5, instructions: 'Pick tubers by hand. Brush off loose dirt. Do not wash.' },
        { name: 'Load cart', scale: 'row', minutes: 3, instructions: 'Transfer buckets to cart.' },
        { name: 'Cure in dark space', scale: 'fixed', minutes: 15, instructions: 'Spread in dark ventilated space at 50-60F. Cure 2 weeks before long-term storage.' },
      ],
      equipment: ['digging fork', 'harvest bucket', 'garden cart'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 9,
    },
  ],
};
