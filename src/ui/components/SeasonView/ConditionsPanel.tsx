/**
 * Side panel showing conditions and accumulation at the current slider date.
 *
 * Two tabs:
 *   Conditions — temperature, photoperiod, GDD, soil moisture for the day
 *   Accumulation — season-to-date harvest totals by display group
 */

import React, { useMemo, useState } from 'react';
import type { DaySnapshot } from '@core/engine/simulate';
import type { ConditionsResolver } from '@core/environment/types';
import type { PlantSpecies } from '@core/types/PlantSpecies';
import type { Task } from '@core/types/Task';

type PanelTab = 'conditions' | 'accumulation' | 'tasks';

interface ConditionsPanelProps {
  snapshot: DaySnapshot | null;
  snapshots: DaySnapshot[];
  dayIndex: number;
  env: ConditionsResolver | null;
  catalog: Map<string, PlantSpecies>;
}

const DISPLAY_GROUP_ORDER = ['Lettuce', 'Spinach', 'Kale', 'Paste', 'Cherry', 'Potato', 'Corn'] as const;

const SPECIES_DISPLAY_GROUP: Record<string, string> = {
  lettuce_bss: 'Lettuce',
  spinach_bloomsdale: 'Spinach',
  kale_red_russian: 'Kale',
  tomato_amish_paste: 'Paste',
  tomato_sun_gold: 'Cherry',
  potato_kennebec: 'Potato',
  corn_nothstine_dent: 'Corn',
};

const GROUP_COLORS: Record<string, string> = {
  Lettuce: '#7BC67E',
  Spinach: '#2E8B57',
  Kale: '#8B4513',
  Paste: '#C0392B',
  Cherry: '#E74C3C',
  Potato: '#a78bfa',
  Corn: '#fbbf24',
};

/** Sum harvest_ready events up to and including dayIndex. */
function computeAccumulation(
  snapshots: DaySnapshot[],
  dayIndex: number,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (let i = 0; i <= dayIndex && i < snapshots.length; i++) {
    for (const event of snapshots[i]!.events) {
      if (event.type !== 'harvest_ready') continue;
      const plant = snapshots[i]!.plants.find(p => p.plant_id === event.plant_id);
      const group = plant ? SPECIES_DISPLAY_GROUP[plant.species_id] : undefined;
      if (group) {
        totals[group] = (totals[group] ?? 0) + event.accumulated_lbs;
      }
    }
  }
  return totals;
}

/** Count plants by stage in the current snapshot. */
function countByStage(snapshot: DaySnapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const plant of snapshot.plants) {
    counts[plant.stage] = (counts[plant.stage] ?? 0) + 1;
  }
  return counts;
}

const TASK_CATEGORY_COLORS: Record<string, string> = {
  harvest: '#22c55e',
  water: '#3b82f6',
  thin: '#a78bfa',
  prune: '#f59e0b',
  plant: '#10b981',
  inspect: '#6b7280',
  weed: '#84cc16',
  mulch: '#92400e',
  hill: '#d97706',
  sow: '#10b981',
  fertilize: '#8b5cf6',
};

/** Sum estimated_duration_minutes for all tasks up through dayIndex. */
function sumTaskMinutesThrough(snapshots: DaySnapshot[], dayIndex: number): number {
  let total = 0;
  for (let i = 0; i <= dayIndex && i < snapshots.length; i++) {
    for (const task of snapshots[i]!.tasks ?? []) {
      total += task.estimated_duration_minutes ?? 0;
    }
  }
  return total;
}

/** Group tasks by type for display. */
function groupTasksByType(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = groups.get(task.type) ?? [];
    existing.push(task);
    groups.set(task.type, existing);
  }
  return groups;
}

function ConditionRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200 font-mono">{value}{unit ?? ''}</span>
    </div>
  );
}

export function ConditionsPanel({ snapshot, snapshots, dayIndex, env, catalog }: ConditionsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('conditions');

  const conditions = useMemo(() => {
    if (!env || !snapshot) return null;
    return env.getConditions(snapshot.date);
  }, [env, snapshot]);

  const accumulation = useMemo(
    () => computeAccumulation(snapshots, dayIndex),
    [snapshots, dayIndex],
  );

  const stageCounts = useMemo(
    () => snapshot ? countByStage(snapshot) : {},
    [snapshot],
  );

  const todayTasks = useMemo(
    () => snapshot?.tasks ?? [],
    [snapshot],
  );

  const taskGroups = useMemo(
    () => groupTasksByType(todayTasks),
    [todayTasks],
  );

  const laborMinutesToDate = useMemo(
    () => sumTaskMinutesThrough(snapshots, dayIndex),
    [snapshots, dayIndex],
  );

  const todayMinutes = useMemo(
    () => todayTasks.reduce((s, t) => s + (t.estimated_duration_minutes ?? 0), 0),
    [todayTasks],
  );

  if (!snapshot) {
    return (
      <div className="bg-gray-800 p-3 text-gray-500 text-xs">
        Loading simulation...
      </div>
    );
  }

  const grandTotal = Object.values(accumulation).reduce((s, v) => s + v, 0);
  const growing = snapshot.plants.filter(p => p.lifecycle === 'growing').length;
  const stressed = snapshot.plants.filter(p => p.lifecycle === 'stressed').length;
  const senescent = snapshot.plants.filter(p => p.lifecycle === 'senescent').length;
  const pulled = snapshot.plants.filter(p => p.lifecycle === 'pulled').length;
  const dead = snapshot.plants.filter(p => p.lifecycle === 'dead').length;
  const alive = growing + stressed;

  return (
    <div className="bg-gray-800 border-l border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Date header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-sm font-semibold text-gray-200">
          {snapshot.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {alive} alive{stressed > 0 ? ` (${stressed} stressed)` : ''} / {dead} dead{senescent > 0 ? ` / ${senescent} senescent` : ''}{pulled > 0 ? ` / ${pulled} pulled` : ''}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-gray-700">
        {(['conditions', 'accumulation', 'tasks'] as PanelTab[]).map(tab => {
          const label = tab === 'conditions' ? 'Conditions' : tab === 'accumulation' ? 'Harvest' : 'Tasks';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 text-[10px] transition-colors ${
                activeTab === tab
                  ? 'text-emerald-400 border-b border-emerald-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === 'conditions' && conditions && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Weather</div>
              <ConditionRow label="High" value={conditions.avg_high_f.toFixed(0)} unit=" F" />
              <ConditionRow label="Low" value={conditions.avg_low_f.toFixed(0)} unit=" F" />
              <ConditionRow label="Soil temp" value={conditions.soil_temp_f.toFixed(0)} unit=" F" />
              <ConditionRow label="Photoperiod" value={conditions.photoperiod_h.toFixed(1)} unit=" h" />
              {conditions.sunshine_hours !== undefined && (
                <ConditionRow label="Sunshine" value={conditions.sunshine_hours.toFixed(1)} unit=" h" />
              )}
              {conditions.soil_moisture_pct_fc !== undefined && (
                <ConditionRow label="Soil moisture" value={conditions.soil_moisture_pct_fc.toFixed(0)} unit="% FC" />
              )}
            </div>

            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Plant Stages</div>
              {Object.entries(stageCounts).sort().map(([stage, count]) => (
                <ConditionRow key={stage} label={stage} value={count} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'accumulation' && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                Season-to-Date (lbs)
              </div>
              {DISPLAY_GROUP_ORDER.map(group => {
                const lbs = accumulation[group] ?? 0;
                if (lbs === 0) return null;
                return (
                  <div key={group} className="flex justify-between text-xs py-0.5">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-sm inline-block"
                        style={{ backgroundColor: GROUP_COLORS[group] }}
                      />
                      <span className="text-gray-300">{group}</span>
                    </span>
                    <span className="text-gray-200 font-mono">{lbs.toFixed(1)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-xs py-1 mt-1 border-t border-gray-700 font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="text-emerald-400 font-mono">{grandTotal.toFixed(1)}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Today's Events</div>
              {snapshot.events.length === 0 ? (
                <div className="text-[10px] text-gray-600">No events</div>
              ) : (
                snapshot.events.slice(0, 10).map((event, i) => (
                  <div key={i} className="text-[10px] text-gray-400 py-0.5">
                    {event.type === 'harvest_ready' && `Harvest: ${event.accumulated_lbs.toFixed(2)} lbs`}
                    {event.type === 'stage_changed' && `${event.from} > ${event.to}`}
                    {event.type === 'plant_died' && `Died: ${event.cause}`}
                  </div>
                ))
              )}
              {snapshot.events.length > 10 && (
                <div className="text-[10px] text-gray-600">+{snapshot.events.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Season-to-Date</div>
              <ConditionRow label="Total hours" value={(laborMinutesToDate / 60).toFixed(1)} unit=" h" />
            </div>

            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                Today ({todayTasks.length} tasks, {todayMinutes} min)
              </div>
              {todayTasks.length === 0 ? (
                <div className="text-[10px] text-gray-600">No tasks today</div>
              ) : (
                Array.from(taskGroups.entries()).map(([type, tasks]) => (
                  <div key={type} className="mb-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-sm inline-block"
                        style={{ backgroundColor: TASK_CATEGORY_COLORS[type] ?? '#6b7280' }}
                      />
                      <span className="text-[10px] text-gray-300 font-medium capitalize">{type}</span>
                      <span className="text-[10px] text-gray-600">({tasks.length})</span>
                    </div>
                    {tasks.slice(0, 5).map(task => {
                      const targetLabel = task.target.target_type === 'plant'
                        ? task.target.plant_id.replace(/_\d+$/, '').replace(/_/g, ' ')
                        : task.target.target_type === 'garden'
                          ? 'garden'
                          : task.target.target_type;
                      return (
                        <div key={task.task_id} className="text-[10px] text-gray-400 py-0.5 flex justify-between pl-3">
                          <span className="truncate mr-1">{targetLabel}</span>
                          {task.estimated_duration_minutes != null && (
                            <span className="text-gray-500 font-mono shrink-0">
                              {task.estimated_duration_minutes}m
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {tasks.length > 5 && (
                      <div className="text-[10px] text-gray-600 pl-3">+{tasks.length - 5} more</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
