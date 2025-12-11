/**
 * 職員の個別勤務制約を編集するコンポーネント
 * AI読み取り用の日本語形式でデータを保存
 */
import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Plus, X } from "lucide-react";
import type { EmployeeWorkConstraints, DayName } from "../types/employeeConstraints";
import { convertToNewFormat } from "../types/employeeConstraints";

interface StaffConstraintsEditorProps {
  constraints: EmployeeWorkConstraints;
  onChange: (constraints: EmployeeWorkConstraints) => void;
}

const DAY_NAMES: DayName[] = ["日", "月", "火", "水", "木", "金", "土"];

// 禁止シフトオプション（日本語）
const FORBIDDEN_SHIFT_OPTIONS = ["夜勤", "早番", "遅番", "11～20"];

export function StaffConstraintsEditor({ constraints, onChange }: StaffConstraintsEditorProps) {
  // 旧形式のデータを新形式に変換して使用
  const [localConstraints, setLocalConstraints] = useState<EmployeeWorkConstraints>(
    convertToNewFormat(constraints || {})
  );

  useEffect(() => {
    setLocalConstraints(convertToNewFormat(constraints || {}));
  }, [constraints]);

  const updateConstraint = <K extends keyof EmployeeWorkConstraints>(
    key: K,
    value: EmployeeWorkConstraints[K]
  ) => {
    const updated = { ...localConstraints, [key]: value };
    // undefinedや空の値は削除
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      delete updated[key];
    }
    setLocalConstraints(updated);
    onChange(updated);
  };

  // 固定休曜日のトグル（日本語形式）
  const toggleOffDay = (day: DayName) => {
    const current = localConstraints.offDays || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    // 曜日順にソート
    const sorted = updated.sort((a, b) => DAY_NAMES.indexOf(a) - DAY_NAMES.indexOf(b));
    updateConstraint("offDays", sorted.length > 0 ? sorted : undefined);
  };

  // 禁止シフトのトグル（日本語形式）
  const toggleForbiddenShift = (shift: string) => {
    const current = localConstraints.forbiddenShifts || [];
    const updated = current.includes(shift)
      ? current.filter(s => s !== shift)
      : [...current, shift];
    updateConstraint("forbiddenShifts", updated.length > 0 ? updated : undefined);
  };

  // 固定勤務曜日の更新（日本語形式）
  const updateFixedDay = (day: DayName, shift: string) => {
    const current = localConstraints.fixedDays || {};
    if (shift) {
      updateConstraint("fixedDays", { ...current, [day]: shift });
    } else {
      const { [day]: _, ...rest } = current;
      updateConstraint("fixedDays", Object.keys(rest).length > 0 ? rest : undefined);
    }
  };

  // 月間シフト回数の更新
  const updateMonthlyShiftCount = (shiftName: string, count: number | undefined) => {
    const current = localConstraints.monthlyShiftCounts || {};
    if (count !== undefined && count > 0) {
      updateConstraint("monthlyShiftCounts", { ...current, [shiftName]: count });
    } else {
      const { [shiftName]: _, ...rest } = current;
      updateConstraint("monthlyShiftCounts", Object.keys(rest).length > 0 ? rest : undefined);
    }
  };

  // 新しい月間シフト回数を追加
  const [newShiftName, setNewShiftName] = useState("");
  const addMonthlyShiftCount = () => {
    if (newShiftName.trim()) {
      updateMonthlyShiftCount(newShiftName.trim(), 1);
      setNewShiftName("");
    }
  };

  return (
    <div className="space-y-5">
      {/* ========== 基本シフト設定 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">基本シフト設定</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="defaultShift" className="text-sm">デフォルト勤務時間</Label>
            <Input
              id="defaultShift"
              placeholder="例: 9～18"
              value={localConstraints.defaultShift || ""}
              onChange={(e) => updateConstraint("defaultShift", e.target.value || undefined)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nightShiftTarget" className="text-sm">夜勤目標（月）</Label>
            <Input
              id="nightShiftTarget"
              type="number"
              min="0"
              placeholder="回数"
              value={localConstraints.nightShiftTarget || ""}
              onChange={(e) => updateConstraint("nightShiftTarget", parseInt(e.target.value) || undefined)}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Switch
            id="fixedTimeOnly"
            checked={localConstraints.fixedTimeOnly || false}
            onCheckedChange={(checked) => updateConstraint("fixedTimeOnly", checked || undefined)}
          />
          <Label htmlFor="fixedTimeOnly" className="text-sm cursor-pointer">
            時間固定（早番・遅番・夜勤を自動割当しない）
          </Label>
        </div>
      </div>

      {/* ========== 勤務日数 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">勤務日数</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="monthlyWorkDays" className="text-sm">月間</Label>
            <div className="flex items-center">
              <Input
                id="monthlyWorkDays"
                type="number"
                min="0"
                max="31"
                value={localConstraints.monthlyWorkDays || ""}
                onChange={(e) => updateConstraint("monthlyWorkDays", parseInt(e.target.value) || undefined)}
                className="rounded-lg"
              />
              <span className="ml-1 text-sm text-slate-500">日</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="weeklyWorkDays" className="text-sm">週間</Label>
            <div className="flex items-center">
              <Input
                id="weeklyWorkDays"
                type="number"
                min="0"
                max="7"
                value={localConstraints.weeklyWorkDays || ""}
                onChange={(e) => updateConstraint("weeklyWorkDays", parseInt(e.target.value) || undefined)}
                className="rounded-lg"
              />
              <span className="ml-1 text-sm text-slate-500">日</span>
            </div>
          </div>
          <div className="flex items-end pb-1">
            <div className="flex items-center space-x-2">
              <Switch
                id="holidayOff"
                checked={localConstraints.holidayOff || false}
                onCheckedChange={(checked) => updateConstraint("holidayOff", checked || undefined)}
              />
              <Label htmlFor="holidayOff" className="text-sm cursor-pointer">祝日休み</Label>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 曜日設定 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">曜日設定</h4>

        {/* 固定休曜日 */}
        <div className="space-y-2">
          <Label className="text-sm">固定休曜日（クリックで選択）</Label>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((day) => {
              const isOff = localConstraints.offDays?.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleOffDay(day)}
                  className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                  style={isOff
                    ? { backgroundColor: '#ef4444', color: '#ffffff' }
                    : { backgroundColor: '#f1f5f9', color: '#475569' }
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 固定勤務曜日 */}
        <div className="space-y-2">
          <Label className="text-sm">曜日別の固定時間（空欄=通常）</Label>
          <div className="grid grid-cols-4 gap-2">
            {DAY_NAMES.map((day) => (
              <div key={day} className="flex items-center space-x-1">
                <span className="w-5 text-xs font-medium text-slate-600">{day}</span>
                <Input
                  placeholder="9～16"
                  value={localConstraints.fixedDays?.[day] || ""}
                  onChange={(e) => updateFixedDay(day, e.target.value)}
                  className="rounded-lg text-xs h-8 px-2"
                  disabled={localConstraints.offDays?.includes(day)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== 禁止シフト ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">禁止シフト（クリックで選択）</h4>
        <div className="flex flex-wrap gap-2">
          {FORBIDDEN_SHIFT_OPTIONS.map((shift) => {
            const isSelected = localConstraints.forbiddenShifts?.includes(shift);
            return (
              <button
                key={shift}
                type="button"
                onClick={() => toggleForbiddenShift(shift)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2"
                style={isSelected
                  ? { backgroundColor: '#ea580c', borderColor: '#c2410c', color: '#000000' }
                  : { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', color: '#334155' }
                }
              >
                {shift}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== 夜勤特殊ルール ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">夜勤特殊ルール</h4>
        <p className="text-xs text-slate-500">夜勤担当者向けの特別な制約を設定</p>

        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Switch
              id="noEarlyShift"
              checked={localConstraints.noEarlyShift || false}
              onCheckedChange={(checked) => updateConstraint("noEarlyShift", checked || undefined)}
            />
            <Label htmlFor="noEarlyShift" className="text-sm cursor-pointer">
              早番不可（早番シフトを割り当てない）
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="noFridayNightShift"
              checked={localConstraints.noFridayNightShift || false}
              onCheckedChange={(checked) => updateConstraint("noFridayNightShift", checked || undefined)}
            />
            <Label htmlFor="noFridayNightShift" className="text-sm cursor-pointer">
              金曜夜勤不可（金曜の夜勤を割り当てない。通常勤務は可）
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="allowConsecutiveNight"
              checked={localConstraints.allowConsecutiveNight || false}
              onCheckedChange={(checked) => updateConstraint("allowConsecutiveNight", checked || undefined)}
            />
            <Label htmlFor="allowConsecutiveNight" className="text-sm cursor-pointer">
              連続夜勤可（夜→明→夜→明→休の5日サイクル）
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="allowNormalNightCycle"
              checked={localConstraints.allowNormalNightCycle || false}
              onCheckedChange={(checked) => updateConstraint("allowNormalNightCycle", checked || undefined)}
            />
            <Label htmlFor="allowNormalNightCycle" className="text-sm cursor-pointer">
              通常夜勤サイクル可（夜→明→休の3日サイクル）
            </Label>
          </div>
        </div>
      </div>

      {/* ========== 月間特定シフト回数 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">月間特定シフト回数</h4>
        <p className="text-xs text-slate-500">特定のシフトを月に何回入れるか指定</p>

        {/* 既存のシフト回数 */}
        {localConstraints.monthlyShiftCounts && Object.entries(localConstraints.monthlyShiftCounts).map(([shift, count]) => (
          <div key={shift} className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 min-w-16">{shift}</span>
            <span className="text-sm text-slate-500">を月</span>
            <Input
              type="number"
              min="0"
              max="31"
              value={count}
              onChange={(e) => updateMonthlyShiftCount(shift, parseInt(e.target.value) || undefined)}
              className="rounded-lg w-16 h-8"
            />
            <span className="text-sm text-slate-500">回</span>
            <button
              type="button"
              onClick={() => updateMonthlyShiftCount(shift, undefined)}
              className="p-1 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* 新規追加 */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="シフト名 (例: 9～15)"
            value={newShiftName}
            onChange={(e) => setNewShiftName(e.target.value)}
            className="rounded-lg flex-1 h-8"
            onKeyDown={(e) => e.key === 'Enter' && addMonthlyShiftCount()}
          />
          <button
            type="button"
            onClick={addMonthlyShiftCount}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>
      </div>

      {/* ========== 休憩時間 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">休憩時間</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="breakTime" className="text-sm">固定休憩（時間）</Label>
            <Input
              id="breakTime"
              type="number"
              min="0"
              max="2"
              step="0.5"
              value={localConstraints.breakTime ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateConstraint("breakTime", isNaN(val) ? undefined : val);
              }}
              className="rounded-lg"
              placeholder="0=なし, 1=1時間"
            />
          </div>
          <div className="space-y-1 text-xs text-slate-500 pt-6">
            または条件付き↓
          </div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg space-y-2">
          <Label className="text-xs text-slate-600">条件付き休憩（○時間超で○時間休憩）</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={localConstraints.breakTimeRule?.threshold ?? ""}
              onChange={(e) => {
                const threshold = parseFloat(e.target.value);
                if (!isNaN(threshold)) {
                  updateConstraint("breakTimeRule", {
                    threshold,
                    duration: localConstraints.breakTimeRule?.duration || 1
                  });
                } else if (!localConstraints.breakTimeRule?.duration) {
                  updateConstraint("breakTimeRule", undefined);
                }
              }}
              className="rounded-lg w-16 h-8"
              placeholder="6"
            />
            <span className="text-sm text-slate-500">時間超で</span>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.5"
              value={localConstraints.breakTimeRule?.duration ?? ""}
              onChange={(e) => {
                const duration = parseFloat(e.target.value);
                if (!isNaN(duration)) {
                  updateConstraint("breakTimeRule", {
                    duration,
                    threshold: localConstraints.breakTimeRule?.threshold || 6
                  });
                } else if (!localConstraints.breakTimeRule?.threshold) {
                  updateConstraint("breakTimeRule", undefined);
                }
              }}
              className="rounded-lg w-16 h-8"
              placeholder="1"
            />
            <span className="text-sm text-slate-500">時間休憩</span>
          </div>
        </div>
      </div>

      {/* ========== 特殊ルール・備考 ========== */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">特殊ルール・備考</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="specialRuleId" className="text-sm">特殊ルールID</Label>
            <Input
              id="specialRuleId"
              placeholder="例: SUGIYAMA_FRIDAY"
              value={localConstraints.specialRuleId || ""}
              onChange={(e) => updateConstraint("specialRuleId", e.target.value || undefined)}
              className="rounded-lg text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-sm">備考</Label>
            <Input
              id="notes"
              placeholder="その他の制約など"
              value={localConstraints.notes || ""}
              onChange={(e) => updateConstraint("notes", e.target.value || undefined)}
              className="rounded-lg text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
