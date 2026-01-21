/**
 * Minimap Component
 *
 * Meta-view showing entire garden with current viewport position.
 * Appears when ≤50% of garden is visible.
 * Supports click-to-jump interaction.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import type { Garden } from '@core/types';
import { getViewportBounds, PIXELS_PER_INCH, type Viewport } from '../../utils/canvasTransforms';

const MINIMAP_SIZE = 200; // 200×200 px

interface MinimapProps {
  viewport: Viewport;
  garden: Garden;
  onViewportChange: (viewport: Viewport) => void;
}

export function Minimap({ viewport, garden, onViewportChange }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate what percent of garden is visible
  const visiblePercent = useMemo(() => {
    const bounds = getViewportBounds(viewport, window.innerWidth, window.innerHeight);
    const gardenWidth = garden.grid.width_ft * 12; // feet to inches
    const gardenHeight = garden.grid.length_ft * 12;

    const visibleWidth = bounds.maxX - bounds.minX;
    const visibleHeight = bounds.maxY - bounds.minY;
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = gardenWidth * gardenHeight;

    return (visibleArea / totalArea) * 100;
  }, [viewport, garden]);

  // Show minimap when ≤50% visible
  const shouldShow = visiblePercent <= 50;

  // Render minimap canvas
  useEffect(() => {
    if (!shouldShow) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gardenWidth = garden.grid.width_ft * 12;
    const gardenHeight = garden.grid.length_ft * 12;

    // Clear canvas
    ctx.fillStyle = '#1F2937'; // gray-800
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw garden boundary (white)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Calculate viewport rectangle position and size
    const bounds = getViewportBounds(viewport, window.innerWidth, window.innerHeight);

    // Map world coordinates to minimap coordinates
    const rectX = (bounds.minX / gardenWidth) * MINIMAP_SIZE;
    const rectY = (bounds.minY / gardenHeight) * MINIMAP_SIZE;
    const rectW = ((bounds.maxX - bounds.minX) / gardenWidth) * MINIMAP_SIZE;
    const rectH = ((bounds.maxY - bounds.minY) / gardenHeight) * MINIMAP_SIZE;

    // Draw viewport rectangle (semi-transparent white fill + white border)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(rectX, rectY, rectW, rectH);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(rectX, rectY, rectW, rectH);
  }, [viewport, garden, shouldShow]);

  // Click to jump to location
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gardenWidth = garden.grid.width_ft * 12;
    const gardenHeight = garden.grid.length_ft * 12;

    // Map minimap click to world coordinates
    const worldX = (clickX / MINIMAP_SIZE) * gardenWidth;
    const worldY = (clickY / MINIMAP_SIZE) * gardenHeight;

    // Calculate viewport size in world coordinates
    const viewportWidth = window.innerWidth / (PIXELS_PER_INCH * viewport.scale);
    const viewportHeight = window.innerHeight / (PIXELS_PER_INCH * viewport.scale);

    // Center viewport on clicked point
    onViewportChange({
      offsetX: worldX - viewportWidth / 2,
      offsetY: worldY - viewportHeight / 2,
      scale: viewport.scale
    });
  };

  if (!shouldShow) return null;

  return (
    <div className="absolute top-4 right-4 z-10">
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onClick={handleClick}
        className="border-2 border-gray-700 rounded cursor-pointer hover:border-gray-500 transition-colors"
        title={`Minimap (${visiblePercent.toFixed(1)}% visible)`}
      />
      <div className="text-xs text-gray-400 text-center mt-1">
        {visiblePercent.toFixed(1)}% visible
      </div>
    </div>
  );
}
