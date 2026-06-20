import { DivePlan } from '../core/types';

export const sampleDivePlan: DivePlan = {
  segments: [
    {
      targetDepth_m: 25,
      bottomTime_min: 25,
      surfaceInterval_min: 60,
    },
    {
      targetDepth_m: 18,
      bottomTime_min: 35,
      surfaceInterval_min: 90,
    },
    {
      targetDepth_m: 12,
      bottomTime_min: 45,
      surfaceInterval_min: 0,
    },
  ],
};
