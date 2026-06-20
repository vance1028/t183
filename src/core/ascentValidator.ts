import {
  SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
  SAFE_ASCENT_RATE_TECHNICAL_m_per_min,
  Warning,
} from './types';

export interface AscentValidation {
  maxRate_m_per_min: number;
  warnings: Warning[];
}

export function validateAscentRate(
  depthChange_m: number,
  duration_min: number,
  segmentIndex?: number,
  isTechnicalDive: boolean = false
): AscentValidation {
  const warnings: Warning[] = [];
  if (duration_min <= 0) {
    return { maxRate_m_per_min: 0, warnings };
  }

  const rate = depthChange_m / duration_min;
  const safeRate = isTechnicalDive
    ? SAFE_ASCENT_RATE_TECHNICAL_m_per_min
    : SAFE_ASCENT_RATE_RECREATIONAL_m_per_min;

  if (rate > safeRate) {
    warnings.push({
      type: 'ascent_rate',
      message: `上升速率过快：${rate.toFixed(1)} 米/分钟，安全上限为 ${safeRate} 米/分钟`,
      severity: rate > safeRate * 1.3 ? 'danger' : 'warning',
      segmentIndex,
    });
  }

  return { maxRate_m_per_min: rate, warnings };
}

export function calculateAscentDuration(
  startDepth_m: number,
  endDepth_m: number,
  rate_m_per_min: number
): number {
  if (rate_m_per_min <= 0) return 0;
  return Math.max(0, (startDepth_m - endDepth_m) / rate_m_per_min);
}

export function calculateDescentDuration(
  startDepth_m: number,
  endDepth_m: number,
  rate_m_per_min: number
): number {
  if (rate_m_per_min <= 0) return 0;
  return Math.max(0, (endDepth_m - startDepth_m) / rate_m_per_min);
}
