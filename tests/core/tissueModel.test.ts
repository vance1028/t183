import { describe, it, expect } from 'vitest';
import {
  depthToPressure,
  pressureToDepth,
  ambientN2Pressure,
  initialSurfaceTensions,
  constantDepthTensionChange,
  linearDepthChangeTensions,
  calculateMValue,
  BUHLMANN_ZHL16C,
  NUM_COMPARTMENTS,
} from '@/core/tissueModel';

describe('tissueModel - 单位转换', () => {
  it('depthToPressure 应正确转换深度为绝对压力', () => {
    expect(depthToPressure(0)).toBeCloseTo(1.0, 3);
    expect(depthToPressure(10)).toBeCloseTo(2.0, 3);
    expect(depthToPressure(30)).toBeCloseTo(4.0, 3);
  });

  it('pressureToDepth 应正确转换绝对压力为深度', () => {
    expect(pressureToDepth(1.0)).toBeCloseTo(0, 3);
    expect(pressureToDepth(2.0)).toBeCloseTo(10, 3);
    expect(pressureToDepth(4.0)).toBeCloseTo(30, 3);
  });

  it('depthToPressure 与 pressureToDepth 应互为逆运算', () => {
    for (let d = 0; d <= 60; d += 5) {
      expect(pressureToDepth(depthToPressure(d))).toBeCloseTo(d, 5);
    }
  });
});

describe('tissueModel - 初始状态', () => {
  it('初始表面张力所有舱应等于表面 N2 分压', () => {
    const tensions = initialSurfaceTensions();
    expect(tensions.length).toBe(NUM_COMPARTMENTS);
    const pN2Surface = ambientN2Pressure(0);
    for (const t of tensions) {
      expect(t).toBeCloseTo(pN2Surface, 5);
    }
  });
});

describe('tissueModel - Buhlmann ZH-L16C 参数', () => {
  it('应定义 16 个组织舱', () => {
    expect(BUHLMANN_ZHL16C.length).toBe(16);
    expect(NUM_COMPARTMENTS).toBe(16);
  });

  it('半排期应递增', () => {
    for (let i = 1; i < BUHLMANN_ZHL16C.length; i++) {
      expect(BUHLMANN_ZHL16C[i].halfLife_min).toBeGreaterThan(
        BUHLMANN_ZHL16C[i - 1].halfLife_min
      );
    }
  });

  it('a 值应递减', () => {
    for (let i = 1; i < BUHLMANN_ZHL16C.length; i++) {
      expect(BUHLMANN_ZHL16C[i].aMvalue).toBeLessThan(
        BUHLMANN_ZHL16C[i - 1].aMvalue
      );
    }
  });

  it('b 值应递增', () => {
    for (let i = 1; i < BUHLMANN_ZHL16C.length; i++) {
      expect(BUHLMANN_ZHL16C[i].bMvalue).toBeGreaterThan(
        BUHLMANN_ZHL16C[i - 1].bMvalue
      );
    }
  });
});

describe('tissueModel - 恒定深度张力变化', () => {
  it('长时间在深度应趋近于该深度的 N2 分压', () => {
    const initial = initialSurfaceTensions();
    const depth = 30;
    const result = constantDepthTensionChange(initial, depth, 10000);
    const target = ambientN2Pressure(depth);
    for (let i = 0; i < result.length; i++) {
      expect(Math.abs(result[i] - target)).toBeLessThan(0.05);
    }
  });

  it('时间为 0 时张力不应变化', () => {
    const initial = initialSurfaceTensions();
    const result = constantDepthTensionChange(initial, 30, 0);
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(initial[i], 6);
    }
  });

  it('快组织舱（半排期短）的张力变化比慢舱快', () => {
    const initial = initialSurfaceTensions();
    const result = constantDepthTensionChange(initial, 40, 10);
    const target = ambientN2Pressure(40);
    const pN2Surface = ambientN2Pressure(0);
    const fastRatio = (result[0] - pN2Surface) / (target - pN2Surface);
    const slowRatio = (result[15] - pN2Surface) / (target - pN2Surface);
    expect(fastRatio).toBeGreaterThan(slowRatio);
  });
});

describe('tissueModel - M 值', () => {
  it('表面 M 值应等于 a + b', () => {
    for (let i = 0; i < NUM_COMPARTMENTS; i++) {
      const mVal = calculateMValue(i, 0);
      const expected = BUHLMANN_ZHL16C[i].aMvalue + BUHLMANN_ZHL16C[i].bMvalue * 1.0;
      expect(mVal).toBeCloseTo(expected, 5);
    }
  });

  it('更深的深度 M 值应更大', () => {
    for (let i = 0; i < NUM_COMPARTMENTS; i++) {
      const m0 = calculateMValue(i, 0);
      const m30 = calculateMValue(i, 30);
      expect(m30).toBeGreaterThan(m0);
    }
  });
});

describe('tissueModel - 线性深度变化', () => {
  it('从表面下潜到 30m 再回到表面后张力应高于初始值', () => {
    const initial = initialSurfaceTensions();
    const afterDescent = linearDepthChangeTensions(initial, 0, 30, 1.5);
    const afterAscent = linearDepthChangeTensions(afterDescent, 30, 0, 3.5);
    for (let i = 0; i < afterAscent.length; i++) {
      expect(afterAscent[i]).toBeGreaterThan(initial[i]);
    }
  });

  it('深度变化为 0 时结果应等于恒定深度', () => {
    const initial = initialSurfaceTensions();
    const linear = linearDepthChangeTensions(initial, 20, 20, 10);
    const constant = constantDepthTensionChange(initial, 20, 10);
    for (let i = 0; i < linear.length; i++) {
      expect(linear[i]).toBeCloseTo(constant[i], 4);
    }
  });
});
