import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gift, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Trash2, 
  Trophy, 
  Award, 
  Check, 
  AlertCircle, 
  Settings2,
  RefreshCw,
  Plus,
  Flame,
  Volume2
} from 'lucide-react';
import { Member, Prize, WinnerRecord, DrawSettings, DrawState } from '../types';
import { soundFx } from '../utils/audio';
import { exportWinnersToCsv } from '../utils/csvParser';

interface LuckyDrawProps {
  members: Member[];
  winners: WinnerRecord[];
  onAddWinners: (newWinners: WinnerRecord[]) => void;
  onRemoveWinner: (winnerId: string) => void;
  onClearWinners: () => void;
  prizes: Prize[];
  onUpdatePrizes: (prizes: Prize[]) => void;
}

export const LuckyDraw: React.FC<LuckyDrawProps> = ({
  members,
  winners,
  onAddWinners,
  onRemoveWinner,
  onClearWinners,
  prizes,
  onUpdatePrizes,
}) => {
  // Current selected prize
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(prizes[0]?.id || '');
  const [drawCount, setDrawCount] = useState<number>(1);
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);
  const [drawSpeed, setDrawSpeed] = useState<'normal' | 'suspense' | 'fast'>('suspense');

  // Animation states
  const [drawState, setDrawState] = useState<DrawState>('idle');
  const [rollingCandidate, setRollingCandidate] = useState<Member | null>(null);
  const [currentRoundWinners, setCurrentRoundWinners] = useState<Member[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);

  // New prize input form
  const [showAddPrize, setShowAddPrize] = useState<boolean>(false);
  const [newPrizeName, setNewPrizeName] = useState<string>('');
  const [newPrizeQuantity, setNewPrizeQuantity] = useState<number>(1);

  // Animation interval refs
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suspenseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId) || prizes[0];

  // Calculate available candidates based on allowDuplicates
  const alreadyWonMemberIds = new Set(winners.map((w) => w.memberId));
  
  const eligibleCandidates = members.filter((m) => {
    if (m.isExcluded) return false;
    if (!allowDuplicates && alreadyWonMemberIds.has(m.id)) return false;
    return true;
  });

  // Calculate how many have won this specific prize
  const wonThisPrizeCount = winners.filter((w) => w.prizeId === selectedPrize?.id).length;
  const remainingForThisPrize = selectedPrize ? Math.max(0, selectedPrize.quantity - wonThisPrizeCount) : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      if (suspenseTimerRef.current) clearTimeout(suspenseTimerRef.current);
    };
  }, []);

  // Trigger celebration confetti
  const fireConfetti = () => {
    try {
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55, colors: ['#6366f1', '#ec4899', '#f59e0b'] });
      fire(0.2, { spread: 60, colors: ['#10b981', '#3b82f6', '#8b5cf6'] });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch {
      // Fallback gracefully if canvas is blocked
    }
  };

  // Execute Lucky Draw
  const handleStartDraw = () => {
    if (eligibleCandidates.length === 0) return;
    if (drawState === 'rolling') return;

    const countToDraw = Math.min(drawCount, eligibleCandidates.length);
    if (countToDraw <= 0) return;

    setDrawState('rolling');
    setCurrentRoundWinners([]);
    soundFx.playSuspensePing();

    // Determine duration based on speed setting
    const duration = drawSpeed === 'fast' ? 1200 : drawSpeed === 'suspense' ? 4200 : 2500;
    const startTime = Date.now();
    let tickDelay = 50;

    // Fast cycling animation loop
    const rollStep = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      // Pick a random candidate to display on stage
      const randomIdx = Math.floor(Math.random() * eligibleCandidates.length);
      setRollingCandidate(eligibleCandidates[randomIdx]);
      soundFx.playTick();

      if (progress < 1) {
        // Dynamic easing: roll fast initially, then progressively slow down dramatically at the end
        if (progress > 0.7) {
          tickDelay = 60 + Math.pow((progress - 0.7) / 0.3, 2.5) * 280;
        } else {
          tickDelay = 45;
        }
        animationTimerRef.current = setTimeout(rollStep, tickDelay);
      } else {
        // Draw finished! Select the winners
        finishDraw(countToDraw);
      }
    };

    animationTimerRef.current = setTimeout(rollStep, tickDelay);
  };

  const finishDraw = (count: number) => {
    // Fisher-Yates shuffle on a copy of eligible candidates
    const pool = [...eligibleCandidates];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const selectedWinners = pool.slice(0, count);
    const batchId = `批次 #${winners.length > 0 ? Math.max(...winners.map(w => parseInt(w.batchId.replace(/\D/g, '') || '0'))) + 1 : 1}`;
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newRecords: WinnerRecord[] = selectedWinners.map((winner) => ({
      id: `win-${Date.now()}-${winner.id}-${Math.random().toString(36).substring(2, 6)}`,
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      memberId: winner.id,
      memberName: winner.name,
      department: winner.department,
      empId: winner.empId,
      drawnAt: timestamp,
      batchId,
    }));

    setRollingCandidate(selectedWinners[0] || null);
    setCurrentRoundWinners(selectedWinners);
    setDrawState('revealed');
    onAddWinners(newRecords);

    // Audio & Visual celebratory fanfare
    soundFx.playFanfare();
    fireConfetti();
    setShowWinnerModal(true);
  };

  // Add new custom prize
  const handleAddNewPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeName.trim()) return;

    const newPrize: Prize = {
      id: `p-${Date.now()}`,
      name: newPrizeName.trim(),
      quantity: Math.max(1, newPrizeQuantity),
    };

    onUpdatePrizes([...prizes, newPrize]);
    setSelectedPrizeId(newPrize.id);
    setNewPrizeName('');
    setNewPrizeQuantity(1);
    setShowAddPrize(false);
    soundFx.playClick();
  };

  // Single redraw: if someone was not present, redraw for that specific winner record
  const handleRedrawSingle = (winnerRecord: WinnerRecord) => {
    if (eligibleCandidates.length === 0) {
      alert('目前沒有其他可用的候選名單！');
      return;
    }
    if (!window.confirm(`確定要為得獎人「${winnerRecord.memberName}」重新抽籤嗎？`)) {
      return;
    }

    // Remove the old winner first
    onRemoveWinner(winnerRecord.id);

    // Pick a new replacement randomly from remaining eligible candidates
    const pool = eligibleCandidates.filter((m) => m.id !== winnerRecord.memberId);
    if (pool.length === 0) {
      alert('名單中已無其他人員可抽！');
      return;
    }

    const replacement = pool[Math.floor(Math.random() * pool.length)];
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newRecord: WinnerRecord = {
      id: `win-${Date.now()}-${replacement.id}-${Math.random().toString(36).substring(2, 6)}`,
      prizeId: winnerRecord.prizeId,
      prizeName: winnerRecord.prizeName,
      memberId: replacement.id,
      memberName: replacement.name,
      department: replacement.department,
      empId: replacement.empId,
      drawnAt: timestamp,
      batchId: `${winnerRecord.batchId} (重抽)`,
    };

    onAddWinners([newRecord]);
    soundFx.playFanfare();
    fireConfetti();
  };

  return (
    <div className="space-y-6">
      {/* Prize Selector & Quick Setup Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              選擇抽獎獎項：
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {prizes.map((prize) => {
                const isSelected = prize.id === selectedPrize?.id;
                const wonCount = winners.filter((w) => w.prizeId === prize.id).length;
                return (
                  <button
                    key={prize.id}
                    type="button"
                    onClick={() => {
                      setSelectedPrizeId(prize.id);
                      soundFx.playClick();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Trophy className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                    <span>{prize.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums ${
                        isSelected ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {wonCount}/{prize.quantity}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAddPrize(true)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>自訂獎項</span>
              </button>
            </div>
          </div>

          {/* Quick Settings: Duplicates & Speed */}
          <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {/* Duplicate Draw Toggle */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600 font-medium pl-1">重複抽取：</span>
              <button
                type="button"
                onClick={() => {
                  setAllowDuplicates(false);
                  soundFx.playClick();
                }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  !allowDuplicates
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                不重複抽 (得獎排除)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllowDuplicates(true);
                  soundFx.playClick();
                }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  allowDuplicates
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                可重複抽 (人人有機會)
              </button>
            </div>

            {/* Animation Pace */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">動畫懸疑感：</span>
              <select
                value={drawSpeed}
                onChange={(e) => setDrawSpeed(e.target.value as any)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="suspense">緊張刺激 (4.2秒 漸漸減速)</option>
                <option value="normal">標準節奏 (2.5秒)</option>
                <option value="fast">極速抽出 (1.2秒)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add Prize Modal / Inline Form */}
        {showAddPrize && (
          <form
            onSubmit={handleAddNewPrize}
            className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg"
          >
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="獎品名稱 (例如: 頭獎 iPhone 16 Pro 256G)"
                value={newPrizeName}
                onChange={(e) => setNewPrizeName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="w-28">
              <input
                type="number"
                min={1}
                max={999}
                value={newPrizeQuantity}
                onChange={(e) => setNewPrizeQuantity(parseInt(e.target.value) || 1)}
                placeholder="名額數量"
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
              >
                確認新增
              </button>
              <button
                type="button"
                onClick={() => setShowAddPrize(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Main Lucky Draw Stage */}
      <div className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 rounded-2xl p-6 sm:p-10 shadow-xl overflow-hidden border border-indigo-900/40 text-center">
        {/* Stage ambient lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Current Prize Banner */}
        <div className="relative z-10 max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wider uppercase mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>抽獎進行中 · {selectedPrize?.name || '請選擇獎項'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
            {selectedPrize?.name}
          </h2>
          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-indigo-200/80 mt-2 font-mono">
            <span>總名額：{selectedPrize?.quantity || 1} 名</span>
            <span>·</span>
            <span>已抽出：{wonThisPrizeCount} 名</span>
            <span>·</span>
            <span className="text-amber-300 font-semibold">待抽出：{remainingForThisPrize} 名</span>
          </div>
        </div>

        {/* Stage Center Card / Slot Machine */}
        <div className="relative z-10 max-w-md mx-auto my-6">
          <div
            className={`p-8 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${
              drawState === 'rolling'
                ? 'bg-slate-900/90 border-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.35)] scale-102 ring-4 ring-indigo-500/20'
                : drawState === 'revealed'
                ? 'bg-slate-900/95 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.4)] scale-102 ring-4 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 shadow-inner'
            }`}
          >
            {drawState === 'rolling' && rollingCandidate && (
              <div className="animate-pulse space-y-2">
                <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
                  抽籤旋轉中...
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {rollingCandidate.name}
                </div>
                <div className="text-sm font-medium text-indigo-200">
                  {rollingCandidate.department || '幸運兒即將揭曉'}
                </div>
              </div>
            )}

            {drawState === 'revealed' && currentRoundWinners.length > 0 && (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>恭喜幸運得獎者！</span>
                </div>
                {currentRoundWinners.length === 1 ? (
                  <>
                    <div className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight">
                      {currentRoundWinners[0].name}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-300 font-medium">
                      <span>{currentRoundWinners[0].department || '部門未定'}</span>
                      {currentRoundWinners[0].empId && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-slate-400">{currentRoundWinners[0].empId}</span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-2">
                    <div className="text-sm text-amber-200 font-semibold mb-3">
                      本次共抽出 {currentRoundWinners.length} 位得獎者
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 max-h-36 overflow-y-auto p-1">
                      {currentRoundWinners.map((winner) => (
                        <div
                          key={winner.id}
                          className="bg-amber-500/20 border border-amber-400/40 text-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          {winner.name} ({winner.department || '一般'})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {drawState === 'idle' && (
              <div className="space-y-3 py-2">
                <Gift className="w-14 h-14 text-indigo-400/80 mx-auto animate-bounce" />
                <div className="text-2xl font-bold text-white">準備就緒，隨時開抽</div>
                <p className="text-xs text-indigo-200/70 max-w-xs mx-auto">
                  目前候選池共有 <span className="text-amber-400 font-bold font-mono">{eligibleCandidates.length}</span> 位參與同仁
                  {!allowDuplicates && alreadyWonMemberIds.size > 0 && ` (已排除 ${alreadyWonMemberIds.size} 位已獲獎者)`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Draw Controls */}
        <div className="relative z-10 max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          {/* Draw quantity selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-xl text-white">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium">單次抽取：</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={drawState === 'rolling' || num > eligibleCandidates.length}
                  onClick={() => {
                    setDrawCount(num);
                    soundFx.playClick();
                  }}
                  className={`w-7 h-7 rounded-md text-xs font-bold font-mono transition-colors disabled:opacity-30 ${
                    drawCount === num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
              {remainingForThisPrize > 5 && (
                <button
                  type="button"
                  disabled={drawState === 'rolling'}
                  onClick={() => {
                    setDrawCount(Math.min(remainingForThisPrize, eligibleCandidates.length));
                    soundFx.playClick();
                  }}
                  className="px-2 h-7 rounded-md text-xs font-bold bg-slate-800 text-amber-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
                  title="一次抽出此獎項全部剩餘名額"
                >
                  剩餘全部
                </button>
              )}
            </div>
          </div>

          {/* Primary Lucky Draw Button */}
          <button
            type="button"
            disabled={drawState === 'rolling' || eligibleCandidates.length === 0}
            onClick={handleStartDraw}
            className="w-full sm:w-auto px-8 py-3.5 text-base font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none flex items-center justify-center gap-2"
          >
            {drawState === 'rolling' ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-slate-900" />
                <span>開獎旋轉中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-900 fill-slate-900" />
                <span>開始抽籤 (抽出 {drawCount} 位)</span>
              </>
            )}
          </button>
        </div>

        {/* Warning if pool empty */}
        {eligibleCandidates.length === 0 && (
          <div className="relative z-10 mt-4 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 max-w-md mx-auto py-2 px-3 rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>候選池已無可用名單！請至「名單管理」匯入成員，或開啟「可重複抽取」。</span>
          </div>
        )}
      </div>

      {/* Winner Announcement Popup Modal */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-amber-200 overflow-hidden text-center relative p-6 sm:p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50">
              <Trophy className="w-8 h-8 text-amber-600" />
            </div>

            <h3 className="text-xs font-bold tracking-widest text-amber-600 uppercase">
              CONGRATULATIONS
            </h3>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {selectedPrize?.name}
            </h4>

            <div className="my-6 max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50 rounded-xl p-3 border border-slate-200">
              {currentRoundWinners.map((winner, idx) => (
                <div key={winner.id} className="py-2.5 flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 text-base">{winner.name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {winner.department || '一般單位'} {winner.empId ? `· ${winner.empId}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    中獎確認
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  fireConfetti();
                  soundFx.playFanfare();
                }}
                className="px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>再撒一次彩帶</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
              >
                收下中獎紀錄，繼續開獎
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner History & Record Board */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>本場活動中獎記錄清單</span>
              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                共 {winners.length} 人次
              </span>
            </h3>
          </div>

          {winners.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportWinnersToCsv(winners)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>匯出中獎名單 (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('確定要清空本次活動所有中獎記錄嗎？此操作無法還原。')) {
                    onClearWinners();
                    setDrawState('idle');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空中獎記錄</span>
              </button>
            </div>
          )}
        </div>

        {winners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold text-slate-600 tracking-wider">
                  <th className="py-2.5 px-4 w-12 text-center">編號</th>
                  <th className="py-2.5 px-4">獎項名稱</th>
                  <th className="py-2.5 px-4">獲獎人姓名</th>
                  <th className="py-2.5 px-4">所屬部門</th>
                  <th className="py-2.5 px-4 font-mono">工號</th>
                  <th className="py-2.5 px-4 font-mono">獲獎時間</th>
                  <th className="py-2.5 px-4">抽獎輪次</th>
                  <th className="py-2.5 px-4 text-right">管理操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {winners.map((win, idx) => (
                  <tr key={win.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400 tabular-nums text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-indigo-700">
                      {win.prizeName}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {win.memberName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {win.department || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums text-xs">
                      {win.empId || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400 tabular-nums text-xs">
                      {win.drawnAt}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        {win.batchId}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleRedrawSingle(win)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md border border-amber-200 transition-colors"
                          title="因未在場或取消，重抽此名額"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          <span>重抽</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`確定刪除「${win.memberName}」的中獎記錄？`)) {
                              onRemoveWinner(win.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          title="刪除此筆記錄"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">目前尚無中獎紀錄</p>
            <p className="text-xs text-slate-400 mt-1">
              點擊上方「開始抽籤」即可開啟精彩抽獎！
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
