"use client";
import { useRef, useState, useMemo, useEffect } from "react";
// m + AnimatePresence from motion/react: the app provides LazyMotion(domAnimation),
// so m.* elements animate identically to motion.* without the eager full bundle.
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";

// These immutable exports are byte-identical to the former DottedMap output.
// Build the 8,476-point grid offline, not in a render/useMemo during scrolling.
// Regenerate with scripts/deployment/precompute-world-map.mjs --patch.
const MAP_BACKGROUNDS = {
  dark: "/maps/world-v1-dark.svg",
  light: "/maps/world-v1-light.svg",
} as const;
const LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
  "New York": { x: -50, y: -34 },
  "Los Angeles": { x: -56, y: 8 },
  London: { x: -62, y: -34 },
  Paris: { x: 8, y: 2 },
  Moscow: { x: 10, y: -34 },
  Dubai: { x: 8, y: 2 },
  Singapore: { x: -48, y: 8 },
  Tokyo: { x: 8, y: -30 },
  "São Paulo": { x: -48, y: -32 },
};

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
  showLabels?: boolean;
  animationDuration?: number;
  loop?: boolean;
}

export function WorldMap({
  dots = [],
  lineColor = "#FF2D55",
  showLabels = true,
  animationDuration = 2,
  loop = true,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoveredLocation] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // Pause the infinite path/beacon animations when the map is off-screen: the
  // animated overlay unmounts (the static dotted-map image stays), so no rAF
  // work runs for a section the user cannot see. Re-entry restarts the loop
  // cycle, which is visually indistinguishable for looping draws.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "160px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // The parent viewport gate defers this island; lazy image delivery avoids
  // fetching the map before it is useful. Wait for the resolved theme rather
  // than briefly requesting the wrong variant during theme hydration.
  const mapBackground = resolvedTheme
    ? MAP_BACKGROUNDS[resolvedTheme === "dark" ? "dark" : "light"]
    : undefined;

  const locations = useMemo(() => {
    const unique = new Map<string, { lat: number; lng: number; label: string }>();
    for (const dot of dots) {
      for (const point of [dot.start, dot.end]) {
        if (point.label && !unique.has(point.label)) {
          unique.set(point.label, { lat: point.lat, lng: point.lng, label: point.label });
        }
      }
    }
    return [...unique.values()];
  }, [dots]);

  const projectPoint = (lat: number, lng: number) => ({
    x: (lng + 180) * (800 / 360),
    y: (90 - lat) * (400 / 180),
  });

  const createCurvedPath = (s: { x: number; y: number }, e: { x: number; y: number }) => {
    const midX = (s.x + e.x) / 2;
    const midY = Math.min(s.y, e.y) - 60;
    return `M ${s.x} ${s.y} Q ${midX} ${midY} ${e.x} ${e.y}`;
  };

  const staggerDelay = 0.4;
  const totalAnimationTime = dots.length * staggerDelay + animationDuration;
  const pauseTime = 1.5;
  const fullCycleDuration = totalAnimationTime + pauseTime;

  return (
    <div ref={wrapRef} className="global-world-map-shell">
      <div className="global-world-map w-full aspect-[2/1] rounded-2xl relative overflow-hidden">
      {mapBackground && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={mapBackground}
          className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] pointer-events-none select-none object-cover opacity-80"
          alt="world map"
          width={198}
          height={100}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
      {active && (
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-auto select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowStrong" x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur stdDeviation="3.4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {dots.map((dot, i) => {
          const s = projectPoint(dot.start.lat, dot.start.lng);
          const e = projectPoint(dot.end.lat, dot.end.lng);
          const path = createCurvedPath(s, e);
          const startTime = (i * staggerDelay) / fullCycleDuration;
          const endTime = (i * staggerDelay + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;

          return (
            <g key={`path-${i}`}>
              <m.path
                d={path}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1.75"
                filter="url(#glow)"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={reduceMotion ? { pathLength: 1 } : loop ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }}
                transition={reduceMotion ? { duration: 0 } : loop ? {
                  duration: fullCycleDuration,
                  times: [0, startTime, endTime, resetTime, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                } : { duration: animationDuration, delay: i * staggerDelay }}
              />
              {loop && !reduceMotion && (
                <m.circle r="5" fill={lineColor} filter="url(#glowStrong)"
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{ offsetDistance: [null, "0%", "100%", "100%", "100%"], opacity: [0, 0, 1, 0, 0] }}
                  transition={{ duration: fullCycleDuration, times: [0, startTime, endTime, resetTime, 1], ease: "easeInOut", repeat: Infinity }}
                  style={{ offsetPath: `path('${path}')` }}
                />
              )}
            </g>
          );
        })}

        {locations.map((location) => {
          const pt = projectPoint(location.lat, location.lng);
          const offset = LABEL_OFFSETS[location.label] ?? { x: -48, y: -30 };
          return (
            <g key={location.label}>
              <circle cx={pt.x} cy={pt.y} r="3.4" fill={lineColor} filter="url(#glowStrong)" />
              {!reduceMotion && (
                <circle cx={pt.x} cy={pt.y} r="6" fill="none" stroke={lineColor} strokeWidth="0.8" opacity="0.35" />
              )}
              {showLabels && (
                <foreignObject x={pt.x + offset.x} y={pt.y + offset.y} width="104" height="24">
                  <div className="flex items-center h-full">
                    <span className="global-city-label">
                      {location.label}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      )}

      <AnimatePresence>
        {hoveredLocation && (
          <m.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-sm border border-white/10"
          >
            {hoveredLocation}
          </m.div>
        )}
      </AnimatePresence>
      </div>

      {showLabels && (
        <div className="global-city-list" aria-label="Client cities">
          {locations.map((location) => <span key={location.label}>{location.label}</span>)}
        </div>
      )}
    </div>
  );
}
