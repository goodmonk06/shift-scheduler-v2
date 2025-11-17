/**
 * 職員個別データ管理システム - 型定義
 *
 * 職員の個別勤務条件、休暇管理、個人情報を一元管理
 */

/**
 * 勤務制約タイプ
 */
export type WorkConstraintType =
  | "day_off_pattern"        // 曜日パターン休み（例: 土日祝日休み）
  | "specific_day_off"       // 特定曜日休み（例: 火曜日休み）
  | "work_hours"             // 勤務時間帯（例: 9:00-14:00のみ）
  | "specific_day_hours"     // 特定曜日の勤務時間（例: 水曜・土曜 11:00-20:00）
  | "max_consecutive_days"   // 連続勤務上限
  | "max_weekly_hours";      // 週間最大勤務時間

/**
 * 勤務制約（優先度100 - 絶対厳守）
 */
export interface WorkConstraint {
  id: number;
  type: WorkConstraintType;
  description: string;        // 説明（例: "土日祝日休み"）
  dayOfWeek?: number[];       // 曜日（0=日曜, 6=土曜）
  includeHolidays?: boolean;  // 祝日を含むか
  startTime?: string;         // 開始時間（HH:MM）
  endTime?: string;           // 終了時間（HH:MM）
  maxValue?: number;          // 最大値（連続勤務日数、週間時間など）
  priority: 100;              // 絶対厳守
  isActive: boolean;          // 有効/無効
}

/**
 * 休暇取得状態
 */
export type LeaveStatus = "取得済み" | "申請中" | "予定" | "却下";

/**
 * 休暇取得日
 */
export interface LeaveDateRecord {
  date: string;               // YYYY-MM-DD
  status: LeaveStatus;
}

/**
 * 有給休暇管理
 */
export interface PaidLeaveAllowance {
  totalDays: number;          // 年間付与日数
  usedDays: number;           // 使用済み日数
  remainingDays: number;      // 残日数
  scheduledDays: number;      // 予定済み日数（申請中）
  expirationDate: string;     // 有効期限（YYYY-MM-DD）
  takenDates: LeaveDateRecord[];      // 取得済み日付（優先度100）
  scheduledDates: LeaveDateRecord[];  // 予定日（申請中・予定）
}

/**
 * 誕生日休暇管理
 */
export interface BirthdayLeaveAllowance {
  eligible: boolean;          // 対象かどうか（職場ルールで判定）
  totalDays: number;          // 年間付与日数（通常1日）
  usedDays: number;           // 使用済み日数（0 or 1）
  remainingDays: number;      // 残日数（0 or 1）
  birthday: string;           // 誕生日（MM-DD）
  validityPeriod?: string;    // 有効期限（例: "誕生月のみ"）
  takenDates: LeaveDateRecord[];      // 取得済み日付（優先度100）
  scheduledDates: LeaveDateRecord[];  // 予定日
}

/**
 * 季節休暇（夏季・冬季）
 */
export interface SeasonalLeaveDetail {
  eligible: boolean;
  totalDays: number;          // 付与日数
  usedDays: number;           // 使用済み日数
  remainingDays: number;      // 残日数
  validPeriod?: string;       // 有効期間（例: "6-9月"）
  takenDates: LeaveDateRecord[];      // 取得済み日付（優先度100）
  scheduledDates: LeaveDateRecord[];  // 予定日
}

/**
 * 季節休暇管理
 */
export interface SeasonalLeaveAllowance {
  summer: SeasonalLeaveDetail;
  winter: SeasonalLeaveDetail;
}

/**
 * 休暇管理（優先度100 - 絶対厳守）
 */
export interface LeaveAllowances {
  paidLeave: PaidLeaveAllowance;              // 有給休暇
  birthdayLeave: BirthdayLeaveAllowance;      // 誕生日休暇（正社員のみ）
  seasonalLeave: SeasonalLeaveAllowance;      // 季節休暇（全職員）
}

/**
 * 個人情報（優先度90 - 強い配慮）
 */
export interface PersonalInfo {
  birthday?: string;          // 誕生日（YYYY-MM-DD）
  age?: number;               // 年齢
  childrenAges?: number[];    // 子供の年齢
  situation?: string;         // 状況（例: "保育園送迎"、"介護中"、"産休前"）
  specialNotes?: string;      // 特記事項
  priority: 90;               // 強い配慮
}

/**
 * AI処理メタデータ
 */
export interface AIMetadata {
  lastProcessed: string;      // 最終処理日時（ISO 8601）
  processingModel: string;    // 使用モデル（例: "gpt-4o-2024-11-20"）
  confidenceScore: number;    // 信頼度スコア（0-1）
  validationStatus: "verified" | "needs_review" | "draft";  // 検証状態
}

/**
 * 職員個別データ（完全版）
 * employees.additionalConstraints に保存
 */
export interface EmployeeConstraints {
  // 入力された自然言語（記録用）
  rawInput: string;
  lastUpdated: string;        // 最終更新日時（ISO 8601）

  // 勤務制約（優先度100 - 絶対厳守）
  workConstraints: WorkConstraint[];

  // 休暇管理（優先度100 - 絶対厳守）
  leaveAllowances: LeaveAllowances;

  // 個人情報（優先度90 - 強い配慮）
  personalInfo?: PersonalInfo;

  // AI処理メタデータ
  aiMetadata?: AIMetadata;
}

/**
 * 職場ルールタイプ（既存のworkplaceRulesに追加）
 */
export type WorkplaceRuleType =
  | "min_rest_days"
  | "night_shift_quota"
  | "post_night_shift_rest"
  | "required_staff_pattern"
  | "max_consecutive_days"
  | "fulltime_required_hours"
  | "birthday_leave"          // ← 新規追加
  | "seasonal_leave";         // ← 新規追加

/**
 * 職場ルール設定値（誕生日休暇）
 */
export interface BirthdayLeaveRuleValue {
  daysPerYear: number;        // 年間付与日数
  validityPeriod?: string;    // 有効期限（例: "誕生月のみ"）
  eligibleEmploymentTypes: ("fulltime" | "parttime")[]; // 対象雇用形態
}

/**
 * 職場ルール設定値（季節休暇）
 */
export interface SeasonalLeaveRuleValue {
  summer: {
    days: number;
    period: string;           // 例: "6-9月"
  };
  winter: {
    days: number;
    period: string;           // 例: "12-1月"
  };
}

/**
 * AI構造化リクエスト
 */
export interface StructureEmployeeDataRequest {
  employeeId: number;
  naturalLanguageInput: string;
}

/**
 * AI構造化レスポンス
 */
export interface StructureEmployeeDataResponse {
  success: boolean;
  data?: EmployeeConstraints;
  error?: string;
  warnings?: string[];
}

/**
 * 配置可能枠の理由タイプ
 */
export type UnavailableReason =
  | "希望休（厳守）"
  | "有給休暇（厳守）"
  | "誕生日休暇（厳守）"
  | "季節休暇（厳守）"
  | "土日祝日休み（厳守）"
  | "勤務時間外（厳守）"
  | "特定曜日休み（厳守）"
  | "夜勤資格なし（厳守）"
  | "連続勤務上限（厳守）"
  | "既に配置済み（厳守）"
  | "✅ 配置可能";

/**
 * 休暇残日数サマリー（UI表示用）
 */
export interface LeaveBalanceSummary {
  employeeId: number;
  employeeName: string;
  paidLeave: {
    used: number;
    total: number;
    remaining: number;
  };
  birthdayLeave: {
    used: number;
    total: number;
    remaining: number;
    eligible: boolean;
  };
  summerLeave: {
    used: number;
    total: number;
    remaining: number;
  };
  winterLeave: {
    used: number;
    total: number;
    remaining: number;
  };
}
