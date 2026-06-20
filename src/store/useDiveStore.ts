import { create } from 'zustand';
import { DivePlan, DiveSegment, CalculationResult } from '../core/types';
import { calculateDivePlan } from '../core';
import { storage } from '../utils/storage';
import { sampleDivePlan } from '../data/samplePlan';

interface DiveState {
  plan: DivePlan;
  result: CalculationResult;
  setPlan: (plan: DivePlan) => void;
  updateSegment: (index: number, segment: Partial<DiveSegment>) => void;
  addSegment: () => void;
  removeSegment: (index: number) => void;
  resetToSample: () => void;
  clearPlan: () => void;
  exportPlan: () => void;
  importPlan: (file: File) => Promise<void>;
  recompute: () => void;
}

const initialPlan = storage.load() || sampleDivePlan;
const initialResult = calculateDivePlan(initialPlan);

export const useDiveStore = create<DiveState>((set, get) => ({
  plan: initialPlan,
  result: initialResult,

  setPlan: (plan: DivePlan) => {
    const result = calculateDivePlan(plan);
    storage.save(plan);
    set({ plan, result });
  },

  updateSegment: (index: number, segment: Partial<DiveSegment>) => {
    const { plan } = get();
    const newSegments = plan.segments.map((s, i) =>
      i === index ? { ...s, ...segment } : s
    );
    const newPlan = { segments: newSegments };
    const result = calculateDivePlan(newPlan);
    storage.save(newPlan);
    set({ plan: newPlan, result });
  },

  addSegment: () => {
    const { plan } = get();
    const lastSegment = plan.segments[plan.segments.length - 1];
    const newSegment: DiveSegment = {
      targetDepth_m: lastSegment ? Math.max(10, lastSegment.targetDepth_m - 5) : 15,
      bottomTime_min: lastSegment ? lastSegment.bottomTime_min : 30,
      surfaceInterval_min: 60,
    };
    const newPlan = { segments: [...plan.segments, newSegment] };
    const result = calculateDivePlan(newPlan);
    storage.save(newPlan);
    set({ plan: newPlan, result });
  },

  removeSegment: (index: number) => {
    const { plan } = get();
    if (plan.segments.length <= 1) {
      const newPlan = {
        segments: [{ targetDepth_m: 10, bottomTime_min: 30, surfaceInterval_min: 0 }],
      };
      const result = calculateDivePlan(newPlan);
      storage.save(newPlan);
      set({ plan: newPlan, result });
      return;
    }
    const newSegments = plan.segments.filter((_, i) => i !== index);
    if (index === newSegments.length) {
      newSegments[newSegments.length - 1].surfaceInterval_min = 0;
    }
    const newPlan = { segments: newSegments };
    const result = calculateDivePlan(newPlan);
    storage.save(newPlan);
    set({ plan: newPlan, result });
  },

  resetToSample: () => {
    const result = calculateDivePlan(sampleDivePlan);
    storage.save(sampleDivePlan);
    set({ plan: sampleDivePlan, result });
  },

  clearPlan: () => {
    const emptyPlan = {
      segments: [{ targetDepth_m: 10, bottomTime_min: 30, surfaceInterval_min: 0 }],
    };
    const result = calculateDivePlan(emptyPlan);
    storage.save(emptyPlan);
    set({ plan: emptyPlan, result });
  },

  exportPlan: () => {
    const { plan } = get();
    storage.downloadJSON(plan);
  },

  importPlan: async (file: File) => {
    const plan = await storage.importJSON(file);
    const result = calculateDivePlan(plan);
    storage.save(plan);
    set({ plan, result });
  },

  recompute: () => {
    const { plan } = get();
    const result = calculateDivePlan(plan);
    set({ result });
  },
}));
