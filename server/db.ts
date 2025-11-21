import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  positionGroups,
  InsertPositionGroup,
  employees,
  InsertEmployee,
  workTimeSlots,
  InsertWorkTimeSlot,
  employeeConstraints,
  InsertEmployeeConstraint,
  workplaceRules,
  InsertWorkplaceRule,
  requiredStaffing,
  InsertRequiredStaffing,
  shifts,
  InsertShift,
  shiftDetails,
  InsertShiftDetail,
  leaveRequests,
  InsertLeaveRequest,
  workPreferences,
  InsertWorkPreference,
  changeProposals,
  InsertChangeProposal,
  emergencyNotifications,
  InsertEmergencyNotification,
  shiftFeedback,
  InsertShiftFeedback,
  facilityEvents,
  InsertFacilityEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Remove ssl-mode parameter if present (not supported by mysql2)
      const connectionString = process.env.DATABASE_URL.replace(/[?&]ssl-mode=[^&]*/g, '');
      _db = drizzle(connectionString);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success, rolls back on error
 *
 * @example
 * await withTransaction(async (tx) => {
 *   await tx.insert(shifts).values({...});
 *   await tx.update(employees).set({...}).where(...);
 * });
 */
export async function withTransaction<T>(
  callback: (tx: NonNullable<typeof _db>) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Drizzle's transaction method
  return await db.transaction(async (tx) => {
    return await callback(tx as any);
  });
}

// ========== User Management ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Position Groups ==========

export async function getAllPositionGroups() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(positionGroups).orderBy(asc(positionGroups.displayOrder));
}

export async function createPositionGroup(data: InsertPositionGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(positionGroups).values(data);
  return result;
}

export async function updatePositionGroup(id: number, data: Partial<InsertPositionGroup>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(positionGroups).set(data).where(eq(positionGroups.id, id));
}

export async function deletePositionGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(positionGroups).where(eq(positionGroups.id, id));
}

// ========== Employees ==========

export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees).orderBy(asc(employees.displayOrder));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // employeeIdが指定されていない場合、自動生成
  if (!data.employeeId) {
    // 最大IDを取得して+1
    const maxIdResult = await db.select({ maxId: sql<number>`MAX(id)` }).from(employees);
    const nextId = (maxIdResult[0]?.maxId || 0) + 1;
    data.employeeId = `EMP${String(nextId).padStart(5, '0')}`;
  }
  
  const result = await db.insert(employees).values(data);
  return result;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(employees).where(eq(employees.id, id));
}

// ========== Work Time Slots ==========

export async function getAllWorkTimeSlots() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workTimeSlots);
}

export async function createWorkTimeSlot(data: InsertWorkTimeSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workTimeSlots).values(data);
  return result;
}

export async function updateWorkTimeSlot(id: number, data: Partial<InsertWorkTimeSlot>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(workTimeSlots).set(data).where(eq(workTimeSlots.id, id));
}

export async function deleteWorkTimeSlot(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(workTimeSlots).where(eq(workTimeSlots.id, id));
}

// ========== Employee Constraints ==========

export async function getEmployeeConstraints(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employeeConstraints).where(eq(employeeConstraints.employeeId, employeeId));
}

export async function getAllEmployeeConstraints() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employeeConstraints);
}

export async function createEmployeeConstraint(data: InsertEmployeeConstraint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeConstraints).values(data);
  return result;
}

export async function deleteEmployeeConstraint(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(employeeConstraints).where(eq(employeeConstraints.id, id));
}

// ========== Workplace Rules ==========

export async function getAllWorkplaceRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workplaceRules);
}

export async function createWorkplaceRule(data: InsertWorkplaceRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workplaceRules).values(data);
  return result;
}

export async function updateWorkplaceRule(id: number, data: Partial<InsertWorkplaceRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(workplaceRules).set(data).where(eq(workplaceRules.id, id));
}

export async function deleteWorkplaceRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(workplaceRules).where(eq(workplaceRules.id, id));
}

export async function upsertWorkplaceRules(rules: InsertWorkplaceRule[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 各ルールタイプに対して、既存を削除して新規挿入
  for (const rule of rules) {
    // 同じruleTypeの既存ルールを削除
    await db.delete(workplaceRules).where(
      and(
        eq(workplaceRules.ruleType, rule.ruleType),
        eq(workplaceRules.employmentType, rule.employmentType)
      )
    );

    // 新規挿入
    await db.insert(workplaceRules).values(rule);
  }

  return { success: true };
}

// ========== Required Staffing ==========

export async function getAllRequiredStaffing() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(requiredStaffing);
}

export async function upsertRequiredStaffing(data: InsertRequiredStaffing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if exists
  const existing = await db.select().from(requiredStaffing)
    .where(and(
      eq(requiredStaffing.dayOfWeek, data.dayOfWeek),
      eq(requiredStaffing.hour, data.hour)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return await db.update(requiredStaffing)
      .set({ requiredCount: data.requiredCount })
      .where(and(
        eq(requiredStaffing.dayOfWeek, data.dayOfWeek),
        eq(requiredStaffing.hour, data.hour)
      ));
  } else {
    return await db.insert(requiredStaffing).values(data);
  }
}

// ========== Shifts ==========

export async function getAllShifts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shifts).orderBy(desc(shifts.year), desc(shifts.month));
}

export async function getShiftById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getShiftByYearMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import("drizzle-orm");
  const result = await db.select().from(shifts).where(and(eq(shifts.year, year), eq(shifts.month, month))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createShift(data: InsertShift) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert and get the insertId
  const result = await db.insert(shifts).values(data);

  // Get the insertId from the result
  // @ts-ignore - mysql2 returns insertId in the result
  const insertId = result[0]?.insertId;

  if (!insertId) {
    console.error('[createShift] No insertId returned from INSERT:', result);
    throw new Error("Failed to get insertId from shift creation");
  }

  console.log(`[createShift] Created shift with ID: ${insertId}`);

  // Retrieve the created shift to return full data
  const created = await getShiftById(insertId);
  if (!created) {
    throw new Error(`Failed to retrieve created shift with ID ${insertId}`);
  }

  return created;
}

export async function updateShift(id: number, data: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(shifts).set(data).where(eq(shifts.id, id));
}

export async function deleteShift(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(shifts).where(eq(shifts.id, id));
}

// ========== Shift Details ==========

export async function getShiftDetails(shiftId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shiftDetails).where(eq(shiftDetails.shiftId, shiftId));
}

export async function getShiftDetailsByShiftId(shiftId: number) {
  return await getShiftDetails(shiftId);
}

export async function createShiftDetail(data: InsertShiftDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(shiftDetails).values(data);
    console.log(`[createShiftDetail] Inserted shift detail for shift ${data.shiftId}, employee ${data.employeeId}, date ${data.date}`);
    return result;
  } catch (error: any) {
    console.error(`[createShiftDetail] ERROR inserting shift detail:`, error);
    console.error(`[createShiftDetail] Data:`, JSON.stringify(data, null, 2));
    throw error;
  }
}

export async function updateShiftDetail(id: number, data: Partial<InsertShiftDetail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(shiftDetails).set(data).where(eq(shiftDetails.id, id));
}

export async function deleteShiftDetail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(shiftDetails).where(eq(shiftDetails.id, id));
}

export async function deleteShiftDetailsByShiftId(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(shiftDetails).where(eq(shiftDetails.shiftId, shiftId));
}

export async function deleteAIGeneratedShiftDetails(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(shiftDetails)
    .where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        eq(shiftDetails.generatedBy, "ai")
      )
    );
}

// ========== Leave Requests ==========

export async function getAllLeaveRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
}

export async function getLeaveRequestsByShift(shiftId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leaveRequests).where(eq(leaveRequests.shiftId, shiftId));
}

export async function getLeaveRequestsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
}

export async function createLeaveRequest(data: InsertLeaveRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leaveRequests).values(data);
  return result;
}

export async function updateLeaveRequest(id: number, data: Partial<InsertLeaveRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id));
}

export async function deleteLeaveRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
}

// ========== Work Preferences ==========

export async function getAllWorkPreferences() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workPreferences).orderBy(desc(workPreferences.createdAt));
}

export async function getWorkPreferencesByShift(shiftId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workPreferences).where(eq(workPreferences.shiftId, shiftId));
}

export async function getWorkPreferencesByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workPreferences).where(eq(workPreferences.employeeId, employeeId));
}

export async function createWorkPreference(data: InsertWorkPreference) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workPreferences).values(data);
  return result;
}

export async function updateWorkPreference(id: number, data: Partial<InsertWorkPreference>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(workPreferences).set(data).where(eq(workPreferences.id, id));
}

export async function deleteWorkPreference(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(workPreferences).where(eq(workPreferences.id, id));
}

// ========== Change Proposals ==========

export async function getAllChangeProposals() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(changeProposals).orderBy(desc(changeProposals.createdAt));
}

export async function getChangeProposalsByShift(shiftId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(changeProposals).where(eq(changeProposals.shiftId, shiftId));
}

export async function getChangeProposalsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(changeProposals).where(eq(changeProposals.employeeId, employeeId));
}

export async function createChangeProposal(data: InsertChangeProposal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(changeProposals).values(data);
  return result;
}

export async function updateChangeProposal(id: number, data: Partial<InsertChangeProposal>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(changeProposals).set(data).where(eq(changeProposals.id, id));
}

// ========== Emergency Notifications ==========

export async function getEmergencyNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emergencyNotifications);
}

export async function createEmergencyNotification(data: InsertEmergencyNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emergencyNotifications).values(data);
  return result;
}

export async function deleteEmergencyNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(emergencyNotifications).where(eq(emergencyNotifications.id, id));
}

// ========== Shift Feedback ==========

export async function getShiftFeedback(shiftId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shiftFeedback).where(eq(shiftFeedback.shiftId, shiftId));
}

export async function createShiftFeedback(data: InsertShiftFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shiftFeedback).values(data);
  return result;
}

// ========== Transaction Support Functions ==========

/**
 * トランザクション内でAI生成シフト詳細を削除
 * @param tx - トランザクションオブジェクト
 * @param shiftId - シフトID
 */
export async function deleteAIGeneratedShiftDetailsWithTransaction(tx: any, shiftId: number) {
  return await tx.delete(shiftDetails)
    .where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        eq(shiftDetails.generatedBy, "ai")
      )
    );
}

/**
 * トランザクション内でルールベース生成シフト詳細を削除
 * @param tx - トランザクションオブジェクト
 * @param shiftId - シフトID
 */
export async function deleteRuleBasedGeneratedShiftDetailsWithTransaction(tx: any, shiftId: number) {
  return await tx.delete(shiftDetails)
    .where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        eq(shiftDetails.generatedBy, "rule_based")
      )
    );
}

/**
 * トランザクション内でシフト詳細を作成
 * @param tx - トランザクションオブジェクト
 * @param data - シフト詳細データ
 */
export async function createShiftDetailWithTransaction(tx: any, data: InsertShiftDetail) {
  const result = await tx.insert(shiftDetails).values(data);
  return result;
}

/**
 * トランザクション内でシフト情報を更新
 * @param tx - トランザクションオブジェクト
 * @param id - シフトID
 * @param data - 更新データ
 */
export async function updateShiftWithTransaction(tx: any, id: number, data: Partial<InsertShift>) {
  return await tx.update(shifts).set(data).where(eq(shifts.id, id));
}

/**
 * 承認済みの希望休をシフト詳細に反映
 * @param shiftId - シフトID
 * @returns 反映された希望休の件数
 */
export async function applyApprovedLeaveRequestsToShift(shiftId: number): Promise<number> {
  const database = await getDb();
  if (!database) {
    throw new Error("Database connection not available");
  }

  // トランザクション内で実行して、すべての操作が成功するか、すべて失敗するかを保証
  return await withTransaction(async (tx) => {
    // 指定シフトの承認済み希望休を取得
    const approvedRequests = await tx
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.shiftId, shiftId),
          eq(leaveRequests.status, "approved")
        )
      );

    if (approvedRequests.length === 0) {
      return 0;
    }

    // シフト情報を取得して期間を確認
    const shiftResult = await tx
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (shiftResult.length === 0) {
      throw new Error("Shift not found");
    }

    // パフォーマンス最適化: N+1問題を解決
    // 1. 全ての対象日付を先に計算
    const allTargetDates: Array<{ employeeId: number; date: string }> = [];
    for (const request of approvedRequests) {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        allTargetDates.push({ employeeId: request.employeeId, date: dateStr });
      }
    }

    // 2. 既存のシフト詳細を一括取得
    const existingDetails = await tx
      .select()
      .from(shiftDetails)
      .where(eq(shiftDetails.shiftId, shiftId));

    // 3. 既存データをMapに格納 (employeeId-date -> detail)
    const existingMap = new Map<string, typeof shiftDetails.$inferSelect>();
    for (const detail of existingDetails) {
      const key = `${detail.employeeId}-${detail.date}`;
      existingMap.set(key, detail);
    }

    // 4. 更新と挿入のデータを準備
    const toUpdate: Array<{ id: number }> = [];
    const toInsert: Array<typeof shiftDetails.$inferInsert> = [];

    for (const { employeeId, date } of allTargetDates) {
      const key = `${employeeId}-${date}`;
      const existing = existingMap.get(key);

      if (existing) {
        toUpdate.push({ id: existing.id });
      } else {
        toInsert.push({
          shiftId,
          employeeId,
          date,
          status: "off",
          timeSlotId: null,
          generatedBy: "leave_request",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // 5. トランザクション内でバッチ更新
    for (const { id } of toUpdate) {
      await tx
        .update(shiftDetails)
        .set({
          status: "off",
          timeSlotId: null,
          generatedBy: "leave_request",
          updatedAt: new Date(),
        })
        .where(eq(shiftDetails.id, id));
    }

    // 6. トランザクション内でバッチ挿入 (Drizzleは複数行の一括挿入をサポート)
    if (toInsert.length > 0) {
      await tx.insert(shiftDetails).values(toInsert);
    }

    const appliedCount = allTargetDates.length;
    console.log(`[ApplyLeaveRequests] Applied ${appliedCount} leave days for shift ${shiftId} (${toUpdate.length} updated, ${toInsert.length} inserted)`);
    return appliedCount;
  }); // End of transaction
}

// ========== Facility Events Management ==========

/**
 * Get all facility events
 */
export async function getAllFacilityEvents() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return await database.select().from(facilityEvents).orderBy(asc(facilityEvents.year), asc(facilityEvents.month), asc(facilityEvents.day));
}

/**
 * Get facility events for a specific month
 */
export async function getFacilityEventsByMonth(year: number, month: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return await database
    .select()
    .from(facilityEvents)
    .where(
      and(
        eq(facilityEvents.year, year),
        eq(facilityEvents.month, month)
      )
    )
    .orderBy(asc(facilityEvents.day));
}

/**
 * Get a facility event by ID
 */
export async function getFacilityEventById(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.select().from(facilityEvents).where(eq(facilityEvents.id, id));
  return result[0] || null;
}

/**
 * Create a new facility event
 */
export async function createFacilityEvent(event: Omit<InsertFacilityEvent, 'id'>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(facilityEvents).values(event);
  return result;
}

/**
 * Update a facility event
 */
export async function updateFacilityEvent(id: number, event: Partial<Omit<InsertFacilityEvent, 'id' | 'createdBy'>>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.update(facilityEvents).set({
    ...event,
    updatedAt: new Date(),
  }).where(eq(facilityEvents.id, id));
  return result;
}

/**
 * Delete a facility event
 */
export async function deleteFacilityEvent(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.delete(facilityEvents).where(eq(facilityEvents.id, id));
  return result;
}
