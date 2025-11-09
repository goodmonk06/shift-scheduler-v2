import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { StaffTable } from "./StaffTable";
import { StaffFormDialog } from "./StaffFormDialog";
import type { Employee, PositionGroup, EmployeeFormData } from "../types/staffManagementTypes";
import { validateEmployeeForm, getInitialFormData, generateEmployeeId } from "../utils/staffManagementHelpers";
import { useToast } from "../hooks/useToast";
import { EmptyState } from "./ui/error-state";

export function StaffManagement() {
  const toast = useToast();

  // モックデータ（後でAPI連携）
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "EMP001",
      name: "山田 太郎",
      positionGroupId: "1",
      positionGroupName: "正社員",
      skillLevel: 100,
      canWorkNight: true,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 5,
      additionalConstraints: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "EMP002",
      name: "佐藤 花子",
      positionGroupId: "1",
      positionGroupName: "正社員",
      skillLevel: 100,
      canWorkNight: true,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 5,
      additionalConstraints: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "EMP003",
      name: "鈴木 一郎",
      positionGroupId: "2",
      positionGroupName: "パート",
      skillLevel: 80,
      canWorkNight: false,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 3,
      additionalConstraints: "月・水・金のみ勤務可能。水曜日は17時まで（子供の送迎のため）。",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  // 役職グループのモックデータ（後でAPI連携）
  const positionGroups: PositionGroup[] = [
    { id: "1", name: "正社員" },
    { id: "2", name: "パート" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState<EmployeeFormData>(getInitialFormData());

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData(getInitialFormData());
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      positionGroupId: employee.positionGroupId,
      skillLevel: employee.skillLevel,
      canWorkNight: employee.canWorkNight,
      minDaysOffPerWeek: employee.minDaysOffPerWeek || 2,
      maxConsecutiveWorkDays: employee.maxConsecutiveWorkDays || 5,
      additionalConstraints: employee.additionalConstraints || "",
    });
    setIsDialogOpen(true);
  };

  // 保存処理
  const handleSave = () => {
    const validationError = validateEmployeeForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const positionGroup = positionGroups.find((g) => g.id === formData.positionGroupId);

    if (editingEmployee) {
      // 更新
      setEmployees(
        employees.map((e) =>
          e.id === editingEmployee.id
            ? {
                ...e,
                name: formData.name,
                positionGroupId: formData.positionGroupId,
                positionGroupName: positionGroup?.name || "",
                skillLevel: formData.skillLevel,
                canWorkNight: formData.canWorkNight,
                minDaysOffPerWeek: formData.minDaysOffPerWeek,
                maxConsecutiveWorkDays: formData.maxConsecutiveWorkDays,
                additionalConstraints: formData.additionalConstraints,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
      toast.success("職員情報を更新しました");
    } else {
      // 新規作成
      const newEmployee: Employee = {
        id: generateEmployeeId(employees.length),
        name: formData.name,
        positionGroupId: formData.positionGroupId,
        positionGroupName: positionGroup?.name || "",
        skillLevel: formData.skillLevel,
        canWorkNight: formData.canWorkNight,
        minDaysOffPerWeek: formData.minDaysOffPerWeek,
        maxConsecutiveWorkDays: formData.maxConsecutiveWorkDays,
        additionalConstraints: formData.additionalConstraints,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEmployees([...employees, newEmployee]);
      toast.success("職員を追加しました");
    }

    setIsDialogOpen(false);
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (employeeId: string) => {
    setDeletingEmployeeId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (deletingEmployeeId) {
      setEmployees(employees.filter((e) => e.id !== deletingEmployeeId));
      toast.success("職員を削除しました");
      setIsDeleteDialogOpen(false);
      setDeletingEmployeeId(null);
    }
  };

  // 詳細表示（仮実装）
  const handleViewDetail = (employeeId: string) => {
    toast.info("職員詳細画面へ遷移します（実装予定）");
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">職員管理</h1>
            <p className="text-sm text-muted-foreground">
              職員の登録・編集・削除を行います
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          職員を追加
        </Button>
      </div>

      {/* テーブル */}
      <StaffTable
        employees={employees}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDeleteClick={handleDeleteClick}
      />

      {/* 追加・編集ダイアログ */}
      <StaffFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingEmployee={editingEmployee}
        formData={formData}
        setFormData={setFormData}
        positionGroups={positionGroups}
        onSave={handleSave}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>職員を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この職員に紐づくシフトデータも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
