import { Activity, Clock, AlertTriangle, Wind, Timer } from 'lucide-react';
import { useDiveStore } from '../store/useDiveStore';

export function MetricsPanel() {
  const { result } = useDiveStore();

  const totalBottomTime = result.totalBottomTime_min;
  const totalRunTime = result.totalRunTime_min;
  const gasLoad = result.overallGasLoad;
  const decoCount = result.decoStops.filter((s) => s.depth_m > 5).length;
  const hasWarning = result.warnings.length > 0;

  const gasLoadColor =
    gasLoad < 0.6
      ? 'text-emerald-400'
      : gasLoad < 0.8
      ? 'text-amber-400'
      : 'text-red-400';

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} 分`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">总体指标</h2>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="总水下时间"
          value={formatTime(totalRunTime)}
          sub={`水底 ${totalBottomTime.toFixed(0)} 分`}
          color="text-cyan-400"
        />
        <MetricCard
          icon={<Timer className="w-5 h-5" />}
          label="总水底时间"
          value={`${totalBottomTime.toFixed(0)} 分`}
          color="text-blue-400"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="身体气体负荷"
          value={`${(gasLoad * 100).toFixed(0)}%`}
          sub={gasLoad < 0.6 ? '低' : gasLoad < 0.8 ? '中' : '高'}
          color={gasLoadColor}
        />
        <MetricCard
          icon={<Wind className="w-5 h-5" />}
          label="减压停留"
          value={decoCount > 0 ? `${decoCount} 站` : '免减压'}
          sub={
            decoCount > 0
              ? `${result.decoStops.reduce((s, d) => s + d.duration_min, 0).toFixed(0)} 分钟`
              : undefined
          }
          color={decoCount > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
      </div>

      {hasWarning && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-300 bg-amber-950/40 rounded-lg border border-amber-900/50">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>存在 {result.warnings.length} 条警告，请查看警告面板</span>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function MetricCard({ icon, label, value, sub, color }: MetricCardProps) {
  return (
    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
