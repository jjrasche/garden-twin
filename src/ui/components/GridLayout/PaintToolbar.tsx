/**
 * Paint Toolbar Component
 *
 * Floating toolbar for terrain/shade painting mode selection.
 * Shows mode buttons (Water, Path, Tree, Shade) and shade settings submenu.
 */

import React from 'react';
import { useGardenStore, PaintMode, BrushSize } from '../../store/gardenStore';
import type { TimeSlot, Season } from '@core/types';

const PAINT_MODES: { mode: PaintMode; label: string; icon: string; color: string }[] = [
  { mode: 'water', label: 'Water', icon: '💧', color: 'bg-blue-600' },
  { mode: 'path', label: 'Path', icon: '🚶', color: 'bg-stone-600' },
  { mode: 'tree', label: 'Tree', icon: '🌳', color: 'bg-green-700' },
  { mode: 'shade', label: 'Shade', icon: '☁️', color: 'bg-gray-600' },
];

const TIME_SLOTS: { slot: TimeSlot; label: string }[] = [
  { slot: 'early_morning', label: '6-9 AM' },
  { slot: 'mid_morning', label: '9-12 PM' },
  { slot: 'early_afternoon', label: '12-3 PM' },
  { slot: 'late_afternoon', label: '3-6 PM' },
];

const SEASONS: { season: Season; label: string }[] = [
  { season: 'summer', label: 'Summer' },
  { season: 'winter', label: 'Winter' },
];

const BRUSH_SIZES: { size: BrushSize; label: string; cells: string }[] = [
  { size: 0, label: '1×1', cells: 'Precision' },
  { size: 1, label: '3×3', cells: 'Small' },
  { size: 2, label: '5×5', cells: 'Medium' },
  { size: 3, label: '7×7', cells: 'Large' },
];

export function PaintToolbar() {
  const paintMode = useGardenStore((state) => state.paintMode);
  const shadeSettings = useGardenStore((state) => state.shadeSettings);
  const brushSettings = useGardenStore((state) => state.brushSettings);
  const setPaintMode = useGardenStore((state) => state.setPaintMode);
  const setShadeSettings = useGardenStore((state) => state.setShadeSettings);
  const setBrushSettings = useGardenStore((state) => state.setBrushSettings);

  const handleModeClick = (mode: PaintMode) => {
    if (paintMode === mode) {
      // Toggle off if clicking the same mode
      setPaintMode('none');
    } else {
      setPaintMode(mode);
    }
  };

  const handleTimeSlotToggle = (slot: TimeSlot) => {
    const currentSlots = shadeSettings.timeSlots;
    if (currentSlots.includes(slot)) {
      // Remove slot if already selected
      setShadeSettings({ timeSlots: currentSlots.filter((s) => s !== slot) });
    } else {
      // Add slot if not selected
      setShadeSettings({ timeSlots: [...currentSlots, slot] });
    }
  };

  const handleSeasonChange = (season: Season) => {
    setShadeSettings({ season });
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      {/* Main toolbar */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 shadow-lg border border-gray-700">
        {PAINT_MODES.map(({ mode, label, icon, color }) => (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${paintMode === mode
                ? `${color} text-white`
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title={label}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-1" />

        {/* Cancel button */}
        <button
          onClick={() => setPaintMode('none')}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${paintMode === 'none'
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }
          `}
          disabled={paintMode === 'none'}
          title="Cancel painting"
        >
          ✕
        </button>
      </div>

      {/* Brush size settings - show when any paint mode is active */}
      {paintMode !== 'none' && (
        <div className="mt-2 bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-14">Brush:</span>

            {/* Auto-size toggle */}
            <button
              onClick={() => setBrushSettings({ autoSize: !brushSettings.autoSize })}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${brushSettings.autoSize
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }
              `}
              title="Auto-adjust brush size based on zoom level"
            >
              Auto
            </button>

            {/* Manual size buttons */}
            <div className={`flex gap-1 ${brushSettings.autoSize ? 'opacity-50' : ''}`}>
              {BRUSH_SIZES.map(({ size, label, cells }) => (
                <button
                  key={size}
                  onClick={() => setBrushSettings({ size, autoSize: false })}
                  disabled={brushSettings.autoSize}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-colors
                    ${!brushSettings.autoSize && brushSettings.size === size
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                    ${brushSettings.autoSize ? 'cursor-not-allowed' : ''}
                  `}
                  title={cells}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shade settings submenu */}
      {paintMode === 'shade' && (
        <div className="mt-2 bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-700">
          {/* Season toggle */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400 w-14">Season:</span>
            <div className="flex gap-1">
              {SEASONS.map(({ season, label }) => (
                <button
                  key={season}
                  onClick={() => handleSeasonChange(season)}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-colors
                    ${shadeSettings.season === season
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time slot checkboxes */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-14">Time:</span>
            <div className="flex gap-1">
              {TIME_SLOTS.map(({ slot, label }) => (
                <button
                  key={slot}
                  onClick={() => handleTimeSlotToggle(slot)}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-colors
                    ${shadeSettings.timeSlots.includes(slot)
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-500 mt-2">
            Click and drag on canvas to paint shade
          </p>
        </div>
      )}

      {/* Active mode indicator */}
      {paintMode !== 'none' && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Painting: <span className="text-white font-medium">{paintMode}</span>
          {' '}&bull; Click/drag on canvas
        </div>
      )}
    </div>
  );
}
