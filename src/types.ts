export interface Member {
  id: string;
  name: string;
  department?: string;
  empId?: string;
  email?: string;
  isExcluded?: boolean;
}

export interface Prize {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  icon?: string;
}

export interface WinnerRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  memberId: string;
  memberName: string;
  department?: string;
  empId?: string;
  drawnAt: string;
  batchId: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  codename: string;
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    lightBg: string;
  };
  members: Member[];
  leaderId?: string;
}

export type DrawState = 'idle' | 'rolling' | 'revealed';

export interface DrawSettings {
  allowDuplicates: boolean; // 是否允許重複中獎
  drawSpeed: 'normal' | 'suspense' | 'fast';
  soundEnabled: boolean;
}

export interface GroupingSettings {
  mode: 'byTeamCount' | 'byGroupSize';
  targetNumber: number; // 組數 或 每組人數
  balanceDepartment: boolean; // 是否啟用部門分散平衡
  autoAssignLeader: boolean; // 是否隨機指定隊長
}
