export interface Employee {
  id: string;
  employeeId?: string; // ログイン用ID (1-4桁)
  name: string;
  positionGroupId: string;
  positionGroupName: string; // 表示用
  skillLevel: number; // 50-100
  canWorkNight: boolean;
  // AI生成用の制約条件
  minDaysOffPerWeek?: number;
  maxConsecutiveWorkDays?: number;
  additionalConstraints?: string;
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
  minDaysOffPerWeek: number;
  maxConsecutiveWorkDays: number;
  additionalConstraints: string;
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
