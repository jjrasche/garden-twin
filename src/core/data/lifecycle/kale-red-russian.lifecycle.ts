import { LifecycleSpec } from '../../types/LifecycleSpec';
import {
  FILL_BLOCKS, DROP_SEED, SETUP_TRAY,
  GATHER_TOOLS, CLEANUP, WATER_IN_ROW,
  GATHER_HARVEST_GEAR, CUT_OUTER_LEAVES, SWAP_BASKET, RINSE_AND_STORE,
} from './shared-steps';

export const KALE_RED_RUSSIAN_LIFECYCLE: LifecycleSpec = {
  species_id: 'kale_red_russian',
  activities: [
    {
      activity_id: 'start_seeds',
      name: 'Start seeds in soil blocks',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: -21 },  // 3 weeks in 2" soil block
      steps: [
        FILL_BLOCKS,
        { ...DROP_SEED, instructions: 'Place 1 kale seed per block indent, 1/4" deep. Cover lightly.' },
        SETUP_TRAY,
      ],
      equipment: ['soil block maker', 'seed starting mix', 'grow light', 'tray'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 7,
    },
    {
      activity_id: 'transplant',
      name: 'Transplant to garden',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: 0 },
      steps: [
        GATHER_TOOLS,
        { name: 'Dig hole and set transplant', scale: 'plant', minutes: 0.5, instructions: 'Dig hole at spacing marks. Set block at same depth. Firm soil around base.' },
        WATER_IN_ROW,
        CLEANUP,
      ],
      equipment: ['trowel', 'watering can'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 9,
    },
    {
      activity_id: 'harvest_cut',
      name: 'Harvest leaves (cut)',
      task_type: 'harvest',
      trigger: { type: 'plant_flag', flag: 'is_harvestable' },
      steps: [
        GATHER_HARVEST_GEAR,
        { ...CUT_OUTER_LEAVES, instructions: 'Cut outer leaves 2" above soil line, leaving growing center and 4-6 inner leaves. Take no more than 1/3 of foliage per cut.' },
        SWAP_BASKET,
        RINSE_AND_STORE,
      ],
      equipment: ['harvest knife', 'harvest bucket'],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 8,
    },
    {
      activity_id: 'pull_dead',
      name: 'Remove spent plants',
      task_type: 'weed',
      trigger: { type: 'growth_stage', stage: 'done' },
      steps: [
        { name: 'Cut at base and pull', scale: 'plant', minutes: 0.167, instructions: 'Pull or cut at base after final harvest. Compost stalks.' },
        CLEANUP,
      ],
      equipment: ['garden cart'],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 3,
    },
  ],
};
