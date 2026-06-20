import { describe, it, expect } from 'vitest';
import { calculateDivePlan, DivePlan } from '@/core';

function createPlan(segments: {
  depth: number;
  time: number;
  surface?: number;
}[]): DivePlan {
  return {
    segments: segments.map((s) => ({
      targetDepth_m: s.depth,
      bottomTime_min: s.time,
      surfaceInterval_min: s.surface ?? 0,
    })),
  };
}

describe('multiDive - 多段潜水残留衔接', () => {
  it('第二段潜水的初始张力应高于表面初始值', () => {
    const plan = createPlan([
      { depth: 30, time: 20, surface: 60 },
      { depth: 20, time: 30 },
    ]);
    const result = calculateDivePlan(plan);
    expect(result.segmentResults.length).toBe(2);

    const segment1Descent = result.profile.filter(
      (p) => p.segmentIndex === 1 && p.phase === 'descent'
    );
    expect(segment1Descent.length).toBeGreaterThan(0);

    const startOfSeg1 = segment1Descent[0].tissueTensions_bar;
    const surfacePN2 = 0.79 * (1.0 - 0.0627);
    let hasHigher = false;
    for (let i = 0; i < startOfSeg1.length; i++) {
      if (startOfSeg1[i] > surfacePN2 + 0.001) {
        hasHigher = true;
        break;
      }
    }
    expect(hasHigher).toBe(true);
  });

  it('第二段的 NDL 应比干净状态短', () => {
    const planWithResidue = createPlan([
      { depth: 30, time: 20, surface: 15 },
      { depth: 25, time: 1 },
    ]);
    const planClean = createPlan([{ depth: 25, time: 1 }]);

    const resultWith = calculateDivePlan(planWithResidue);
    const resultClean = calculateDivePlan(planClean);

    const ndlWith = resultWith.segmentResults[1].ndlAtStart_min;
    const ndlClean = resultClean.segmentResults[0].ndlAtStart_min;
    expect(ndlWith).toBeLessThan(ndlClean + 0.001);
    expect(ndlClean).toBeGreaterThan(0);
  });

  it('长时间水面间歇后 NDL 应大部分恢复', () => {
    const planShortSI = createPlan([
      { depth: 30, time: 25, surface: 15 },
      { depth: 25, time: 1 },
    ]);
    const planLongSI = createPlan([
      { depth: 30, time: 25, surface: 180 },
      { depth: 25, time: 1 },
    ]);

    const resultShort = calculateDivePlan(planShortSI);
    const resultLong = calculateDivePlan(planLongSI);

    const ndlShort = resultShort.segmentResults[1].ndlAtStart_min;
    const ndlLong = resultLong.segmentResults[1].ndlAtStart_min;
    expect(ndlLong).toBeGreaterThanOrEqual(ndlShort - 0.001);
  });

  it('单段极浅水极短时间潜水应无强制减压', () => {
    const plan = createPlan([{ depth: 10, time: 15 }]);
    const result = calculateDivePlan(plan);
    const mandatoryDeco = result.decoStops.filter((s) => s.depth_m > 5);
    expect(mandatoryDeco.length).toBe(0);
    expect(result.segmentResults[0].requiresDeco).toBe(false);
  });

  it('超限潜水应触发减压停留', () => {
    const plan = createPlan([{ depth: 55, time: 30 }]);
    const result = calculateDivePlan(plan);
    expect(result.segmentResults[0].requiresDeco).toBe(true);
    expect(result.decoStops.length).toBeGreaterThan(0);
    const ndlWarning = result.warnings.find((w) => w.type === 'ndl_exceeded');
    expect(ndlWarning).toBeDefined();
  });
});

describe('determinism - 结果一致性', () => {
  it('同一输入多次计算结果应完全一致', () => {
    const plan = createPlan([
      { depth: 30, time: 20, surface: 60 },
      { depth: 25, time: 25, surface: 90 },
      { depth: 18, time: 40 },
    ]);

    const results = Array.from({ length: 5 }, () => calculateDivePlan(plan));
    const first = results[0];

    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalDiveTime_min).toBeCloseTo(first.totalDiveTime_min, 6);
      expect(results[i].overallGasLoad).toBeCloseTo(first.overallGasLoad, 6);
      expect(results[i].decoStops.length).toBe(first.decoStops.length);
      expect(results[i].warnings.length).toBe(first.warnings.length);
      expect(results[i].profile.length).toBe(first.profile.length);
      expect(results[i].segmentResults.length).toBe(first.segmentResults.length);

      for (let j = 0; j < first.segmentResults.length; j++) {
        expect(results[i].segmentResults[j].ndlAtStart_min).toBeCloseTo(
          first.segmentResults[j].ndlAtStart_min,
          4
        );
        expect(results[i].segmentResults[j].ndlRemaining_min).toBeCloseTo(
          first.segmentResults[j].ndlRemaining_min,
          4
        );
        expect(results[i].segmentResults[j].requiresDeco).toBe(
          first.segmentResults[j].requiresDeco
        );
      }

      for (let j = 0; j < first.profile.length; j++) {
        expect(results[i].profile[j].time_min).toBeCloseTo(
          first.profile[j].time_min,
          6
        );
        expect(results[i].profile[j].depth_m).toBeCloseTo(
          first.profile[j].depth_m,
          6
        );
        for (let k = 0; k < first.profile[j].tissueTensions_bar.length; k++) {
          expect(results[i].profile[j].tissueTensions_bar[k]).toBeCloseTo(
            first.profile[j].tissueTensions_bar[k],
            8
          );
        }
      }
    }
  });

  it('空计划应能正常计算', () => {
    const plan = createPlan([]);
    const result = calculateDivePlan(plan);
    expect(result.profile.length).toBeGreaterThan(0);
    expect(result.totalDiveTime_min).toBe(0);
    expect(result.segmentResults.length).toBe(0);
    expect(result.decoStops.length).toBe(0);
    expect(result.warnings.length).toBe(0);
  });
});
