import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shuffle, 
  Download, 
  Copy, 
  Check, 
  Crown, 
  Building2, 
  ArrowRightLeft,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Member, TeamGroup, GroupingSettings } from '../types';
import { soundFx } from '../utils/audio';
import { exportGroupsToCsv, formatGroupsAsText, downloadCsv } from '../utils/csvParser';

interface TeamBuilderProps {
  members: Member[];
}

// Preset vibrant themes for groups
const TEAM_THEMES = [
  {
    codename: '獵鷹隊',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    text: 'text-indigo-950',
    accent: 'text-indigo-600',
    lightBg: 'bg-indigo-100/60',
  },
  {
    codename: '星雲隊',
    bg: 'bg-purple-50/70',
    border: 'border-purple-200',
    text: 'text-purple-950',
    accent: 'text-purple-600',
    lightBg: 'bg-purple-100/60',
  },
  {
    codename: '烈焰隊',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-950',
    accent: 'text-rose-600',
    lightBg: 'bg-rose-100/60',
  },
  {
    codename: '破浪隊',
    bg: 'bg-cyan-50/70',
    border: 'border-cyan-200',
    text: 'text-cyan-950',
    accent: 'text-cyan-600',
    lightBg: 'bg-cyan-100/60',
  },
  {
    codename: '獅心隊',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-950',
    accent: 'text-emerald-600',
    lightBg: 'bg-emerald-100/60',
  },
  {
    codename: '泰坦隊',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    text: 'text-blue-950',
    accent: 'text-blue-600',
    lightBg: 'bg-blue-100/60',
  },
  {
    codename: '雷鳥隊',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-950',
    accent: 'text-amber-600',
    lightBg: 'bg-amber-100/60',
  },
  {
    codename: '極光隊',
    bg: 'bg-violet-50/70',
    border: 'border-violet-200',
    text: 'text-violet-950',
    accent: 'text-violet-600',
    lightBg: 'bg-violet-100/60',
  },
  {
    codename: '風暴隊',
    bg: 'bg-sky-50/70',
    border: 'border-sky-200',
    text: 'text-sky-950',
    accent: 'text-sky-600',
    lightBg: 'bg-sky-100/60',
  },
  {
    codename: '金芒隊',
    bg: 'bg-yellow-50/70',
    border: 'border-yellow-200',
    text: 'text-yellow-950',
    accent: 'text-yellow-600',
    lightBg: 'bg-yellow-100/60',
  },
];

export const TeamBuilder: React.FC<TeamBuilderProps> = ({ members }) => {
  const activeMembers = members.filter((m) => !m.isExcluded);

  const [settings, setSettings] = useState<GroupingSettings>({
    mode: 'byGroupSize', // 'byGroupSize' (每組幾人) or 'byTeamCount' (共分幾組)
    targetNumber: 4, // 預設 4 人一組
    balanceDepartment: true,
    autoAssignLeader: true,
  });

  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // Moving member manual adjustment state
  const [movingMember, setMovingMember] = useState<{ member: Member; fromGroupId: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto trigger initial grouping when members or settings load
  useEffect(() => {
    if (activeMembers.length > 0 && groups.length === 0) {
      handleGenerateGroups();
    }
  }, [activeMembers.length]);

  // Execute grouping algorithm
  const handleGenerateGroups = () => {
    if (activeMembers.length === 0) {
      setGroups([]);
      return;
    }

    setIsShuffling(true);
    soundFx.playTick();

    setTimeout(() => {
      let teamCount = 1;
      if (settings.mode === 'byGroupSize') {
        const groupSize = Math.max(1, settings.targetNumber);
        teamCount = Math.max(1, Math.ceil(activeMembers.length / groupSize));
      } else {
        teamCount = Math.max(1, Math.min(settings.targetNumber, activeMembers.length));
      }

      // Initialize empty team groups
      const newGroups: TeamGroup[] = Array.from({ length: teamCount }, (_, i) => {
        const theme = TEAM_THEMES[i % TEAM_THEMES.length];
        return {
          id: `group-${i + 1}`,
          name: `第 ${i + 1} 組`,
          codename: theme.codename,
          color: theme,
          members: [],
        };
      });

      if (settings.balanceDepartment) {
        // Smart Department Cross-balancing
        const deptBuckets: { [dept: string]: Member[] } = {};
        const unassigned: Member[] = [];

        activeMembers.forEach((m) => {
          const dept = m.department?.trim() || '__unknown__';
          if (dept === '__unknown__') {
            unassigned.push(m);
          } else {
            if (!deptBuckets[dept]) deptBuckets[dept] = [];
            deptBuckets[dept].push(m);
          }
        });

        // Shuffle within each bucket
        Object.keys(deptBuckets).forEach((dept) => {
          deptBuckets[dept].sort(() => Math.random() - 0.5);
        });
        unassigned.sort(() => Math.random() - 0.5);

        // Sort departments by size descending
        const sortedDepts = Object.keys(deptBuckets).sort(
          (a, b) => deptBuckets[b].length - deptBuckets[a].length
        );

        // Distribute round-robin
        sortedDepts.forEach((dept) => {
          const deptList = deptBuckets[dept];
          let groupPointer = Math.floor(Math.random() * teamCount);
          deptList.forEach((member) => {
            let bestGroupIdx = 0;
            let minMembers = Infinity;
            for (let i = 0; i < teamCount; i++) {
              const idx = (groupPointer + i) % teamCount;
              if (newGroups[idx].members.length < minMembers) {
                minMembers = newGroups[idx].members.length;
                bestGroupIdx = idx;
              }
            }
            newGroups[bestGroupIdx].members.push(member);
            groupPointer = (bestGroupIdx + 1) % teamCount;
          });
        });

        // Distribute remaining unassigned members
        unassigned.forEach((member) => {
          newGroups.sort((a, b) => a.members.length - b.members.length);
          newGroups[0].members.push(member);
        });

      } else {
        // Pure Random Shuffle
        const shuffled = [...activeMembers].sort(() => Math.random() - 0.5);
        shuffled.forEach((member, idx) => {
          newGroups[idx % teamCount].members.push(member);
        });
      }

      // Assign leaders if enabled
      if (settings.autoAssignLeader) {
        newGroups.forEach((g) => {
          if (g.members.length > 0) {
            const randomLeaderIdx = Math.floor(Math.random() * g.members.length);
            g.leaderId = g.members[randomLeaderIdx].id;
          }
        });
      }

      setGroups(newGroups);
      setIsShuffling(false);
      soundFx.playFanfare();
      showToast(`已完成自動分組！共建立 ${newGroups.length} 個隊伍。`);
    }, 300);
  };

  // Feature 3: Download full grouping result to CSV
  const handleDownloadCsv = () => {
    if (groups.length === 0) {
      showToast('目前尚未生成分組名單！');
      return;
    }
    exportGroupsToCsv(groups);
    soundFx.playClick();
    showToast('已成功下載全體分組名單 CSV 紀錄！');
  };

  // Download a single group to CSV
  const handleDownloadSingleGroupCsv = (group: TeamGroup) => {
    const headers = ['組別名稱', '小組代號', '組內序號', '成員姓名', '部門/系所', '工號/學號', '角色定位'];
    const rows = group.members.map((m, idx) => [
      group.name,
      group.codename,
      (idx + 1).toString(),
      m.name,
      m.department || '-',
      m.empId || '-',
      m.id === group.leaderId ? '★ 組長' : '組員'
    ]);
    downloadCsv(`HR_分組紀錄_${group.name}_${group.codename}.csv`, [headers, ...rows]);
    soundFx.playClick();
    showToast(`已下載「${group.name}」分組紀錄 CSV！`);
  };

  // Copy formatted list to clipboard
  const handleCopyFormatted = async () => {
    const text = formatGroupsAsText(groups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      soundFx.playClick();
      showToast('已複製格式化名冊至剪貼簿，可直接貼上至 LINE 或 Slack！');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Move a member to target group
  const handleMoveMemberToGroup = (targetGroupId: string) => {
    if (!movingMember) return;
    if (movingMember.fromGroupId === targetGroupId) {
      setMovingMember(null);
      return;
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === movingMember.fromGroupId) {
          return {
            ...g,
            members: g.members.filter((m) => m.id !== movingMember.member.id),
            leaderId: g.leaderId === movingMember.member.id ? undefined : g.leaderId,
          };
        }
        if (g.id === targetGroupId) {
          return {
            ...g,
            members: [...g.members, movingMember.member],
          };
        }
        return g;
      })
    );

    setMovingMember(null);
    soundFx.playClick();
    showToast(`已將 ${movingMember.member.name} 調至新組別！`);
  };

  // Toggle leader
  const handleToggleLeader = (groupId: string, memberId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            leaderId: g.leaderId === memberId ? undefined : memberId,
          };
        }
        return g;
      })
    );
    soundFx.playClick();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between shadow-xs transition-all">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-semibold ml-4"
          >
            關閉
          </button>
        </div>
      )}

      {/* Control Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>智慧團隊自動分組</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>現有名單 {activeMembers.length} 人</span>
              <span aria-hidden="true">·</span>
              <span>自訂每組人數或總組數</span>
              <span aria-hidden="true">·</span>
              <span>跨部門/系所平衡</span>
            </div>
          </div>

          {/* Quick Actions & CSV Download */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerateGroups}
              disabled={isShuffling || activeMembers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{groups.length > 0 ? '重新隨機洗牌' : '立即自動分組'}</span>
            </button>

            {groups.length > 0 && (
              <>
                {/* Feature 3: Download Grouping Results to CSV (下載成 CSV 紀錄) */}
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-all shadow-2xs whitespace-nowrap"
                  title="將分組結果下載為 Excel/CSV 紀錄檔"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>下載分組紀錄 (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFormatted}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>已複製名冊！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>複製文字名冊</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grouping Settings Matrix */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">分組模式</label>
            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, mode: 'byGroupSize', targetNumber: 4 })}
                className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors ${
                  settings.mode === 'byGroupSize'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依每組人數
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, mode: 'byTeamCount', targetNumber: 4 })}
                className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors ${
                  settings.mode === 'byTeamCount'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依總組數
              </button>
            </div>
          </div>

          {/* Target Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {settings.mode === 'byGroupSize' ? '每組人數設定' : '預計總組數設定'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={Math.max(2, activeMembers.length)}
                value={settings.targetNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 2;
                  setSettings({ ...settings, targetNumber: val });
                }}
                className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {settings.mode === 'byGroupSize' ? '人 / 組' : '個小組'}
              </span>
            </div>
          </div>

          {/* Department Cross-Balancing Switch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">單位平衡機制</label>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, balanceDepartment: !settings.balanceDepartment })
              }
              className={`w-full py-1.5 px-3 text-xs font-medium rounded-lg border flex items-center justify-between transition-colors ${
                settings.balanceDepartment
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>跨部門/系所交叉平衡</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80">
                {settings.balanceDepartment ? '啟用' : '停用'}
              </span>
            </button>
          </div>

          {/* Leader Auto Assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">組長指派</label>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, autoAssignLeader: !settings.autoAssignLeader })
              }
              className={`w-full py-1.5 px-3 text-xs font-medium rounded-lg border flex items-center justify-between transition-colors ${
                settings.autoAssignLeader
                  ? 'bg-amber-50/80 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>隨機選出隊長</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80">
                {settings.autoAssignLeader ? '啟用' : '停用'}
              </span>
            </button>
          </div>
        </div>

        {/* Member transfer notice bar if a member is currently selected to move */}
        {movingMember && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between animate-pulse">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              正在調動成員「{movingMember.member.name}」：請點擊下方目標隊伍卡片右上角的「移至此組」按鈕！
            </span>
            <button
              type="button"
              onClick={() => setMovingMember(null)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 px-2 py-0.5"
            >
              取消調動
            </button>
          </div>
        )}
      </div>

      {/* Feature 3: Prominent Grouping Summary & Download Banner */}
      {groups.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                團隊分組已完成 · 共 {groups.length} 組（總計 {activeMembers.length} 人參與）
              </div>
              <div className="text-xs text-slate-600">
                每組約 {Math.round(activeMembers.length / groups.length)} 人
                {settings.balanceDepartment && ' · 已啟動部門/系所交叉平均分散機制'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>下載分組名單 CSV 紀錄</span>
          </button>
        </div>
      )}

      {/* Visualized Team Cards Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const isDestination = movingMember && movingMember.fromGroupId !== group.id;

            return (
              <div
                key={group.id}
                className={`bg-white rounded-xl border ${group.color.border} shadow-xs overflow-hidden transition-all duration-200 flex flex-col ${
                  isDestination ? 'ring-2 ring-indigo-500 shadow-md' : ''
                }`}
              >
                {/* Team Card Header */}
                <div className={`p-4 ${group.color.bg} border-b ${group.color.border} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-black text-lg ${group.color.text} tracking-tight`}>
                        {group.name}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${group.color.lightBg} ${group.color.accent}`}>
                        {group.codename}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      組員共 {group.members.length} 人
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isDestination ? (
                      <button
                        type="button"
                        onClick={() => handleMoveMemberToGroup(group.id)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap animate-bounce"
                      >
                        移至此組
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleGroupCsv(group)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-md transition-colors"
                        title="下載此組 CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Member List */}
                <div className="p-4 flex-1 divide-y divide-slate-100">
                  {group.members.length > 0 ? (
                    group.members.map((member, index) => {
                      const isLeader = group.leaderId === member.id;
                      const isBeingMoved = movingMember?.member.id === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`py-2 flex items-center justify-between text-xs sm:text-sm group hover:bg-slate-50/80 px-1.5 rounded-md transition-colors ${
                            isBeingMoved ? 'bg-indigo-50 opacity-60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-slate-400 font-mono text-xs tabular-nums">
                              {index + 1}.
                            </span>

                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <span>{member.name}</span>
                                {isLeader && (
                                  <span
                                    title="隊長 / 組長"
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                  >
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    隊長
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {member.department || '一般單位'}
                                {member.empId ? ` · ${member.empId}` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Member actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleLeader(group.id, member.id)}
                              className={`p-1 rounded-md text-xs transition-colors ${
                                isLeader
                                  ? 'text-amber-600 bg-amber-50'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isLeader ? '取消隊長標記' : '指派為隊長'}
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMovingMember({ member, fromGroupId: group.id });
                                soundFx.playClick();
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="調換至其他組"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      此組尚無組員
                    </div>
                  )}
                </div>

                {/* Team Card Footer: Department breakdown */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="font-medium text-slate-600">單位分布：</span>
                    {Array.from(new Set(group.members.map((m) => m.department).filter(Boolean))).map(
                      (d) => (
                        <span key={d} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm">
                          {d}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            尚未生成團隊分組
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            請確認名單中有足夠人員，設定每組人數後點選「立即自動分組」。
          </p>
          <button
            type="button"
            onClick={handleGenerateGroups}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>開始分組</span>
          </button>
        </div>
      )}
    </div>
  );
};
