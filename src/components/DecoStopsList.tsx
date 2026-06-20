import { useState } from 'react';
import { Anchor, ChevronDown, ChevronUp } from 'lucide-react';
import { useDiveStore } from '../store/useDiveStore';
import { SAFETY_STOP_DEPTH_m } from '../core/types';

export function DecoStopsList() {
  const { result } = useDiveStore();
  const stops = result.decoStops;
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (stops.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">减压停留</h2>
        </div>
        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
          无减压停留要求
        </div>
      </div>
    );
  }

  const mandatoryStops = stops.filter((s) => s.depth_m > SAFETY_STOP_DEPTH_m);
  const safetyStops = stops.filter((s) => s.depth_m <= SAFETY_STOP_DEPTH_m);
  const totalDecoTime = stops.reduce((sum, s) => sum + s.duration_min, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-100">减压停留</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {stops.length} 站 · {Math.ceil(totalDecoTime)} 分
          </span>
        </div>
        {stops.length > 3 && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition flex items-center gap-1"
          >
            {isCollapsed ? (
              <><ChevronDown className="w-3 h-3" /> 展开</>
            ) : (
              <><ChevronUp className="w-3 h-3" /> 折叠</>
            )}
          </button>
        )}
      </div>
      <div
        className={`space-y-2 overflow-y-auto transition-all duration-300 ${
          isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-64'
        }`}
      >
        {mandatoryStops.length > 0 && (
          <div className="text-xs text-red-400 font-medium mt-2">强制减压站</div>
        )}
        {mandatoryStops.map((stop, i) => (
          <StopCard key={`mandatory-${i}`} depth_m={stop.depth_m} duration_min={stop.duration_min} isMandatory />
        ))}
        {safetyStops.length > 0 && (
          <div className="text-xs text-cyan-400 font-medium mt-3">安全停留</div>
        )}
        {safetyStops.map((stop, i) => (
          <StopCard key={`safety-${i}`} depth_m={stop.depth_m} duration_min={stop.duration_min} />
        ))}
      </div>
    </div>
  );
}

interface StopCardProps {
  depth_m: number;
  duration_min: number;
  isMandatory?: boolean;
}

function StopCard({ depth_m, duration_min, isMandatory }: StopCardProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
        isMandatory
          ? 'bg-red-950/30 border-red-900/50'
          : 'bg-cyan-950/20 border-cyan-900/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${
            isMandatory ? 'bg-red-900/60 text-red-300' : 'bg-cyan-900/50 text-cyan-300'
          }`}
        >
          <Anchor className="w-5 h-5" />
        </div>
        <div>
          <div
            className={`font-bold ${
              isMandatory ? 'text-red-300' : 'text-cyan-300'
            }`}
          >
            {depth_m} 米
          </div>
          <div className="text-xs text-slate-400">
            {isMandatory ? '强制减压' : '安全停留'}
          </div>
        </div>
      </div>
      <div
        className={`text-2xl font-bold ${
          isMandatory ? 'text-red-400' : 'text-cyan-400'
        }`}
      >
        {Math.ceil(duration_min)}
        <span className="text-sm font-normal text-slate-400 ml-1">分</span>
      </div>
    </div>
  );
}
