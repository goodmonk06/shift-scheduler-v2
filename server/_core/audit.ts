/**
 * Audit Logging System
 *
 * Records all important actions for compliance, debugging, and security monitoring
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Common audit actions
 * Extend this enum as needed for your application
 */
export enum AuditAction {
  // Shift actions
  SHIFT_CREATED = "SHIFT_CREATED",
  SHIFT_UPDATED = "SHIFT_UPDATED",
  SHIFT_DELETED = "SHIFT_DELETED",
  SHIFT_CONFIRMED = "SHIFT_CONFIRMED",
  SHIFT_PUBLISHED = "SHIFT_PUBLISHED",
  SHIFT_ARCHIVED = "ARCHIVED",

  // Employee actions
  EMPLOYEE_CREATED = "EMPLOYEE_CREATED",
  EMPLOYEE_UPDATED = "EMPLOYEE_UPDATED",
  EMPLOYEE_DELETED = "EMPLOYEE_DELETED",

  // Leave request actions
  LEAVE_REQUEST_CREATED = "LEAVE_REQUEST_CREATED",
  LEAVE_REQUEST_APPROVED = "LEAVE_REQUEST_APPROVED",
  LEAVE_REQUEST_REJECTED = "LEAVE_REQUEST_REJECTED",

  // Modification request actions
  MODIFICATION_REQUEST_CREATED = "MODIFICATION_REQUEST_CREATED",
  MODIFICATION_REQUEST_APPROVED = "MODIFICATION_REQUEST_APPROVED",
  MODIFICATION_REQUEST_REJECTED = "MODIFICATION_REQUEST_REJECTED",

  // Authentication actions
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  USER_LOGIN_FAILED = "USER_LOGIN_FAILED",

  // Administrative actions
  SETTINGS_UPDATED = "SETTINGS_UPDATED",
  BULK_OPERATION = "BULK_OPERATION",
}

/**
 * Audit log entry parameters
 */
export interface AuditParams {
  actorUserId: number;
  action: AuditAction | string;
  target: string; // e.g., "shift:123", "employee:456", "leave_request:789"
  meta?: Record<string, unknown>;
}

/**
 * Record an audit log entry
 *
 * @example
 * await recordAudit({
 *   actorUserId: user.id,
 *   action: AuditAction.SHIFT_CONFIRMED,
 *   target: `shift:${shiftId}`,
 *   meta: { year: 2025, month: 11 }
 * });
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Audit] Database not available, skipping audit log");
      return;
    }

    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId,
      action: params.action,
      target: params.target,
      meta: params.meta || null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    // But log the error for investigation
    console.error("[Audit] Failed to record audit log:", error, params);
  }
}

/**
 * Batch record multiple audit logs
 * Useful for bulk operations
 */
export async function recordAuditBatch(entries: AuditParams[]): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Audit] Database not available, skipping audit logs");
      return;
    }

    const now = new Date();
    await db.insert(auditLogs).values(
      entries.map((entry) => ({
        actorUserId: entry.actorUserId,
        action: entry.action,
        target: entry.target,
        meta: entry.meta || null,
        createdAt: now,
      }))
    );
  } catch (error) {
    console.error("[Audit] Failed to record audit logs:", error);
  }
}

/**
 * Get audit logs for a specific target
 *
 * @example
 * const logs = await getAuditLogs("shift:123");
 */
export async function getAuditLogs(
  target: string,
  options?: { limit?: number; offset?: number }
): Promise<typeof auditLogs.$inferSelect[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const { limit = 100, offset = 0 } = options || {};

  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.target, target))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: number,
  options?: { limit?: number; offset?: number }
): Promise<typeof auditLogs.$inferSelect[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const { limit = 100, offset = 0 } = options || {};

  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.actorUserId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Helper to create target identifiers
 */
export const createTarget = {
  shift: (id: number) => `shift:${id}`,
  employee: (id: number) => `employee:${id}`,
  leaveRequest: (id: number) => `leave_request:${id}`,
  modificationRequest: (id: number) => `modification_request:${id}`,
  user: (id: number) => `user:${id}`,
  custom: (type: string, id: number | string) => `${type}:${id}`,
};
