import { describe, it, expect } from 'vitest';
import { validateAscentRate, calculateAscentDuration } from '@/core/ascentValidator';
import { SAFE_ASCENT_RATE_RECREATIONAL_m_per_min, SAFE_ASCENT_RATE_TECHNICAL_m_per_min } from '@/core/types';

describe('ascentValidator - 上升速率校验', () => {
  it('正常上升速率不应产生警告', () => {
    const result = validateAscentRate(18, 3);
    expect(result.maxRate_m_per_min).toBeCloseTo(6, 3);
    expect(result.warnings.length).toBe(0);
  });

  it('休闲潜水 9 m/min 边界不应警告', () => {
    const result = validateAscentRate(
      SAFE_ASCENT_RATE_RECREATIONAL_m_per_min * 2,
      2
    );
    expect(result.maxRate_m_per_min).toBeCloseTo(
      SAFE_ASCENT_RATE_RECREATIONAL_m_per_min,
      3
    );
    expect(result.warnings.length).toBe(0);
  });

  it('休闲潜水超过 9 m/min 应产生警告', () => {
    const result = validateAscentRate(30, 2);
    expect(result.maxRate_m_per_min).toBeCloseTo(15, 3);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].type).toBe('ascent_rate');
  });

  it('技术潜水 6 m/min 边界不应警告', () => {
    const result = validateAscentRate(
      SAFE_ASCENT_RATE_TECHNICAL_m_per_min * 2,
      2,
      undefined,
      true
    );
    expect(result.warnings.length).toBe(0);
  });

  it('技术潜水超过 6 m/min 应产生警告', () => {
    const result = validateAscentRate(21, 3, undefined, true);
    expect(result.maxRate_m_per_min).toBeCloseTo(7, 3);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('速率严重超限时应为 danger 级别', () => {
    const result = validateAscentRate(60, 3);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].severity).toBe('danger');
  });

  it('速率刚超限时应为 warning 级别', () => {
    const result = validateAscentRate(28, 3);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].severity).toBe('warning');
  });

  it('时长为 0 不应报错', () => {
    const result = validateAscentRate(10, 0);
    expect(result.maxRate_m_per_min).toBe(0);
    expect(result.warnings.length).toBe(0);
  });
});

describe('ascentValidator - 时长计算', () => {
  it('calculateAscentDuration 应正确计算时间', () => {
    expect(calculateAscentDuration(30, 0, 9)).toBeCloseTo(30 / 9, 5);
    expect(calculateAscentDuration(18, 0, 6)).toBeCloseTo(3, 5);
    expect(calculateAscentDuration(0, 0, 9)).toBe(0);
  });
});
