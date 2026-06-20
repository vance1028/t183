import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useDiveStore } from '../store/useDiveStore';
import type { Warning } from '../core/types';

export function WarningsPanel() {
  const { result } = useDiveStore();
  const warnings = result.warnings;

  if (warnings.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">警告</h2>
        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
          一切正常，注意安全潜水
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">
        警告
        <span className="ml-2 px-2 py-0.5 text-xs bg-amber-900/50 text-amber-300 rounded-full">
          {warnings.length}
        </span>
      </h2>
      <div className="space-y-2">
        {warnings.map((warning, i) => (
          <WarningCard key={i} warning={warning} />
        ))}
      </div>
    </div>
  );
}

function WarningCard({ warning }: { warning: Warning }) {
  const colorMap = {
    info: {
      bg: 'bg-blue-950/30',
      border: 'border-blue-900/50',
      icon: 'text-blue-400',
      text: 'text-blue-300',
    },
    warning: {
      bg: 'bg-amber-950/30',
      border: 'border-amber-900/50',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    danger: {
      bg: 'bg-red-950/40',
      border: 'border-red-900/60',
      icon: 'text-red-400',
      text: 'text-red-300',
    },
  };
  const c = colorMap[warning.severity] || colorMap.warning;

  return (
    <div className={`p-3 rounded-xl border ${c.bg} ${c.border}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.icon}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${c.text}`}>{warning.message}</div>
          {warning.segmentIndex !== undefined && (
            <div className="text-xs text-slate-500 mt-0.5">
              第 {warning.segmentIndex + 1} 段
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
