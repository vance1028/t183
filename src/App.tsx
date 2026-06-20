import { Toolbar } from './components/Toolbar';
import { DiveSegmentEditor } from './components/DiveSegmentEditor';
import { MetricsPanel } from './components/MetricsPanel';
import { DecoStopsList } from './components/DecoStopsList';
import { WarningsPanel } from './components/WarningsPanel';
import { DepthProfileChart } from './components/DepthProfileChart';
import { TissueTensionChart } from './components/TissueTensionChart';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Toolbar />

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <DiveSegmentEditor />
            <WarningsPanel />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricsPanel />
              <DecoStopsList />
            </div>
            <DepthProfileChart />
            <TissueTensionChart />

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <p className="text-xs text-slate-500 leading-relaxed">
                ⚠️ <strong className="text-slate-400">免责声明</strong>：本工具基于 Buhlmann ZH-L16C
                减压模型用于教学演示和规划参考，计算结果偏保守。实际潜水请遵循您所接受训练体系的潜水表和潜水电脑的指示。
                所有潜水都存在风险，请务必在能力范围内进行并保持足够的安全余量。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
