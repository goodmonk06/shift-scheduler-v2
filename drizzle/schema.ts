import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

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
  additionalConstraints: text("additionalConstraints"), // 追加の制約条件（自然言語）
  breakTime: int("breakTime").default(60).notNull(), // 休憩時間（0/30/60分）
  isServiceManager: boolean("isServiceManager").default(false).notNull(), // サービス提供責任者フラグ
  isOfficeStaff: boolean("isOfficeStaff").default(false).notNull(), // 事務員フラグ
  displayOrder: int("displayOrder").default(0).notNull(),
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
 * 24時間×7曜日のマトリクス
 */
export const requiredStaffing = mysqlTable("requiredStaffing", {
  id: int("id").autoincrement().primaryKey(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (0=Sunday)
  hour: int("hour").notNull(), // 0-23
  requiredCount: int("requiredCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RequiredStaffing = typeof requiredStaffing.$inferSelect;
export type InsertRequiredStaffing = typeof requiredStaffing.$inferInsert;

/**
 * Shifts (シフト)
 */
export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: 'restrict' }), // FK to users - creator (nullable)
  year: int("year").notNull(),
  month: int("month").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["draft", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).default("draft").notNull(), // 6段階ステータス
  generatedBy: mysqlEnum("generatedBy", ["manual", "ai"]).default("manual").notNull(),
  leaveRequestDeadline: timestamp("leaveRequestDeadline"), // 通常の希望休締め切り
  additionalRequestDeadline: timestamp("additionalRequestDeadline"), // 追加希望締め切り（仮確定後）
  aiPrompt: text("aiPrompt"), // AI生成時のプロンプト（デバッグ用）
  aiResponse: json("aiResponse"), // AI生成時のレスポンス（デバッグ用）
  tentativePublishedAt: timestamp("tentativePublishedAt"),
  confirmedAt: timestamp("confirmedAt"),
  isArchived: boolean("isArchived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

/**
 * Shift Details (シフト詳細)
 */
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }), // FK to shifts
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  status: mysqlEnum("status", ["working", "off", "requested_off", "emergency_off"]).notNull(),
  timeSlotId: int("timeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable
  generatedBy: mysqlEnum("generatedBy", ["manual", "ai", "leave_request"]).default("manual").notNull(), // Track if shift was manually created, AI-generated, or from leave request
  isChanged: boolean("isChanged").default(false).notNull(),
  previousTimeSlotId: int("previousTimeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }), // FK to workTimeSlots, nullable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftDetail = typeof shiftDetails.$inferSelect;
export type InsertShiftDetail = typeof shiftDetails.$inferInsert;

/**
 * Leave Requests (希望休申請)
 */
export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }), // FK to employees
  shiftId: int("shiftId").references(() => shifts.id, { onDelete: 'set null' }), // FK to shifts (nullable - not assigned until shift is created)
  requestDate: varchar("requestDate", { length: 10 }), // YYYY-MM-DD format (deprecated, use startDate/endDate)
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  endDate: varchar("endDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  leaveType: mysqlEnum("leaveType", ["休", "有休", "時間指定"]).default("休").notNull(), // 休みの種類
  startTime: varchar("startTime", { length: 5 }), // HH:MM format, nullable
  endTime: varchar("endTime", { length: 5 }), // HH:MM format, nullable
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
