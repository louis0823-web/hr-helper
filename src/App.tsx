import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RosterManager } from './components/RosterManager';
import { LuckyDraw } from './components/LuckyDraw';
import { TeamBuilder } from './components/TeamBuilder';
import { Member, Prize, WinnerRecord } from './types';
import { SAMPLE_PRESETS } from './utils/csvParser';
import { soundFx } from './utils/audio';

const DEFAULT_PRIZES: Prize[] = [
  { id: 'prize-1', name: '特獎 · 現金一萬元大紅包', quantity: 1 },
  { id: 'prize-2', name: '頭獎 · 頂級主動降噪耳機', quantity: 2 },
  { id: 'prize-3', name: '貳獎 · 智慧運動手錶', quantity: 3 },
  { id: 'prize-4', name: '參獎 · 百貨量販禮券 $2,000', quantity: 5 },
  { id: 'prize-5', name: '幸運獎 · 連鎖咖啡商品卡 5 入', quantity: 10 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'roster' | 'draw' | 'teams'>('draw');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Initialize members with localStorage or default sample preset
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('hr_roster_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SAMPLE_PRESETS[0].data;
  });

  // Winners record list
  const [winners, setWinners] = useState<WinnerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('hr_draw_winners');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Prizes list
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    try {
      const saved = localStorage.getItem('hr_draw_prizes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRIZES;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hr_roster_members', JSON.stringify(members));
    } catch {}
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem('hr_draw_winners', JSON.stringify(winners));
    } catch {}
  }, [winners]);

  useEffect(() => {
    try {
      localStorage.setItem('hr_draw_prizes', JSON.stringify(prizes));
    } catch {}
  }, [prizes]);

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.enabled = next;
    if (next) soundFx.playClick();
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleAddWinners = (newWinners: WinnerRecord[]) => {
    setWinners((prev) => [...newWinners, ...prev]);
  };

  const handleRemoveWinner = (winnerId: string) => {
    setWinners((prev) => prev.filter((w) => w.id !== winnerId));
  };

  const handleClearWinners = () => {
    setWinners([]);
  };

  const handleClearMembers = () => {
    setMembers([]);
    setWinners([]);
  };

  const activeCandidatesCount = members.filter((m) => !m.isExcluded).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 3-Zone Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memberCount={members.length}
        validCandidateCount={activeCandidatesCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'roster' && (
          <RosterManager
            members={members}
            onUpdateMembers={setMembers}
            onClearMembers={handleClearMembers}
            onGoToDraw={() => setActiveTab('draw')}
          />
        )}

        {activeTab === 'draw' && (
          <LuckyDraw
            members={members}
            winners={winners}
            onAddWinners={handleAddWinners}
            onRemoveWinner={handleRemoveWinner}
            onClearWinners={handleClearWinners}
            prizes={prizes}
            onUpdatePrizes={setPrizes}
          />
        )}

        {activeTab === 'teams' && <TeamBuilder members={members} />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HR Pulse · 企業活動抽籤與團隊自動分組工具</span>
          <div className="flex items-center gap-3">
            <span>支援 CSV / TSV 格式</span>
            <span aria-hidden="true">·</span>
            <span>可重複與不重複抽獎模式</span>
            <span aria-hidden="true">·</span>
            <span>跨部門交叉平衡分組</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
