import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Users,
  Building,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Member } from '../types';
import { 
  parseMemberText, 
  SAMPLE_PRESETS, 
  exportMembersToCsv, 
  downloadSampleTemplateCsv,
  getDuplicateNameStats,
  deduplicateMembers
} from '../utils/csvParser';
import { soundFx } from '../utils/audio';

interface RosterManagerProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  onClearMembers: () => void;
  onGoToDraw: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({
  members,
  onUpdateMembers,
  onClearMembers,
  onGoToDraw,
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [autoDedupeOnPaste, setAutoDedupeOnPaste] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'warn' } | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'warn' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Analyze duplicates in current member list
  const dupStats = getDuplicateNameStats(members);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseMemberText(text);
        if (parsed.length > 0) {
          const newCombined = [...members, ...parsed];
          const newDupStats = getDuplicateNameStats(newCombined);
          onUpdateMembers(newCombined);

          if (newDupStats.totalDuplicateEntries > 0) {
            showToast(
              `已匯入 ${parsed.length} 筆資料，但偵測到有 ${newDupStats.totalDuplicateEntries} 筆重複姓名，已在名單中醒目標示！`,
              'warn'
            );
          } else {
            showToast(`成功匯入 ${parsed.length} 筆名單資料！`);
          }
          soundFx.playFanfare();
        } else {
          showToast('無法從此檔案解析出有效的名單，請確認檔案格式', 'warn');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste submission with optional auto deduplication
  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return;
    let parsed = parseMemberText(pasteContent);
    if (parsed.length > 0) {
      let dedupeMessage = '';
      if (autoDedupeOnPaste) {
        const dedupedResult = deduplicateMembers(parsed);
        if (dedupedResult.removedCount > 0) {
          dedupeMessage = `（已自動過濾 ${dedupedResult.removedCount} 筆重複姓名）`;
          parsed = dedupedResult.cleaned;
        }
      }

      onUpdateMembers([...members, ...parsed]);
      setShowPasteModal(false);
      setPasteContent('');
      showToast(`成功貼上匯入 ${parsed.length} 位名單！${dedupeMessage}`);
      soundFx.playFanfare();
    } else {
      showToast('未能辨識出有效名單，請確認每行輸入一個姓名', 'warn');
    }
  };

  // Handle one-click deduplication
  const handleOneClickDeduplicate = () => {
    const { cleaned, removedCount } = deduplicateMembers(members);
    if (removedCount > 0) {
      onUpdateMembers(cleaned);
      showToast(`已成功一次性移除 ${removedCount} 筆重複姓名，保留了每位同仁/學生的唯一資料！`);
      soundFx.playFanfare();
    } else {
      showToast('名單中目前沒有重複的姓名。');
    }
  };

  // Handle single manual addition
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const trimmedName = newName.trim();
    const isDuplicate = members.some(
      (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    const newMember: Member = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      department: newDept.trim() || undefined,
      empId: newEmpId.trim() || undefined,
      isExcluded: false,
    };

    onUpdateMembers([newMember, ...members]);
    setNewName('');
    setNewDept('');
    setNewEmpId('');
    soundFx.playClick();

    if (isDuplicate) {
      showToast(`已新增成員：${newMember.name}（注意：名單中已有同名人員）`, 'warn');
    } else {
      showToast(`已新增成員：${newMember.name}`);
    }
  };

  // Toggle member exclusion
  const handleToggleExclude = (id: string) => {
    onUpdateMembers(
      members.map((m) => (m.id === id ? { ...m, isExcluded: !m.isExcluded } : m))
    );
    soundFx.playClick();
  };

  // Delete single member
  const handleDeleteMember = (id: string) => {
    onUpdateMembers(members.filter((m) => m.id !== id));
    soundFx.playClick();
  };

  // Load preset sample
  const handleLoadPreset = (presetId: string) => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onUpdateMembers(preset.data);
    soundFx.playFanfare();
    showToast(`已載入模擬名單：${preset.label} (${preset.data.length}人)`);
  };

  // Department list for filtering
  const departments = Array.from(
    new Set(members.map((m) => m.department).filter(Boolean))
  ) as string[];

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.empId && m.empId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'all' || m.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  const activeCandidatesCount = members.filter((m) => !m.isExcluded).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-2.5 rounded-lg text-sm flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'warn'
              ? 'bg-amber-50 border border-amber-300 text-amber-900'
              : 'bg-indigo-50 border border-indigo-200 text-indigo-900'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {notification.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            {notification.msg}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-semibold ml-4"
          >
            關閉
          </button>
        </div>
      )}

      {/* Main Roster Source & Mock Preset Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                名單來源與員工/學生資料庫
              </h2>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold">
                HR & 教師活動工具
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>支援 CSV/Excel 檔案</span>
              <span aria-hidden="true">·</span>
              <span>複製貼上文字</span>
              <span aria-hidden="true">·</span>
              <span>重複姓名標記與一鍵去重</span>
            </div>
          </div>

          {/* Import / Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>上傳 CSV / 檔案</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>貼上名單內容</span>
            </button>

            <button
              type="button"
              onClick={downloadSampleTemplateCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs whitespace-nowrap"
              title="下載標準格式的範本 CSV 檔案"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>下載範本 CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFormatGuide(!showFormatGuide)}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>格式指南</span>
              {showFormatGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Feature 1: Dedicated Mock Dataset Showcase (模擬名單快速體驗區) */}
        <div className="mt-5 p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200/90 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 tracking-wide">
                快速體驗：載入情境模擬名單
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                點選任一模擬範本，即可直接體驗抽籤動畫、自動分組與去重機制
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset.id)}
                className={`p-3 text-left bg-white border rounded-lg transition-all shadow-2xs hover:shadow-xs hover:border-indigo-300 group ${
                  preset.id === 'duplicates_test'
                    ? 'border-amber-200 hover:border-amber-400 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                      preset.id === 'duplicates_test'
                        ? 'bg-amber-100 text-amber-800'
                        : preset.id === 'students'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {preset.badge}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-indigo-600 font-medium">
                    {preset.data.length} 人
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 line-clamp-1">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Format Guide Expandable Box */}
        {showFormatGuide && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2 animate-in fade-in duration-150">
            <div className="font-bold text-slate-800">名單資料匯入支援格式說明：</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-2.5 rounded-md border border-slate-200">
                <div className="font-semibold text-indigo-700 mb-1">格式一：僅有姓名</div>
                <p className="text-[11px] text-slate-500 mb-1">一行一個姓名，適合快速破冰或抽籤：</p>
                <pre className="bg-slate-100 p-1.5 rounded font-mono text-[10px] text-slate-700">
                  {"陳冠宇\n林庭羽\n張哲銘\n黃詩涵"}
                </pre>
              </div>

              <div className="bg-white p-2.5 rounded-md border border-slate-200">
                <div className="font-semibold text-indigo-700 mb-1">格式二：姓名, 部門/系所, 工號</div>
                <p className="text-[11px] text-slate-500 mb-1">逗號隔開或 Excel 匯出之標準 CSV：</p>
                <pre className="bg-slate-100 p-1.5 rounded font-mono text-[10px] text-slate-700">
                  {"姓名,部門,工號\n王小明,研發部,RD01\n林小芳,行銷部,MK02"}
                </pre>
              </div>

              <div className="bg-white p-2.5 rounded-md border border-slate-200">
                <div className="font-semibold text-indigo-700 mb-1">格式三：學生名單 / 班級</div>
                <p className="text-[11px] text-slate-500 mb-1">包含學號與系所班級，自動適配跨系分組：</p>
                <pre className="bg-slate-100 p-1.5 rounded font-mono text-[10px] text-slate-700">
                  {"陳韋安,資工系,B11902001\n李若涵,電機系,B11901001"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Quick Add Single Row Form */}
        <form
          onSubmit={handleAddSingle}
          className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
        >
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="姓名 * (例: 陳冠宇)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="部門 / 系所 (例: 研發部 或 資工系)"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>
          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="工號 / 學號 (例: RD01 或 B11901)"
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>快速加入</span>
            </button>
          </div>
        </form>
      </div>

      {/* Feature 2: Duplicate Alert & One-Click Cleanup Banner (重複姓名警告與一鍵移除按鈕) */}
      {dupStats.totalDuplicateEntries > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>發現名單中含有 {dupStats.totalDuplicateEntries} 筆重複的姓名！</span>
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                重複同名人員：
                <span className="font-semibold text-amber-950 ml-1">
                  {dupStats.duplicateNamesList.join('、')}
                </span>
                （已在下方名單以黃色標籤醒目標註）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOneClickDeduplicate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition-all whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>一鍵移除重複姓名（保留第一筆）</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">目前總人數</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{members.length}</span>
            <span className="text-xs text-slate-500">人</span>
            {dupStats.totalDuplicateEntries > 0 && (
              <span className="text-xs text-amber-600 font-semibold ml-auto bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                含 {dupStats.totalDuplicateEntries} 筆重複
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">有效參與候選人數</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">{activeCandidatesCount}</span>
            <span className="text-xs text-slate-500">人 (排除 {members.length - activeCandidatesCount} 人)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">部門 / 班級系所數</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {departments.length > 0 ? departments.length : 1}
            </span>
            <span className="text-xs text-slate-500">個不同單位</span>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋姓名、工號或部門..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">所有單位 ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {dupStats.totalDuplicateEntries > 0 && (
              <button
                type="button"
                onClick={handleOneClickDeduplicate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                <span>一鍵清理重複項 ({dupStats.totalDuplicateEntries})</span>
              </button>
            )}

            {members.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => exportMembersToCsv(members)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出 CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('確定要清空所有名單嗎？此操作無法復原。')) {
                      onClearMembers();
                      showToast('已清空名單');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Member Table */}
        {filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 tracking-wider">
                  <th className="py-2.5 px-4 w-12 text-center">序號</th>
                  <th className="py-2.5 px-4">員工 / 學生姓名</th>
                  <th className="py-2.5 px-4">部門 / 系所班級</th>
                  <th className="py-2.5 px-4">工號 / 學號</th>
                  <th className="py-2.5 px-4 text-center">狀態標記</th>
                  <th className="py-2.5 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredMembers.map((member, index) => {
                  const normalizedName = member.name.trim().toLowerCase();
                  const dupCount = dupStats.duplicateNameCounts.get(normalizedName) || 1;
                  const isDuplicate = dupCount > 1;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDuplicate ? 'bg-amber-50/40' : ''
                      } ${member.isExcluded ? 'opacity-60' : ''}`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 font-mono tabular-nums text-xs">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {/* Feature 2: Prominent Duplicate Tag on Row */}
                          {isDuplicate && (
                            <span
                              title={`姓名「${member.name}」在名單中共出現了 ${dupCount} 次`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-sm"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>重複 (共{dupCount}次)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {member.department ? (
                          <span className="font-medium text-slate-700">
                            {member.department}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">未指定</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums text-xs">
                        {member.empId || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleExclude(member.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            member.isExcluded
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                          title={member.isExcluded ? '點擊以恢復參與' : '點擊以暫時排除'}
                        >
                          {member.isExcluded ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>已排除</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>參與中</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          title="刪除此筆"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              {searchQuery ? '找不到符合條件的人員' : '目前名單尚無資料'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              {searchQuery
                ? '請嘗試使用不同關鍵字搜尋，或切換部門/系所篩選條件。'
                : '請從上方選擇「模擬名單」、上傳 CSV 檔案或直接貼上姓名名單！'}
            </p>
            {!searchQuery && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('corporate')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>載入企業 36 人模擬名單</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('students')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>載入學生 24 人名單</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>貼上自訂姓名名單</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table Footer */}
        {members.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>
                顯示 {filteredMembers.length} / {members.length} 人
              </span>
              {dupStats.totalDuplicateEntries > 0 && (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  尚有 {dupStats.totalDuplicateEntries} 筆重複待處理
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onGoToDraw}
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <span>前往抽籤舞台 →</span>
            </button>
          </div>
        )}
      </div>

      {/* Feature 2: Paste Modal with Instant Duplicate Detection (貼上名單彈窗與重複預覽) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">批次貼上名單</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  支援直接由 Excel 複製貼上，或一行一個姓名
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                <span className="font-semibold block mb-1 text-slate-900">格式範例：</span>
                • 簡易格式：一行一個名字（例：王小明）<br />
                • 完整格式：姓名, 部門/系所, 工號/學號（或從 Excel 框選多欄直接 Ctrl+V 貼上）
              </div>

              <textarea
                rows={8}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={"陳大文\n林小芳, 行銷部, MK02\n張志偉\t研發部\tRD09\n王小明, 資工系, B11902"}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {/* Live Preview Duplicate Check in Modal */}
              {pasteContent.trim() && (() => {
                const previewParsed = parseMemberText(pasteContent);
                const previewDupes = getDuplicateNameStats(previewParsed);
                return (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>已解析出 {previewParsed.length} 筆姓名資料</span>
                      {previewDupes.totalDuplicateEntries > 0 && (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          內含 {previewDupes.totalDuplicateEntries} 筆重複姓名
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={autoDedupeOnPaste}
                        onChange={(e) => setAutoDedupeOnPaste(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="font-medium">
                        自動過濾並移除重複姓名（若有同名同姓，僅匯入第一筆）
                      </span>
                    </label>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                解析並加入名單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
