import { useEffect, useRef } from 'react';

export interface TouchControlsOptions {
  onPan?: (deltaX: number, deltaY: number) => void;
  onZoom?: (scale: number, centerX: number, centerY: number) => void;
  minScale?: number;
  maxScale?: number;
}

/**
 * Hook that provides touch controls for pan and pinch-to-zoom gestures.
 *
 * @param elementRef - Ref to the DOM element to attach touch handlers
 * @param options - Configuration options for touch controls
 */
export function useTouchControls(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchControlsOptions = {}
) {
  const {
    onPan,
    onZoom,
    minScale = 0.5,
    maxScale = 5.0,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch0 = e.touches[0];
      const touch1 = e.touches[1];

      if (e.touches.length === 1 && touch0) {
        // Single touch - prepare for panning
        touchStartRef.current = {
          x: touch0.clientX,
          y: touch0.clientY,
        };
      } else if (e.touches.length === 2 && touch0 && touch1) {
        // Two touches - prepare for pinch zoom
        const dx = touch0.clientX - touch1.clientX;
        const dy = touch0.clientY - touch1.clientY;
        lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent browser default behavior (scroll, zoom)
      e.preventDefault();

      const touch0 = e.touches[0];
      const touch1 = e.touches[1];

      if (e.touches.length === 1 && touch0 && touchStartRef.current && onPan) {
        // Single touch - pan
        const deltaX = touch0.clientX - touchStartRef.current.x;
        const deltaY = touch0.clientY - touchStartRef.current.y;

        onPan(deltaX, deltaY);

        touchStartRef.current = {
          x: touch0.clientX,
          y: touch0.clientY,
        };
      } else if (e.touches.length === 2 && touch0 && touch1 && lastDistanceRef.current !== null && onZoom) {
        // Two touches - pinch zoom
        const dx = touch0.clientX - touch1.clientX;
        const dy = touch0.clientY - touch1.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        const scaleChange = currentDistance / lastDistanceRef.current;

        // Calculate center point between two touches
        const centerX = (touch0.clientX + touch1.clientX) / 2;
        const centerY = (touch0.clientY + touch1.clientY) / 2;

        // Clamp scale change
        const clampedScale = Math.max(minScale, Math.min(maxScale, scaleChange));

        onZoom(clampedScale, centerX, centerY);

        lastDistanceRef.current = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      // Reset tracking refs
      touchStartRef.current = null;
      lastDistanceRef.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [elementRef, onPan, onZoom, minScale, maxScale]);
}
