import React from 'react';
import { useGardenStore } from '../../store/gardenStore';

export function WorkLog() {
  const projection = useGardenStore((state) => state.projection);

  if (!projection || projection.labor_schedule.length === 0) {
    return (
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold mb-2">Work Log</h2>
        <p className="text-gray-400 text-xs">No labor schedule available</p>
      </div>
    );
  }

  const { labor_schedule } = projection;

  return (
    <div className="bg-gray-900 p-4 border-b border-gray-700 h-full flex flex-col overflow-hidden">
      <h2 className="text-white text-sm font-semibold mb-2">Work Log</h2>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="py-2 px-2">Week</th>
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Task</th>
              <th className="py-2 px-2">Species</th>
              <th className="py-2 px-2 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {labor_schedule.map((week) =>
              week.tasks.map((task, idx) => (
                <tr
                  key={`${week.week_number}-${task.species_id}-${task.task_name}-${idx}`}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  {idx === 0 && (
                    <>
                      <td
                        className="py-2 px-2 text-white font-medium"
                        rowSpan={week.tasks.length}
                      >
                        W{week.week_number}
                      </td>
                      <td
                        className="py-2 px-2 text-gray-400"
                        rowSpan={week.tasks.length}
                      >
                        {new Date(week.week_starting).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2 text-gray-300">{formatTaskName(task.task_name)}</td>
                  <td className="py-2 px-2 text-gray-400">{formatSpeciesName(task.species_id)}</td>
                  <td className="py-2 px-2 text-right text-white">{task.hours.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 text-right">
        <span className="text-xs text-gray-400">
          Total: {' '}
          <span className="text-white font-semibold">
            {labor_schedule.reduce((sum, week) => sum + week.total_hours, 0).toFixed(1)} hours
          </span>
        </span>
      </div>
    </div>
  );
}

function formatTaskName(taskName: string): string {
  return taskName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatSpeciesName(speciesId: string): string {
  return speciesId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
