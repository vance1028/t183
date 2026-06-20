import { DivePlan, DiveSegment } from '../core/types';

const STORAGE_KEY = 'dive_planner_data_v1';

export const storage = {
  load(): DivePlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.segments)) {
        return parsed as DivePlan;
      }
      return null;
    } catch {
      return null;
    }
  },

  save(plan: DivePlan): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      console.warn('Failed to save dive plan to localStorage');
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  exportJSON(plan: DivePlan): string {
    return JSON.stringify(plan, null, 2);
  },

  downloadJSON(plan: DivePlan, filename = 'dive-plan.json'): void {
    const blob = new Blob([this.exportJSON(plan)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async importJSON(file: File): Promise<DivePlan> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          if (!parsed || !Array.isArray(parsed.segments)) {
            reject(new Error('无效的潜水计划文件格式'));
            return;
          }
          parsed.segments = parsed.segments.map((s: Partial<DiveSegment>) => ({
            targetDepth_m: Number(s.targetDepth_m) || 0,
            bottomTime_min: Number(s.bottomTime_min) || 0,
            surfaceInterval_min: Number(s.surfaceInterval_min) || 0,
          }));
          resolve(parsed as DivePlan);
        } catch {
          reject(new Error('无法解析 JSON 文件'));
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  },
};
