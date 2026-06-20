import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useDiveStore } from '../store/useDiveStore';
import { SAFETY_STOP_DEPTH_m } from '../core/types';

interface ProfilePoint {
  time: number;
  depth: number;
  phase: string;
  segment: number;
}

export function DepthProfileChart() {
  const { result } = useDiveStore();

  const chartData = useMemo(() => {
    const points: ProfilePoint[] = [];
    result.profile.forEach((p) => {
      points.push({
        time: Number(p.time_min.toFixed(2)),
        depth: Number(p.depth_m.toFixed(1)),
        phase: p.phase,
        segment: p.segmentIndex,
      });
    });
    return points;
  }, [result.profile]);

  const maxDepth = Math.max(...chartData.map((p) => p.depth), 10);
  const yDomain = [Math.min(maxDepth + 5, 100), 0];

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-100">深度-时间剖面</h3>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-400 rounded" />
            深度
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400 rounded border-dashed border-dashed border-amber-400" />
            安全停留深度
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              label={{
                value: '时间 (分钟)',
                position: 'insideBottom',
                offset: -3,
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={yDomain}
              reversed
              label={{
                value: '深度 (米)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 12,
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number) => [`${value} 米`, '深度']}
              labelFormatter={(label) => `时间: ${label} 分`}
            />
            <ReferenceLine
              y={SAFETY_STOP_DEPTH_m}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="depth"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
