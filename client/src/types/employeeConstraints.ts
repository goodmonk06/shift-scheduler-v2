/**
 * 職員の個別勤務条件の型定義
 * AI自動生成時に読み取りやすいJSON構造
 */

/**
 * 曜日名（日本語）
 */
export type DayName = "日" | "月" | "火" | "水" | "木" | "金" | "土";

/**
 * 休憩時間ルール（条件付き）
 */
export interface BreakTimeRule {
  threshold: number;   // 勤務時間がこれを超えたら休憩を取る（時間単位）
  duration: number;    // 休憩時間（時間単位、例: 1 = 1時間）
}

/**
 * 月間シフト回数指定
 * 例: { '9～15': 2 } = 9時～15時勤務を月2回
 */
export interface MonthlyShiftCounts {
  [shiftPattern: string]: number;
}

/**
 * 固定勤務曜日（日本語キー）
 * 例: { "月": "9～16", "木": "8～16" }
 */
export interface FixedDays {
  [dayName: string]: string;
}

/**
 * 職員の個別勤務条件（JSON構造）
 * AIが直接読み取れる日本語形式
 */
export interface EmployeeWorkConstraints {
  // ========== 基本設定 ==========

  /** 時間固定フラグ（trueの場合、早番・遅番・夜勤の自動割り当て対象外） */
  fixedTimeOnly?: boolean;

  /** デフォルト勤務時間（例: '9～18', '8半～16半'） */
  defaultShift?: string;

  /** 夜勤目標回数（月） */
  nightShiftTarget?: number;

  // ========== 勤務日数 ==========

  /** 月間勤務日数 */
  monthlyWorkDays?: number;

  /** 週間勤務日数 */
  weeklyWorkDays?: number;

  /** 祝日休み */
  holidayOff?: boolean;

  // ========== 曜日設定（日本語形式） ==========

  /** 固定休曜日（例: ["日", "土"]） */
  offDays?: DayName[];

  /** 固定勤務曜日（例: { "月": "9～16", "木": "8～16" }） */
  fixedDays?: FixedDays;

  // ========== 禁止シフト（日本語形式） ==========

  /** 禁止シフト（例: ["夜勤", "遅番"]） */
  forbiddenShifts?: string[];

  // ========== 月間特定シフト回数 ==========

  /** 月間シフト回数（例: { "9～15": 2 } = 9-15時勤務を月2回） */
  monthlyShiftCounts?: MonthlyShiftCounts;

  // ========== 休憩時間 ==========

  /** 固定休憩時間（時間単位。例: 1 = 1時間、0 = 休憩なし） */
  breakTime?: number;

  /** 条件付き休憩（例: { threshold: 6, duration: 1 } = 6時間超で1時間休憩） */
  breakTimeRule?: BreakTimeRule;

  // ========== 特殊ルール ==========

  /** 特殊ルール識別子（例: 'SUGIYAMA_FRIDAY', 'OHASHI_NIGHT_COMBO'） */
  specialRuleId?: string;

  /** 備考 */
  notes?: string;

  // ========== 夜勤特殊ルール ==========

  /** 早番不可（trueの場合、早番シフトを割り当てない） */
  noEarlyShift?: boolean;

  /** 金曜夜勤不可（trueの場合、金曜日の夜勤を割り当てない。通常勤務は可能） */
  noFridayNightShift?: boolean;

  /** 連続夜勤可（trueの場合、夜→明→夜→明→休の5日サイクルが可能） */
  allowConsecutiveNight?: boolean;

  /** 通常夜勤サイクル可（trueの場合、夜→明→休の3日サイクルが可能） */
  allowNormalNightCycle?: boolean;

  // ========== 旧形式（互換性のために保持） ==========

  /** @deprecated offDaysを使用してください */
  offDayOfWeek?: number[];

  /** @deprecated fixedDaysを使用してください */
  fixedDayOfWeek?: { [dayOfWeek: number]: string };

  /** @deprecated forbiddenShiftsを使用してください */
  forbiddenTypes?: string[];

  /** ランダムに割り当てるシフト（例: ['早', '8～17', '9～18']） */
  randomShifts?: string[];
}

/**
 * デフォルトの空の制約
 */
export const emptyConstraints: EmployeeWorkConstraints = {};

/**
 * 制約が設定されているかチェック
 */
export function hasConstraints(constraints: EmployeeWorkConstraints | null | undefined): boolean {
  if (!constraints) return false;
  return Object.keys(constraints).length > 0;
}

/**
 * 曜日インデックスと日本語名のマッピング
 */
export const DAY_INDEX_TO_NAME: Record<number, DayName> = {
  0: "日", 1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土"
};

export const DAY_NAME_TO_INDEX: Record<DayName, number> = {
  "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6
};

/**
 * 禁止シフトの英語→日本語マッピング
 */
export const FORBIDDEN_TYPE_TO_JP: Record<string, string> = {
  "NIGHT": "夜勤",
  "EARLY": "早番",
  "LATE": "遅番",
  "11～20": "11～20"
};

export const FORBIDDEN_JP_TO_TYPE: Record<string, string> = {
  "夜勤": "NIGHT",
  "早番": "EARLY",
  "遅番": "LATE",
  "11～20": "11～20"
};

/**
 * 旧形式から新形式に変換
 */
export function convertToNewFormat(constraints: EmployeeWorkConstraints): EmployeeWorkConstraints {
  const result = { ...constraints };

  // offDayOfWeek → offDays
  if (result.offDayOfWeek && !result.offDays) {
    result.offDays = result.offDayOfWeek.map(i => DAY_INDEX_TO_NAME[i]);
    delete result.offDayOfWeek;
  }

  // fixedDayOfWeek → fixedDays
  if (result.fixedDayOfWeek && !result.fixedDays) {
    result.fixedDays = {};
    for (const [key, value] of Object.entries(result.fixedDayOfWeek)) {
      const dayIndex = parseInt(key);
      result.fixedDays[DAY_INDEX_TO_NAME[dayIndex]] = value;
    }
    delete result.fixedDayOfWeek;
  }

  // forbiddenTypes → forbiddenShifts
  if (result.forbiddenTypes && !result.forbiddenShifts) {
    result.forbiddenShifts = result.forbiddenTypes.map(t => FORBIDDEN_TYPE_TO_JP[t] || t);
    delete result.forbiddenTypes;
  }

  return result;
}

/**
 * 新形式から旧形式に変換（DecemberShiftGeneration互換用）
 */
export function convertToOldFormat(constraints: EmployeeWorkConstraints): EmployeeWorkConstraints {
  const result = { ...constraints };

  // offDays → offDayOfWeek
  if (result.offDays && !result.offDayOfWeek) {
    result.offDayOfWeek = result.offDays.map(d => DAY_NAME_TO_INDEX[d]);
    delete result.offDays;
  }

  // fixedDays → fixedDayOfWeek
  if (result.fixedDays && !result.fixedDayOfWeek) {
    result.fixedDayOfWeek = {};
    for (const [key, value] of Object.entries(result.fixedDays)) {
      const dayIndex = DAY_NAME_TO_INDEX[key as DayName];
      if (dayIndex !== undefined) {
        result.fixedDayOfWeek[dayIndex] = value;
      }
    }
    delete result.fixedDays;
  }

  // forbiddenShifts → forbiddenTypes
  if (result.forbiddenShifts && !result.forbiddenTypes) {
    result.forbiddenTypes = result.forbiddenShifts.map(s => FORBIDDEN_JP_TO_TYPE[s] || s);
    delete result.forbiddenShifts;
  }

  return result;
}

/**
 * AI用の読み取りやすい説明文を生成
 */
export function generateConstraintDescription(constraints: EmployeeWorkConstraints): string {
  const parts: string[] = [];

  // 時間固定
  if (constraints.fixedTimeOnly) {
    parts.push("時間固定");
  }

  // デフォルトシフト
  if (constraints.defaultShift) {
    parts.push(`基本：${constraints.defaultShift}`);
  }

  // 夜勤目標
  if (constraints.nightShiftTarget) {
    parts.push(`夜勤${constraints.nightShiftTarget}回/月`);
  }

  // 勤務日数
  if (constraints.monthlyWorkDays) {
    parts.push(`月${constraints.monthlyWorkDays}日`);
  }
  if (constraints.weeklyWorkDays) {
    parts.push(`週${constraints.weeklyWorkDays}日`);
  }

  // 祝日休み
  if (constraints.holidayOff) {
    parts.push("祝日休");
  }

  // 固定休曜日（新形式）
  if (constraints.offDays && constraints.offDays.length > 0) {
    parts.push(`${constraints.offDays.join("")}休`);
  }
  // 旧形式対応
  else if (constraints.offDayOfWeek && constraints.offDayOfWeek.length > 0) {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const offDays = constraints.offDayOfWeek.map(d => dayNames[d]).join("");
    parts.push(`${offDays}休`);
  }

  // 固定勤務曜日（新形式）
  if (constraints.fixedDays) {
    const entries = Object.entries(constraints.fixedDays);
    if (entries.length > 0) {
      const desc = entries.map(([day, shift]) => `${day}:${shift}`).join(" ");
      parts.push(desc);
    }
  }
  // 旧形式対応
  else if (constraints.fixedDayOfWeek) {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const entries = Object.entries(constraints.fixedDayOfWeek);
    if (entries.length > 0) {
      const desc = entries.map(([day, shift]) => `${dayNames[parseInt(day)]}:${shift}`).join(" ");
      parts.push(desc);
    }
  }

  // 禁止シフト（新形式）
  if (constraints.forbiddenShifts && constraints.forbiddenShifts.length > 0) {
    parts.push(`${constraints.forbiddenShifts.join("・")}不可`);
  }
  // 旧形式対応
  else if (constraints.forbiddenTypes && constraints.forbiddenTypes.length > 0) {
    const jpTypes = constraints.forbiddenTypes.map(t => FORBIDDEN_TYPE_TO_JP[t] || t);
    parts.push(`${jpTypes.join("・")}不可`);
  }

  // 月間シフト回数
  if (constraints.monthlyShiftCounts) {
    Object.entries(constraints.monthlyShiftCounts).forEach(([shift, count]) => {
      parts.push(`${shift}:${count}回/月`);
    });
  }

  // 休憩時間
  if (constraints.breakTime !== undefined) {
    if (constraints.breakTime === 0) {
      parts.push("休憩なし");
    } else {
      parts.push(`休憩${constraints.breakTime}h`);
    }
  } else if (constraints.breakTimeRule) {
    parts.push(`${constraints.breakTimeRule.threshold}h超→休憩${constraints.breakTimeRule.duration}h`);
  }

  // 特殊ルール
  if (constraints.specialRuleId) {
    parts.push(`[${constraints.specialRuleId}]`);
  }

  // 夜勤特殊ルール
  if (constraints.noEarlyShift) {
    parts.push("早番不可");
  }
  if (constraints.noFridayNightShift) {
    parts.push("金曜夜勤不可");
  }
  if (constraints.allowConsecutiveNight) {
    parts.push("連続夜勤可");
  }
  if (constraints.allowNormalNightCycle) {
    parts.push("通常夜勤サイクル可");
  }

  // 備考
  if (constraints.notes) {
    parts.push(constraints.notes);
  }

  return parts.join("、");
}
