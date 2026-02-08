/**
 * Canvas Controls Hook
 *
 * Handles mouse and touch input for zoom and pan interactions.
 * Critical feature: Mouse wheel zoom toward cursor position (UX gold standard).
 */

import { useEffect, useCallback, useRef } from 'react';
import { screenToWorld, clamp, type Viewport } from '../utils/canvasTransforms';

interface ControlsState {
  isPanning: boolean;
  lastMousePos: { x: number; y: number };
  touchStartDistance: number | null;
  touchStartScale: number;
}

/**
 * Canvas controls hook
 *
 * @param canvasRef - Reference to canvas element
 * @param viewport - Current viewport state
 * @param setViewport - Function to update viewport
 * @param disabled - Disable panning (but not zoom) when painting
 */
export function useCanvasControls(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewport: Viewport,
  setViewport: (viewport: Viewport) => void,
  disabled: boolean = false
) {
  const stateRef = useRef<ControlsState>({
    isPanning: false,
    lastMousePos: { x: 0, y: 0 },
    touchStartDistance: null,
    touchStartScale: 1
  });

  /**
   * Mouse wheel zoom (toward cursor position)
   *
   * This is the critical UX feature - zoom should feel centered on the cursor,
   * not on the viewport center.
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Get world position under cursor BEFORE zoom
      const worldPosBefore = screenToWorld({ x: mouseX, y: mouseY }, viewport);

      // Calculate new scale (zoom in/out by 10%)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = clamp(viewport.scale * zoomFactor, 0.1, 10);

      // Apply new scale
      const newViewport = { ...viewport, scale: newScale };

      // Get world position under cursor AFTER zoom
      const worldPosAfter = screenToWorld({ x: mouseX, y: mouseY }, newViewport);

      // Adjust offset to keep cursor position stable in world space
      newViewport.offsetX += (worldPosBefore.x_in - worldPosAfter.x_in);
      newViewport.offsetY += (worldPosBefore.y_in - worldPosAfter.y_in);

      setViewport(newViewport);
    },
    [canvasRef, viewport, setViewport]
  );

  /**
   * Mouse down - start panning
   */
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (disabled) return; // Skip when painting mode active

    stateRef.current.isPanning = true;
    stateRef.current.lastMousePos = { x: e.clientX, y: e.clientY };

    // Change cursor to grabbing (only when not disabled/painting)
    if (canvasRef.current && !disabled) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, [canvasRef, disabled]);

  /**
   * Mouse move - pan viewport
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const state = stateRef.current;
      if (!state.isPanning) return;

      const deltaX = e.clientX - state.lastMousePos.x;
      const deltaY = e.clientY - state.lastMousePos.y;

      // Convert screen delta to world delta
      const worldDeltaX = -deltaX / (10 * viewport.scale); // PIXELS_PER_INCH = 10
      const worldDeltaY = -deltaY / (10 * viewport.scale);

      setViewport({
        ...viewport,
        offsetX: viewport.offsetX + worldDeltaX,
        offsetY: viewport.offsetY + worldDeltaY
      });

      state.lastMousePos = { x: e.clientX, y: e.clientY };
    },
    [viewport, setViewport]
  );

  /**
   * Mouse up - stop panning
   */
  const handleMouseUp = useCallback(() => {
    stateRef.current.isPanning = false;

    // Change cursor back to grab (only when not disabled/painting)
    if (canvasRef.current && !disabled) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, [canvasRef, disabled]);

  /**
   * Touch start - detect pinch gesture
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture starting
      const touch1 = e.touches[0]!;
      const touch2 = e.touches[1]!;

      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      stateRef.current.touchStartDistance = distance;
      stateRef.current.touchStartScale = viewport.scale;

      e.preventDefault();
    } else if (e.touches.length === 1) {
      // Single touch - start panning
      const touch = e.touches[0]!;
      stateRef.current.isPanning = true;
      stateRef.current.lastMousePos = { x: touch.clientX, y: touch.clientY };
    }
  }, [viewport.scale]);

  /**
   * Touch move - handle pinch zoom or pan
   */
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && stateRef.current.touchStartDistance !== null) {
        // Pinch zoom
        const touch1 = e.touches[0]!;
        const touch2 = e.touches[1]!;

        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        const scaleFactor = distance / stateRef.current.touchStartDistance;
        const newScale = clamp(
          stateRef.current.touchStartScale * scaleFactor,
          0.1,
          10
        );

        setViewport({
          ...viewport,
          scale: newScale
        });

        e.preventDefault();
      } else if (e.touches.length === 1 && stateRef.current.isPanning) {
        // Single touch pan
        const touch = e.touches[0]!;
        const deltaX = touch.clientX - stateRef.current.lastMousePos.x;
        const deltaY = touch.clientY - stateRef.current.lastMousePos.y;

        const worldDeltaX = -deltaX / (10 * viewport.scale);
        const worldDeltaY = -deltaY / (10 * viewport.scale);

        setViewport({
          ...viewport,
          offsetX: viewport.offsetX + worldDeltaX,
          offsetY: viewport.offsetY + worldDeltaY
        });

        stateRef.current.lastMousePos = { x: touch.clientX, y: touch.clientY };
      }
    },
    [viewport, setViewport]
  );

  /**
   * Touch end - stop gestures
   */
  const handleTouchEnd = useCallback(() => {
    stateRef.current.isPanning = false;
    stateRef.current.touchStartDistance = null;
  }, []);

  /**
   * Attach event listeners
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    canvasRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  ]);
}
