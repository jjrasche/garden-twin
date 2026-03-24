import { LifecycleSpec } from '../../types/LifecycleSpec';
import { GATHER_TOOLS, CLEANUP, WATER_IN_ROW, PRESS_LARGE_SEEDS, SNIP_THIN, WALK_ROW_INSPECT } from './shared-steps';

export const CORN_NOTHSTINE_DENT_LIFECYCLE: LifecycleSpec = {
  species_id: 'corn_nothstine_dent',
  activities: [
    {
      activity_id: 'direct_sow',
      name: 'Direct sow seeds',
      task_type: 'plant',
      trigger: { type: 'days_after_planting', days: 0 },
      steps: [
        { name: 'Poke holes with dibble', scale: 'plant', minutes: 0.083, instructions: 'Poke holes 1.5" deep at 18" equidistant spacing marks.' },
        { ...PRESS_LARGE_SEEDS, minutes: 0.167, instructions: 'Drop 2 seeds per hole. Cover and firm soil. Soil temp must be 60F+ for germination.' },
        WATER_IN_ROW,
      ],
      equipment: ['dibble or hoe'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 9,
    },
    {
      activity_id: 'thin',
      name: 'Thin to one per station',
      task_type: 'thin',
      trigger: { type: 'growth_stage', stage: 'vegetative' },
      steps: [
        WALK_ROW_INSPECT,
        { ...SNIP_THIN, instructions: 'When seedlings are 4-6" tall, snip the weaker of each pair at soil level. Do not pull.' },
      ],
      equipment: ['scissors'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 5,
    },
    {
      activity_id: 'harvest_ears',
      name: 'Harvest ears',
      task_type: 'harvest',
      trigger: { type: 'growth_stage', stage: 'harvest' },
      steps: [
        GATHER_TOOLS,
        { name: 'Snap ears from stalk', scale: 'plant', minutes: 0.167, instructions: 'Harvest when husks are dry and brown, kernels hard and dented. Snap ear downward to detach.' },
        { name: 'Load cart', scale: 'row', minutes: 2, instructions: 'Transfer buckets of ears to garden cart.' },
        { name: 'Hang to dry', scale: 'fixed', minutes: 15, instructions: 'Hang or spread ears in dry ventilated space for 4-6 weeks with husks on.' },
      ],
      equipment: ['harvest bucket', 'garden cart'],
      skill_level: 'beginner',
      labor_type: 'manual',
      priority: 8,
    },
  ],
  processing: [
    {
      activity_id: 'shell_dry',
      name: 'Shell dried ears',
      input_lbs_per_batch: 20,
      output_per_batch: 16,
      output_unit: 'lb_dried_kernels',
      duration_minutes_per_batch: 90,
      equipment: ['corn sheller (hand crank or electric)', 'storage bucket with lid'],
      skill_level: 'beginner',
      instructions: 'After 4-6 weeks drying (kernels <14% moisture), run ears through sheller. Winnow chaff outdoors. Store kernels in airtight container in cool dry place.',
      storage_method: 'dried_ambient',
      storage_volume_per_unit: '5-gallon bucket per ~30 lbs',
      shelf_life_months: 60,
    },
  ],
};
