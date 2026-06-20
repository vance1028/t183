export interface DiveSegment {
  targetDepth_m: number;
  bottomTime_min: number;
  surfaceInterval_min: number;
}

export interface DivePlan {
  segments: DiveSegment[];
}

export interface TissueCompartment {
  halfLife_min: number;
  aMvalue: number;
  bMvalue: number;
}

export interface DecoStop {
  depth_m: number;
  duration_min: number;
  segmentIndex: number;
}

export type ProfilePhase =
  | 'descent'
  | 'bottom'
  | 'ascent'
  | 'deco'
  | 'surface';

export interface ProfilePoint {
  time_min: number;
  depth_m: number;
  tissueTensions_bar: number[];
  phase: ProfilePhase;
  segmentIndex?: number;
}

export interface SegmentResult {
  segmentIndex: number;
  ndlAtStart_min: number;
  ndlRemaining_min: number;
  ndlMarginAtEnd_min: number;
  requiresDeco: boolean;
  maxAscentRate_m_per_min: number;
  endTensions_bar: number[];
}

export type WarningSeverity = 'info' | 'warning' | 'danger';

export interface Warning {
  type: string;
  message: string;
  severity: WarningSeverity;
  segmentIndex?: number;
}

export interface CalculationResult {
  profile: ProfilePoint[];
  segmentResults: SegmentResult[];
  decoStops: DecoStop[];
  warnings: Warning[];
  totalDiveTime_min: number;
  totalBottomTime_min: number;
  totalRunTime_min: number;
  overallGasLoad: number;
}

export const SURFACE_PRESSURE_bar = 1.0;
export const BAR_PER_METER = 0.1;
export const N2_FRACTION_AIR = 0.79;
export const WATER_VAPOR_PRESSURE_bar = 0.0627;
export const DESCENT_RATE_m_per_min = 20;
export const SAFE_ASCENT_RATE_RECREATIONAL_m_per_min = 9;
export const SAFE_ASCENT_RATE_TECHNICAL_m_per_min = 6;
export const DECO_STOP_INCREMENT_m = 3;
export const SAFETY_STOP_DEPTH_m = 5;
export const SAFETY_STOP_DURATION_min = 3;
