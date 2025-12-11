import { Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { StaffConstraintsEditor } from "./StaffConstraintsEditor";
import type { StaffFormDialogProps } from "../types/staffManagementTypes";
import type { EmployeeWorkConstraints } from "../types/employeeConstraints";
import { generateConstraintDescription } from "../types/employeeConstraints";

export function StaffFormDialog({
  open,
  onOpenChange,
  editingEmployee,
  formData,
  setFormData,
  positionGroups,
  onSave,
}: StaffFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEmployee ? "職員情報を編集" : "職員を追加"}
          </DialogTitle>
          <DialogDescription>
            職員の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前 *</Label>
            <Input
              id="name"
              placeholder="例: 山田 太郎"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">職員ID *</Label>
            <Input
              id="employeeId"
              placeholder="例: 1234（1〜4桁の数字）"
              value={formData.employeeId || ""}
              onChange={(e) =>
                setFormData({ ...formData, employeeId: e.target.value })
              }
              className="rounded-xl"
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground">
              職員がログインする際に使用するID（1〜4桁）
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="positionGroupId">役職グループ *</Label>
            <Select
              value={formData.positionGroupId}
              onValueChange={(value: string) =>
                setFormData({ ...formData, positionGroupId: value })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positionGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skillLevel">スキルレベル</Label>
            <Input
              id="skillLevel"
              type="number"
              min="50"
              max="100"
              value={formData.skillLevel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  skillLevel: parseInt(e.target.value) || 100,
                })
              }
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              50=0.5人前、100=1人前(50〜100)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="canWorkNight"
              checked={formData.canWorkNight}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, canWorkNight: checked })
              }
            />
            <Label htmlFor="canWorkNight" className="cursor-pointer">
              夜勤可能
            </Label>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">個別勤務条件</Label>
            <StaffConstraintsEditor
              constraints={(formData.additionalConstraintsRaw as EmployeeWorkConstraints) || {}}
              onChange={(constraints) => {
                const description = generateConstraintDescription(constraints);
                setFormData({
                  ...formData,
                  additionalConstraintsRaw: constraints as unknown as Record<string, unknown>,
                  additionalConstraints: description,
                });
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={onSave} className="rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
