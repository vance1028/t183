import {
  BUHLMANN_ZHL16C,
  NUM_COMPARTMENTS,
  ambientN2Pressure,
  compartmentK,
  calculateMValue,
  compartmentSuperSaturationRatio,
  leadingCompartmentIndex,
  constantDepthTensionChange,
  linearDepthChangeTensions,
} from './tissueModel';
import {
  DECO_STOP_INCREMENT_m,
  SAFETY_STOP_DEPTH_m,
  SAFETY_STOP_DURATION_min,
  SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
} from './types';

function surfaceTensionAfterAscent(
  bottomTension: number,
  compartmentIndex: number,
  bottomDepth_m: number,
  ascentRate_m_per_min: number
): number {
  const duration = bottomDepth_m / ascentRate_m_per_min;
  if (duration <= 0) return bottomTension;
  const k = compartmentK(BUHLMANN_ZHL16C[compartmentIndex].halfLife_min);
  const P_alv_start = ambientN2Pressure(bottomDepth_m);
  const P_alv_end = ambientN2Pressure(0);
  const R = (P_alv_end - P_alv_start) / duration;

  const exp_kt = Math.exp(-k * duration);
  return (
    P_alv_start +
    R * (duration - 1 / k) +
    (bottomTension - P_alv_start + R / k) * exp_kt
  );
}

function compartmentCanSurfaceSafely(
  bottomTension: number,
  compartmentIndex: number,
  bottomDepth_m: number,
  ascentRate_m_per_min: number
): boolean {
  const surfaceTension = surfaceTensionAfterAscent(
    bottomTension,
    compartmentIndex,
    bottomDepth_m,
    ascentRate_m_per_min
  );
  const surfaceMValue = calculateMValue(compartmentIndex, 0);
  return surfaceTension <= surfaceMValue + 1e-6;
}

function canDiveSurfaceSafely(
  bottomTensions: number[],
  bottomDepth_m: number,
  ascentRate_m_per_min: number
): boolean {
  for (let i = 0; i < NUM_COMPARTMENTS; i++) {
    if (
      !compartmentCanSurfaceSafely(
        bottomTensions[i],
        i,
        bottomDepth_m,
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

  const isSafe = (t_min: number): boolean => {
    const tensions = tensionsAtBottom(t_min);
    return canDiveSurfaceSafely(tensions, depth_m, ascentRate_m_per_min);
  };

  if (isSafe(0) === false) return 0;

  let lo = 0;
  let hi = 1;
  while (isSafe(hi) && hi < 10000) hi *= 2;

  if (hi >= 10000 && isSafe(10000)) return Infinity;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    if (isSafe(mid)) {
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

  if (canDiveSurfaceSafely(tensions, bottomDepth_m, ascentRate_m_per_min)) {
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

    if (
      stops.length > 0 &&
      canDiveSurfaceSafely(tensions, currentDepth, ascentRate_m_per_min)
    ) {
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
  if (canDiveSurfaceSafely(tensions, stopDepth_m, ascentRate_m_per_min)) {
    return 0;
  }

  const leadingIdx = leadingCompartmentIndex(tensions, stopDepth_m);
  const comp = BUHLMANN_ZHL16C[leadingIdx];
  const k = compartmentK(comp.halfLife_min);
  const P_alv = ambientN2Pressure(stopDepth_m);

  let lo = 0;
  let hi = 1;
  const isOk = (t: number): boolean => {
    const newTensions = constantDepthTensionChange(tensions, stopDepth_m, t);
    return canDiveSurfaceSafely(newTensions, stopDepth_m, ascentRate_m_per_min);
  };

  while (!isOk(hi) && hi < 1000) hi *= 2;
  if (hi >= 1000 && !isOk(1000)) return 60;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    if (isOk(mid)) hi = mid;
    else lo = mid;
  }

  return Math.ceil((lo + hi) / 2);
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
