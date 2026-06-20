import {
  TissueCompartment,
  SURFACE_PRESSURE_bar,
  BAR_PER_METER,
  N2_FRACTION_AIR,
  WATER_VAPOR_PRESSURE_bar,
} from './types';

export const BUHLMANN_ZHL16C: TissueCompartment[] = [
  { halfLife_min: 4.0, aMvalue: 1.2599, bMvalue: 0.5050 },
  { halfLife_min: 8.0, aMvalue: 1.0000, bMvalue: 0.6514 },
  { halfLife_min: 12.5, aMvalue: 0.8618, bMvalue: 0.7222 },
  { halfLife_min: 18.5, aMvalue: 0.7562, bMvalue: 0.7725 },
  { halfLife_min: 27.0, aMvalue: 0.6667, bMvalue: 0.8125 },
  { halfLife_min: 38.3, aMvalue: 0.5933, bMvalue: 0.8434 },
  { halfLife_min: 54.3, aMvalue: 0.5282, bMvalue: 0.8693 },
  { halfLife_min: 77.0, aMvalue: 0.4701, bMvalue: 0.8910 },
  { halfLife_min: 109.0, aMvalue: 0.4187, bMvalue: 0.9092 },
  { halfLife_min: 146.0, aMvalue: 0.3798, bMvalue: 0.9222 },
  { halfLife_min: 187.0, aMvalue: 0.3497, bMvalue: 0.9319 },
  { halfLife_min: 239.0, aMvalue: 0.3223, bMvalue: 0.9403 },
  { halfLife_min: 305.0, aMvalue: 0.2971, bMvalue: 0.9477 },
  { halfLife_min: 390.0, aMvalue: 0.2737, bMvalue: 0.9544 },
  { halfLife_min: 498.0, aMvalue: 0.2523, bMvalue: 0.9602 },
  { halfLife_min: 635.0, aMvalue: 0.2327, bMvalue: 0.9653 },
];

export const NUM_COMPARTMENTS = BUHLMANN_ZHL16C.length;

export function depthToPressure(depth_m: number): number {
  return SURFACE_PRESSURE_bar + depth_m * BAR_PER_METER;
}

export function pressureToDepth(pressure_bar: number): number {
  return (pressure_bar - SURFACE_PRESSURE_bar) / BAR_PER_METER;
}

export function ambientN2Pressure(depth_m: number): number {
  return (depthToPressure(depth_m) - WATER_VAPOR_PRESSURE_bar) * N2_FRACTION_AIR;
}

export function initialSurfaceTensions(): number[] {
  const pN2Surface = ambientN2Pressure(0);
  return Array(NUM_COMPARTMENTS).fill(pN2Surface);
}

export function compartmentK(halfLife_min: number): number {
  return Math.LN2 / halfLife_min;
}

export function schreinerEquation(
  P0: number,
  P_alv_start: number,
  rateOfPressureChange_bar_per_min: number,
  k: number,
  duration_min: number
): number {
  if (duration_min <= 0) return P0;
  if (k === 0) return P0;

  const R = rateOfPressureChange_bar_per_min;
  const exp_kt = Math.exp(-k * duration_min);

  return (
    P_alv_start +
    R * (duration_min - 1 / k) +
    (P0 - P_alv_start + R / k) * exp_kt
  );
}

export function constantDepthTensionChange(
  initialTensions: number[],
  depth_m: number,
  duration_min: number
): number[] {
  const P_alv = ambientN2Pressure(depth_m);
  return BUHLMANN_ZHL16C.map((comp, i) =>
    schreinerEquation(initialTensions[i], P_alv, 0, compartmentK(comp.halfLife_min), duration_min)
  );
}

export function linearDepthChangeTensions(
  initialTensions: number[],
  startDepth_m: number,
  endDepth_m: number,
  duration_min: number
): number[] {
  if (duration_min <= 0) return [...initialTensions];

  const P_alv_start = ambientN2Pressure(startDepth_m);
  const P_alv_end = ambientN2Pressure(endDepth_m);
  const R = (P_alv_end - P_alv_start) / duration_min;

  return BUHLMANN_ZHL16C.map((comp, i) =>
    schreinerEquation(initialTensions[i], P_alv_start, R, compartmentK(comp.halfLife_min), duration_min)
  );
}

export function calculateMValue(
  compartmentIndex: number,
  depth_m: number
): number {
  const comp = BUHLMANN_ZHL16C[compartmentIndex];
  const P_amb = depthToPressure(depth_m);
  const overpressureM = comp.aMvalue + P_amb * comp.bMvalue;
  return P_amb + overpressureM;
}

export function compartmentSuperSaturationRatio(
  tension_bar: number,
  compartmentIndex: number,
  depth_m: number
): number {
  const mValue = calculateMValue(compartmentIndex, depth_m);
  return tension_bar / mValue;
}

export function leadingCompartmentIndex(
  tensions_bar: number[],
  depth_m: number
): number {
  let maxRatio = -1;
  let leadingIdx = 0;
  for (let i = 0; i < tensions_bar.length; i++) {
    const ratio = compartmentSuperSaturationRatio(tensions_bar[i], i, depth_m);
    if (ratio > maxRatio) {
      maxRatio = ratio;
      leadingIdx = i;
    }
  }
  return leadingIdx;
}

export function overallGasLoad(
  tensions_bar: number[],
  depth_m: number
): number {
  let maxRatio = 0;
  for (let i = 0; i < tensions_bar.length; i++) {
    const ratio = compartmentSuperSaturationRatio(tensions_bar[i], i, depth_m);
    if (ratio > maxRatio) maxRatio = ratio;
  }
  return maxRatio;
}
