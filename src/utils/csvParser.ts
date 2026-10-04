import { Member, WinnerRecord, TeamGroup } from '../types';

/**
 * Parse raw text (CSV, TSV, or newline-separated list) into structured Members
 */
export function parseMemberText(content: string): Member[] {
  if (!content || !content.trim()) return [];

  // Remove potential UTF-8 BOM
  let cleaned = content.replace(/^\uFEFF/, '').trim();
  const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) return [];

  // Check if first line looks like a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = 
    firstLine.includes('name') || firstLine.includes('姓名') ||
    firstLine.includes('dept') || firstLine.includes('部門') || firstLine.includes('系所') || firstLine.includes('班級') ||
    firstLine.includes('id') || firstLine.includes('工號') || firstLine.includes('學號') ||
    firstLine.includes('email') || firstLine.includes('信箱');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detect delimiter in first data line
  const sampleLine = lines[0];
  let delimiter: string | RegExp = ',';
  if (sampleLine.includes('\t')) {
    delimiter = '\t';
  } else if (sampleLine.includes(';')) {
    delimiter = ';';
  } else if (!sampleLine.includes(',') && (sampleLine.includes(' ') || sampleLine.includes('　'))) {
    delimiter = /\s+/;
  }

  // Header column index mapping
  let nameIdx = 0;
  let deptIdx = -1;
  let idIdx = -1;
  let emailIdx = -1;

  if (hasHeader) {
    const headers = lines[0].split(delimiter as any).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    headers.forEach((h, idx) => {
      if (h.includes('name') || h.includes('姓名') || h.includes('名字') || h === '人名' || h === '學生') {
        nameIdx = idx;
      } else if (h.includes('dept') || h.includes('部門') || h.includes('系所') || h.includes('班級') || h.includes('單位') || h.includes('組別')) {
        deptIdx = idx;
      } else if (h.includes('id') || h.includes('工號') || h.includes('學號') || h.includes('編號') || h.includes('座號')) {
        idIdx = idx;
      } else if (h.includes('email') || h.includes('信箱') || h.includes('郵件')) {
        emailIdx = idx;
      }
    });
  }

  const members: Member[] = [];

  dataLines.forEach((line, index) => {
    let cols: string[] = [];
    if (typeof delimiter === 'string') {
      cols = splitCsvLine(line, delimiter);
    } else {
      cols = line.split(delimiter);
    }

    if (cols.length === 0) return;

    let name = '';
    let dept = '';
    let empId = '';
    let email = '';

    if (hasHeader) {
      name = cols[nameIdx]?.trim() || '';
      dept = deptIdx !== -1 ? cols[deptIdx]?.trim() : '';
      empId = idIdx !== -1 ? cols[idIdx]?.trim() : '';
      email = emailIdx !== -1 ? cols[emailIdx]?.trim() : '';
    } else {
      // Auto heuristic without explicit header
      if (cols.length === 1) {
        name = cols[0].trim();
      } else if (cols.length === 2) {
        if (/^[a-zA-Z0-9_-]{2,10}$/.test(cols[0].trim()) && !/^[\u4e00-\u9fa5]/.test(cols[0].trim())) {
          empId = cols[0].trim();
          name = cols[1].trim();
        } else {
          name = cols[0].trim();
          dept = cols[1].trim();
        }
      } else {
        if (/^[a-zA-Z0-9_-]{2,10}$/.test(cols[0].trim())) {
          empId = cols[0].trim();
          name = cols[1].trim();
          dept = cols[2]?.trim() || '';
          email = cols[3]?.trim() || '';
        } else {
          name = cols[0].trim();
          dept = cols[1]?.trim() || '';
          empId = cols[2]?.trim() || '';
          email = cols[3]?.trim() || '';
        }
      }
    }

    // Strip outer quotes
    name = name.replace(/^["']|["']$/g, '').trim();
    dept = dept.replace(/^["']|["']$/g, '').trim();
    empId = empId.replace(/^["']|["']$/g, '').trim();

    if (name) {
      const generatedId = `m-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      members.push({
        id: generatedId,
        name,
        department: dept || undefined,
        empId: empId || undefined,
        email: email || undefined,
        isExcluded: false,
      });
    }
  });

  return members;
}

/**
 * Simple CSV line splitter handling quoted strings
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      insideQuote = !insideQuote;
    } else if (char === delimiter && !insideQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Detect duplicate names within a member list
 * Returns a map of normalized name -> count and array of duplicate names
 */
export function getDuplicateNameStats(members: Member[]): {
  duplicateNameCounts: Map<string, number>;
  duplicateNamesList: string[];
  totalDuplicateEntries: number; // How many rows are redundant
} {
  const counts = new Map<string, number>();

  members.forEach((m) => {
    const normalized = m.name.trim().toLowerCase();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });

  const duplicateNamesList: string[] = [];
  let totalDuplicateEntries = 0;

  counts.forEach((count, name) => {
    if (count > 1) {
      duplicateNamesList.push(name);
      totalDuplicateEntries += count - 1; // Number of redundant entries to be removed
    }
  });

  return {
    duplicateNameCounts: counts,
    duplicateNamesList,
    totalDuplicateEntries,
  };
}

/**
 * Remove duplicate names, keeping the first occurrence
 */
export function deduplicateMembers(members: Member[]): {
  cleaned: Member[];
  removedCount: number;
} {
  const seen = new Set<string>();
  const cleaned: Member[] = [];
  let removedCount = 0;

  members.forEach((m) => {
    const normalized = m.name.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(m);
    } else {
      removedCount++;
    }
  });

  return { cleaned, removedCount };
}

/**
 * Preset datasets for instant demonstration & testing
 */
export const SAMPLE_PRESETS: { 
  id: string;
  label: string; 
  badge: string;
  desc: string; 
  data: Member[];
}[] = [
  {
    id: 'corporate',
    label: '科技公司全體員工 (36 人)',
    badge: '企業活動',
    desc: '包含工程研發、產品企劃、品牌行銷、財務會計、人資運營等部門',
    data: [
      { id: 's-1', name: '陳冠宇 (Leo)', department: '研發部', empId: 'RD01' },
      { id: 's-2', name: '林庭羽 (Chloe)', department: '研發部', empId: 'RD02' },
      { id: 's-3', name: '張哲銘 (Kevin)', department: '研發部', empId: 'RD03' },
      { id: 's-4', name: '黃詩涵 (Ariel)', department: '研發部', empId: 'RD04' },
      { id: 's-5', name: '謝承翰 (Alex)', department: '研發部', empId: 'RD05' },
      { id: 's-6', name: '李佩萱 (Sandy)', department: '研發部', empId: 'RD06' },
      { id: 's-7', name: '吳宗翰 (Hank)', department: '研發部', empId: 'RD07' },
      { id: 's-8', name: '蔡宜庭 (Tina)', department: '產品部', empId: 'PM01' },
      { id: 's-9', name: '許家豪 (Howard)', department: '產品部', empId: 'PM02' },
      { id: 's-10', name: '鄭雅婷 (Vicky)', department: '產品部', empId: 'PM03' },
      { id: 's-11', name: '王俊傑 (Jason)', department: '產品部', empId: 'PM04' },
      { id: 's-12', name: '楊筑婷 (Jenny)', department: '產品部', empId: 'PM05' },
      { id: 's-13', name: '周柏言 (Brian)', department: '設計部', empId: 'UI01' },
      { id: 's-14', name: '劉又嘉 (Kelly)', department: '設計部', empId: 'UI02' },
      { id: 's-15', name: '潘威廷 (Dennis)', department: '設計部', empId: 'UI03' },
      { id: 's-16', name: '洪語婕 (Joyce)', department: '行銷部', empId: 'MK01' },
      { id: 's-17', name: '曾建榮 (Eric)', department: '行銷部', empId: 'MK02' },
      { id: 's-18', name: '賴宛萱 (Wendy)', department: '行銷部', empId: 'MK03' },
      { id: 's-19', name: '蘇立群 (Ryan)', department: '行銷部', empId: 'MK04' },
      { id: 's-20', name: '柯佳穎 (Iris)', department: '行銷部', empId: 'MK05' },
      { id: 's-21', name: '郭子齊 (Marcus)', department: '營運部', empId: 'OP01' },
      { id: 's-22', name: '徐若芳 (Rita)', department: '營運部', empId: 'OP02' },
      { id: 's-23', name: '葉書帆 (Sean)', department: '營運部', empId: 'OP03' },
      { id: 's-24', name: '范子晴 (Claire)', department: '營運部', empId: 'OP04' },
      { id: 's-25', name: '彭博揚 (Lucas)', department: '業務部', empId: 'SL01' },
      { id: 's-26', name: '梁詠心 (Peggy)', department: '業務部', empId: 'SL02' },
      { id: 's-27', name: '童振邦 (Oscar)', department: '業務部', empId: 'SL03' },
      { id: 's-28', name: '鐘曼晴 (Emily)', department: '業務部', empId: 'SL04' },
      { id: 's-29', name: '石正皓 (Victor)', department: '業務部', empId: 'SL05' },
      { id: 's-30', name: '莊心怡 (Grace)', department: '人資部', empId: 'HR01' },
      { id: 's-31', name: '江育廷 (Daniel)', department: '人資部', empId: 'HR02' },
      { id: 's-32', name: '高芷涵 (Hannah)', department: '人資部', empId: 'HR03' },
      { id: 's-33', name: '戴世勳 (Simon)', department: '財務部', empId: 'FN01' },
      { id: 's-34', name: '盧彥廷 (Darren)', department: '財務部', empId: 'FN02' },
      { id: 's-35', name: '薛敏慧 (Serena)', department: '財務部', empId: 'FN03' },
      { id: 's-36', name: '游宗霖 (Vincent)', department: '總經理室', empId: 'EX01' },
    ]
  },
  {
    id: 'students',
    label: '培訓營 / 班級學生名單 (24 人)',
    badge: '學生教學',
    desc: '包含資工系、電機系、企管系、外文系等學生學號與系所分佈',
    data: [
      { id: 'st-1', name: '陳韋安', department: '資工系', empId: 'B11902001' },
      { id: 'st-2', name: '林郁婷', department: '資工系', empId: 'B11902002' },
      { id: 'st-3', name: '黃俊凱', department: '資工系', empId: 'B11902003' },
      { id: 'st-4', name: '張家豪', department: '資工系', empId: 'B11902004' },
      { id: 'st-5', name: '李若涵', department: '電機系', empId: 'B11901001' },
      { id: 'st-6', name: '王宗憲', department: '電機系', empId: 'B11901002' },
      { id: 'st-7', name: '趙子儀', department: '電機系', empId: 'B11901003' },
      { id: 'st-8', name: '周柏宇', department: '電機系', empId: 'B11901004' },
      { id: 'st-9', name: '楊心妤', department: '企管系', empId: 'B11701001' },
      { id: 'st-10', name: '劉子敬', department: '企管系', empId: 'B11701002' },
      { id: 'st-11', name: '孫詠潔', department: '企管系', empId: 'B11701003' },
      { id: 'st-12', name: '徐博彥', department: '企管系', empId: 'B11701004' },
      { id: 'st-13', name: '高雅筑', department: '外文系', empId: 'B11102001' },
      { id: 'st-14', name: '吳廷恩', department: '外文系', empId: 'B11102002' },
      { id: 'st-15', name: '鄭巧敏', department: '外文系', empId: 'B11102003' },
      { id: 'st-16', name: '蔡睿承', department: '外文系', empId: 'B11102004' },
      { id: 'st-17', name: '謝沛珊', department: '設計系', empId: 'B11501001' },
      { id: 'st-18', name: '葉佳銘', department: '設計系', empId: 'B11501002' },
      { id: 'st-19', name: '許書涵', department: '設計系', empId: 'B11501003' },
      { id: 'st-20', name: '宋浩宇', department: '設計系', empId: 'B11501004' },
      { id: 'st-21', name: '梁詠晴', department: '醫學系', empId: 'B11801001' },
      { id: 'st-22', name: '馮冠榮', department: '醫學系', empId: 'B11801002' },
      { id: 'st-23', name: '任雅雯', department: '法律系', empId: 'B11601001' },
      { id: 'st-24', name: '方宏志', department: '法律系', empId: 'B11601002' },
    ]
  },
  {
    id: 'duplicates_test',
    label: '包含重複姓名測試名單 (14 人，內含 4 筆重複)',
    badge: '去重示範',
    desc: '刻意包含重複學生/同仁（王小明出現 3 次、林小芬出現 2 次），便於立即體驗重複標記與一鍵去重！',
    data: [
      { id: 'dup-1', name: '王小明', department: '企劃部', empId: 'T01' },
      { id: 'dup-2', name: '林小芬', department: '設計部', empId: 'T02' },
      { id: 'dup-3', name: '張國榮', department: '研發部', empId: 'T03' },
      { id: 'dup-4', name: '王小明', department: '企劃部', empId: 'T01' }, // 重複 1
      { id: 'dup-5', name: '李美華', department: '人資部', empId: 'T04' },
      { id: 'dup-6', name: '林小芬', department: '設計部', empId: 'T02' }, // 重複 2
      { id: 'dup-7', name: '陳天豪', department: '業務部', empId: 'T05' },
      { id: 'dup-8', name: '王小明', department: '總務處', empId: 'T06' }, // 重複 3
      { id: 'dup-9', name: '周杰安', department: '產品部', empId: 'T07' },
      { id: 'dup-10', name: '黃曉柔', department: '行銷部', empId: 'T08' },
      { id: 'dup-11', name: '蔡偉倫', department: '研發部', empId: 'T09' },
      { id: 'dup-12', name: '趙佩琪', department: '財務部', empId: 'T10' },
      { id: 'dup-13', name: '曾建明', department: '營運部', empId: 'T11' },
      { id: 'dup-14', name: '吳書婷', department: '人資部', empId: 'T12' },
    ]
  },
  {
    id: 'workshop',
    label: '敏捷破冰小組 (16 人)',
    badge: '工作坊',
    desc: '適合小組競賽、破冰交流與快速分組的精簡名單',
    data: [
      { id: 'ws-1', name: '張立仁 (Ian)', department: '前端組' },
      { id: 'ws-2', name: '黃靖雅 (Ashley)', department: '後端組' },
      { id: 'ws-3', name: '陳韋安 (Andy)', department: '測試組' },
      { id: 'ws-4', name: '林佩珊 (Cynthia)', department: '企劃組' },
      { id: 'ws-5', name: '劉家銘 (Gary)', department: '前端組' },
      { id: 'ws-6', name: '鄭雅芳 (Flora)', department: '後端組' },
      { id: 'ws-7', name: '許文傑 (Wayne)', department: '測試組' },
      { id: 'ws-8', name: '王敏婷 (Mindy)', department: '企劃組' },
      { id: 'ws-9', name: '蔡宗憲 (Shawn)', department: '前端組' },
      { id: 'ws-10', name: '謝佩芬 (Penny)', department: '後端組' },
      { id: 'ws-11', name: '吳冠良 (Leon)', department: '測試組' },
      { id: 'ws-12', name: '李佳蓉 (Sharon)', department: '企劃組' },
      { id: 'ws-13', name: '曾柏翰 (Benson)', department: '前端組' },
      { id: 'ws-14', name: '楊雅婷 (Amber)', department: '後端組' },
      { id: 'ws-15', name: '周宏偉 (Howard)', department: '測試組' },
      { id: 'ws-16', name: '徐詩婷 (Stacy)', department: '企劃組' },
    ]
  }
];

/**
 * Export generic content as a downloaded CSV file with UTF-8 BOM
 */
export function downloadCsv(filename: string, csvRows: string[][]) {
  const content = '\uFEFF' + csvRows.map(row => 
    row.map(field => {
      const escaped = (field ?? '').toString().replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download sample template CSV for users to learn format
 */
export function downloadSampleTemplateCsv() {
  const headers = ['姓名', '部門/系所', '工號/學號', '電子郵件'];
  const sampleRows = [
    ['王小明', '研發部', 'RD001', 'xiaoming@example.com'],
    ['陳大華', '行銷部', 'MK002', 'dahua@example.com'],
    ['林雅婷', '人資部', 'HR003', 'yating@example.com'],
    ['張志強', '產品部', 'PM004', 'zhiqiang@example.com'],
    ['黃美玲', '財務部', 'FN005', 'meiling@example.com'],
    ['李俊傑', '研發部', 'RD006', 'junjie@example.com'],
  ];
  downloadCsv('HR_名單匯入範本_姓名_部門_工號.csv', [headers, ...sampleRows]);
}

/**
 * Export members to CSV
 */
export function exportMembersToCsv(members: Member[]) {
  const headers = ['序號', '姓名', '部門/系所', '工號/學號', '抽籤與分組狀態'];
  const rows = members.map((m, idx) => [
    (idx + 1).toString(),
    m.name,
    m.department || '未指定',
    m.empId || '',
    m.isExcluded ? '已排除' : '參與中'
  ]);
  downloadCsv(`HR_成員名單總表_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
}

/**
 * Export winners to CSV
 */
export function exportWinnersToCsv(winners: WinnerRecord[]) {
  const headers = ['抽獎梯次', '獎項名稱', '得獎人姓名', '部門/系所', '工號/學號', '獲獎時間'];
  const rows = winners.map(w => [
    w.batchId,
    w.prizeName,
    w.memberName,
    w.department || '-',
    w.empId || '-',
    w.drawnAt
  ]);
  downloadCsv(`HR_獎品中獎紀錄清單_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
}

/**
 * Export grouping results to CSV
 */
export function exportGroupsToCsv(groups: TeamGroup[]) {
  const headers = ['組別名稱', '小組代號', '組內序號', '成員姓名', '部門/系所', '工號/學號', '角色定位', '分組匯出日期'];
  const dateStr = new Date().toISOString().slice(0, 10);
  const rows: string[][] = [];

  groups.forEach(g => {
    g.members.forEach((m, mIdx) => {
      rows.push([
        g.name,
        g.codename,
        (mIdx + 1).toString(),
        m.name,
        m.department || '一般單位',
        m.empId || '-',
        m.id === g.leaderId ? '★ 組長' : '組員',
        dateStr
      ]);
    });
  });

  downloadCsv(`HR_自動團隊分組名冊_${dateStr}.csv`, [headers, ...rows]);
}

/**
 * Generate formatted clipboard text of teams
 */
export function formatGroupsAsText(groups: TeamGroup[]): string {
  const lines: string[] = ['【團隊分組名冊】\n'];
  groups.forEach((g) => {
    lines.push(`━━ ${g.name} (${g.codename}) [共 ${g.members.length} 人] ━━`);
    g.members.forEach((m, mIdx) => {
      const isLeader = m.id === g.leaderId ? ' [★ 組長]' : '';
      const dept = m.department ? ` (${m.department})` : '';
      const idStr = m.empId ? ` #${m.empId}` : '';
      lines.push(`  ${mIdx + 1}. ${m.name}${dept}${idStr}${isLeader}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
