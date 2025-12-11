export interface WorkableDay {
  dayOfWeek: number; // 0=日曜, 1=月曜, ..., 6=土曜
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface Employee {
  id: string;
  employeeId?: string; // ログイン用ID (1-4桁)
  name: string;
  positionGroupId: string;
  positionGroupName: string; // 表示用
  skillLevel: number; // 50-100
  canWorkNight: boolean;
  // 勤務可能曜日と時間帯
  workableDays?: WorkableDay[];
  additionalConstraints?: string; // 表示用（テキスト形式）
  additionalConstraintsRaw?: Record<string, unknown> | null; // 生のJSONオブジェクト
  createdAt: string;
  updatedAt: string;
}

export interface PositionGroup {
  id: string;
  name: string;
}

export interface EmployeeFormData {
  name: string;
  employeeId?: string; // ログイン用ID (1-4桁)
  positionGroupId: string;
  skillLevel: number;
  canWorkNight: boolean;
  workableDays: WorkableDay[];
  additionalConstraints: string;
  additionalConstraintsRaw: Record<string, unknown> | null; // 生のJSONオブジェクト
}

export interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEmployee: Employee | null;
  formData: EmployeeFormData;
  setFormData: (data: EmployeeFormData) => void;
  positionGroups: PositionGroup[];
  onSave: () => void;
}

export interface StaffTableProps {
  employees: Employee[];
  onViewDetail: (employeeId: string) => void;
  onEdit: (employee: Employee) => void;
  onDeleteClick: (employeeId: string) => void;
}
