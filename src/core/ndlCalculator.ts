import {
  BUHLMANN_ZHL16C,
  NUM_COMPARTMENTS,
  ambientN2Pressure,
  compartmentK,
  calculateMValue,
  compartmentSuperSaturationRatio,
  constantDepthTensionChange,
  linearDepthChangeTensions,
} from './tissueModel';
import {
  DECO_STOP_INCREMENT_m,
  SAFETY_STOP_DEPTH_m,
  SAFETY_STOP_DURATION_min,
  SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
} from './types';

function tensionAfterAscent(
  startTension: number,
  compartmentIndex: number,
  startDepth_m: number,
  endDepth_m: number,
  ascentRate_m_per_min: number
): number {
  const depthChange = startDepth_m - endDepth_m;
  const duration = depthChange / ascentRate_m_per_min;
  if (duration <= 0) return startTension;
  const k = compartmentK(BUHLMANN_ZHL16C[compartmentIndex].halfLife_min);
  const P_alv_start = ambientN2Pressure(startDepth_m);
  const P_alv_end = ambientN2Pressure(endDepth_m);
  const R = (P_alv_end - P_alv_start) / duration;

  const exp_kt = Math.exp(-k * duration);
  return (
    P_alv_start +
    R * (duration - 1 / k) +
    (startTension - P_alv_start + R / k) * exp_kt
  );
}

function compartmentCanAscendTo(
  startTension: number,
  compartmentIndex: number,
  startDepth_m: number,
  endDepth_m: number,
  ascentRate_m_per_min: number
): boolean {
  const depthChange = startDepth_m - endDepth_m;
  const duration = depthChange / ascentRate_m_per_min;
  if (duration <= 0) return true;

  const steps = Math.max(10, Math.ceil(duration * 10));
  const depthStep = depthChange / steps;
  let tension = startTension;

  for (let i = 1; i <= steps; i++) {
    const currentDepth = startDepth_m - depthStep * i;
    const prevDepth = startDepth_m - depthStep * (i - 1);
    tension = tensionAfterAscent(
      tension,
      compartmentIndex,
      prevDepth,
      currentDepth,
      ascentRate_m_per_min
    );
    const mValue = calculateMValue(compartmentIndex, currentDepth);
    if (tension > mValue + 1e-6) {
      return false;
    }
  }

  return true;
}

function canAscendTo(
  tensions: number[],
  startDepth_m: number,
  endDepth_m: number,
  ascentRate_m_per_min: number
): boolean {
  for (let i = 0; i < NUM_COMPARTMENTS; i++) {
    if (
      !compartmentCanAscendTo(
        tensions[i],
        i,
        startDepth_m,
        endDepth_m,
        ascentRate_m_per_min
      )
    ) {
      return false;
    }
  }
  return true;
}

export function calculateNDL(
  initialTensions: number[],
  depth_m: number,
  ascentRate_m_per_min: number = SAFE_ASCENT_RATE_RECREATIONAL_m_per_min
): number {
  if (depth_m <= 0) return Infinity;

  const tensionsAtBottom = (t_min: number): number[] => {
    if (t_min <= 0) return [...initialTensions];
    return constantDepthTensionChange(initialTensions, depth_m, t_min);
  };

  const canSurfaceDirectly = (tensions: number[]): boolean => {
    return canAscendTo(tensions, depth_m, 0, ascentRate_m_per_min);
  };

  if (canSurfaceDirectly(tensionsAtBottom(0)) === false) return 0;

  let lo = 0;
  let hi = 1;
  while (canSurfaceDirectly(tensionsAtBottom(hi)) && hi < 10000) hi *= 2;

  if (hi >= 10000 && canSurfaceDirectly(tensionsAtBottom(10000))) return Infinity;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    if (canSurfaceDirectly(tensionsAtBottom(mid))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.max(0, (lo + hi) / 2);
}

export function timeToSurfaceAtSafeRate(
  depth_m: number,
  ascentRate_m_per_min: number,
  stops: { depth_m: number; duration_min: number }[] = []
): number {
  let totalTime = 0;
  let currentDepth = depth_m;

  const sortedStops = [...stops].sort((a, b) => b.depth_m - a.depth_m);

  for (const stop of sortedStops) {
    if (stop.depth_m < currentDepth) {
      totalTime += (currentDepth - stop.depth_m) / ascentRate_m_per_min;
      totalTime += stop.duration_min;
      currentDepth = stop.depth_m;
    }
  }

  if (currentDepth > 0) {
    totalTime += currentDepth / ascentRate_m_per_min;
  }

  return totalTime;
}

export function calculateDecoStops(
  endBottomTensions: number[],
  bottomDepth_m: number,
  ascentRate_m_per_min: number
): { depth_m: number; duration_min: number }[] {
  const stops: { depth_m: number; duration_min: number }[] = [];
  let tensions = [...endBottomTensions];
  let currentDepth = bottomDepth_m;

  if (canAscendTo(tensions, bottomDepth_m, 0, ascentRate_m_per_min)) {
    return stops;
  }

  while (currentDepth > 0) {
    let nextStopDepth = Math.max(
      0,
      currentDepth - DECO_STOP_INCREMENT_m
    );
    nextStopDepth =
      Math.round(nextStopDepth / DECO_STOP_INCREMENT_m) *
      DECO_STOP_INCREMENT_m;

    tensions = linearDepthChangeTensions(
      tensions,
      currentDepth,
      nextStopDepth,
      (currentDepth - nextStopDepth) / ascentRate_m_per_min
    );
    currentDepth = nextStopDepth;

    if (currentDepth <= 0) break;

    const stopDuration = requiredStopDuration(
      tensions,
      currentDepth,
      ascentRate_m_per_min
    );
    if (stopDuration > 0) {
      stops.push({ depth_m: currentDepth, duration_min: stopDuration });
      tensions = constantDepthTensionChange(
        tensions,
        currentDepth,
        stopDuration
      );
    }

    if (canAscendTo(tensions, currentDepth, 0, ascentRate_m_per_min)) {
      break;
    }
  }

  return stops;
}

function requiredStopDuration(
  tensions: number[],
  stopDepth_m: number,
  ascentRate_m_per_min: number
): number {
  const nextDepth = Math.max(
    0,
    Math.round((stopDepth_m - DECO_STOP_INCREMENT_m) / DECO_STOP_INCREMENT_m) *
      DECO_STOP_INCREMENT_m
  );

  if (canAscendTo(tensions, stopDepth_m, nextDepth, ascentRate_m_per_min)) {
    return 0;
  }

  let lo = 0;
  let hi = 1;
  const isOk = (t: number): boolean => {
    const newTensions = constantDepthTensionChange(tensions, stopDepth_m, t);
    return canAscendTo(newTensions, stopDepth_m, nextDepth, ascentRate_m_per_min);
  };

  while (!isOk(hi) && hi < 60) hi *= 2;
  if (hi >= 60 && !isOk(60)) return Math.ceil(hi / 2);

  for (let iter = 0; iter < 25; iter++) {
    const mid = (lo + hi) / 2;
    if (isOk(mid)) hi = mid;
    else lo = mid;
  }

  return Math.max(1, Math.ceil((lo + hi) / 2));
}

export function addSafetyStopIfNeeded(
  stops: { depth_m: number; duration_min: number }[],
  bottomDepth_m: number,
  bottomTime_min: number,
  ndlRemaining_min: number
): { depth_m: number; duration_min: number }[] {
  const hasDeco = stops.length > 0;
  const isDeep = bottomDepth_m >= 30;
  const isCloseToNDL = ndlRemaining_min < 5;
  const isLongDive = bottomTime_min >= 30;

  if (hasDeco || isDeep || isCloseToNDL || isLongDive) {
    const existing5mStop = stops.find(
      (s) => s.depth_m === SAFETY_STOP_DEPTH_m
    );
    if (existing5mStop) {
      existing5mStop.duration_min = Math.max(
        existing5mStop.duration_min,
        SAFETY_STOP_DURATION_min
      );
    } else {
      stops.push({
        depth_m: SAFETY_STOP_DEPTH_m,
        duration_min: SAFETY_STOP_DURATION_min,
      });
    }
  }

  return stops.sort((a, b) => b.depth_m - a.depth_m);
}

export { compartmentSuperSaturationRatio, calculateMValue };
