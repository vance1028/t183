import { describe, it, expect } from 'vitest';
import {
  calculateNDL,
  calculateDecoStops,
  addSafetyStopIfNeeded,
} from '@/core/ndlCalculator';
import {
  initialSurfaceTensions,
  constantDepthTensionChange,
  linearDepthChangeTensions,
} from '@/core/tissueModel';
import { SAFE_ASCENT_RATE_RECREATIONAL_m_per_min } from '@/core/types';

describe('ndlCalculator - NDL 计算', () => {
  it('表面 NDL 应为无穷大', () => {
    const initial = initialSurfaceTensions();
    const ndl = calculateNDL(initial, 0);
    expect(ndl).toBe(Infinity);
  });

  it('浅水 NDL 应比深水长', () => {
    const initial = initialSurfaceTensions();
    const ndl10 = calculateNDL(initial, 10);
    const ndl40 = calculateNDL(initial, 40);
    expect(ndl10).toBeGreaterThan(ndl40);
  });

  it('30m 空气潜水 NDL 应为正的有限值', () => {
    const initial = initialSurfaceTensions();
    const ndl = calculateNDL(initial, 30);
    expect(ndl).toBeGreaterThan(0);
    expect(ndl).toBeLessThan(120);
    expect(isFinite(ndl)).toBe(true);
  });

  it('20m 空气潜水 NDL 应为正的有限值且大于 30m', () => {
    const initial = initialSurfaceTensions();
    const ndl30 = calculateNDL(initial, 30);
    const ndl20 = calculateNDL(initial, 20);
    expect(ndl20).toBeGreaterThan(ndl30);
    expect(ndl20).toBeGreaterThan(0);
    expect(isFinite(ndl20)).toBe(true);
  });

  it('有残留气体时 NDL 应缩短', () => {
    const clean = initialSurfaceTensions();
    const withResidue = clean.map((t) => t * 1.2);
    const ndlClean = calculateNDL(clean, 30);
    const ndlResidue = calculateNDL(withResidue, 30);
    expect(ndlResidue).toBeLessThan(ndlClean);
  });
});

describe('ndlCalculator - 减压停留', () => {
  it('极短时间浅水潜水不应产生强制减压停留（>5m）', () => {
    let t = initialSurfaceTensions();
    t = linearDepthChangeTensions(t, 0, 12, 0.6);
    t = constantDepthTensionChange(t, 12, 10);
    const stops = calculateDecoStops(t, 12, SAFE_ASCENT_RATE_RECREATIONAL_m_per_min);
    const mandatoryStops = stops.filter((s) => s.depth_m > 5);
    expect(mandatoryStops.length).toBe(0);
  });

  it('深水长时间潜水应产生减压停留', () => {
    let t = initialSurfaceTensions();
    t = linearDepthChangeTensions(t, 0, 50, 2.5);
    t = constantDepthTensionChange(t, 50, 25);
    const stops = calculateDecoStops(t, 50, SAFE_ASCENT_RATE_RECREATIONAL_m_per_min);
    expect(stops.length).toBeGreaterThan(0);
    for (const stop of stops) {
      expect(stop.depth_m).toBeGreaterThan(0);
      expect(stop.depth_m).toBeLessThan(50);
      expect(stop.duration_min).toBeGreaterThan(0);
    }
  });

  it('减压停留深度应按降序排列', () => {
    let t = initialSurfaceTensions();
    t = linearDepthChangeTensions(t, 0, 55, 2.75);
    t = constantDepthTensionChange(t, 55, 30);
    const stops = calculateDecoStops(t, 55, SAFE_ASCENT_RATE_RECREATIONAL_m_per_min);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].depth_m).toBeLessThanOrEqual(stops[i - 1].depth_m);
    }
  });
});

describe('ndlCalculator - 安全停留', () => {
  it('深潜应自动添加安全停留', () => {
    const stops = addSafetyStopIfNeeded([], 35, 15, 10);
    const has5m = stops.find((s) => s.depth_m === 5);
    expect(has5m).toBeDefined();
    expect(has5m!.duration_min).toBeGreaterThanOrEqual(3);
  });

  it('接近 NDL 时应自动添加安全停留', () => {
    const stops = addSafetyStopIfNeeded([], 20, 45, 2);
    const has5m = stops.find((s) => s.depth_m === 5);
    expect(has5m).toBeDefined();
  });

  it('长时间潜水应自动添加安全停留', () => {
    const stops = addSafetyStopIfNeeded([], 18, 35, 20);
    const has5m = stops.find((s) => s.depth_m === 5);
    expect(has5m).toBeDefined();
  });

  it('短时间浅水免减压潜水无需安全停留', () => {
    const stops = addSafetyStopIfNeeded([], 15, 20, 30);
    const has5m = stops.find((s) => s.depth_m === 5);
    expect(has5m).toBeUndefined();
  });

  it('已有 5m 停留时应延长而不是重复添加', () => {
    const stops = addSafetyStopIfNeeded([{ depth_m: 5, duration_min: 2 }], 35, 20, 5);
    const matches = stops.filter((s) => s.depth_m === 5);
    expect(matches.length).toBe(1);
    expect(matches[0].duration_min).toBeGreaterThanOrEqual(3);
  });
});
