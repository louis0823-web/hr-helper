import React from 'react';
import { Users, Gift, Shuffle, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  activeTab: 'roster' | 'draw' | 'teams';
  onTabChange: (tab: 'roster' | 'draw' | 'teams') => void;
  memberCount: number;
  validCandidateCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  memberCount,
  validCandidateCount,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm shadow-sm">
              HR
            </span>
            <span>HR LuckyDraw & Groups</span>
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md tabular-nums">
            名單 {memberCount} 人 · 候選 {validCandidateCount} 人
          </span>
        </div>

        {/* Zone 2: Navigation Links / Segmented Mode Controls */}
        <nav className="flex items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onTabChange('roster');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>名單管理</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onTabChange('draw');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'draw'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>獎品抽籤</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onTabChange('teams');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'teams'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>自動分組</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions / Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? '關閉音效' : '開啟音效'}
            aria-label={soundEnabled ? '關閉音效' : '開啟音效'}
            className={`p-2 text-sm rounded-lg border transition-colors ${
              soundEnabled
                ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100'
                : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '結束全螢幕 (投屏模式)' : '全螢幕展示 (投屏模式)'}
            aria-label={isFullscreen ? '結束全螢幕' : '全螢幕展示'}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>退出投屏</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>投影模式</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
