import { getDb } from "./db";
import {
  notifications,
  modificationRequests,
  workflowHistory,
  employees,
  shifts,
} from "../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

// ========== Notification Functions ==========

export async function createNotification(data: {
  recipientType: "all" | "employee" | "admin";
  recipientId?: number;
  shiftId?: number;
  notificationType: "status_change" | "deadline_reminder" | "feedback_request" | "approval" | "rejection" | "shift_published" | "modification_request";
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  actionUrl?: string;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(notifications).values({
    recipientType: data.recipientType,
    recipientId: data.recipientId,
    shiftId: data.shiftId,
    notificationType: data.notificationType,
    title: data.title,
    message: data.message,
    priority: data.priority || "medium",
    actionUrl: data.actionUrl,
    expiresAt: data.expiresAt,
    isRead: false,
  });
  return { id: Number(result.insertId) };
}

export async function sendBulkNotification(data: {
  shiftId: number;
  notificationType: "status_change" | "deadline_reminder" | "feedback_request" | "approval" | "rejection" | "shift_published" | "modification_request";
  title: string;
  message: string;
  recipientType?: "all" | "employee" | "admin";
  priority?: "low" | "medium" | "high";
}) {
  return await createNotification({
    recipientType: data.recipientType || "all",
    shiftId: data.shiftId,
    notificationType: data.notificationType,
    title: data.title,
    message: data.message,
    priority: data.priority,
  });
}

export async function getNotificationsForEmployee(employeeId: number, options?: { limit?: number; includeRead?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const limit = options?.limit || 50;
  const includeRead = options?.includeRead ?? false;

  let query = db
    .select()
    .from(notifications)
    .where(
      and(
        sql`(${notifications.recipientType} = 'all' OR (${notifications.recipientType} = 'employee' AND ${notifications.recipientId} = ${employeeId}))`
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  if (!includeRead) {
    query = db
      .select()
      .from(notifications)
      .where(
        and(
          sql`(${notifications.recipientType} = 'all' OR (${notifications.recipientType} = 'employee' AND ${notifications.recipientId} = ${employeeId}))`,
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  return await query;
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
  return { success: true };
}

export async function markAllNotificationsAsRead(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, employeeId),
        eq(notifications.isRead, false)
      )
    );
  return { success: true };
}

// ========== Modification Request Functions ==========

export async function createModificationRequest(data: {
  shiftId: number;
  employeeId: number;
  requestDate: string;
  requestType: "swap" | "off" | "time_change";
  currentAssignment?: string;
  requestedAssignment?: string;
  swapTargetEmployeeId?: number;
  reason: string;
  priority?: "low" | "medium" | "high";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(modificationRequests).values({
    shiftId: data.shiftId,
    employeeId: data.employeeId,
    requestDate: data.requestDate,
    requestType: data.requestType,
    currentAssignment: data.currentAssignment,
    requestedAssignment: data.requestedAssignment,
    swapTargetEmployeeId: data.swapTargetEmployeeId,
    reason: data.reason,
    priority: data.priority || "medium",
    status: "pending",
  });
  return { id: Number(result.insertId) };
}

export async function getModificationRequestsByEmployee(employeeId: number, status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  let query = db
    .select()
    .from(modificationRequests)
    .where(eq(modificationRequests.employeeId, employeeId))
    .orderBy(desc(modificationRequests.createdAt));

  if (status) {
    query = db
      .select()
      .from(modificationRequests)
      .where(
        and(
          eq(modificationRequests.employeeId, employeeId),
          eq(modificationRequests.status, status as any)
        )
      )
      .orderBy(desc(modificationRequests.createdAt));
  }

  return await query;
}

export async function getModificationRequestsByShift(shiftId: number, status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  let query = db
    .select()
    .from(modificationRequests)
    .where(eq(modificationRequests.shiftId, shiftId))
    .orderBy(desc(modificationRequests.createdAt));

  if (status) {
    query = db
      .select()
      .from(modificationRequests)
      .where(
        and(
          eq(modificationRequests.shiftId, shiftId),
          eq(modificationRequests.status, status as any)
        )
      )
      .orderBy(desc(modificationRequests.createdAt));
  }

  return await query;
}

export async function getPendingModificationRequestsCount(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select({ count: count() })
    .from(modificationRequests)
    .where(
      and(
        eq(modificationRequests.shiftId, shiftId),
        eq(modificationRequests.status, "pending")
      )
    );
  return result[0]?.count || 0;
}

export async function batchProcessModificationRequests(
  requestIds: number[],
  action: string,
  userId: number,
  comment?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const status = action === "approve" ? "approved" : "rejected";

  for (const id of requestIds) {
    await db
      .update(modificationRequests)
      .set({
        status: status as any,
        processedAt: new Date(),
        processedBy: userId,
        processingComment: comment,
      })
      .where(eq(modificationRequests.id, id));
  }

  return requestIds.length;
}

// ========== Workflow History Functions ==========

export async function recordWorkflowHistory(data: {
  shiftId: number;
  fromStatus?: string;
  toStatus: string;
  changedBy?: number;
  comment?: string;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(workflowHistory).values({
    shiftId: data.shiftId,
    fromStatus: data.fromStatus,
    toStatus: data.toStatus,
    changedBy: data.changedBy,
    comment: data.comment,
    metadata: data.metadata,
  });
  return { id: Number(result.insertId) };
}

export async function getWorkflowHistory(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db
    .select()
    .from(workflowHistory)
    .where(eq(workflowHistory.shiftId, shiftId))
    .orderBy(desc(workflowHistory.createdAt));
}

export async function getLatestWorkflowStatus(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(workflowHistory)
    .where(eq(workflowHistory.shiftId, shiftId))
    .orderBy(desc(workflowHistory.createdAt))
    .limit(1);
  return result[0] || null;
}

// ========== Workflow Statistics ==========

export async function getWorkflowStatistics(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [pendingMods, approvedMods, rejectedMods, unreadNotes, totalNotes] = await Promise.all([
    db
      .select({ count: count() })
      .from(modificationRequests)
      .where(
        and(
          eq(modificationRequests.shiftId, shiftId),
          eq(modificationRequests.status, "pending")
        )
      ),
    db
      .select({ count: count() })
      .from(modificationRequests)
      .where(
        and(
          eq(modificationRequests.shiftId, shiftId),
          eq(modificationRequests.status, "approved")
        )
      ),
    db
      .select({ count: count() })
      .from(modificationRequests)
      .where(
        and(
          eq(modificationRequests.shiftId, shiftId),
          eq(modificationRequests.status, "rejected")
        )
      ),
    db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.shiftId, shiftId),
          eq(notifications.isRead, false)
        )
      ),
    db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.shiftId, shiftId)),
  ]);

  const workflowStepsResult = await db
    .select({ count: count() })
    .from(workflowHistory)
    .where(eq(workflowHistory.shiftId, shiftId));

  return {
    pendingModifications: pendingMods[0]?.count || 0,
    approvedModifications: approvedMods[0]?.count || 0,
    rejectedModifications: rejectedMods[0]?.count || 0,
    unreadNotifications: unreadNotes[0]?.count || 0,
    totalNotifications: totalNotes[0]?.count || 0,
    workflowSteps: workflowStepsResult[0]?.count || 0,
  };
}
