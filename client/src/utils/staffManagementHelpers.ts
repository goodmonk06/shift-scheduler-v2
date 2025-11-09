import type { EmployeeFormData } from "../types/staffManagementTypes";

// フォームデータの検証
export const validateEmployeeForm = (formData: EmployeeFormData): string | null => {
  if (!formData.name.trim()) {
    return "名前を入力してください";
  }

  if (formData.skillLevel < 50 || formData.skillLevel > 100) {
    return "スキルレベルは50〜100の範囲で設定してください";
  }

  return null;
};

// 初期フォームデータの取得
export const getInitialFormData = (): EmployeeFormData => ({
  name: "",
  positionGroupId: "1",
  skillLevel: 100,
  canWorkNight: false,
  minDaysOffPerWeek: 2,
  maxConsecutiveWorkDays: 5,
  additionalConstraints: "",
});

// 新しい従業員IDの生成
export const generateEmployeeId = (currentCount: number): string => {
  return `EMP${String(currentCount + 1).padStart(3, "0")}`;
};
