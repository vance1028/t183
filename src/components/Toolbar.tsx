import { useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Waves,
} from 'lucide-react';
import { useDiveStore } from '../store/useDiveStore';

export function Toolbar() {
  const { resetToSample, clearPlan, exportPlan, importPlan } = useDiveStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importPlan(file);
      } catch (err) {
        alert((err as Error).message);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <Waves className="w-7 h-7 text-cyan-400" />
        <h1 className="text-xl font-bold text-white">潜水减压计划工具</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={resetToSample}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
        >
          <RotateCcw className="w-4 h-4" />
          示例数据
        </button>
        <button
          onClick={clearPlan}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
          清空
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
        >
          <Upload className="w-4 h-4" />
          导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={exportPlan}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
        >
          <Download className="w-4 h-4" />
          导出 JSON
        </button>
      </div>
    </div>
  );
}
