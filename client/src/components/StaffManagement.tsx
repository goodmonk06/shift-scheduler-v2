import { useState, useEffect } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { StaffTable } from "./StaffTable";
import { StaffFormDialog } from "./StaffFormDialog";
import type { Employee, PositionGroup, EmployeeFormData } from "../types/staffManagementTypes";
import { validateEmployeeForm, getInitialFormData, generateEmployeeId } from "../utils/staffManagementHelpers";
import { useToast } from "../hooks/useToast";
import { EmptyState } from "./ui/error-state";
import { trpcClient } from "../lib/trpc";
import { useMutation } from "../hooks/useAsync";

export function StaffManagement() {
  const toast = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // データ読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [employeesData, positionGroupsData] = await Promise.all([
        trpcClient.employees.list.query(),
        trpcClient.positionGroups.list.query(),
      ]);

      // データ変換
      const mappedEmployees: Employee[] = employeesData.map((emp: any) => ({
        id: emp.id.toString(),
        employeeId: emp.employeeId,
        name: emp.name,
        positionGroupId: emp.positionGroupId.toString(),
        positionGroupName: emp.positionGroup?.name || "",
        skillLevel: emp.skillLevel || 100,
        canWorkNight: emp.canWorkNightShift || false,
        minDaysOffPerWeek: 2,
        maxConsecutiveWorkDays: 5,
        additionalConstraints: "",
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      }));

      const mappedGroups: PositionGroup[] = positionGroupsData.map((group: any) => ({
        id: group.id.toString(),
        name: group.name,
      }));

      setEmployees(mappedEmployees);
      setPositionGroups(mappedGroups);
    } catch (error) {
      console.error("データの読み込みに失敗:", error);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

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
      employeeId: employee.employeeId,
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
  const handleSave = async () => {
    const validationError = validateEmployeeForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      if (editingEmployee) {
        // 更新
        await trpcClient.employees.update.mutate({
          id: parseInt(editingEmployee.id),
          name: formData.name,
          employeeId: formData.employeeId,
          positionGroupId: parseInt(formData.positionGroupId),
          skillLevel: formData.skillLevel,
          canWorkNightShift: formData.canWorkNight,
        });
        toast.success("職員情報を更新しました");
      } else {
        // 新規作成
        await trpcClient.employees.create.mutate({
          name: formData.name,
          employeeId: formData.employeeId,
          positionGroupId: parseInt(formData.positionGroupId),
          skillLevel: formData.skillLevel,
          canWorkNightShift: formData.canWorkNight,
        });
        toast.success("職員を追加しました");
      }

      // データ再読み込み
      await loadData();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("保存エラー:", error);
      toast.error(error.message || "保存に失敗しました");
    }
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (employeeId: string) => {
    setDeletingEmployeeId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = async () => {
    if (deletingEmployeeId) {
      try {
        await trpcClient.employees.delete.mutate({ id: parseInt(deletingEmployeeId) });
        toast.success("職員を削除しました");
        await loadData();
        setIsDeleteDialogOpen(false);
        setDeletingEmployeeId(null);
      } catch (error: any) {
        console.error("削除エラー:", error);
        toast.error(error.message || "削除に失敗しました");
      }
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
