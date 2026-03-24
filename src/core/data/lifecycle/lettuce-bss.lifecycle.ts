import { LifecycleSpec } from '../../types/LifecycleSpec';
import {
  HOE_FURROW, PRESS_SEEDS, COVER_AND_FIRM, WATER_IN_ROW,
  SNIP_THIN, WALK_ROW_INSPECT,
  GATHER_HARVEST_GEAR, CUT_OUTER_LEAVES, SWAP_BASKET, RINSE_AND_STORE,
} from './shared-steps';

export const LETTUCE_BSS_LIFECYCLE: LifecycleSpec = {
  species_id: 'lettuce_bss',
  activities: [
    {
      activity_id: 'prepare_bed',
      name: 'Prepare bed',
      task_type: 'mulch',
      trigger: { type: 'days_after_planting', days: -1 },
      steps: [
        { name: 'Rake bed smooth', scale: 'row', minutes: 3, instructions: 'Rake bed smooth. Remove debris and large clods.' },
        WATER_IN_ROW,
      ],
      equipment: ['rake'],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 6,
    },
    {
      activity_id: 'direct_sow',
      name: 'Direct sow seeds',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: 0 },
      steps: [
        HOE_FURROW,
        { ...PRESS_SEEDS, instructions: 'Press 2 seeds per station at 6" spacing. Push into surface only — lettuce needs light to germinate. Do not cover more than 1/8" deep.' },
        { name: 'Mist gently', scale: 'row', minutes: 2, instructions: 'Water with fine mist. Do not flood — seeds will wash away.' },
      ],
      equipment: ['hoe'],
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
        { ...SNIP_THIN, instructions: 'When 2-3 true leaves show, snip weaker of each pair at soil level. Do not pull.' },
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
        { ...CUT_OUTER_LEAVES, instructions: 'Cut outer leaves 1" above soil, leaving growing center intact. Take outer ring only. Harvest in morning for best crispness.' },
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
        { name: 'Pull plant', scale: 'plant', minutes: 0.083, instructions: 'When central stem elongates and flower buds appear, plant is bolted. Pull and compost.' },
        { name: 'Rake bed smooth', scale: 'row', minutes: 2, instructions: 'Bed is now free for fall replanting.' },
      ],
      equipment: [],
      skill_level: 'beginner',
      labor_type: 'either',
      priority: 4,
    },
  ],
};
