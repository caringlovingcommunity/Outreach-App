import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.25;
/** Finger travel past this counts as a pan, not a tap on the card underneath. */
const TAP_SLOP = 6;

/**
 * Flick tuning. Velocity is kept in px/second rather than px/frame so a fling
 * travels the same distance on a 60Hz phone and a 120Hz one — otherwise the
 * faster display silently out-pans the slower one.
 */
/** How much of the release speed carries past the finger. */
const MOMENTUM_BOOST = 2;
/** Speed left after a second of coasting (~0.92 per 60Hz frame, as before). */
const MOMENTUM_DECAY_PER_SECOND = 0.007;
/** Below this, in px/s, the coast has run out. */
const MIN_MOMENTUM_SPEED = 30;
/** A release this long after the last move was a rest, not a flick. */
const STALE_RELEASE_MS = 100;
/** Long frames are clamped so a backgrounded tab resumes rather than teleports. */
const MAX_MOMENTUM_STEP_SECONDS = 1 / 15;

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export interface ChartViewport {
  scale: number;
  x: number;
  y: number;
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const centerBetween = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * `mx-auto` already centres a canvas narrower than the frame, so its box starts
 * this far from the frame's left/top edge. The transform grows from the box's
 * top-left corner, so every clamp has to subtract that shift.
 */
const offsetFor = (frameSize: number, contentSize: number) =>
  Math.max(0, (frameSize - contentSize) / 2);

const clampAxis = (value: number, frameSize: number, contentSize: number, scale: number) => {
  const offset = offsetFor(frameSize, contentSize);
  const scaled = contentSize * scale;
  if (scaled <= frameSize) return (frameSize - scaled) / 2 - offset;
  return clampNumber(value, frameSize - scaled - offset, -offset);
};

/** Keeps the canvas inside the frame: centred where it fits, bounded where it overflows. */
const clampViewport = (viewport: ChartViewport, frame: Size, content: Size): ChartViewport => ({
  scale: viewport.scale,
  x: clampAxis(viewport.x, frame.width, content.width, viewport.scale),
  y: clampAxis(viewport.y, frame.height, content.height, viewport.scale),
});

interface PinchStart {
  viewport: ChartViewport;
  mid: Point;
  distance: number;
  /** Frame origin in client coordinates, captured at gesture start. */
  origin: Point;
}

export interface UseChartViewportResult {
  frameRef: RefObject<HTMLDivElement | null>;
  scale: number;
  transform: string;
  /** `pan-y` lets the page scroll when the chart has nothing to pan vertically. */
  touchAction: CSSProperties['touchAction'];
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  setScale: (scale: number) => void;
  fit: () => void;
  /** Centres the viewport on a point in content coordinates, e.g. a node. */
  centerOn: (contentX: number, contentY: number) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** Swallows the click a pan would otherwise leave behind on a card. */
  onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export interface UseChartViewportOptions {
  /** Content x to centre on the opening view, e.g. the tree's top-level node. */
  anchorX?: number;
  /** Fit the opening view to the canvas width. */
  fitWidth?: boolean;
  /**
   * Seat the opening view by fitting the canvas height to the frame instead of
   * the default 1:1. The full-screen sheet is tall enough that a whole branch
   * reads at once, where the 19.5:9 preview only wants a feel of the tree.
   */
  fitHeight?: boolean;
}

/**
 * Pan and zoom for a canvas that is wider than the frame it lives in.
 *
 * Phones turn the chart into a fixed 19.5:9 viewport and drive it by touch —
 * one finger pans, two pinch about their midpoint — so gestures zoom the chart
 * instead of the page. Nothing here measures breakpoints: `src/index.css` turns
 * the transform off at `sm+`, where the native scroller takes over again.
 */
export const useChartViewport = (
  rawContent: Size,
  { anchorX, fitWidth = false, fitHeight = false }: UseChartViewportOptions = {},
): UseChartViewportResult => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState<Size>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<ChartViewport>({ scale: 1, x: 0, y: 0 });

  // Handlers read the live viewport from a ref so panning never lags a frame.
  const viewportRef = useRef(viewport);
  const pointers = useRef(new Map<number, Point>());
  const panStart = useRef<Point | null>(null);
  /** Release speed in px/s, carried from the last pan move into the coast. */
  const panVelocity = useRef<Point>({ x: 0, y: 0 });
  /** Timestamp of that last move, both to measure speed and to spot a rest. */
  const moveAt = useRef(0);
  const momentumFrame = useRef<number | null>(null);
  const momentumStepAt = useRef(0);
  const pinchStart = useRef<PinchStart | null>(null);
  /** Once the viewer drives the viewport themselves, re-seating stops. */
  const touched = useRef(false);
  /** Set when a gesture travelled far enough that its click is not a tap. */
  const dragEnd = useRef(false);

  // Callers pass a `{ width, height }` literal, a new object every render. Key
  // the memo off the numbers so the effects below don't re-run on identity.
  const { width: rawWidth, height: rawHeight } = rawContent;
  const content = useMemo(
    () => ({ width: rawWidth, height: rawHeight }),
    [rawWidth, rawHeight],
  );

  const offset = useMemo(
    () => ({ x: offsetFor(frame.width, content.width), y: offsetFor(frame.height, content.height) }),
    [frame.width, content, frame.height],
  );

  const applyViewport = useCallback(
    (updater: (previous: ChartViewport) => ChartViewport) => {
      const next = updater(viewportRef.current);
      viewportRef.current = next;
      setViewport(next);
    },
    [],
  );

  // Measured rather than assumed: the frame is 19.5:9 on a phone but auto-height
  // on desktop, and it changes with rotation and the bottom bar.
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrame({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Re-seat the canvas whenever the frame or the tree changes size until the
  // viewer pans or zooms.
  useEffect(() => {
    if (!frame.width || !frame.height) return;
    applyViewport((previous) => {
      if (touched.current) return clampViewport(previous, frame, content);
      const scale = fitWidth
        ? clampNumber(frame.width / content.width, MIN_SCALE, 1)
        : fitHeight
          ? clampNumber(frame.height / content.height, MIN_SCALE, 1)
          : previous.scale;
      return clampViewport(
        {
          scale,
          x: anchorX === undefined ? previous.x : frame.width / 2 - offset.x - anchorX * scale,
          y: 0,
        },
        frame,
        content,
      );
    });
  }, [applyViewport, frame, content, offset, anchorX, fitWidth, fitHeight]);

  const zoomAt = useCallback(
    (focus: Point, factor: number) => {
      touched.current = true;
      applyViewport((previous) => {
        const scale = clampNumber(previous.scale * factor, MIN_SCALE, MAX_SCALE);
        const underX = (focus.x - offset.x - previous.x) / previous.scale;
        const underY = (focus.y - offset.y - previous.y) / previous.scale;
        return clampViewport(
          {
            scale,
            x: focus.x - offset.x - underX * scale,
            y: focus.y - offset.y - underY * scale,
          },
          frame,
          content,
        );
      });
    },
    [applyViewport, offset, frame, content],
  );

  const zoomIn = useCallback(
    () => zoomAt({ x: frame.width / 2, y: frame.height / 2 }, ZOOM_STEP),
    [zoomAt, frame.width, frame.height],
  );

  const zoomOut = useCallback(
    () => zoomAt({ x: frame.width / 2, y: frame.height / 2 }, 1 / ZOOM_STEP),
    [zoomAt, frame.width, frame.height],
  );

  const setScale = useCallback(
    (nextScale: number) => {
      const scale = clampNumber(nextScale, MIN_SCALE, MAX_SCALE);
      zoomAt({ x: frame.width / 2, y: frame.height / 2 }, scale / viewportRef.current.scale);
    },
    [zoomAt, frame.width, frame.height],
  );

  const fit = useCallback(() => {
    touched.current = true;
    applyViewport(() => clampViewport(
      {
        scale: clampNumber(frame.width / content.width, MIN_SCALE, 1),
        x: anchorX === undefined
          ? 0
          : frame.width / 2 - offset.x - anchorX * clampNumber(frame.width / content.width, MIN_SCALE, 1),
        y: 0,
      },
      frame,
      content,
    ));
  }, [applyViewport, frame, content, offset, anchorX]);

  // Seats a chosen node under the centre of the frame — the same maths the
  // opening seat uses, but driven by the viewer rather than the anchor.
  const centerOn = useCallback((contentX: number, contentY: number) => {
    touched.current = true;
    applyViewport((previous) => clampViewport(
      {
        scale: previous.scale,
        x: frame.width / 2 - offset.x - contentX * previous.scale,
        y: frame.height / 2 - offset.y - contentY * previous.scale,
      },
      frame,
      content,
    ));
  }, [applyViewport, offset, frame, content]);

  // Trackpad pinch arrives as ctrl/⌘+wheel. React registers wheel passively, so
  // this needs a native non-passive listener to be able to preventDefault.
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt({ x: event.clientX - rect.left, y: event.clientY - rect.top },
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const stopMomentum = useCallback(() => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
  }, []);

  const startMomentum = useCallback(() => {
    const step = (now: number) => {
      const dt = clampNumber((now - momentumStepAt.current) / 1000, 0, MAX_MOMENTUM_STEP_SECONDS);
      momentumStepAt.current = now;
      const { x: vx, y: vy } = panVelocity.current;
      if (Math.hypot(vx, vy) < MIN_MOMENTUM_SPEED) {
        momentumFrame.current = null;
        panVelocity.current = { x: 0, y: 0 };
        return;
      }
      const decay = MOMENTUM_DECAY_PER_SECOND ** dt;
      const stepX = vx * decay * MOMENTUM_BOOST * dt;
      const stepY = vy * decay * MOMENTUM_BOOST * dt;
      panVelocity.current = { x: vx * decay, y: vy * decay };
      applyViewport((previous) => clampViewport(
        { scale: previous.scale, x: previous.x + stepX, y: previous.y + stepY },
        frame,
        content,
      ));
      momentumFrame.current = requestAnimationFrame(step);
    };
    momentumStepAt.current = performance.now();
    momentumFrame.current = requestAnimationFrame(step);
  }, [applyViewport, frame, content]);

  // Stop momentum on unmount
  useEffect(() => stopMomentum, [stopMomentum]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...pointers.current.values()];

    if (active.length >= 2) {
      stopMomentum();
      const start = pinchStart.current;
      if (!start) return;
      const mid = centerBetween(active[0], active[1]);
      const ratio = start.distance > 0 ? distanceBetween(active[0], active[1]) / start.distance : 1;
      const scale = clampNumber(start.viewport.scale * ratio, MIN_SCALE, MAX_SCALE);
      if (Math.hypot(mid.x - start.mid.x, mid.y - start.mid.y) > TAP_SLOP) dragEnd.current = true;
      // Keep the content point that sat under the initial midpoint under the
      // current midpoint, which pans and zooms in one step.
      const anchorX = (start.mid.x - start.origin.x - offset.x - start.viewport.x) / start.viewport.scale;
      const anchorY = (start.mid.y - start.origin.y - offset.y - start.viewport.y) / start.viewport.scale;
      applyViewport(() => clampViewport(
        {
          scale,
          x: mid.x - start.origin.x - offset.x - anchorX * scale,
          y: mid.y - start.origin.y - offset.y - anchorY * scale,
        },
        frame,
        content,
      ));
      return;
    }

    const start = panStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Speed in px/s, not px/frame, so the coast is identical at 60Hz and 120Hz.
    const elapsed = moveAt.current ? (event.timeStamp - moveAt.current) / 1000 : 1 / 60;
    moveAt.current = event.timeStamp;
    const dt = clampNumber(elapsed, 1 / 240, 1 / 15);
    panVelocity.current = { x: dx / dt, y: dy / dt };
    panStart.current = { x: event.clientX, y: event.clientY };
    if (Math.hypot(dx, dy) > TAP_SLOP) dragEnd.current = true;
    applyViewport((previous) => clampViewport(
      { scale: previous.scale, x: previous.x + dx, y: previous.y + dy },
      frame,
      content,
    ));
  }, [applyViewport, offset, frame, content, stopMomentum]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Desktop keeps the native scroller, and its clicks must reach the cards.
    // Mouse pointers stay out of `pointers`, so the move/up guards drop them.
    if (event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).closest('[data-chart-control]')) return;
    // A new touch cancels any coasting instead of fighting it.
    stopMomentum();
    panVelocity.current = { x: 0, y: 0 };
    moveAt.current = 0;
    touched.current = true;
    const frameRect = frameRef.current?.getBoundingClientRect();
    if (!frameRect) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      // Pinching supersedes the pan; drop its speed so lifting does not coast.
      panVelocity.current = { x: 0, y: 0 };
      moveAt.current = 0;
      const [first, second] = [...pointers.current.values()];
      pinchStart.current = {
        viewport: viewportRef.current,
        mid: centerBetween(first, second),
        distance: distanceBetween(first, second),
        origin: { x: frameRect.left, y: frameRect.top },
      };
      return;
    }
    panStart.current = { x: event.clientX, y: event.clientY };
  }, [stopMomentum]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      panStart.current = null;
      // A finger that rested before lifting was not a flick — releasing it
      // should not send the tree gliding off on stale speed.
      const { x: vx, y: vy } = panVelocity.current;
      const stale = moveAt.current === 0 || event.timeStamp - moveAt.current > STALE_RELEASE_MS;
      if (stale || Math.hypot(vx, vy) < MIN_MOMENTUM_SPEED) {
        panVelocity.current = { x: 0, y: 0 };
      } else {
        startMomentum();
      }
    }
  }, [startMomentum]);

  // The browser fires click after a touch drag too. A card is only ~200px wide
  // inside a 170px frame, so without this, panning opens profile drawers.
  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragEnd.current) return;
    dragEnd.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    frameRef,
    scale: viewport.scale,
    transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
    // Nothing to pan vertically means the swipe belongs to the page.
    touchAction: frame.height > 0 && content.height * viewport.scale <= frame.height ? 'pan-y' : 'none',
    canZoomIn: viewport.scale < MAX_SCALE - 0.001,
    canZoomOut: viewport.scale > MIN_SCALE + 0.001,
    zoomIn,
    zoomOut,
    setScale,
    fit,
    centerOn,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCapture,
  };
};