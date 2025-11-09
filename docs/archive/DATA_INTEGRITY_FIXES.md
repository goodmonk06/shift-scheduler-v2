# Critical Data Integrity Fixes - Code Examples

This document provides concrete code fixes for the critical issues identified in DATA_FLOW_AND_INTEGRITY_ANALYSIS.md

## Fix 1: Implement Admin Role-Based Access Control

### Problem
All endpoints use `protectedProcedure` allowing any authenticated user to call admin functions.

### Solution

**File: server/routers.ts - Apply to all admin operations**

```typescript
// BEFORE: Allows any authenticated user
shifts: router({
  create: protectedProcedure
    .input(z.object({...}))
    .mutation(async ({ input, ctx }) => {
      return await db.createShift({...input, userId: ctx.user.id});
    }),
});

// AFTER: Restrict to admins only
shifts: router({
  create: adminProcedure
    .input(z.object({...}))
    .mutation(async ({ input, ctx }) => {
      return await db.createShift({...input, userId: ctx.user.id});
    }),
    
  confirm: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Add status validation
      const shift = await db.getShiftById(input.id);
      if (!shift || shift.status !== 'tentative') {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Only tentative shifts can be confirmed" 
        });
      }
      return await db.updateShift(input.id, {
        status: "confirmed",
        confirmedAt: new Date(),
      });
    }),
    
  update: adminProcedure
    .input(z.object({...}))
    .mutation(async ({ input }) => {
      // Validate status transitions
      const shift = await db.getShiftById(input.id);
      if (!shift) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      const validTransitions: Record<string, string[]> = {
        'draft': ['draft', 'tentative', 'deleted'],
        'tentative': ['tentative', 'tentative_revised', 'confirmed'],
        'tentative_revised': ['tentative_revised', 'confirmed'],
        'confirmed': ['confirmed', 'actual'],
        'actual': ['actual'],
        'archived': ['archived'],
      };
      
      const newStatus = input.status || shift.status;
      if (input.status && !validTransitions[shift.status]?.includes(newStatus)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot transition from ${shift.status} to ${newStatus}`
        });
      }
      
      const { id, ...data } = input;
      return await db.updateShift(id, data);
    }),
    
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteShift(input.id);
    }),
    
  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const shift = await db.getShiftById(input.id);
      if (!shift) throw new TRPCError({ code: "NOT_FOUND" });
      if (shift.status === 'archived') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Already archived" });
      }
      return await db.updateShift(input.id, {
        status: "archived",
        isArchived: true,
        archivedAt: new Date()
      });
    }),
});

// Apply to ALL admin endpoints:
positionGroups: {
  create: adminProcedure...,
  update: adminProcedure...,
  delete: adminProcedure...,
}

employees: {
  create: adminProcedure...,
  update: adminProcedure...,
  delete: adminProcedure...,
}

workTimeSlots: {
  create: adminProcedure...,
  update: adminProcedure...,
  delete: adminProcedure...,
}

workplaceRules: {
  create: adminProcedure...,
  update: adminProcedure...,
  delete: adminProcedure...,
}

requiredStaffing: {
  upsert: adminProcedure...,
}

shiftDetails: {
  create: adminProcedure...,
  update: adminProcedure...,
  delete: adminProcedure...,
}

emergencyNotifications: {
  create: adminProcedure...,
  delete: adminProcedure...,
}
```

---

## Fix 2: Prevent Employee Self-Approval of Change Proposals

### Problem
Employees can approve/reject their own change proposals because no role check exists.

### Solution

**File: server/routers.ts - Lines 499-507**

```typescript
// BEFORE: Anyone can approve
changeProposals: router({
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.updateChangeProposal(input.id, { 
        status: "approved", 
        reviewedAt: new Date() 
      });
    }),
    
  reject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.updateChangeProposal(input.id, { 
        status: "rejected", 
        reviewedAt: new Date() 
      });
    }),
});

// AFTER: Only admins can approve/reject
changeProposals: router({
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proposal = await db.getChangeProposalById(input.id);
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND" });
      if (proposal.status !== 'pending') {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Only pending proposals can be approved" 
        });
      }
      
      // Apply the change to shiftDetails
      const { proposedTimeSlotId, proposalDate, employeeId, shiftId } = proposal;
      
      // Find and update the shiftDetail record
      const shiftDetails = await db.getShiftDetails(shiftId);
      const detail = shiftDetails.find(
        d => d.employeeId === employeeId && d.date === proposalDate
      );
      
      if (!detail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift detail not found" });
      }
      
      await db.updateShiftDetail(detail.id, {
        timeSlotId: proposedTimeSlotId,
        isChanged: true,
        previousTimeSlotId: detail.timeSlotId
      });
      
      return await db.updateChangeProposal(input.id, { 
        status: "approved", 
        reviewedAt: new Date() 
      });
    }),
    
  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const proposal = await db.getChangeProposalById(input.id);
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND" });
      if (proposal.status !== 'pending') {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Only pending proposals can be rejected" 
        });
      }
      
      return await db.updateChangeProposal(input.id, { 
        status: "rejected", 
        reviewedAt: new Date() 
      });
    }),
});
```

**Add helper function to db.ts:**

```typescript
export async function getChangeProposalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select()
    .from(changeProposals)
    .where(eq(changeProposals.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
```

---

## Fix 3: Add Employee Data Access Control

### Problem
Employees can query data for other employees by manipulating the employeeId parameter.

### Solution

**File: server/routers.ts - Update all employee-specific queries**

```typescript
// BEFORE: No access control
shiftDetails: router({
  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), shiftId: z.number() }))
    .query(async ({ input }) => {
      const allDetails = await db.getShiftDetails(input.shiftId);
      return allDetails.filter(d => d.employeeId === input.employeeId);
    }),
});

// AFTER: Verify employee ownership
shiftDetails: router({
  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), shiftId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Only allow users to access their own data
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee || (employee.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const allDetails = await db.getShiftDetails(input.shiftId);
      return allDetails.filter(d => d.employeeId === input.employeeId);
    }),
});

// Apply same pattern to:
leaveRequests: {
  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input, ctx }) => {
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee || (employee.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getLeaveRequestsByEmployee(input.employeeId);
    }),
},

changeProposals: {
  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input, ctx }) => {
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee || (employee.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getChangeProposalsByEmployee(input.employeeId);
    }),
},
```

---

## Fix 4: Add Transactional Support for AI Generation

### Problem
AI shift generation is non-atomic, leading to data loss on failure or concurrent modifications.

### Solution

**File: server/db.ts - Add transaction support**

```typescript
// Add at top of file
import { mysql } from 'drizzle-orm/mysql-core';
import type { MySql2Database } from 'drizzle-orm/mysql2';

export async function withTransaction<T>(
  callback: (db: MySql2Database<Record<string, never>>) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.execute('START TRANSACTION');
    const result = await callback(db);
    await db.execute('COMMIT');
    return result;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function deleteAIGeneratedShiftDetailsAtomic(shiftId: number) {
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
```

**File: server/aiShiftGenerator.ts - Wrap in transaction**

```typescript
// BEFORE: Non-atomic operations
export async function generateShiftWithAI(params: GenerateShiftParams): Promise<void> {
  const { shiftId, year, month } = params;
  try {
    const context = await collectContext(shiftId, year, month);
    
    await db.deleteAIGeneratedShiftDetails(shiftId);  // DELETE
    
    const partTimeResult = await generatePartTimeShifts(context, [], shiftId);
    for (const shift of partTimeResult.shifts) {
      await db.createShiftDetail({...shift, shiftId, generatedBy: "ai"});  // INSERT
    }
    
    const fullTimeResult = await generateFullTimeShifts(context, partTimeResult.shifts, shiftId);
    for (const shift of fullTimeResult.shifts) {
      await db.createShiftDetail({...shift, shiftId, generatedBy: "ai"});  // INSERT
    }
    
    await db.updateShift(shiftId, {  // UPDATE
      generatedBy: "ai",
      aiPrompt: combinedPrompt,
      aiResponse: combinedResponse,
    });
  } catch (error) {
    console.error("[AIシフト生成] エラー:", error);
    throw error;
  }
}

// AFTER: Atomic transaction
export async function generateShiftWithAI(params: GenerateShiftParams): Promise<void> {
  const { shiftId, year, month } = params;

  try {
    console.log("[AIシフト生成] 開始:", { shiftId, year, month });

    // Wrap entire operation in transaction
    await db.withTransaction(async (txDb) => {
      const context = await collectContext(shiftId, year, month);
      console.log("[AIシフト生成] コンテキスト収集完了");

      // Delete within transaction
      await txDb.delete(shiftDetails)
        .where(
          and(
            eq(shiftDetails.shiftId, shiftId),
            eq(shiftDetails.generatedBy, "ai")
          )
        );
      console.log("[AIシフト生成] 既存AIシフト削除完了");

      // Generate and insert part-time shifts
      const partTimeResult = await generatePartTimeShifts(context, [], shiftId);
      for (const shift of partTimeResult.shifts) {
        await txDb.insert(shiftDetails).values({
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] パートシフトDB保存完了:", partTimeResult.shifts.length);

      // Generate and insert full-time shifts
      const fullTimeResult = await generateFullTimeShifts(context, partTimeResult.shifts, shiftId);
      for (const shift of fullTimeResult.shifts) {
        await txDb.insert(shiftDetails).values({
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] 正社員シフトDB保存完了:", fullTimeResult.shifts.length);

      // Update shift metadata
      const combinedPrompt = `...${partTimeResult.prompt}...${fullTimeResult.prompt}`;
      const combinedResponse = {...};
      
      await txDb.update(shifts)
        .set({
          generatedBy: "ai",
          aiPrompt: combinedPrompt,
          aiResponse: combinedResponse,
        })
        .where(eq(shifts.id, shiftId));
      
      console.log("[AIシフト生成] 完了（プロンプト/レスポンス保存済み）");
    });
  } catch (error: any) {
    console.error("[AIシフト生成] エラー:", error);
    throw error;
  }
}
```

---

## Fix 5: Add Optimistic Locking

### Problem
Concurrent edits by multiple admins can result in lost updates.

### Solution

**Step 1: Add version columns to schema**

Create migration:
```sql
ALTER TABLE shifts ADD COLUMN version INT DEFAULT 1;
ALTER TABLE shiftDetails ADD COLUMN version INT DEFAULT 1;
ALTER TABLE leaveRequests ADD COLUMN version INT DEFAULT 1;
```

**Step 2: Update db.ts**

```typescript
export async function updateShiftWithOptimisticLock(
  id: number, 
  data: Partial<InsertShift>,
  expectedVersion: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.update(shifts)
    .set({ ...data, version: expectedVersion + 1 })
    .where(and(eq(shifts.id, id), eq(shifts.version, expectedVersion)));
  
  if (result.rowCount === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Shift was modified by another user. Please refresh and try again."
    });
  }
  
  return result;
}

export async function updateShiftDetailWithOptimisticLock(
  id: number,
  data: Partial<InsertShiftDetail>,
  expectedVersion: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.update(shiftDetails)
    .set({ ...data, version: expectedVersion + 1 })
    .where(and(eq(shiftDetails.id, id), eq(shiftDetails.version, expectedVersion)));
  
  if (result.rowCount === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Shift detail was modified. Please refresh and try again."
    });
  }
  
  return result;
}
```

**Step 3: Update routers.ts to include version**

```typescript
shifts: router({
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      version: z.number(), // REQUIRED
      name: z.string().optional(),
      status: z.enum([...]).optional(),
      // ... other fields
    }))
    .mutation(async ({ input }) => {
      const { id, version, ...data } = input;
      try {
        return await db.updateShiftWithOptimisticLock(id, data, version);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "CONFLICT") {
          throw error;
        }
        throw error;
      }
    }),
}),

shiftDetails: router({
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      version: z.number(), // REQUIRED
      timeSlotId: z.number().optional(),
      // ... other fields
    }))
    .mutation(async ({ input }) => {
      const { id, version, ...data } = input;
      try {
        return await db.updateShiftDetailWithOptimisticLock(id, data, version);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "CONFLICT") {
          throw error;
        }
        throw error;
      }
    }),
}),
```

---

## Fix 6: Add Server-Side Deadline Enforcement

### Problem
Vacation request deadlines are only enforced on client, allowing API bypasses.

### Solution

**File: server/routers.ts**

```typescript
leaveRequests: router({
  create: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      shiftId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string(),
      leaveType: z.enum(["休", "有休", "時間指定"]).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      isAdditional: z.boolean().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify employee can only create for themselves
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee || (employee.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      // Check deadline if not additional request
      if (!input.isAdditional && input.shiftId) {
        const shift = await db.getShiftById(input.shiftId);
        if (shift && shift.leaveRequestDeadline) {
          if (new Date() > shift.leaveRequestDeadline) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "희望休の申請期限を過ぎています"
            });
          }
        }
      }
      
      // Check additional request deadline if applicable
      if (input.isAdditional && input.shiftId) {
        const shift = await db.getShiftById(input.shiftId);
        if (shift && shift.additionalRequestDeadline) {
          if (new Date() > shift.additionalRequestDeadline) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "追加希望休の申請期限を過ぎています"
            });
          }
        }
      }
      
      return await db.createLeaveRequest({
        ...input,
        requestDate: input.startDate,
        status: "pending",
        submittedAt: new Date(),
      });
    }),
    
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      // ... other fields
    }))
    .mutation(async ({ input, ctx }) => {
      const request = await db.getLeaveRequestById(input.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });
      
      // Verify employee can only update own requests
      const employee = await db.getEmployeeById(request.employeeId);
      if (!employee || (employee.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      // Cannot update approved/rejected requests
      if (request.status !== 'pending') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "提出済みの申請は変更できません"
        });
      }
      
      // Check deadline
      if (request.shiftId) {
        const shift = await db.getShiftById(request.shiftId);
        if (shift && shift.leaveRequestDeadline) {
          if (new Date() > shift.leaveRequestDeadline) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "希望休の申請期限を過ぎています"
            });
          }
        }
      }
      
      const { id, ...data } = input;
      return await db.updateLeaveRequest(id, data);
    }),
}),
```

**Add helper function:**
```typescript
export async function getLeaveRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
```

---

## Fix 7: Add Audit Logging

### Problem
No record of who made what changes, no compliance trail.

### Solution

**File: server/db.ts - Add audit logging helper**

```typescript
export async function logAuditAction(
  actorUserId: number,
  action: string,
  target: string,
  meta?: Record<string, any>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Database not available");
    return;
  }
  
  try {
    await db.insert(auditLogs).values({
      actorUserId,
      action,
      target,
      meta,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[Audit] Failed to log:", error);
    // Don't throw - audit logging should not break the operation
  }
}
```

**File: server/routers.ts - Add logging to mutations**

```typescript
shifts: router({
  create: adminProcedure
    .input(z.object({...}))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createShift({...input, userId: ctx.user.id});
      
      // Log the action
      await db.logAuditAction(
        ctx.user.id,
        "SHIFT_CREATED",
        `shift:${result.insertId}`,
        { year: input.year, month: input.month, name: input.name }
      );
      
      return result;
    }),
    
  confirm: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const shift = await db.getShiftById(input.id);
      const result = await db.updateShift(input.id, {
        status: "confirmed",
        confirmedAt: new Date(),
      });
      
      await db.logAuditAction(
        ctx.user.id,
        "SHIFT_CONFIRMED",
        `shift:${input.id}`,
        { previousStatus: shift?.status }
      );
      
      return result;
    }),
    
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const shift = await db.getShiftById(input.id);
      const result = await db.deleteShift(input.id);
      
      await db.logAuditAction(
        ctx.user.id,
        "SHIFT_DELETED",
        `shift:${input.id}`,
        { year: shift?.year, month: shift?.month, status: shift?.status }
      );
      
      return result;
    }),
    
  generateAI: adminProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const shift = await db.getShiftById(input.shiftId);
      if (!shift) throw new Error("Shift not found");
      
      await generateShiftWithAI({
        shiftId: input.shiftId,
        year: shift.year,
        month: shift.month,
      });
      
      await db.logAuditAction(
        ctx.user.id,
        "SHIFT_AI_GENERATED",
        `shift:${input.shiftId}`,
        { year: shift.year, month: shift.month }
      );
      
      return { success: true };
    }),
}),

leaveRequests: router({
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const request = await db.getLeaveRequestById(input.id);
      const result = await db.updateLeaveRequest(input.id, { status: "approved" });
      
      await db.logAuditAction(
        ctx.user.id,
        "LEAVE_REQUEST_APPROVED",
        `leaveRequest:${input.id}`,
        { employeeId: request?.employeeId, dates: [request?.startDate, request?.endDate] }
      );
      
      return result;
    }),
    
  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const request = await db.getLeaveRequestById(input.id);
      const result = await db.updateLeaveRequest(input.id, { status: "rejected" });
      
      await db.logAuditAction(
        ctx.user.id,
        "LEAVE_REQUEST_REJECTED",
        `leaveRequest:${input.id}`,
        { employeeId: request?.employeeId, dates: [request?.startDate, request?.endDate] }
      );
      
      return result;
    }),
}),

changeProposals: router({
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proposal = await db.getChangeProposalById(input.id);
      // ... approval logic ...
      
      await db.logAuditAction(
        ctx.user.id,
        "CHANGE_PROPOSAL_APPROVED",
        `changeProposal:${input.id}`,
        { 
          employeeId: proposal?.employeeId,
          proposalDate: proposal?.proposalDate,
          currentTimeSlotId: proposal?.currentTimeSlotId,
          proposedTimeSlotId: proposal?.proposedTimeSlotId
        }
      );
      
      return result;
    }),
}),
```

---

## Testing the Fixes

### Test Case 1: Authorization
```typescript
// Should fail - employee trying to call admin endpoint
const emp = await getEmployeeToken('employee-123');
const result = await client.shifts.create.mutate(
  { year: 2025, month: 11, name: "Test" },
  { headers: { Cookie: emp } }
);
// Expected: FORBIDDEN error
```

### Test Case 2: Employee Data Access
```typescript
// Should fail - accessing another employee's data
const emp1 = await getEmployeeToken('employee-1');
const result = await client.leaveRequests.getByEmployee.query(
  { employeeId: 999 }, // Different employee
  { headers: { Cookie: emp1 } }
);
// Expected: FORBIDDEN error
```

### Test Case 3: Optimistic Locking
```typescript
// Should fail - version mismatch
const shift = await db.getShiftById(1);
// Simulate another user updating
await db.updateShift(1, { name: "Updated by other user" });
// Try to update with old version
const result = await client.shifts.update.mutate({
  id: 1,
  version: shift.version, // Old version
  name: "My update"
});
// Expected: CONFLICT error
```

### Test Case 4: Deadline Enforcement
```typescript
// Should fail - after deadline
const shift = await db.getShiftById(1);
// Set deadline to past
await db.updateShift(1, { leaveRequestDeadline: new Date(Date.now() - 86400000) });
const result = await client.leaveRequests.create.mutate({
  employeeId: 5,
  shiftId: 1,
  startDate: "2025-11-15",
  endDate: "2025-11-15",
});
// Expected: FORBIDDEN error about deadline
```

---

## Implementation Priority

1. **Week 1:**
   - Fix #1: Admin role-based access control
   - Fix #2: Prevent employee self-approval
   - Fix #3: Employee data access control

2. **Week 2:**
   - Fix #6: Server-side deadline enforcement
   - Fix #7: Audit logging
   - Fix #4: Transactional support

3. **Week 3:**
   - Fix #5: Optimistic locking
   - Integration testing
   - Performance testing

**Total estimated effort: 15-20 developer days**
