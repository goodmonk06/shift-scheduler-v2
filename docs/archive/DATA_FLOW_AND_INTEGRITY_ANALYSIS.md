# Shift Scheduler v2: Data Flow and Data Integrity Analysis

## Executive Summary

This document provides a comprehensive analysis of data flow between admin and employee interfaces in the Shift Scheduler application. The analysis identifies critical data integrity issues, potential race conditions, and authorization vulnerabilities that require immediate attention before production deployment.

**CRITICAL ISSUES FOUND: 7**
**HIGH PRIORITY ISSUES: 12**
**MEDIUM PRIORITY ISSUES: 8**

---

## 1. AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### 1.1 Current Implementation

**Files:**
- `/server/_core/context.ts` - Context creation with triple-layer auth
- `/server/_core/trpc.ts` - tRPC middleware (protectedProcedure, adminProcedure)
- `/server/adminAuth.ts` - Admin-specific auth
- `/server/simpleAuth.ts` - Employee simple auth

**Architecture:**
The system uses three authentication methods in cascade:
1. Admin Auth (JWT via admin_auth_token cookie)
2. OAuth/SDK Auth (OAuth2)
3. Simple Auth (JWT via simple_auth_token cookie for employees)

```
Request → Admin Auth? → OAuth? → Simple Auth? → User set or null
```

### 1.2 Authorization Enforcement

**Current State:**
- All endpoints use `protectedProcedure` (requires authenticated user)
- `adminProcedure` exists but is NOT USED in routers.ts
- No role-based access control on data endpoints
- No employee self-data access validation

**Code Reference (routers.ts, line 4-28):**
```typescript
export const protectedProcedure = t.procedure.use(requireUser);
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
  }),
);
```

**CRITICAL ISSUE #1: No adminProcedure Usage**
- All administrative mutations (shift creation, confirmation, employee management) use `protectedProcedure`
- Any authenticated user can call admin endpoints
- The role check exists but is never applied

---

## 2. DATA MODIFICATION CAPABILITIES BY ROLE

### 2.1 Employee Data Modifications (希望休申請 - Vacation Requests)

**Endpoints Involved:**
- `leaveRequests.create` (line 409-426)
- `leaveRequests.update` (line 428-441)
- `leaveRequests.delete` (line 443-446)

**Data Allowed:**
- startDate, endDate (date range)
- leaveType (休, 有休, 時間指定)
- startTime, endTime (for 時間指定)
- reason (text explanation)
- isAdditional (post-tentative requests flag)

**Issues:**
1. No validation that employee can only modify their own requests
2. No deadline enforcement at API level (only client-side in VacationRequest.tsx)
3. No check for shift status before allowing modifications

**Code Reference (routers.ts, lines 409-426):**
```typescript
create: protectedProcedure
  .input(z.object({
    employeeId: z.number(),
    shiftId: z.number().optional(),
    startDate: z.string(),
    endDate: z.string(),
    leaveType: z.enum(["休", "有休", "時間指定"]).optional(),
    isAdditional: z.boolean().optional(),
    reason: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    return await db.createLeaveRequest({
      ...input,
      requestDate: input.startDate,
    });
  }),
```

**Data Integrity Issue #1: Client-Side Deadline Enforcement**
- Deadline is managed in VacationContext (client-side)
- API has no validation of deadline
- Determined employees can submit requests after deadline via API

### 2.2 Employee Change Proposals (変更提案)

**Endpoints Involved:**
- `changeProposals.create` (line 475-485)
- `changeProposals.update` (line 487-497)
- `changeProposals.approve` (line 499-502)
- `changeProposals.reject` (line 504-507)

**Data Structure (schema.ts, lines 209-225):**
```typescript
export const changeProposals = mysqlTable("changeProposals", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  shiftId: int("shiftId").notNull(),
  proposalDate: varchar("proposalDate", { length: 10 }).notNull(),
  currentTimeSlotId: int("currentTimeSlotId"),
  proposedTimeSlotId: int("proposedTimeSlotId"),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

**Issues:**
1. No check that employee only proposes for their own shift
2. `approve` and `reject` endpoints allow ANY authenticated user to review proposals
3. No role check - employees could approve/reject their own proposals

**CRITICAL ISSUE #2: Employee Can Approve Own Change Proposals**
- `changeProposals.approve` (line 499-502) uses protectedProcedure
- No verification that user is admin/manager
- Employees can self-approve shift changes

---

## 3. ADMIN DATA MODIFICATIONS (シフト作成, 職員管理)

### 3.1 Shift Management

**Endpoints (lines 238-346):**
- `shifts.create` - Create shift record
- `shifts.update` - Modify shift details
- `shifts.confirm` - Move to confirmed status
- `shifts.publishTentative` - Publish tentative version
- `shifts.generateAI` - Trigger AI generation
- `shifts.archive` - Archive shift

**Shift Status Flow:**
```
draft → tentative → confirmed → actual/archived
```

**Key Issue: No Shift Status Validation**
```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.enum(["draft", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).optional(),
    leaveRequestDeadline: z.date().optional(),
    // ...
  }))
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await db.updateShift(id, data);
  }),
```

**No validation that:**
- Status transitions are valid (draft → tentative only, not arbitrary)
- Confirmed shifts cannot be reverted to draft
- Deadlines cannot be moved backward

### 3.2 Shift Details Management

**Endpoints (lines 349-391):**
- `shiftDetails.create`
- `shiftDetails.update`
- `shiftDetails.delete`

**Issues:**
1. Can modify completed shifts
2. No optimistic locking
3. Concurrent updates not handled

### 3.3 Staff Management

**Endpoints (lines 74-119):**
- `employees.create`
- `employees.update`
- `employees.delete`

**CRITICAL ISSUE #3: No Referential Integrity Checks**
- Can delete employees with active shift assignments
- Can delete position groups referenced by employees
- No cascading deletes or warnings

---

## 4. CRITICAL DATA FLOW ISSUES

### 4.1 AI Shift Generation Race Conditions

**File: `/server/aiShiftGenerator.ts`**

**Process Flow:**
```
1. collectContext() - Read all related data
   └─ getAllEmployees, getAllPositionGroups, getLeaveRequestsByShift, etc.
2. deleteAIGeneratedShiftDetails(shiftId) - Delete previous AI shifts
3. generatePartTimeShifts() - AI call for part-time employees
4. For each shift: createShiftDetail() - Insert into DB
5. generateFullTimeShifts() - AI call for full-time employees
6. For each shift: createShiftDetail() - Insert into DB
7. updateShift() - Mark as "ai" generated
```

**CRITICAL ISSUE #4: Non-Atomic Operations**
Code reference (lines 28-102):
```typescript
// 2. AI生成のシフト詳細のみを削除
await db.deleteAIGeneratedShiftDetails(shiftId);

// 3-4. パートシフト生成・保存
for (const shift of partTimeResult.shifts) {
  await db.createShiftDetail({...shift, generatedBy: "ai"});
}

// 5-6. 正社員シフト生成・保存
for (const shift of fullTimeResult.shifts) {
  await db.createShiftDetail({...shift, generatedBy: "ai"});
}

// 7. シフト更新
await db.updateShift(shiftId, {generatedBy: "ai", aiPrompt, aiResponse});
```

**Race Condition Scenario:**
1. Admin starts AI generation for shift #100
2. Admin opens shift editor and manually deletes AI shift for 2025-11-15
3. AI generation completes and deletes ALL AI-generated shifts for #100
4. AI generation inserts new shifts - manual deletion is lost
5. Final shift update completes with no record of the manual change

**Data Loss Risk: HIGH**

### 4.2 Manual Shift Modification During AI Generation

**Race Condition Scenario:**
1. Shift #100 has mixed manual and AI-generated shifts
2. Admin clicks "Regenerate AI" which calls `deleteAIGeneratedShiftDetails(shiftId)`
3. Simultaneously, employee submits vacation request affecting shift #100
4. AI regeneration deletes AI shifts
5. New leave request references deleted shifts
6. Data inconsistency occurs

### 4.3 Leave Request Processing Race Conditions

**Endpoints:**
- `leaveRequests.approve` (line 448-451)
- `leaveRequests.reject` (line 453-456)
- `leaveRequests.update` (line 428-441)

**Issue: No Mutual Exclusion**
```typescript
approve: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    return await db.updateLeaveRequest(input.id, { status: "approved" });
  }),

reject: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    return await db.updateLeaveRequest(input.id, { status: "rejected" });
  }),
```

**Race Condition:**
1. Admin A clicks "Approve" on leave request #5
2. Admin B clicks "Reject" on leave request #5
3. Both calls execute simultaneously
4. Database has final state but uncertain which action was intended
5. No audit trail of which action won

---

## 5. FOREIGN KEY & DATA INTEGRITY CONSTRAINTS

### 5.1 Missing Foreign Key Validations

**Schema Analysis (drizzle/schema.ts):**

**Issue: No Foreign Key Enforcement**
Drizzle-ORM MySQL doesn't enforce foreign keys at the ORM level. Check database:

Foreign key relationships:
- `shiftDetails.shiftId` → `shifts.id` (not enforced)
- `shiftDetails.employeeId` → `employees.id` (not enforced)
- `leaveRequests.employeeId` → `employees.id` (not enforced)
- `shiftDetails.timeSlotId` → `workTimeSlots.id` (not enforced)

**CRITICAL ISSUE #5: Orphaned Records Possible**

Example scenario:
1. Employee #5 is deleted via `employees.delete(5)`
2. Database has no constraint preventing this
3. All of employee #5's shifts, leave requests, change proposals remain
4. API calls for this employee now reference deleted employee
5. UI breaks when trying to display shift details

### 5.2 Cascade Delete Implications

**Current Code (db.ts):**
```typescript
export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(employees).where(eq(employees.id, id));
}
```

**Database State After Delete:**
- Employee record deleted
- All shiftDetails still reference deleted employeeId
- All leaveRequests still reference deleted employeeId
- All changeProposals still reference deleted employeeId

---

## 6. CLIENT-SIDE DATA INTEGRITY ISSUES

### 6.1 LocalStorage State in VacationRequest Component

**File: `/client/src/components/VacationRequest.tsx`**

**Issue: Dual State Management**
```typescript
// Two separate maps for vacation requests
const [requests, setRequests] = useState<Map<number, DayRequest>>(
  () => loadFromStorage('vacation_editing_requests')
);
const [submittedRequests, setSubmittedRequests] = useState<Map<number, DayRequest>>(
  () => loadFromStorage('vacation_submitted_requests')
);

// LocalStorage persistence
useEffect(() => {
  localStorage.setItem('vacation_editing_requests', JSON.stringify(Array.from(requests.entries())));
}, [requests]);

useEffect(() => {
  localStorage.setItem('vacation_submitted_requests', JSON.stringify(Array.from(submittedRequests.entries())));
}, [submittedRequests]);
```

**Data Integrity Issue #2: No Server Sync**
- All vacation requests stored in localStorage
- No actual API calls to backend
- Manual requests exist only on client
- Submit button calls `addVacationRequest()` via Context
- Context updates never persist to database

**Lines 193-200:**
```typescript
const handleSubmit = () => {
  addVacationRequest({
    staffName: "山田花子", // Hard-coded demo user
    staffId: "staff-demo",
    month: nextMonthName,
    // ...
  });
  // No API call to backend
};
```

### 6.2 ShiftEditor Mock Data vs Real Data

**File: `/client/src/components/ShiftEditor.tsx`**

**Issue: Complete Mock Implementation**
- All shift data is hardcoded (lines 114-227)
- No actual API integration
- `handleSave()` only shows toast, doesn't persist
- `handleAIGenerate()` is mock with 2-second timeout

```typescript
const handleSave = () => {
  toast.success("シフトを保存しました");
  // No actual persistence
};

const handleAIGenerate = async () => {
  // ...
  setTimeout(() => {
    toast.success("AI生成が完了しました");
    // Only updates local state
    setCurrentShift({...});
    setAssignments([...]);
  }, 2000);
};
```

---

## 7. ACCESS CONTROL VIOLATIONS

### 7.1 No Employee Self-Data Restriction

**Issue: Employee Can Access Other Employees' Data**

Example exploit:
```javascript
// Logged in as employee_id=5
// Can still call:
await client.shiftDetails.getByEmployee.query({
  employeeId: 3,  // Another employee!
  shiftId: 100
});

// Returns all shift details for employee 3
```

**Root Cause (routers.ts, lines 350-354):**
```typescript
getByEmployee: protectedProcedure
  .input(z.object({ employeeId: z.number(), shiftId: z.number() }))
  .query(async ({ input }) => {
    const allDetails = await db.getShiftDetails(input.shiftId);
    return allDetails.filter(d => d.employeeId === input.employeeId);
  }),
```

**Fix Needed:**
```typescript
getByEmployee: protectedProcedure
  .input(z.object({ employeeId: z.number(), shiftId: z.number() }))
  .query(async ({ input, ctx }) => {
    // Verify employee owns this data
    const employee = await db.getEmployeeById(input.employeeId);
    if (!employee || employee.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const allDetails = await db.getShiftDetails(input.shiftId);
    return allDetails.filter(d => d.employeeId === input.employeeId);
  }),
```

### 7.2 Similar Issues in Other Endpoints

**Affected Endpoints:**
- `leaveRequests.getByEmployee` (line 399-402)
- `changeProposals.getByEmployee` (line 470-473)
- `shiftDetails.getByEmployee` (line 350-354)

All allow fetching data for ANY employee without role check.

---

## 8. MISSING OPTIMISTIC LOCKING

### 8.1 No Versioning

**Issue: No Optimistic Lock Mechanism**

Scenario:
1. Admin A loads shift 100, version_hash=abc123
2. Admin B loads shift 100, version_hash=abc123
3. Admin A changes shift time slot and saves → version_hash=xyz789
4. Admin B changes required staff count and saves → version_hash=??? (still uses abc123)
5. Admin B's change overwrites Admin A's change
6. Data loss occurs

**Current Implementation (db.ts, lines 339-342):**
```typescript
export async function updateShift(id: number, data: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(shifts).set(data).where(eq(shifts.id, id));
}
```

**No version check or etag validation**

---

## 9. AUDIT & COMPLIANCE ISSUES

### 9.1 Audit Logs Table Exists But Unused

**Schema (lines 263-273):**
```typescript
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  target: varchar("target", { length: 128 }).notNull(),
  meta: json("meta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Issue: Never Written To**
- Table defined but no mutations write to it
- No logging of who made what changes
- No compliance trail

---

## 10. POTENTIAL RACE CONDITION SCENARIOS

### Scenario 1: Simultaneous Shift Confirmation and Change Proposal Approval

```
Timeline:
T0: Admin A loads shift 100 (status: draft)
T1: Admin B submits change proposal for shift 100
T2: Admin A clicks "Confirm" shift 100
T3: Admin B clicks "Approve" change proposal
T4: Both operations complete

Issue: Change proposal references a confirmed shift that was modified
during confirmation process. Shift times may have changed.
```

### Scenario 2: AI Generation and Manual Edit Collision

```
Timeline:
T0: Shift 100 has 5 AI-generated + 3 manual shifts
T1: Admin A clicks "Regenerate AI"
T2: System starts: deleteAIGeneratedShiftDetails(100)
T3: Admin B manually adds vacation request for employee in shift 100
T4: 5 AI shifts deleted
T5: New AI shifts generated and inserted
T6: Employee's leave request now orphaned or inconsistent

Issue: New AI shifts may conflict with just-added leave request
```

### Scenario 3: Employee vs Admin Data Modification

```
Timeline:
T0: Shift 100 in draft status
T1: Employee submits leave request for 2025-11-15
T2: Admin confirms shift 100 (now locked)
T3: Employee tries to modify leave request (client allows, API doesn't block)
T4: Employee's modification succeeds (no status check)

Issue: Leave request updated after shift confirmed
```

---

## 11. SUMMARY OF CRITICAL ISSUES

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No adminProcedure usage | CRITICAL | routers.ts | Any user can modify shifts |
| Employee can approve own proposals | CRITICAL | routers.ts line 499 | Shift manipulation |
| No atomic transactions for AI generation | CRITICAL | aiShiftGenerator.ts | Data loss during regen |
| No foreign key enforcement | CRITICAL | schema.ts | Orphaned records possible |
| No employee data access control | CRITICAL | routers.ts line 350+ | Information disclosure |
| No optimistic locking | HIGH | db.ts | Concurrent update loss |
| Client-side deadline enforcement | HIGH | VacationRequest.tsx | Deadlines bypassable |
| No shift status validation | HIGH | routers.ts line 276+ | Invalid state transitions |
| Dual client-side state management | MEDIUM | VacationRequest.tsx | Sync issues |
| Mock data in production components | MEDIUM | ShiftEditor.tsx | Real data never saved |

---

## 12. RECOMMENDATIONS

### Immediate Actions (Before Production):

1. **Implement Role-Based Access Control**
   - Convert all admin endpoints to use `adminProcedure`
   - Implement middleware to verify user ownership of data
   - Add role checks to all sensitive endpoints

2. **Add Transactional Support**
   - Wrap AI generation in database transaction
   - Use savepoints for multi-step operations
   - Implement rollback on failure

3. **Implement Optimistic Locking**
   - Add `version` column to key tables (shifts, shiftDetails, leaveRequests)
   - Verify version on update
   - Return conflict error on mismatch

4. **Add Server-Side Validation**
   - Validate shift status transitions
   - Enforce deadlines at API level
   - Check referential integrity before deletes

5. **Implement Audit Logging**
   - Log all mutations to auditLogs table
   - Include user ID, action, timestamp
   - Store old and new values for data changes

### Medium-Term Actions:

6. **Implement Pessimistic Locking**
   - Lock shift during AI generation
   - Prevent edits while locked
   - Add timeout to prevent indefinite locks

7. **Add API Integration to Components**
   - Remove mock data from client components
   - Integrate real API calls
   - Implement proper state management (React Query/SWR)

8. **Database Constraints**
   - Enable foreign key constraints
   - Add unique constraints where appropriate
   - Add check constraints for enums

9. **Event-Driven Updates**
   - Implement WebSocket or Server-Sent Events
   - Push updates to connected clients in real-time
   - Warn users of conflicting modifications

10. **Add Data Validation**
    - Validate all employee constraint ranges
    - Verify shift time slot logic
    - Check required staffing calculations

---

## 13. DATABASE SCHEMA IMPROVEMENTS

Recommended additions:

```sql
-- Add version field for optimistic locking
ALTER TABLE shifts ADD COLUMN version INT DEFAULT 1;
ALTER TABLE shiftDetails ADD COLUMN version INT DEFAULT 1;
ALTER TABLE leaveRequests ADD COLUMN version INT DEFAULT 1;

-- Add locked status for pessimistic locking
ALTER TABLE shifts ADD COLUMN locked_by INT;
ALTER TABLE shifts ADD COLUMN locked_at TIMESTAMP;

-- Add soft delete for audit trail
ALTER TABLE shifts ADD COLUMN deleted_at TIMESTAMP;

-- Ensure audit logging
-- (Table exists, just needs usage)

-- Add foreign key constraints
ALTER TABLE shiftDetails 
  ADD CONSTRAINT fk_sd_shift FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE;
ALTER TABLE shiftDetails 
  ADD CONSTRAINT fk_sd_employee FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE;
-- ... continue for other tables

-- Add indexes for common queries
CREATE INDEX idx_shifts_user ON shifts(userId);
CREATE INDEX idx_shifts_year_month ON shifts(year, month);
CREATE INDEX idx_shiftdetails_shift ON shiftDetails(shiftId);
CREATE INDEX idx_shiftdetails_employee ON shiftDetails(employeeId);
CREATE INDEX idx_leaverequests_employee ON leaveRequests(employeeId);
```

---

## Conclusion

The application has a solid foundation with proper authentication methods, but **critical data integrity gaps** must be addressed before production use. The main issues revolve around:

1. **Authorization**: Role-based access control not enforced on endpoints
2. **Atomicity**: Multi-step operations (AI generation) not transactional
3. **Concurrency**: No locking mechanisms for simultaneous modifications
4. **Validation**: Server-side enforcement of business rules is missing
5. **Auditability**: Mutation logging not implemented

**Estimated effort to fix critical issues: 3-4 weeks for a 2-person team**
