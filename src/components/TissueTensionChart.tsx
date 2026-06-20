import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDiveStore } from '../store/useDiveStore';
import { BUHLMANN_ZHL16C } from '../core/tissueModel';
import { depthToPressure, calculateMValue } from '../core/tissueModel';
import { SURFACE_PRESSURE_bar } from '../core/types';

const COMPARTMENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899',
];

interface TensionPoint {
  time: number;
  depth: number;
  mValue: number;
  [key: string]: number;
}

export function TissueTensionChart() {
  const { result } = useDiveStore();
  const [showAll, setShowAll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const compartmentsToShow = showAll
    ? BUHLMANN_ZHL16C.map((_, i) => i)
    : [0, 2, 5, 8, 11, 15];

  const { chartData, maxY } = useMemo(() => {
    const points: TensionPoint[] = [];
    let maxTension = SURFACE_PRESSURE_bar;

    result.profile.forEach((p) => {
      const point: TensionPoint = {
        time: Number(p.time_min.toFixed(2)),
        depth: Number(p.depth_m.toFixed(1)),
        mValue: 0,
      };

      const ambientPressure = depthToPressure(p.depth_m);
      let maxM = 0;

      p.tissueTensions_bar.forEach((tension, ci) => {
        const m = calculateMValue(ci, ambientPressure);
        if (m > maxM) maxM = m;
        if (tension > maxTension) maxTension = tension;
        point[`c${ci}`] = Number(tension.toFixed(3));
      });

      point.mValue = Number(maxM.toFixed(3));
      points.push(point);
    });

    return {
      chartData: points,
      maxY: Math.ceil(Math.max(maxTension + 0.5, 4)),
    };
  }, [result.profile]);

  const handleLegendClick = (data: any) => {
    if (data.dataKey === 'mValue') return;
    setSelectedKey(selectedKey === data.dataKey ? null : data.dataKey);
  };

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-100">组织舱惰性气体张力</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
          >
            {showAll ? '显示 6 个关键舱' : '显示全部 16 舱'}
          </button>
          {selectedKey && (
            <button
              onClick={() => setSelectedKey(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              清除高亮
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500 rounded" />
          最快舱 (4 分钟)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-cyan-400 rounded" />
          M 值极限
        </span>
        <span className="text-slate-500">点击图例高亮单条曲线</span>
      </div>

      <div className="h-72">
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
              domain={[0, maxY]}
              label={{
                value: 'N₂ 张力 (bar)',
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
                fontSize: 11,
                maxHeight: 300,
                overflowY: 'auto',
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => {
                if (name === 'mValue') return [`${value} bar`, 'M 值上限'];
                const ci = parseInt(name.replace('c', ''));
                const compartment = BUHLMANN_ZHL16C[ci];
                return [`${value} bar`, `舱 ${ci + 1} (t½=${compartment.halfLife_min}分)`];
              }}
              labelFormatter={(label) => {
                const pt = chartData.find((d) => d.time === label);
                return `时间: ${label} 分 | 深度: ${pt?.depth ?? '-'} 米`;
              }}
            />
            <Legend
              onClick={handleLegendClick}
              wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
              formatter={(value) => {
                if (value === 'mValue') return <span className="text-slate-300">M值极限</span>;
                const ci = parseInt((value as string).replace('c', ''));
                return (
                  <span
                    style={{
                      color: selectedKey && selectedKey !== value ? '#475569' : COMPARTMENT_COLORS[ci],
                      fontWeight: selectedKey === value ? 'bold' : 'normal',
                    }}
                  >
                    舱{ci + 1}(t½={BUHLMANN_ZHL16C[ci].halfLife_min}分)
                  </span>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="mValue"
              stroke="#22d3ee"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
            />
            {compartmentsToShow.map((ci) => (
              <Line
                key={ci}
                type="monotone"
                dataKey={`c${ci}`}
                stroke={COMPARTMENT_COLORS[ci]}
                strokeWidth={
                  selectedKey === null ? 1.5 : selectedKey === `c${ci}` ? 3 : 0.5
                }
                strokeOpacity={
                  selectedKey === null ? 0.85 : selectedKey === `c${ci}` ? 1 : 0.2
                }
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
