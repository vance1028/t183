import {
  DiveSegment,
  DivePlan,
  ProfilePoint,
  DecoStop,
  SegmentResult,
  Warning,
  CalculationResult,
  DESCENT_RATE_m_per_min,
  SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
  ProfilePhase,
} from './types';
import {
  initialSurfaceTensions,
  linearDepthChangeTensions,
  constantDepthTensionChange,
  overallGasLoad,
} from './tissueModel';
import { calculateNDL, calculateDecoStops, addSafetyStopIfNeeded } from './ndlCalculator';
import { validateAscentRate, calculateAscentDuration, calculateDescentDuration } from './ascentValidator';

interface SimulatedPhase {
  points: ProfilePoint[];
  endTensions: number[];
  endTime: number;
  endDepth: number;
  maxAscentRate: number;
}

function simulateDescent(
  startTime: number,
  startDepth: number,
  endDepth: number,
  startTensions: number[],
  segmentIndex: number
): SimulatedPhase {
  const duration = calculateDescentDuration(startDepth, endDepth, DESCENT_RATE_m_per_min);
  const steps = Math.max(2, Math.ceil(duration * 4));
  const dt = duration / steps;
  const points: ProfilePoint[] = [];
  let tensions = [...startTensions];

  for (let i = 0; i <= steps; i++) {
    const t = startTime + i * dt;
    const d = startDepth + ((endDepth - startDepth) * i) / steps;
    if (i > 0) {
      const prevDepth = points[points.length - 1].depth_m;
      tensions = linearDepthChangeTensions(tensions, prevDepth, d, dt);
    }
    points.push({
      time_min: t,
      depth_m: d,
      tissueTensions_bar: [...tensions],
      phase: 'descent',
      segmentIndex,
    });
  }

  return {
    points,
    endTensions: tensions,
    endTime: startTime + duration,
    endDepth,
    maxAscentRate: 0,
  };
}

function simulateBottom(
  startTime: number,
  depth: number,
  duration: number,
  startTensions: number[],
  segmentIndex: number
): SimulatedPhase {
  const steps = Math.max(2, Math.ceil(duration * 2));
  const dt = duration / steps;
  const points: ProfilePoint[] = [];
  let tensions = [...startTensions];

  for (let i = 0; i <= steps; i++) {
    const t = startTime + i * dt;
    if (i > 0) {
      tensions = constantDepthTensionChange(tensions, depth, dt);
    }
    points.push({
      time_min: t,
      depth_m: depth,
      tissueTensions_bar: [...tensions],
      phase: 'bottom',
      segmentIndex,
    });
  }

  return {
    points,
    endTensions: tensions,
    endTime: startTime + duration,
    endDepth: depth,
    maxAscentRate: 0,
  };
}

function simulateAscentWithDeco(
  startTime: number,
  startDepth: number,
  startTensions: number[],
  segmentIndex: number,
  decoStopsInput: { depth_m: number; duration_min: number }[]
): SimulatedPhase {
  const points: ProfilePoint[] = [];
  let tensions = [...startTensions];
  let currentTime = startTime;
  let currentDepth = startDepth;
  let maxRate = 0;
  const rate = SAFE_ASCENT_RATE_RECREATIONAL_m_per_min;

  const sortedStops = [...decoStopsInput].sort((a, b) => b.depth_m - a.depth_m);

  for (const stop of sortedStops) {
    if (stop.depth_m >= currentDepth) continue;

    const ascentDuration = calculateAscentDuration(currentDepth, stop.depth_m, rate);
    const validation = validateAscentRate(currentDepth - stop.depth_m, ascentDuration, segmentIndex);
    maxRate = Math.max(maxRate, validation.maxRate_m_per_min);

    const ascentSteps = Math.max(2, Math.ceil(ascentDuration * 4));
    const dtAscent = ascentDuration / ascentSteps;
    for (let i = 1; i <= ascentSteps; i++) {
      const t = currentTime + i * dtAscent;
      const d = currentDepth - ((currentDepth - stop.depth_m) * i) / ascentSteps;
      const prevDepth = points.length > 0 ? points[points.length - 1].depth_m : currentDepth;
      tensions = linearDepthChangeTensions(tensions, prevDepth, d, dtAscent);
      points.push({
        time_min: t,
        depth_m: d,
        tissueTensions_bar: [...tensions],
        phase: 'ascent',
        segmentIndex,
      });
    }
    currentTime += ascentDuration;
    currentDepth = stop.depth_m;

    const stopSteps = Math.max(2, Math.ceil(stop.duration_min * 2));
    const dtStop = stop.duration_min / stopSteps;
    for (let i = 1; i <= stopSteps; i++) {
      const t = currentTime + i * dtStop;
      tensions = constantDepthTensionChange(tensions, stop.depth_m, dtStop);
      points.push({
        time_min: t,
        depth_m: stop.depth_m,
        tissueTensions_bar: [...tensions],
        phase: 'deco',
        segmentIndex,
      });
    }
    currentTime += stop.duration_min;
  }

  if (currentDepth > 0) {
    const ascentDuration = calculateAscentDuration(currentDepth, 0, rate);
    const validation = validateAscentRate(currentDepth, ascentDuration, segmentIndex);
    maxRate = Math.max(maxRate, validation.maxRate_m_per_min);

    const steps = Math.max(2, Math.ceil(ascentDuration * 4));
    const dt = ascentDuration / steps;
    for (let i = 1; i <= steps; i++) {
      const t = currentTime + i * dt;
      const d = currentDepth - (currentDepth * i) / steps;
      const prevDepth = points.length > 0 ? points[points.length - 1].depth_m : currentDepth;
      tensions = linearDepthChangeTensions(tensions, prevDepth, d, dt);
      points.push({
        time_min: t,
        depth_m: d,
        tissueTensions_bar: [...tensions],
        phase: 'ascent',
        segmentIndex,
      });
    }
    currentTime += ascentDuration;
    currentDepth = 0;
  }

  return {
    points,
    endTensions: tensions,
    endTime: currentTime,
    endDepth: currentDepth,
    maxAscentRate: maxRate,
  };
}

function simulateSurfaceInterval(
  startTime: number,
  duration: number,
  startTensions: number[]
): SimulatedPhase {
  if (duration <= 0) {
    return {
      points: [],
      endTensions: [...startTensions],
      endTime: startTime,
      endDepth: 0,
      maxAscentRate: 0,
    };
  }

  const steps = Math.max(2, Math.ceil(duration * 0.5));
  const dt = duration / steps;
  const points: ProfilePoint[] = [];
  let tensions = [...startTensions];

  for (let i = 0; i <= steps; i++) {
    const t = startTime + i * dt;
    if (i > 0) {
      tensions = constantDepthTensionChange(tensions, 0, dt);
    }
    points.push({
      time_min: t,
      depth_m: 0,
      tissueTensions_bar: [...tensions],
      phase: 'surface',
    });
  }

  return {
    points,
    endTensions: tensions,
    endTime: startTime + duration,
    endDepth: 0,
    maxAscentRate: 0,
  };
}

export function calculateDivePlan(plan: DivePlan): CalculationResult {
  const allProfile: ProfilePoint[] = [];
  const segmentResults: SegmentResult[] = [];
  const allDecoStops: DecoStop[] = [];
  const allWarnings: Warning[] = [];

  let currentTensions = initialSurfaceTensions();
  let currentTime = 0;
  let totalBottomTime = 0;

  allProfile.push({
    time_min: 0,
    depth_m: 0,
    tissueTensions_bar: [...currentTensions],
    phase: 'surface',
  });

  for (let segIdx = 0; segIdx < plan.segments.length; segIdx++) {
    const segment = plan.segments[segIdx];

    const ndlAtStart = calculateNDL(currentTensions, segment.targetDepth_m);

    const descent = simulateDescent(
      currentTime,
      0,
      segment.targetDepth_m,
      currentTensions,
      segIdx
    );
    allProfile.push(...descent.points.slice(1));
    currentTensions = descent.endTensions;
    currentTime = descent.endTime;

    const bottom = simulateBottom(
      currentTime,
      segment.targetDepth_m,
      segment.bottomTime_min,
      currentTensions,
      segIdx
    );
    allProfile.push(...bottom.points.slice(1));
    currentTensions = bottom.endTensions;
    currentTime = bottom.endTime;
    totalBottomTime += segment.bottomTime_min;

    const rawDecoStops = calculateDecoStops(
      currentTensions,
      segment.targetDepth_m,
      SAFE_ASCENT_RATE_RECREATIONAL_m_per_min
    );

    const ndlRemaining = Math.max(0, ndlAtStart - segment.bottomTime_min);
    const ndlMargin = isFinite(ndlAtStart) ? ndlAtStart - segment.bottomTime_min : Infinity;
    const requiresDeco = rawDecoStops.length > 0;

    const decoStopsWithSafety = addSafetyStopIfNeeded(
      rawDecoStops,
      segment.targetDepth_m,
      segment.bottomTime_min,
      ndlRemaining
    );

    for (const stop of decoStopsWithSafety) {
      allDecoStops.push({ ...stop, segmentIndex: segIdx });
    }

    const ascent = simulateAscentWithDeco(
      currentTime,
      segment.targetDepth_m,
      currentTensions,
      segIdx,
      decoStopsWithSafety
    );
    allProfile.push(...ascent.points);
    const ascentWarnings = validateAscentRate(
      segment.targetDepth_m,
      segment.targetDepth_m / SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
      segIdx
    ).warnings;
    allWarnings.push(...ascentWarnings);
    currentTensions = ascent.endTensions;
    currentTime = ascent.endTime;

    segmentResults.push({
      segmentIndex: segIdx,
      ndlAtStart_min: isFinite(ndlAtStart) ? Math.round(ndlAtStart * 10) / 10 : Infinity,
      ndlRemaining_min: Math.round(ndlRemaining * 10) / 10,
      ndlMarginAtEnd_min: isFinite(ndlMargin) ? Math.round(ndlMargin * 10) / 10 : Infinity,
      requiresDeco,
      maxAscentRate_m_per_min: Math.round(ascent.maxAscentRate * 10) / 10,
      endTensions_bar: [...currentTensions],
    });

    if (segIdx < plan.segments.length - 1 && segment.surfaceInterval_min > 0) {
      const surface = simulateSurfaceInterval(
        currentTime,
        segment.surfaceInterval_min,
        currentTensions
      );
      allProfile.push(...surface.points.slice(1));
      currentTensions = surface.endTensions;
      currentTime = surface.endTime;
    }

    if (segment.bottomTime_min > ndlAtStart) {
      allWarnings.push({
        type: 'ndl_exceeded',
        message: `第 ${segIdx + 1} 段超过免减压极限：水下 ${segment.bottomTime_min} 分钟，NDL 仅 ${Math.round(ndlAtStart)} 分钟`,
        severity: 'danger',
        segmentIndex: segIdx,
      });
    } else if (ndlRemaining < 5 && isFinite(ndlAtStart)) {
      allWarnings.push({
        type: 'ndl_low',
        message: `第 ${segIdx + 1} 段 NDL 余量紧张：仅剩 ${Math.round(ndlRemaining)} 分钟`,
        severity: 'warning',
        segmentIndex: segIdx,
      });
    }
  }

  let maxGasLoad = 0;
  for (const pt of allProfile) {
    const load = overallGasLoad(pt.tissueTensions_bar, pt.depth_m);
    if (load > maxGasLoad) maxGasLoad = load;
  }

  return {
    profile: allProfile,
    segmentResults,
    decoStops: allDecoStops,
    warnings: allWarnings,
    totalDiveTime_min: Math.round(currentTime * 10) / 10,
    totalBottomTime_min: Math.round(totalBottomTime * 10) / 10,
    totalRunTime_min: Math.round(currentTime * 10) / 10,
    overallGasLoad: Math.round(maxGasLoad * 100) / 100,
  };
}

export * from './types';
export * from './tissueModel';
export * from './ndlCalculator';
export * from './ascentValidator';
