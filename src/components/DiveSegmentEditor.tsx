import { Plus, Trash2, Gauge, Clock, Sun } from 'lucide-react';
import { useDiveStore } from '../store/useDiveStore';
import { SegmentResult } from '../core/types';

export function DiveSegmentEditor() {
  const { plan, result, updateSegment, addSegment, removeSegment } = useDiveStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">潜水段</h2>
        <button
          onClick={addSegment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          添加段
        </button>
      </div>

      <div className="space-y-3">
        {plan.segments.map((segment, idx) => (
          <SegmentCard
            key={idx}
            index={idx}
            segment={segment}
            segmentResult={result.segmentResults[idx]}
            isLast={idx === plan.segments.length - 1}
            onUpdate={(partial) => updateSegment(idx, partial)}
            onRemove={() => removeSegment(idx)}
            canRemove={plan.segments.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

interface SegmentCardProps {
  index: number;
  segment: { targetDepth_m: number; bottomTime_min: number; surfaceInterval_min: number };
  segmentResult?: SegmentResult;
  isLast: boolean;
  onUpdate: (partial: Partial<{ targetDepth_m: number; bottomTime_min: number; surfaceInterval_min: number }>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SegmentCard({ index, segment, segmentResult, isLast, onUpdate, onRemove, canRemove }: SegmentCardProps) {
  const ndlMargin = segmentResult?.ndlMarginAtEnd_min;
  const hasDeco = segmentResult?.requiresDeco;
  const ndlColor =
    ndlMargin === undefined
      ? 'text-slate-400'
      : ndlMargin > 5
      ? 'text-emerald-400'
      : ndlMargin > 0
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className={`p-4 rounded-xl border transition ${
      hasDeco ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-800/60 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full bg-slate-700 text-slate-200">
            {index + 1}
          </span>
          <span className="font-medium text-slate-100">第 {index + 1} 段</span>
          {hasDeco && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-900/60 text-red-300 rounded">
              需减压
            </span>
          )}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
            title="删除此段"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Gauge className="w-3.5 h-3.5" />
            目标深度 (米)
          </label>
          <input
            type="number"
            min={0}
            max={200}
            step={1}
            value={segment.targetDepth_m}
            onChange={(e) => onUpdate({ targetDepth_m: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
            停留时间 (分)
          </label>
          <input
            type="number"
            min={0}
            max={240}
            step={1}
            value={segment.bottomTime_min}
            onChange={(e) => onUpdate({ bottomTime_min: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {!isLast && (
          <div>
            <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
              <Sun className="w-3.5 h-3.5" />
              水面间歇 (分)
            </label>
            <input
              type="number"
              min={0}
              max={600}
              step={5}
              value={segment.surfaceInterval_min}
              onChange={(e) => onUpdate({ surfaceInterval_min: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}

        {isLast && (
          <div className="flex items-end">
            <div className={`text-sm font-medium ${ndlColor}`}>
              <div className="text-xs text-slate-500 mb-0.5">NDL 余量</div>
              {ndlMargin !== undefined
                ? ndlMargin === Infinity
                  ? '充足'
                  : `${ndlMargin.toFixed(1)} 分`
                : '-'}
            </div>
          </div>
        )}
      </div>

      {!isLast && (
        <div className="mt-2 flex items-center justify-end">
          <div className={`text-sm font-medium ${ndlColor}`}>
            <span className="text-xs text-slate-500 mr-2">本段末 NDL 余量:</span>
            {ndlMargin !== undefined
              ? ndlMargin === Infinity
                ? '充足'
                : `${ndlMargin.toFixed(1)} 分`
              : '-'}
          </div>
        </div>
      )}
    </div>
  );
}
