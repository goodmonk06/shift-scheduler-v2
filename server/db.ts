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
  changeProposals,
  InsertChangeProposal,
  emergencyNotifications,
  InsertEmergencyNotification,
  shiftFeedback,
  InsertShiftFeedback,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
  const result = await db.insert(shifts).values(data);
  return result;
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

export async function createShiftDetail(data: InsertShiftDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shiftDetails).values(data);
  return result;
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
