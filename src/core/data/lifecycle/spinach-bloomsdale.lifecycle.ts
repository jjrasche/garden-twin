import { LifecycleSpec } from '../../types/LifecycleSpec';
import {
  HOE_FURROW, PRESS_SEEDS, COVER_AND_FIRM, WATER_IN_ROW,
  SNIP_THIN, WALK_ROW_INSPECT,
  GATHER_HARVEST_GEAR, CUT_OUTER_LEAVES, SWAP_BASKET, RINSE_AND_STORE,
} from './shared-steps';

export const SPINACH_BLOOMSDALE_LIFECYCLE: LifecycleSpec = {
  species_id: 'spinach_bloomsdale',
  activities: [
    {
      activity_id: 'direct_sow',
      name: 'Direct sow seeds',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: 0 },
      steps: [
        HOE_FURROW,
        { ...PRESS_SEEDS, instructions: 'Press 2 seeds per station at 6" spacing, 1/2" deep. Spinach prefers cool soil (45-65F).' },
        COVER_AND_FIRM,
        WATER_IN_ROW,
      ],
      equipment: ['hoe', 'rake'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 9,
    },
    {
      activity_id: 'thin',
      name: 'Thin seedlings',
      task_type: 'thin',
      trigger: { type: 'growth_stage', stage: 'vegetative' },
      steps: [
        WALK_ROW_INSPECT,
        { ...SNIP_THIN, instructions: 'Snip weaker of each pair at soil level when 3-4 true leaves show. Do not pull.' },
      ],
      equipment: ['scissors'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 5,
    },
    {
      activity_id: 'harvest_cut',
      name: 'Harvest (cut)',
      task_type: 'harvest',
      trigger: { type: 'plant_flag', flag: 'is_harvestable' },
      steps: [
        GATHER_HARVEST_GEAR,
        { ...CUT_OUTER_LEAVES, instructions: 'Cut outer leaves 1" above crown. Leave inner rosette to regrow. Harvest in morning for best crispness.' },
        SWAP_BASKET,
        RINSE_AND_STORE,
      ],
      equipment: ['harvest knife', 'harvest bucket'],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 8,
    },
    {
      activity_id: 'pull_bolted',
      name: 'Pull bolted plants',
      task_type: 'weed',
      trigger: { type: 'growth_stage', stage: 'done' },
      steps: [
        { name: 'Pull plant', scale: 'plant', minutes: 0.083, instructions: 'Grab at base, pull and shake off soil. Toss to compost pile.' },
        { name: 'Rake bed smooth', scale: 'row', minutes: 2, instructions: 'Rake bed after pulling. Bed is now free for fall replanting.' },
      ],
      equipment: ['rake'],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 4,
    },
  ],
};
