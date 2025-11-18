/**
 * 段階的配置アルゴリズム
 *
 * Phase 1: ハード制約の確定（休み、時間指定優先配置）
 * Phase 2: 勤務可能枠の計算（workableDays考慮 + 連続勤務チェック）
 * Phase 3: AI最適化（必要人数充足、公平性考慮）
 */

import * as db from "./db";
import {
  getEmployeeAvailability,
  getAvailabilityReason,
  type Employee as EmployeeAvail,
  type LeaveRequest,
  type WorkPreference
} from "./utils/employeeAvailability";
import {
  checkConsecutiveWorkLimit,
  type ShiftDay
} from "./utils/consecutiveWorkCheck";
import {
  getAvailabilityTimeRange
} from "./utils/timeSlots";

/**
 * Phase 1: ハード制約の確定
 * - 休み申請を確定
 * - 時間指定勤務希望を優先配置
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @returns 確定したシフト詳細リスト
 */
export async function phase1_confirmHardConstraints(
  shiftId: number,
  year: number,
  month: number
): Promise<any[]> {
  console.log('\n=== Phase 1: ハード制約の確定 ===');

  const confirmedShifts: any[] = [];

  // データ取得
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  const daysInMonth = new Date(year, month, 0).getDate();

  // 各日付・各職員について処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      // 休み申請チェック
      const leave = leaveRequests.find(lr =>
        lr.employeeId === employee.id &&
        (lr.status === 'approved' || lr.status === 'pending') &&
        isDateInRange(date, lr.startDate, lr.endDate)
      );

      if (leave) {
        // 休み確定
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: leave.leaveType,
          startTime: null,
          endTime: null,
          generatedBy: 'leave_request',
          reason: `休み申請（${leave.leaveType}）`,
        });
        console.log(`  ${date} ${employee.name}: 休み確定（${leave.leaveType}）`);
        continue;
      }

      // 時間指定勤務希望チェック
      const workPref = workPreferences.find(wp =>
        wp.employeeId === employee.id &&
        (wp.status === 'approved' || wp.status === 'pending') &&
        isDateInRange(date, wp.startDate, wp.endDate)
      );

      if (workPref) {
        // 時間指定勤務を優先配置
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null, // カスタム時間
          leaveType: null,
          startTime: workPref.startTime,
          endTime: workPref.endTime,
          generatedBy: 'rule_based',
          reason: `時間指定勤務希望（${workPref.startTime}-${workPref.endTime}）`,
        });
        console.log(`  ${date} ${employee.name}: 時間指定勤務配置（${workPref.startTime}-${workPref.endTime}）`);
      }
    }
  }

  console.log(`\nPhase 1完了: ${confirmedShifts.length}件のハード制約を確定`);
  return confirmedShifts;
}

/**
 * Phase 2: 勤務可能枠の計算
 * - workableDays考慮
 * - 連続勤務チェック
 * - 法令遵守チェック
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param confirmedShifts Phase 1で確定したシフト
 * @returns 各職員・各日付の勤務可能情報
 */
export async function phase2_calculateAvailability(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: any[]
): Promise<Map<string, any>> {
  console.log('\n=== Phase 2: 勤務可能枠の計算 ===');

  const availabilityMap = new Map<string, any>();

  // データ取得
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  // 職員情報を変換
  const employeesAvail: EmployeeAvail[] = employees.map(e => ({
    id: e.id,
    name: e.name,
    workableDays: e.workableDays || [],
    canWorkNightShift: e.canWorkNightShift || false,
    skillLevel: e.skillLevel || 100,
  }));

  const daysInMonth = new Date(year, month, 0).getDate();

  // ShiftDay形式に変換（連続勤務チェック用）
  const shiftDays: ShiftDay[] = confirmedShifts.map(s => ({
    date: s.date,
    employeeId: s.employeeId,
    status: s.status,
  }));

  // 各日付・各職員について処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      const key = `${employee.id}_${date}`;

      // 既にPhase 1で確定している場合はスキップ
      const alreadyConfirmed = confirmedShifts.find(
        s => s.employeeId === employee.id && s.date === date
      );

      if (alreadyConfirmed) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability: null, // 確定済み
          reason: alreadyConfirmed.reason,
          canAssign: false,
        });
        continue;
      }

      // 勤務可能時間を計算（優先順位ロジック）
      const availability = getEmployeeAvailability(
        employee.id,
        date,
        employeesAvail,
        leaveRequests as LeaveRequest[],
        workPreferences as WorkPreference[]
      );

      const reason = getAvailabilityReason(
        employee.id,
        date,
        employeesAvail,
        leaveRequests as LeaveRequest[],
        workPreferences as WorkPreference[]
      );

      // 勤務不可の場合
      if (availability === null) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability: null,
          reason,
          canAssign: false,
        });
        continue;
      }

      // 連続勤務チェック
      const consecutiveCheck = checkConsecutiveWorkLimit(
        employee.id,
        date,
        shiftDays,
        4 // 最大4日まで
      );

      if (!consecutiveCheck.canAssign) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability,
          reason: consecutiveCheck.reason,
          canAssign: false,
        });
        continue;
      }

      // 勤務可能時間の範囲を取得
      const timeRange = getAvailabilityTimeRange(availability);

      availabilityMap.set(key, {
        employeeId: employee.id,
        date,
        availability,
        timeRange,
        reason,
        canAssign: true,
      });
    }
  }

  const canAssignCount = Array.from(availabilityMap.values()).filter(v => v.canAssign).length;
  console.log(`\nPhase 2完了: ${availabilityMap.size}件中${canAssignCount}件が配置可能`);

  return availabilityMap;
}

/**
 * Phase 3: AI最適化
 * - 必要人数充足
 * - 公平性・品質考慮
 * - 既存枠とカスタム時間の両対応
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param confirmedShifts Phase 1で確定したシフト
 * @param availabilityMap Phase 2で計算した勤務可能情報
 * @returns AI生成されたシフト
 */
export async function phase3_aiOptimization(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: any[],
  availabilityMap: Map<string, any>
): Promise<any[]> {
  console.log('\n=== Phase 3: AI最適化 ===');

  // データ取得
  const employees = await db.getAllEmployees();
  const workTimeSlots = await db.getAllWorkTimeSlots();
  // requiredStaffingは現在未実装のため空配列を使用
  const requiredStaffing: any[] = [];

  // 配置可能な職員・日付の組み合わせを抽出
  const availableAssignments: any[] = [];
  for (const [key, value] of availabilityMap.entries()) {
    if (value.canAssign && value.timeRange) {
      availableAssignments.push({
        employeeId: value.employeeId,
        date: value.date,
        startTime: value.timeRange.startTime,
        endTime: value.timeRange.endTime,
        reason: value.reason,
      });
    }
  }

  console.log(`配置可能: ${availableAssignments.length}件`);

  // AI生成用のプロンプトを構築
  const prompt = buildAIPrompt(
    year,
    month,
    employees,
    workTimeSlots,
    requiredStaffing,
    confirmedShifts,
    availableAssignments
  );

  // AI呼び出し（カスタム時間対応スキーマ）
  const aiShifts = await invokeAIWithCustomTimeSupport(prompt);

  // 生成結果の検証
  const validatedShifts = validateAndFilterShifts(
    aiShifts,
    availableAssignments,
    confirmedShifts
  );

  console.log(`AI生成: ${aiShifts.length}件 → 検証後: ${validatedShifts.length}件`);

  return validatedShifts;
}

/**
 * AIプロンプト構築
 */
function buildAIPrompt(
  year: number,
  month: number,
  employees: any[],
  workTimeSlots: any[],
  requiredStaffing: any[],
  confirmedShifts: any[],
  availableAssignments: any[]
): string {
  const daysInMonth = new Date(year, month, 0).getDate();

  return `
あなたは介護施設のシフト管理の専門家です。
以下の情報をもとに、最適なシフトを生成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 基本情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**対象期間**: ${year}年${month}月（全${daysInMonth}日間）
**職員数**: ${employees.length}名

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⏰ 勤務時間枠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${workTimeSlots.map((ts: any) => `- **${ts.name}** (ID: ${ts.id}): ${ts.startTime}〜${ts.endTime} (必要${ts.requiredStaff}名)`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ✅ 既に確定しているシフト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${confirmedShifts.length}件のシフトが確定済み（休み申請、時間指定勤務希望）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📊 配置可能な職員・日付・時間
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${availableAssignments.slice(0, 50).map((a: any) => {
  const emp = employees.find(e => e.id === a.employeeId);
  return `- ${a.date} 職員${a.employeeId}(${emp?.name}): ${a.startTime}〜${a.endTime} (${a.reason})`;
}).join("\n")}

${availableAssignments.length > 50 ? `... 他${availableAssignments.length - 50}件` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🎯 生成ルール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 時間枠の選択
- 配置可能時間が既存の時間枠（早番、遅番など）と完全一致する場合
  → **timeSlotId** を使用
- 配置可能時間がカスタム時間の場合
  → **timeSlotId=null, startTime, endTime** を使用

### 2. 必要人数の充足
- 各時間帯で必要人数の80%以上を確保すること

### 3. 公平性
- 職員間で勤務日数を均等に配分

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📝 出力形式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各配置について、以下のいずれかの形式で出力してください:

**既存時間枠の場合:**
{
  "employeeId": 4,
  "date": "${year}-${String(month).padStart(2, '0')}-15",
  "timeSlotId": 7,
  "startTime": null,
  "endTime": null
}

**カスタム時間の場合:**
{
  "employeeId": 4,
  "date": "${year}-${String(month).padStart(2, '0')}-15",
  "timeSlotId": null,
  "startTime": "08:30",
  "endTime": "13:00"
}
`;
}

/**
 * AI生成結果の検証とフィルタリング
 */
function validateAndFilterShifts(
  aiShifts: any[],
  availableAssignments: any[],
  confirmedShifts: any[]
): any[] {
  const validShifts: any[] = [];

  for (const shift of aiShifts) {
    // 1. 既に確定しているシフトと重複チェック
    const isDuplicate = confirmedShifts.some(
      cs => cs.employeeId === shift.employeeId && cs.date === shift.date
    );

    if (isDuplicate) {
      console.warn(`⚠️ スキップ: 既に確定済み（職員${shift.employeeId}, ${shift.date}）`);
      continue;
    }

    // 2. 配置可能リストに含まれているかチェック
    const isAvailable = availableAssignments.some(
      aa => aa.employeeId === shift.employeeId && aa.date === shift.date
    );

    if (!isAvailable) {
      console.warn(`⚠️ スキップ: 配置不可（職員${shift.employeeId}, ${shift.date}）`);
      continue;
    }

    // 3. カスタム時間の妥当性チェック
    if (shift.timeSlotId === null) {
      if (!shift.startTime || !shift.endTime) {
        console.warn(`⚠️ スキップ: カスタム時間が不正（職員${shift.employeeId}, ${shift.date}）`);
        continue;
      }

      // 30分刻みチェック
      const startValid = /^\d{2}:(00|30)$/.test(shift.startTime);
      const endValid = /^\d{2}:(00|30)$/.test(shift.endTime);

      if (!startValid || !endValid) {
        console.warn(`⚠️ スキップ: 30分刻みでない（職員${shift.employeeId}, ${shift.date}, ${shift.startTime}-${shift.endTime}）`);
        continue;
      }

      // 配置可能時間内かチェック
      const assignment = availableAssignments.find(
        aa => aa.employeeId === shift.employeeId && aa.date === shift.date
      );

      if (assignment) {
        const shiftStart = timeToSlot(shift.startTime);
        const shiftEnd = timeToSlot(shift.endTime);
        const availStart = timeToSlot(assignment.startTime);
        const availEnd = timeToSlot(assignment.endTime);

        if (shiftStart < availStart || shiftEnd > availEnd) {
          console.warn(`⚠️ スキップ: 配置可能時間外（職員${shift.employeeId}, ${shift.date}, ${shift.startTime}-${shift.endTime}）`);
          continue;
        }
      }
    }

    // 検証OK
    validShifts.push(shift);
  }

  return validShifts;
}

// ヘルパー: 時間をコマ番号に変換
function timeToSlot(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

/**
 * AI呼び出し（カスタム時間対応スキーマ）
 */
async function invokeAIWithCustomTimeSupport(prompt: string): Promise<any[]> {
  const { invokeLLM } = await import('./_core/llm');

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは介護施設のシフト管理の専門家です。職員の勤務可能時間と必要人数を考慮して、最適なシフトを生成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "shift_schedule",
        strict: true,
        schema: {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employeeId: {
                    type: "number",
                    description: "職員ID"
                  },
                  date: {
                    type: "string",
                    description: "日付（YYYY-MM-DD形式）"
                  },
                  timeSlotId: {
                    type: ["number", "null"],
                    description: "既存の時間枠ID。カスタム時間の場合はnull"
                  },
                  startTime: {
                    type: ["string", "null"],
                    description: "カスタム開始時刻（HH:MM形式、30分刻み）。timeSlotIdがnullの場合に使用"
                  },
                  endTime: {
                    type: ["string", "null"],
                    description: "カスタム終了時刻（HH:MM形式、30分刻み）。timeSlotIdがnullの場合に使用"
                  },
                },
                required: ["employeeId", "date", "timeSlotId"],
                additionalProperties: false,
              },
            },
          },
          required: ["shifts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentStr || "{}");

  // 生成されたシフトを変換
  const shifts = (result.shifts || []).map((s: any) => ({
    employeeId: s.employeeId,
    date: s.date,
    status: 'working',
    timeSlotId: s.timeSlotId,
    startTime: s.startTime,
    endTime: s.endTime,
    leaveType: null,
    generatedBy: 'ai',
  }));

  console.log(`AI生成: ${shifts.length}件のシフト`);
  return shifts;
}

/**
 * 統合実行関数
 */
export async function generateShiftWithPhases(
  shiftId: number,
  year: number,
  month: number
): Promise<{
  confirmedShifts: any[];
  availabilityMap: Map<string, any>;
  aiGeneratedShifts: any[];
  allShifts: any[];
}> {
  console.log(`\n🚀 段階的シフト生成開始: ${year}年${month}月`);

  // Phase 1: ハード制約確定
  const confirmedShifts = await phase1_confirmHardConstraints(shiftId, year, month);

  // Phase 2: 勤務可能枠計算
  const availabilityMap = await phase2_calculateAvailability(shiftId, year, month, confirmedShifts);

  // Phase 3: AI最適化
  const aiGeneratedShifts = await phase3_aiOptimization(shiftId, year, month, confirmedShifts, availabilityMap);

  // 統合
  const allShifts = [...confirmedShifts, ...aiGeneratedShifts];

  console.log(`\n✅ シフト生成完了: 合計${allShifts.length}件`);

  return {
    confirmedShifts,
    availabilityMap,
    aiGeneratedShifts,
    allShifts,
  };
}

// ヘルパー関数
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const targetDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return targetDate >= start && targetDate <= end;
}
