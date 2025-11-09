# Critical Data Integrity Issues - Quick Reference

## Overview

Found 7 CRITICAL and 12 HIGH severity issues. **DO NOT DEPLOY** without fixing at least the critical issues.

## Critical Issues (Must Fix Before Production)

### 1. CRITICAL: No Role-Based Access Control on Admin Endpoints
- **Issue**: All admin endpoints (shift creation, employee management, etc.) use `protectedProcedure` instead of `adminProcedure`
- **Risk**: Any authenticated user (including employees) can call admin functions
- **Fix**: Replace `protectedProcedure` with `adminProcedure` on ALL admin operations
- **Files**: `server/routers.ts` (lines 45+, 87+, 127+, 189+, 225+, 251+, 290+, 316+, 361+, 387+)
- **Effort**: 2-4 hours

### 2. CRITICAL: Employee Can Approve Own Change Proposals
- **Issue**: `changeProposals.approve` and `.reject` use `protectedProcedure` - no admin check
- **Risk**: Employees can self-approve shift changes to their advantage
- **Fix**: Change to `adminProcedure` and apply the proposed time slot change atomically
- **Files**: `server/routers.ts` (lines 499-507)
- **Effort**: 2-3 hours

### 3. CRITICAL: No Employee Data Access Control
- **Issue**: Employees can query data for OTHER employees (leave requests, shift details, proposals)
- **Risk**: Information disclosure; employees can see each other's private data
- **Fix**: Add `ctx.user.id` verification in all `getByEmployee` queries
- **Files**: `server/routers.ts` (lines 350, 399, 470)
- **Effort**: 2-3 hours

### 4. CRITICAL: Non-Atomic AI Shift Generation
- **Issue**: AI generation has 7 separate steps with no transaction wrapper
- **Risk**: If any step fails or concurrent modification occurs, data is lost
- **Example**: Delete succeeds, inserts fail → manual shifts lost forever
- **Fix**: Wrap entire generation in database transaction with rollback
- **Files**: `server/aiShiftGenerator.ts` (lines 28-102)
- **Effort**: 3-4 hours

### 5. CRITICAL: No Foreign Key Enforcement
- **Issue**: Can delete employees while they have active shifts/proposals
- **Risk**: Orphaned records; UI breaks; data inconsistency
- **Example**: Delete employee #5 → all their shifts/proposals become invalid
- **Fix**: Enable MySQL foreign key constraints with CASCADE DELETE
- **Files**: Database schema (needs migration)
- **Effort**: 2-3 hours

### 6. CRITICAL: Client-Side Deadline Enforcement
- **Issue**: Vacation request deadlines only checked in VacationRequest.tsx
- **Risk**: Savvy users can submit requests after deadline via API
- **Fix**: Add server-side deadline check in `leaveRequests.create`
- **Files**: `server/routers.ts` (lines 409-426)
- **Effort**: 1-2 hours

### 7. CRITICAL: No Optimistic Locking
- **Issue**: Concurrent admin edits can result in lost updates (last write wins)
- **Risk**: Multiple admins editing same shift → one person's changes disappear
- **Example**: Admin A saves shift name, Admin B saves staff count → A's change lost
- **Fix**: Add `version` column to shifts/shiftDetails, verify on update
- **Files**: `server/db.ts`, `server/routers.ts`
- **Effort**: 4-5 hours

---

## High Priority Issues (Fix ASAP)

### 8. HIGH: No Shift Status Validation
- **Issue**: Can transition from any status to any other (draft → confirmed, confirmed → draft, etc.)
- **Risk**: Breaks business logic; confirmed shifts become modifiable
- **Fix**: Add status transition validation (draft→tentative→confirmed only)
- **Files**: `server/routers.ts` (lines 276-288)
- **Effort**: 2-3 hours

### 9. HIGH: Race Condition in Leave Request Processing
- **Issue**: Multiple simultaneous approve/reject operations on same request
- **Risk**: Uncertain final state; audit trail confusion
- **Fix**: Add status check before update (can only process "pending" requests)
- **Files**: `server/routers.ts` (lines 448-456)
- **Effort**: 1 hour

### 10. HIGH: No Referential Integrity Checks
- **Issue**: Can delete position groups while employees reference them
- **Risk**: Invalid employee configurations; constraint violations
- **Fix**: Check for references before delete, return error
- **Files**: `server/routers.ts` (lines 65-69)
- **Effort**: 2 hours

### 11. HIGH: Shift Status Change During AI Generation
- **Issue**: No locking during AI generation - admins can edit while generation in progress
- **Risk**: AI deletes manual changes; manual edits are overwritten by AI
- **Fix**: Lock shift during AI generation, prevent other edits
- **Files**: `server/aiShiftGenerator.ts`, `server/db.ts`
- **Effort**: 3-4 hours

### 12-19: Other High Priority Issues...

---

## Medium Priority Issues (Fix in Phase 2)

### Multiple: Mock Data in Components
- **Issue**: VacationRequest.tsx and ShiftEditor.tsx store data in localStorage, never sync with backend
- **Risk**: Employees think data is saved, but it's only client-side
- **Fix**: Integrate with real API endpoints, remove mock data
- **Files**: `client/src/components/VacationRequest.tsx`, `client/src/components/ShiftEditor.tsx`
- **Effort**: 8-10 hours

### Multiple: No Audit Logging
- **Issue**: auditLogs table exists but is never written to
- **Risk**: No compliance trail; can't track who made what changes
- **Fix**: Add `logAuditAction()` calls to all mutations
- **Files**: `server/db.ts`, `server/routers.ts`
- **Effort**: 4-6 hours

---

## Fix Implementation Order

### Phase 1: Critical (Week 1) - 15-20 hours
1. Implement `adminProcedure` on all admin endpoints (2-4h)
2. Fix employee data access control (2-3h)
3. Fix AI generation transaction (3-4h)
4. Add optimistic locking (4-5h)

### Phase 2: High Priority (Week 2) - 10-15 hours
5. Add deadline enforcement (1-2h)
6. Add shift status validation (2-3h)
7. Add referential integrity checks (2h)
8. Fix approval race conditions (1h)
9. Add generation locking (3-4h)

### Phase 3: Medium Priority (Week 3) - 12-16 hours
10. Integrate client components with API (8-10h)
11. Add audit logging (4-6h)

**Total: 37-51 developer hours (1-2 person weeks)**

---

## Pre-Production Checklist

Before deploying to production:

- [ ] Run all fixes through code review
- [ ] Add test cases for each fix
- [ ] Run database migrations (foreign keys, version columns)
- [ ] Test concurrent scenarios (multiple admin/employee edits)
- [ ] Verify audit logs are being recorded
- [ ] Check deadline enforcement with past/future dates
- [ ] Test AI generation with manual edits occurring
- [ ] Load test with multiple simultaneous requests
- [ ] Review authentication/authorization one more time
- [ ] Enable MySQL foreign key constraints

---

## Security Impact Assessment

| Issue | Confidentiality | Integrity | Availability |
|-------|-----------------|-----------|--------------|
| No RBAC | HIGH | HIGH | MEDIUM |
| Self-approval | MEDIUM | CRITICAL | MEDIUM |
| Data access | CRITICAL | HIGH | LOW |
| Non-atomic generation | LOW | CRITICAL | HIGH |
| No FK enforcement | MEDIUM | HIGH | MEDIUM |
| Client deadline | LOW | HIGH | LOW |
| No locking | LOW | CRITICAL | MEDIUM |

**Overall Risk: CRITICAL - DO NOT USE IN PRODUCTION**

---

## Files Requiring Changes

1. `server/routers.ts` - Main router with all endpoints (HIGH impact)
2. `server/db.ts` - Database functions (HIGH impact)
3. `server/aiShiftGenerator.ts` - AI generation logic (HIGH impact)
4. `drizzle/schema.ts` - Database schema (MEDIUM impact)
5. Database migrations - Foreign keys, version columns (MEDIUM impact)
6. `client/src/components/VacationRequest.tsx` - Mock data removal (MEDIUM impact)
7. `client/src/components/ShiftEditor.tsx` - Mock data removal (MEDIUM impact)

---

For detailed code examples and fixes, see: `DATA_INTEGRITY_FIXES.md`

For complete analysis, see: `DATA_FLOW_AND_INTEGRITY_ANALYSIS.md`
