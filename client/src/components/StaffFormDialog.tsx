import { Save, X, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { StaffFormDialogProps, WorkableDay } from "../types/staffManagementTypes";

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
            <h4 className="text-sm">勤務可能曜日と時間帯</h4>
            <p className="text-xs text-muted-foreground">
              曜日ごとに勤務可能な時間帯を設定してください
            </p>

            <div className="space-y-2">
              {formData.workableDays.map((day, index) => {
                const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
                return (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <Select
                      value={day.dayOfWeek.toString()}
                      onValueChange={(value) => {
                        const newDays = [...formData.workableDays];
                        newDays[index].dayOfWeek = parseInt(value);
                        setFormData({ ...formData, workableDays: newDays });
                      }}
                    >
                      <SelectTrigger className="w-24 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((name, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {name}曜日
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => {
                        const newDays = [...formData.workableDays];
                        newDays[index].startTime = e.target.value;
                        setFormData({ ...formData, workableDays: newDays });
                      }}
                      className="w-32 rounded-lg"
                    />
                    <span className="text-sm text-muted-foreground">〜</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => {
                        const newDays = [...formData.workableDays];
                        newDays[index].endTime = e.target.value;
                        setFormData({ ...formData, workableDays: newDays });
                      }}
                      className="w-32 rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDays = formData.workableDays.filter((_, i) => i !== index);
                        setFormData({ ...formData, workableDays: newDays });
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData({
                    ...formData,
                    workableDays: [
                      ...formData.workableDays,
                      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }
                    ],
                  });
                }}
                className="rounded-lg w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                曜日を追加
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              <Label htmlFor="additionalConstraints">個別勤務条件</Label>
              <Textarea
                id="additionalConstraints"
                placeholder="設定されている個別条件がここに表示されます"
                value={formData.additionalConstraints}
                readOnly
                className="rounded-xl bg-muted/50"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                ※ 個別勤務条件はシフト自動生成時にAIが参照します。編集が必要な場合は開発チームにご連絡ください。
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
