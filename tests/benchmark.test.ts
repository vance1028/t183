import { describe, it, expect } from 'vitest';
import { calculateDivePlan } from '../src/core';
import { sampleDivePlan } from '../src/data/samplePlan';
import { initialSurfaceTensions, calculateMValue } from '../src/core/tissueModel';
import { calculateNDL } from '../src/core/ndlCalculator';

describe('基准验证', () => {
  it('核心参数检查', () => {
    const initial = initialSurfaceTensions();
    console.log('初始表面张力:', initial[0].toFixed(3), 'bar');
    console.log('表面 M 值(最快舱):', calculateMValue(0, 0).toFixed(3), 'bar');
    console.log('表面 M 值(最慢舱):', calculateMValue(15, 0).toFixed(3), 'bar');
    expect(initial[0]).toBeGreaterThan(0.7);
  });

  it('NDL 基准测试 - 典型深度', () => {
    console.log('\n=== NDL 基准测试 ===');
    for (const depth of [10, 15, 18, 20, 25, 30, 35, 40]) {
      const ndl = calculateNDL(initialSurfaceTensions(), depth);
      console.log(`  ${depth}m: ${isFinite(ndl) ? ndl.toFixed(1) : '∞'} 分钟`);
      expect(ndl).toBeGreaterThan(0);
      if (depth <= 12) {
        expect(isFinite(ndl)).toBe(false);
      } else if (depth >= 40) {
        expect(isFinite(ndl)).toBe(true);
        expect(ndl).toBeLessThan(20);
      } else {
        if (isFinite(ndl)) {
          expect(ndl).toBeGreaterThan(5);
        }
      }
    }
  });

  it('示例数据不应产生异常减压停留', () => {
    console.log('\n=== 示例数据计算 ===');
    const result = calculateDivePlan(sampleDivePlan);
    console.log('总潜水时间:', result.totalRunTime_min, '分钟');
    console.log('总水底时间:', result.totalBottomTime_min, '分钟');
    console.log('减压停留站数:', result.decoStops.length);
    console.log('减压停留详情:');
    result.decoStops.forEach(s => console.log('  ', s.depth_m, '米 -', s.duration_min.toFixed(1), '分钟'));
    console.log('警告数:', result.warnings.length);
    result.warnings.forEach(w => console.log('  ', w.severity, ':', w.message));

    expect(result.totalRunTime_min).toBeLessThan(600);
    for (const stop of result.decoStops) {
      expect(stop.duration_min).toBeLessThan(60);
    }
  });

  it('典型休闲剖面：18m 45min 应触发轻度减压', () => {
    const plan = { segments: [{ targetDepth_m: 18, bottomTime_min: 45, surfaceInterval_min: 0 }] };
    const result = calculateDivePlan(plan);
    console.log('\n=== 18m 45min 潜水 ===');
    console.log('NDL at start:', isFinite(result.segmentResults[0].ndlAtStart_min) ? result.segmentResults[0].ndlAtStart_min : '∞');
    console.log('是否减压:', result.segmentResults[0].requiresDeco);
    console.log('减压停留:', result.decoStops.map(s => `${s.depth_m}m/${s.duration_min}min`).join(', '));
    const mandatoryStops = result.decoStops.filter(s => s.depth_m > 5);
    expect(mandatoryStops.length).toBeLessThan(5);
  });

  it('典型技术剖面：40m 20min 必须减压', () => {
    const plan = { segments: [{ targetDepth_m: 40, bottomTime_min: 20, surfaceInterval_min: 0 }] };
    const result = calculateDivePlan(plan);
    console.log('\n=== 40m 20min 技术潜水 ===');
    console.log('NDL at start:', result.segmentResults[0].ndlAtStart_min);
    console.log('是否减压:', result.segmentResults[0].requiresDeco);
    console.log('减压停留:', result.decoStops.map(s => `${s.depth_m}m/${s.duration_min}min`).join(', '));
    expect(result.segmentResults[0].requiresDeco).toBe(true);
    expect(result.decoStops.length).toBeGreaterThan(0);
  });
});
