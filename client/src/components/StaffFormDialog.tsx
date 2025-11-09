import { Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { StaffFormDialogProps } from "../types/staffManagementTypes";

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="positionGroupId">役職グループ *</Label>
            <Select
              value={formData.positionGroupId}
              onValueChange={(value) =>
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
              onCheckedChange={(checked) =>
                setFormData({ ...formData, canWorkNight: checked })
              }
            />
            <Label htmlFor="canWorkNight" className="cursor-pointer">
              夜勤可能
            </Label>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm">シフト制約条件(AI生成用)</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minDaysOff">週の最低休日数</Label>
                <Input
                  id="minDaysOff"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.minDaysOffPerWeek}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minDaysOffPerWeek: parseInt(e.target.value) || 2,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConsecutive">最大連勤日数</Label>
                <Input
                  id="maxConsecutive"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.maxConsecutiveWorkDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxConsecutiveWorkDays: parseInt(e.target.value) || 5,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalConstraints">追加の制約(任意)</Label>
              <Textarea
                id="additionalConstraints"
                placeholder="例: 月・水・金のみ勤務可能。水曜日は17時まで(子供の送迎のため)。第2・第4土曜日は不可。"
                value={formData.additionalConstraints}
                onChange={(e) =>
                  setFormData({ ...formData, additionalConstraints: e.target.value })
                }
                className="rounded-xl"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                AIが理解できるように、自然言語で具体的に記入してください
              </p>
            </div>
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
