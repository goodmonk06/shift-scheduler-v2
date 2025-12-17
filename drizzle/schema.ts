import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * 休憩時間ルールの型定義
 */
export interface BreakTimeRule {
  type: 'fixed' | 'conditional' | 'none';
  duration?: number;        // 固定時間（時間単位、例: 1 = 60分）
  threshold?: number;       // 条件閾値（時間単位、例: 6 = 6時間）
  conditionDuration?: number; // 条件を満たした場合の休憩時間（時間単位）
}

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Position Groups (役職グループ)
 * Examples: 社長、施設長、正社員、パート
 */
export const positionGroups = mysqlTable("positionGroups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  employmentType: mysqlEnum("employmentType", ["fulltime", "parttime"]).notNull(),
  minDaysOffPerMonth: int("minDaysOffPerMonth").default(0).notNull(), // 月の公休日数（正社員=9、パート=0）
  isExcludedFromCount: boolean("isExcludedFromCount").default(false).notNull(), // 9:00-16:00の人数カウントから除外（管理者用）
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PositionGroup = typeof positionGroups.$inferSelect;
export type InsertPositionGroup = typeof positionGroups.$inferInsert;

/**
 * Employees (職員)
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: 'set null' }), // FK to users - nullable for employees without login
  employeeId: varchar("employeeId", { length: 50 }).notNull().unique().$defaultFn(() => ''), // 職員ID（簡易ログイン用、自動生成）
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }), // メールアドレス（簡易ログイン用）
  positionGroupId: int("positionGroupId").notNull().references(() => positionGroups.id, { onDelete: 'restrict' }), // FK to positionGroups
  skillLevel: int("skillLevel").default(100).notNull(), // 50-100 (0.5人前〜1人前を0.5-1で50-100で表現)
  canWorkNightShift: boolean("canWorkNightShift").default(false).notNull(),
  workableDays: json("workableDays"), // 勤務可能曜日と時間帯 [{dayOfWeek: 0-6, startTime: "09:00", endTime: "17:00"}]
  additionalConstraints: json("additionalConstraints"), // 追加の制約条件（構造化JSON）
  breakTime: int("breakTime").default(60).notNull(), // 休憩時間（0/30/60分）★旧フィールド（互換性維持）
  breakTimeRule: json("breakTimeRule").$type<BreakTimeRule>(), // 休憩時間ルール（固定/条件付き/なし）★新フィールド
  isServiceManager: boolean("isServiceManager").default(false).notNull(), // サービス提供責任者フラグ
  isOfficeStaff: boolean("isOfficeStaff").default(false).notNull(), // 事務員フラグ
  displayOrder: int("displayOrder").default(0).notNull(),
  // 通知設定
  notificationEnabled: boolean("notificationEnabled").default(true).notNull(), // 通知を受け取るか
  notificationEmail: varchar("notificationEmail", { length: 320 }), // 通知用メールアドレス
  lineUserId: varchar("lineUserId", { length: 100 }), // LINE通知用ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Work Time Slots (勤務時間枠)
 * Examples: 早番、遅番、夜勤
 */
export const workTimeSlots = mysqlTable("workTimeSlots", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  displayLabel: varchar("displayLabel", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  isNightShift: boolean("isNightShift").default(false).notNull(),
  requiredStaff: int("requiredStaff").notNull().default(3), // 必要人数
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkTimeSlot = typeof workTimeSlots.$inferSelect;
export type InsertWorkTimeSlot = typeof workTimeSlots.$inferInsert;

/**
 * Employee Constraints (職員の勤務制約)
 */
export const employeeConstraints = mysqlTable("employeeConstraints", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  constraintType: mysqlEnum("constraintType", [
    "available_day",
    "available_time",
    "max_consecutive_days",
    "max_weekly_hours"
  ]).notNull(),
  dayOfWeek: int("dayOfWeek"), // 0-6 (0=Sunday), nullable
  startTime: varchar("startTime", { length: 5 }), // HH:MM format, nullable
  endTime: varchar("endTime", { length: 5 }), // HH:MM format, nullable
  maxValue: int("maxValue"), // nullable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeConstraint = typeof employeeConstraints.$inferSelect;
export type InsertEmployeeConstraint = typeof employeeConstraints.$inferInsert;

/**
 * Workplace Rules (職場ルール)
 */
export const workplaceRules = mysqlTable("workplaceRules", {
  id: int("id").autoincrement().primaryKey(),
  ruleType: mysqlEnum("ruleType", [
    "min_rest_days",
    "night_shift_quota",
    "post_night_shift_rest",
    "required_staff_pattern",
    "max_consecutive_days", // 連勤上限
    "fulltime_required_hours" // 正社員配置必須時間
  ]).notNull(),
  employmentType: mysqlEnum("employmentType", ["fulltime", "parttime", "all"]).notNull(),
  ruleValue: json("ruleValue").notNull(), // JSON format for flexible rule storage
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkplaceRule = typeof workplaceRules.$inferSelect;
export type InsertWorkplaceRule = typeof workplaceRules.$inferInsert;

/**
 * Required Staffing (必要人数設定)
 * 24時間×7曜日のマトリクス（30分刻み対応）
 */
export const requiredStaffing = mysqlTable("requiredStaffing", {
  id: int("id").autoincrement().primaryKey(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (0=Sunday)
  hour: int("hour").notNull(), // 0-23
  halfHour: int("halfHour").default(0).notNull(), // 0=:00, 30=:30（30分刻み対応）
  requiredCount: int("requiredCount").notNull(),
  staffingDetails: json("staffingDetails"), // 詳細情報（役職グループ、事務員など）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RequiredStaffing = typeof requiredStaffing.$inferSelect;
export type InsertRequiredStaffing = typeof requiredStaffing.$inferInsert;

/**
 * Shifts (シフト)
 */
export const shifts: any = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: 'restrict' }), // FK to users - creator (nullable)
  parentShiftId: int("parentShiftId").references(() => shifts.id, { onDelete: 'set null' }), // 親シフトID（どのシフトから派生したか）
  year: int("year").notNull(),
  month: int("month").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["vacation_only", "draft", "ai_generated", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).default("vacation_only").notNull(), // 8段階ステータス
  generatedBy: mysqlEnum("generatedBy", ["manual", "ai", "rule_based"]).default("manual").notNull(),
  leaveRequestDeadline: timestamp("leaveRequestDeadline"), // 通常の希望休締め切り
  additionalRequestDeadline: timestamp("additionalRequestDeadline"), // 追加希望締め切り（仮確定後）
  feedbackDeadline: timestamp("feedbackDeadline"), // フィードバック締め切り（仮確定後）
  aiPrompt: text("aiPrompt"), // AI生成時のプロンプト（デバッグ用）
  aiResponse: json("aiResponse"), // AI生成時のレスポンス（デバッグ用）
  tentativePublishedAt: timestamp("tentativePublishedAt"),
  confirmedAt: timestamp("confirmedAt"),
  notificationsSent: json("notificationsSent"), // 送信済み通知の記録 {statusChange: [], deadline: [], etc}
  isArchived: boolean("isArchived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  isDevelopment: boolean("isDevelopment").default(false).notNull(), // 開発専用シフトフラグ（本番と分離）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

/**
 * Shift Details (シフト詳細)
 * Note: 時間指定勤務は timeSlotId=null, status=working, startTime/endTime設定 で表現
 */
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  status: mysqlEnum("status", ["working", "off", "requested_off", "emergency_off"]).notNull(),
  timeSlotId: int("timeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable (nullの場合は時間指定勤務)
  leaveType: mysqlEnum("leaveType", ["休", "有休"]), // 休みの種類（勤務日はnull）
  startTime: varchar("startTime", { length: 5 }), // HH:MM format (時間指定勤務の場合のみ)
  endTime: varchar("endTime", { length: 5 }), // HH:MM format (時間指定勤務の場合のみ)
  displayText: varchar("displayText", { length: 50 }), // Display text as shown in UI (e.g. "8～14", "8半～13", "休", "有給")
  generatedBy: mysqlEnum("generatedBy", ["manual", "ai", "leave_request", "rule_based"]).default("manual").notNull(), // Track if shift was manually created, AI-generated, from leave request, or rule-based
  isChanged: boolean("isChanged").default(false).notNull(),
  previousTimeSlotId: int("previousTimeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable
  isFixed: boolean("isFixed").default(false).notNull(), // 固定データフラグ（希望休・勤務希望由来の場合true）
  sourceType: varchar("sourceType", { length: 50 }), // データソース（leave_request, work_preference, manual, ai_generated, rule_based）
  sourceId: int("sourceId"), // ソースデータのID（leaveRequests.id または workPreferences.id）
  editedInActualMode: boolean("editedInActualMode").default(false).notNull(), // 実際の稼働シフトモードで編集されたかどうか
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftDetail = typeof shiftDetails.$inferSelect;
export type InsertShiftDetail = typeof shiftDetails.$inferInsert;

/**
 * Leave Requests (休み申請)
 * Note: 時間指定勤務は workPreferences テーブルに移動しました
 */
export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  shiftId: int("shiftId").references(() => shifts.id, { onDelete: 'set null' }), // FK to shifts (nullable - not assigned until shift is created)
  requestDate: varchar("requestDate", { length: 10 }), // YYYY-MM-DD format (deprecated, use startDate/endDate)
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  endDate: varchar("endDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  leaveType: mysqlEnum("leaveType", ["休", "有休", "夏", "冬"]).default("休").notNull(), // 休みの種類（夏季・冬季休暇含む）
  isAdditional: boolean("isAdditional").default(false).notNull(), // 追加希望休（仮確定後）
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

/**
 * Work Preferences (勤務希望)
 * 職員が希望する勤務時間帯（例：「9:00-13:00のみ勤務可能」）
 * この時間帯のみ勤務でき、他の時間は勤務不可
 */
export const workPreferences = mysqlTable("workPreferences", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  shiftId: int("shiftId").references(() => shifts.id, { onDelete: 'set null' }), // FK to shifts (nullable - not assigned until shift is created)
  requestDate: varchar("requestDate", { length: 10 }), // YYYY-MM-DD format (deprecated, use startDate/endDate)
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  endDate: varchar("endDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format - 勤務可能開始時刻
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format - 勤務可能終了時刻
  isAdditional: boolean("isAdditional").default(false).notNull(), // 追加希望（仮確定後）
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  preferenceType: mysqlEnum("preferenceType", ["time_specified", "night_shift", "post_night", "training", "other"]).default("time_specified").notNull(), // 勤務希望タイプ
  isCountAsStaff: boolean("isCountAsStaff").default(true).notNull(), // 勤務人数にカウントするか（研修時false）
  displayIcon: varchar("displayIcon", { length: 10 }), // 表示用アイコン（研修時は！など）
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkPreference = typeof workPreferences.$inferSelect;
export type InsertWorkPreference = typeof workPreferences.$inferInsert;

/**
 * Change Proposals (変更提案)
 */
export const changeProposals = mysqlTable("changeProposals", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  proposalDate: varchar("proposalDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  currentTimeSlotId: int("currentTimeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable
  proposedTimeSlotId: int("proposedTimeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeProposal = typeof changeProposals.$inferSelect;
export type InsertChangeProposal = typeof changeProposals.$inferInsert;

/**
 * Emergency Notifications (緊急通知)
 */
export const emergencyNotifications = mysqlTable("emergencyNotifications", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isUrgent: boolean("isUrgent").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmergencyNotification = typeof emergencyNotifications.$inferSelect;
export type InsertEmergencyNotification = typeof emergencyNotifications.$inferInsert;

/**
 * Shift Feedback (シフト評価)
 */
export const shiftFeedback = mysqlTable("shiftFeedback", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  feedbackDate: varchar("feedbackDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  wasUnderstaffed: boolean("wasUnderstaffed").default(false).notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShiftFeedback = typeof shiftFeedback.$inferSelect;
export type InsertShiftFeedback = typeof shiftFeedback.$inferInsert;

/**
 * Audit Logs (監査ログ)
 * 誰がいつ何をしたかを記録
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users
  action: varchar("action", { length: 64 }).notNull(), // e.g. 'SHIFT_CONFIRMED', 'PROPOSAL_APPROVED'
  target: varchar("target", { length: 128 }).notNull(), // e.g. 'shift:2025-11'
  meta: json("meta"), // Additional metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Push Subscriptions (Web Push購読情報)
 * スマホ・ブラウザへのプッシュ通知用
 */
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users
  endpoint: varchar("endpoint", { length: 512 }).notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Shift Actuals (シフト実績)
 * 勤務後の実績報告を管理
 */
export const shiftActuals = mysqlTable("shiftActuals", {
  id: int("id").autoincrement().primaryKey(),
  shiftDetailId: int("shiftDetailId").notNull().references(() => shiftDetails.id, { onDelete: 'cascade' }), // FK to shiftDetails
  actualStartTime: varchar("actualStartTime", { length: 5 }), // HH:MM format
  actualEndTime: varchar("actualEndTime", { length: 5 }), // HH:MM format
  note: text("note"), // 備考（残業理由など）
  reportedAt: timestamp("reportedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: 'set null' }), // FK to users
  status: mysqlEnum("status", ["reported", "approved", "rejected"]).default("reported").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftActual = typeof shiftActuals.$inferSelect;
export type InsertShiftActual = typeof shiftActuals.$inferInsert;

/**
 * Notifications (通知)
 * システム全体の通知を管理
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientType: mysqlEnum("recipientType", ["all", "employee", "admin"]).notNull(),
  recipientId: int("recipientId").references(() => employees.id, { onDelete: 'cascade' }), // FK to employees, nullable
  shiftId: int("shiftId").references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts, nullable
  notificationType: mysqlEnum("notificationType", [
    "status_change",
    "deadline_reminder",
    "feedback_request",
    "approval",
    "rejection",
    "shift_published",
    "modification_request"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  actionUrl: varchar("actionUrl", { length: 500 }), // クリック時の遷移先
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  expiresAt: timestamp("expiresAt"), // 通知の有効期限
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Modification Requests (修正希望)
 * 仮確定後の職員からの修正希望を管理
 */
export const modificationRequests = mysqlTable("modificationRequests", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  requestDate: varchar("requestDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  requestType: mysqlEnum("requestType", ["swap", "off", "time_change"]).notNull(),
  currentAssignment: varchar("currentAssignment", { length: 100 }), // 現在の割り当て
  requestedAssignment: varchar("requestedAssignment", { length: 100 }), // 希望の割り当て
  swapTargetEmployeeId: int("swapTargetEmployeeId").references(() => employees.id, { onDelete: 'set null' }), // 交換相手（swap時のみ）
  reason: text("reason").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "processed"]).default("pending").notNull(),
  processedAt: timestamp("processedAt"),
  processedBy: int("processedBy").references(() => users.id, { onDelete: 'set null' }), // FK to users
  processingComment: text("processingComment"), // 処理時のコメント
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModificationRequest = typeof modificationRequests.$inferSelect;
export type InsertModificationRequest = typeof modificationRequests.$inferInsert;

/**
 * Workflow History (ワークフロー履歴)
 * シフトのステータス遷移履歴を記録
 */
export const workflowHistory = mysqlTable("workflowHistory", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy").references(() => users.id, { onDelete: 'set null' }), // FK to users
  comment: text("comment"), // 変更理由やメモ
  metadata: json("metadata"), // 追加データ（通知送信数など）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type InsertWorkflowHistory = typeof workflowHistory.$inferInsert;

/**
 * Staff Settings (職員設定)
 * 職員のカスタマイズ設定（テーマ、ヘッダー画像、フォントサイズ）
 */
export const staffSettings = mysqlTable("staffSettings", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().unique().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  theme: mysqlEnum("theme", ["default", "sakura", "ocean", "forest", "sunset"]).default("default").notNull(),
  headerImage: mysqlEnum("headerImage", ["flowers", "nature", "ocean", "sakura", "mountain"]).default("flowers").notNull(),
  fontSize: mysqlEnum("fontSize", ["small", "medium", "large", "xlarge"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffSettings = typeof staffSettings.$inferSelect;
export type InsertStaffSettings = typeof staffSettings.$inferInsert;

/**
 * Facility Events (施設イベント)
 * 全職員のホームカレンダーに表示される施設イベント
 */
export const facilityEvents = mysqlTable("facilityEvents", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  day: int("day").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  time: varchar("time", { length: 50 }), // 時間（例: "10:00 - 11:30"）
  createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacilityEvent = typeof facilityEvents.$inferSelect;
export type InsertFacilityEvent = typeof facilityEvents.$inferInsert;
