import { Plan, PlantSpecies, LaborWeek, LaborTask } from '../types';

/**
 * Labor Calculator
 *
 * Generates weekly labor schedule based on planting plan and species task requirements.
 */
export class LaborCalculator {
  /**
   * Calculate labor schedule for a garden plan
   *
   * @param plan - Garden planting plan
   * @param speciesMap - Map of species ID → species data
   * @param avg_density - Average planting density (plants per sq ft) for per-area calculations
   * @returns Array of labor weeks (weeks with tasks)
   */
  calculateSchedule(
    plan: Plan,
    speciesMap: Map<string, PlantSpecies>,
    avg_density: number
  ): LaborWeek[] {
    // Map of week number → labor week data
    const weekMap = new Map<number, LaborWeek>();

    // Process each planting
    for (const planting of plan.plantings) {
      const species = speciesMap.get(planting.species_id);
      if (!species) {
        // Skip if species not found
        continue;
      }

      const plantDate = new Date(planting.planting_date);

      // Process each task for this species
      for (const task of species.tasks) {
        for (const dayOffset of task.timing_days) {
          // Calculate task date
          const taskDate = new Date(plantDate);
          taskDate.setDate(taskDate.getDate() + dayOffset);

          // Get week number (1-52)
          const weekNum = this.getWeekNumber(taskDate);
          const weekStart = this.getWeekStart(weekNum, taskDate.getFullYear());

          // Initialize week if not exists
          if (!weekMap.has(weekNum)) {
            weekMap.set(weekNum, {
              week_number: weekNum,
              week_starting: weekStart,
              tasks: [],
              total_hours: 0,
            });
          }

          const week = weekMap.get(weekNum)!;

          // Calculate hours for this task instance
          let hours = 0;
          if (task.hours_per_plant) {
            hours = task.hours_per_plant;
          } else if (task.hours_per_sq_ft) {
            // Convert plants to area
            const area_sq_ft = 1 / avg_density; // 1 plant / (plants per sq ft) = sq ft per plant
            hours = task.hours_per_sq_ft * area_sq_ft;
          }

          // Find existing task for this species in this week
          const existingTask = week.tasks.find(
            t => t.species_id === species.id && t.task_name === task.name
          );

          if (existingTask) {
            // Accumulate hours
            existingTask.hours += hours;
          } else {
            // Add new task
            week.tasks.push({
              species_id: species.id,
              task_name: task.name,
              hours: hours,
            });
          }

          // Update total hours
          week.total_hours += hours;
        }
      }
    }

    // Convert map to sorted array
    return Array.from(weekMap.values()).sort((a, b) => a.week_number - b.week_number);
  }

  /**
   * Get ISO week number for a date (1-52)
   *
   * Note: This is a simplified implementation.
   * For production, consider using a library like date-fns.
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNum;
  }

  /**
   * Get ISO date string for the Monday of a given week
   */
  private getWeekStart(weekNum: number, year: number): string {
    const jan1 = new Date(year, 0, 1);
    const daysToMonday = (jan1.getDay() === 0 ? -6 : 1 - jan1.getDay());
    const firstMonday = new Date(year, 0, 1 + daysToMonday);

    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

    return weekStart.toISOString().split('T')[0]!;
  }
}
