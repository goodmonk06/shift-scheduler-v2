import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { generateShiftWithAI } from "./aiShiftGenerator";
import { generateShiftPDF } from "./pdfGenerator";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear OAuth session cookie
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Clear Simple Auth cookie (employee)
      ctx.res.clearCookie("simple_auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: -1,
        path: "/",
      });
      // Clear Admin Auth cookie
      ctx.res.clearCookie("admin_auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: -1,
        path: "/",
      });
      return {
        success: true,
      } as const;
    }),
  }),

  // Position Groups
  positionGroups: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPositionGroups();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        employmentType: z.enum(["fulltime", "parttime"]),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPositionGroup(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        employmentType: z.enum(["fulltime", "parttime"]).optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePositionGroup(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletePositionGroup(input.id);
      }),
  }),

  // Employees
  employees: router({
    getByUserId: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeeByUserId(input.userId);
      }),
    list: protectedProcedure.query(async () => {
      return await db.getAllEmployees();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeeById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        employeeId: z.string().optional(), // 自動生成される
        email: z.string().optional(),
        positionGroupId: z.number(),
        skillLevel: z.number().optional(),
        canWorkNightShift: z.boolean().optional(),
        workableDays: z.array(z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })).optional(),
        additionalConstraints: z.string().optional(),
        displayOrder: z.number().optional(),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEmployee(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        employeeId: z.string().optional(),
        positionGroupId: z.number().optional(),
        skillLevel: z.number().optional(),
        canWorkNightShift: z.boolean().optional(),
        workableDays: z.array(z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })).optional(),
        additionalConstraints: z.string().optional(),
        displayOrder: z.number().optional(),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateEmployee(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEmployee(input.id);
      }),
  }),

  // Work Time Slots
  workTimeSlots: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkTimeSlots();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        displayLabel: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        isNightShift: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createWorkTimeSlot(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        displayLabel: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        isNightShift: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateWorkTimeSlot(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteWorkTimeSlot(input.id);
      }),
  }),

  // Employee Constraints
  employeeConstraints: router({
    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeeConstraints(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        constraintType: z.enum(["available_day", "available_time", "max_consecutive_days", "max_weekly_hours"]),
        dayOfWeek: z.number().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        maxValue: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEmployeeConstraint(input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEmployeeConstraint(input.id);
      }),
  }),

  // Workplace Rules
  workplaceRules: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkplaceRules();
    }),
    create: protectedProcedure
      .input(z.object({
        ruleType: z.enum(["min_rest_days", "night_shift_quota", "post_night_shift_rest", "required_staff_pattern", "max_consecutive_days", "fulltime_required_hours"]),
        employmentType: z.enum(["fulltime", "parttime", "all"]),
        ruleValue: z.any(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createWorkplaceRule(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        ruleType: z.enum(["min_rest_days", "night_shift_quota", "post_night_shift_rest", "required_staff_pattern", "max_consecutive_days", "fulltime_required_hours"]).optional(),
        employmentType: z.enum(["fulltime", "parttime", "all"]).optional(),
        ruleValue: z.any().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateWorkplaceRule(id, data);
      }),
    upsert: protectedProcedure
      .input(z.object({
        rules: z.array(z.object({
          ruleType: z.enum(["min_rest_days", "night_shift_quota", "post_night_shift_rest", "required_staff_pattern", "max_consecutive_days", "fulltime_required_hours"]),
          employmentType: z.enum(["fulltime", "parttime", "all"]),
          ruleValue: z.any(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertWorkplaceRules(input.rules);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteWorkplaceRule(input.id);
      }),
  }),

  // Required Staffing
  requiredStaffing: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllRequiredStaffing();
    }),
    upsert: protectedProcedure
      .input(z.object({
        dayOfWeek: z.number(),
        hour: z.number(),
        requiredCount: z.number(),
        staffingDetails: z.any().optional(), // JSON data (role groups, office staff)
      }))
      .mutation(async ({ input }) => {
        return await db.upsertRequiredStaffing(input);
      }),
  }),

  // Shifts
  shifts: router({
    getCurrentMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => {
        return await db.getShiftByYearMonth(input.year, input.month);
      }),
    list: protectedProcedure.query(async () => {
      return await db.getAllShifts();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getShiftById(input.id);
      }),
    create: publicProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        name: z.string(),
        status: z.enum(["draft", "ai_generated", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).optional(),
        generatedBy: z.enum(["manual", "ai"]).optional(),
        parentShiftId: z.number().optional(), // 親シフトID
        leaveRequestDeadline: z.string().optional(), // ISO文字列として受け取る
        additionalRequestDeadline: z.string().optional(), // ISO文字列として受け取る
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createShift({
          ...input,
          // ISO文字列をDateに変換
          leaveRequestDeadline: input.leaveRequestDeadline ? new Date(input.leaveRequestDeadline) : undefined,
          additionalRequestDeadline: input.additionalRequestDeadline ? new Date(input.additionalRequestDeadline) : undefined,
          userId: ctx.user?.id || null, // nullを許容（外部キー制約エラーを回避）
        });
      }),
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateShift(input.id, {
          status: "archived",
          isArchived: true,
          archivedAt: new Date()
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["draft", "ai_generated", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).optional(),
        parentShiftId: z.number().optional(), // 親シフトID
        leaveRequestDeadline: z.string().optional(), // ISO文字列
        additionalRequestDeadline: z.string().optional(), // ISO文字列
        tentativePublishedAt: z.string().optional(), // ISO文字列
        confirmedAt: z.string().optional(), // ISO文字列
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        // ISO文字列をDateに変換
        const convertedData = {
          ...data,
          leaveRequestDeadline: data.leaveRequestDeadline ? new Date(data.leaveRequestDeadline) : undefined,
          additionalRequestDeadline: data.additionalRequestDeadline ? new Date(data.additionalRequestDeadline) : undefined,
          tentativePublishedAt: data.tentativePublishedAt ? new Date(data.tentativePublishedAt) : undefined,
          confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : undefined,
        };

        // ステータス変更がある場合、遷移ルールを検証
        if (convertedData.status) {
          const currentShift = await db.getShiftById(id);
          if (!currentShift) {
            throw new Error("Shift not found");
          }

          // ステータス遷移ルール
          const allowedTransitions: Record<string, string[]> = {
            'draft': ['ai_generated'], // AI生成へ
            'ai_generated': ['tentative'], // 仮確定へ
            'tentative': ['tentative_revised', 'confirmed'],
            'tentative_revised': ['confirmed'],
            'confirmed': ['actual'],
            'actual': ['archived'],
            'archived': [], // 変更不可
          };

          const currentStatus = currentShift.status;
          const newStatus = convertedData.status;

          // 同じステータスへの更新は許可
          if (currentStatus !== newStatus) {
            const allowed = allowedTransitions[currentStatus] || [];
            if (!allowed.includes(newStatus)) {
              throw new Error(
                `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
                `Allowed transitions from ${currentStatus}: ${allowed.join(', ') || 'none'}`
              );
            }
          }
        }

        return await db.updateShift(id, convertedData);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteShift(input.id);
      }),
    publishTentative: protectedProcedure
      .input(z.object({
        id: z.number(),
        additionalRequestDeadline: z.string().optional(), // ISO文字列
      }))
      .mutation(async ({ input }) => {
        const { id, additionalRequestDeadline } = input;
        return await db.updateShift(id, {
          status: "tentative",
          tentativePublishedAt: new Date(),
          additionalRequestDeadline: additionalRequestDeadline ? new Date(additionalRequestDeadline) : undefined,
        });
      }),
    confirm: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateShift(input.id, {
          status: "confirmed",
          confirmedAt: new Date(),
        });
      }),
    generateAI: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        prompt: z.string().optional(), // Optional custom prompt for AI
      }))
      .mutation(async ({ input, ctx }) => {
        const draftShift = await db.getShiftById(input.shiftId);
        if (!draftShift) throw new Error("Shift not found");

        // Verify the source shift is in draft status
        if (draftShift.status !== "draft") {
          throw new Error("AI generation can only be run on draft shifts");
        }

        // Create a new shift record with ai_generated status
        const aiShift = await db.createShift({
          year: draftShift.year,
          month: draftShift.month,
          name: `${draftShift.name} (AI生成)`,
          status: "ai_generated",
          generatedBy: "ai",
          parentShiftId: draftShift.id,
          leaveRequestDeadline: draftShift.leaveRequestDeadline,
          additionalRequestDeadline: draftShift.additionalRequestDeadline,
          userId: ctx.user?.id || null,
        });

        // Run AI generation on the new shift
        await generateShiftWithAI({
          shiftId: aiShift.id,
          year: aiShift.year,
          month: aiShift.month,
        });

        return {
          success: true,
          newShiftId: aiShift.id,
        };
      }),
    transitionPhase: protectedProcedure
      .input(z.object({
        sourceShiftId: z.number(),
        targetStatus: z.enum(["tentative", "tentative_revised", "confirmed", "actual"]),
        name: z.string().optional(), // Custom name for the new phase
      }))
      .mutation(async ({ input, ctx }) => {
        const sourceShift = await db.getShiftById(input.sourceShiftId);
        if (!sourceShift) throw new Error("Source shift not found");

        // Validate status transition
        const allowedTransitions: Record<string, string[]> = {
          'ai_generated': ['tentative'],
          'tentative': ['tentative_revised', 'confirmed'],
          'tentative_revised': ['confirmed'],
          'confirmed': ['actual'],
        };

        const allowed = allowedTransitions[sourceShift.status] || [];
        if (!allowed.includes(input.targetStatus)) {
          throw new Error(
            `Invalid transition: ${sourceShift.status} → ${input.targetStatus}`
          );
        }

        // Determine the new shift name
        const statusNameMap: Record<string, string> = {
          'tentative': '仮確定',
          'tentative_revised': '仮確定改',
          'confirmed': '最終',
          'actual': '実績',
        };
        const defaultName = `${sourceShift.year}年${sourceShift.month}月シフト (${statusNameMap[input.targetStatus]})`;

        // Create new shift record with the target status
        const newShift = await db.createShift({
          year: sourceShift.year,
          month: sourceShift.month,
          name: input.name || defaultName,
          status: input.targetStatus,
          generatedBy: sourceShift.generatedBy || "manual",
          parentShiftId: sourceShift.id,
          leaveRequestDeadline: sourceShift.leaveRequestDeadline,
          additionalRequestDeadline: sourceShift.additionalRequestDeadline,
          userId: ctx.user?.id || null,
        });

        // Copy all shift details from source to new shift
        const sourceDetails = await db.getShiftDetails(input.sourceShiftId);
        for (const detail of sourceDetails) {
          await db.createShiftDetail({
            shiftId: newShift.id,
            employeeId: detail.employeeId,
            date: detail.date,
            workTimeSlotId: detail.workTimeSlotId,
            isLeave: detail.isLeave,
            leaveType: detail.leaveType,
            notes: detail.notes,
          });
        }

        return {
          success: true,
          newShiftId: newShift.id,
        };
      }),
    exportPDF: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("Shift not found");

        const pdfBuffer = await generateShiftPDF({
          shiftId: input.shiftId,
          year: shift.year,
          month: shift.month,
        });

        // Base64エンコードして返す
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `shift_${shift.year}_${shift.month}.pdf`,
        };
      }),
  }),

  // Shift Details
  shiftDetails: router({
    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number(), shiftId: z.number() }))
      .query(async ({ input }) => {
        const allDetails = await db.getShiftDetails(input.shiftId);
        return allDetails.filter(d => d.employeeId === input.employeeId);
      }),
    getByShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        return await db.getShiftDetails(input.shiftId);
      }),
    create: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        employeeId: z.number(),
        date: z.string(),
        status: z.enum(["working", "off", "requested_off", "emergency_off"]),
        timeSlotId: z.number().nullable().optional(),
        leaveType: z.enum(["休", "有休", "時間指定"]).nullable().optional(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        // Convert empty strings to null for database compatibility
        const sanitizedInput = {
          ...input,
          timeSlotId: input.timeSlotId || null,
          leaveType: input.leaveType || null,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          previousTimeSlotId: input.previousTimeSlotId || null,
        };
        return await db.createShiftDetail(sanitizedInput);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        status: z.enum(["working", "off", "requested_off", "emergency_off"]).optional(),
        timeSlotId: z.number().nullable().optional(),
        leaveType: z.enum(["休", "有休", "時間指定"]).nullable().optional(),
        startTime: z.string().nullable().optional(), // HH:MM format
        endTime: z.string().nullable().optional(), // HH:MM format
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        // Convert empty strings to null for database compatibility
        const sanitizedData = {
          ...data,
          timeSlotId: data.timeSlotId || null,
          leaveType: data.leaveType || null,
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          previousTimeSlotId: data.previousTimeSlotId || null,
        };
        return await db.updateShiftDetail(id, sanitizedData);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteShiftDetail(input.id);
      }),
  }),

  // Leave Requests
  leaveRequests: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllLeaveRequests();
    }),
    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeaveRequestsByEmployee(input.employeeId);
      }),
    getByShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeaveRequestsByShift(input.shiftId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        shiftId: z.number().optional(),
        requestDate: z.string().optional(), // deprecated
        startDate: z.string(),
        endDate: z.string(),
        leaveType: z.enum(["休", "有休", "時間指定"]).optional(),
        startTime: z.string().optional(), // HH:MM format
        endTime: z.string().optional(), // HH:MM format
        isAdditional: z.boolean().optional(), // 追加希望休（仮確定後）
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // シフトIDが指定されている場合、締切を検証
        if (input.shiftId) {
          const shift = await db.getShiftById(input.shiftId);
          if (!shift) {
            throw new Error("Shift not found");
          }

          // 通常の希望休締切チェック
          if (!input.isAdditional && shift.leaveRequestDeadline) {
            const deadline = new Date(shift.leaveRequestDeadline);
            const now = new Date();
            if (now > deadline) {
              throw new Error(
                `希望休の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
              );
            }
          }

          // 追加希望休締切チェック（仮確定後）
          if (input.isAdditional && shift.additionalRequestDeadline) {
            const deadline = new Date(shift.additionalRequestDeadline);
            const now = new Date();
            if (now > deadline) {
              throw new Error(
                `追加希望休の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
              );
            }
          }
        }

        return await db.createLeaveRequest({
          ...input,
          requestDate: input.startDate, // fallback for backward compatibility
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        leaveType: z.enum(["休", "有休", "時間指定"]).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        reason: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateLeaveRequest(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteLeaveRequest(input.id);
      }),
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
    // 一括承認（締切後に全員分を承認）
    approveAllForShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .mutation(async ({ input }) => {
        const allRequests = await db.getLeaveRequestsByShift(input.shiftId);
        const pendingRequests = allRequests.filter(req => req.status === "pending");

        // すべてのpending状態の希望休を承認
        await Promise.all(
          pendingRequests.map(req =>
            db.updateLeaveRequest(req.id, { status: "approved" })
          )
        );

        // 承認後、すぐにシフトに反映
        const appliedCount = await db.applyApprovedLeaveRequestsToShift(input.shiftId);

        return {
          approved: pendingRequests.length,
          total: allRequests.length,
          appliedToShift: appliedCount,
        };
      }),
    // 希望休提出状況を取得
    getSubmissionStatus: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        const allEmployees = await db.getAllEmployees();
        const requests = await db.getLeaveRequestsByShift(input.shiftId);

        // 提出した職員のID
        const submittedEmployeeIds = new Set(requests.map(r => r.employeeId));

        // 未提出の職員リスト
        const notSubmitted = allEmployees.filter(emp => !submittedEmployeeIds.has(emp.id));

        return {
          total: allEmployees.length,
          submitted: submittedEmployeeIds.size,
          notSubmitted: notSubmitted.map(emp => ({
            id: emp.id,
            name: emp.name,
            email: emp.email
          })),
          pendingApproval: requests.filter(r => r.status === "pending").length,
          approved: requests.filter(r => r.status === "approved").length
        };
      }),
  }),

  // Change Proposals
  changeProposals: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllChangeProposals();
    }),
    getByShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChangeProposalsByShift(input.shiftId);
      }),
    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChangeProposalsByEmployee(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        shiftId: z.number(),
        proposalDate: z.string(),
        currentTimeSlotId: z.number().optional(),
        proposedTimeSlotId: z.number().optional(),
        reason: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createChangeProposal(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        const { id, status } = input;
        return await db.updateChangeProposal(id, {
          status,
          reviewedAt: new Date(),
        });
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateChangeProposal(input.id, { status: "approved", reviewedAt: new Date() });
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateChangeProposal(input.id, { status: "rejected", reviewedAt: new Date() });
      }),
  }),

  // Emergency Notifications
  emergencyNotifications: router({
    list: protectedProcedure.query(async () => {
      return await db.getEmergencyNotifications();
    }),
    getRecent: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(5) }))
      .query(async ({ input }) => {
        const allNotifications = await db.getEmergencyNotifications();
        // 最新のものから指定された件数を取得
        const sorted = allNotifications
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, input.limit);

        // Dateオブジェクトを文字列に変換（superjsonの問題を回避）
        return sorted.map(n => ({
          ...n,
          createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt).toISOString(),
        }));
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEmergencyNotification(input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEmergencyNotification(input.id);
      }),
  }),

  // Employee Notifications (職員向け通知)
  employeeNotifications: router({
    getForEmployee: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        const { employeeId, limit } = input;
        const notifications: Array<{
          id: string;
          type: 'deadline' | 'reminder' | 'approval' | 'rejection' | 'shift_published';
          title: string;
          message: string;
          priority: 'low' | 'medium' | 'high';
          createdAt: string;
          relatedShiftId?: number;
          daysUntilDeadline?: number;
        }> = [];

        // 現在日時
        const now = new Date();

        // 1. 希望休の承認・却下通知を取得
        const allLeaveRequests = await db.getLeaveRequestsByEmployee(employeeId);
        const recentLeaveRequests = allLeaveRequests
          .filter(req => {
            const submittedAt = new Date(req.submittedAt);
            const daysSinceSubmit = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceSubmit <= 7; // 過去7日以内
          })
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        for (const req of recentLeaveRequests) {
          if (req.status === 'approved') {
            notifications.push({
              id: `leave-approved-${req.id}`,
              type: 'approval',
              title: '希望休が承認されました',
              message: `${req.startDate}${req.startDate !== req.endDate ? `〜${req.endDate}` : ''}の希望休が承認されました。`,
              priority: 'medium',
              createdAt: req.submittedAt,
              relatedShiftId: req.shiftId || undefined,
            });
          } else if (req.status === 'rejected') {
            notifications.push({
              id: `leave-rejected-${req.id}`,
              type: 'rejection',
              title: '希望休が却下されました',
              message: `${req.startDate}${req.startDate !== req.endDate ? `〜${req.endDate}` : ''}の希望休が却下されました。${req.reason ? `理由: ${req.reason}` : ''}`,
              priority: 'high',
              createdAt: req.submittedAt,
              relatedShiftId: req.shiftId || undefined,
            });
          }
        }

        // 2. 締切が近いシフトの通知
        const upcomingShifts = await db.getAllShifts();
        const shiftsWithDeadline = upcomingShifts
          .filter(shift => shift.leaveRequestDeadline && shift.status !== 'archived')
          .filter(shift => {
            const deadline = new Date(shift.leaveRequestDeadline!);
            return deadline > now; // 未来の締切のみ
          })
          .sort((a, b) =>
            new Date(a.leaveRequestDeadline!).getTime() - new Date(b.leaveRequestDeadline!).getTime()
          );

        for (const shift of shiftsWithDeadline.slice(0, 2)) { // 最大2件
          const deadline = new Date(shift.leaveRequestDeadline!);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDeadline <= 7) {
            notifications.push({
              id: `deadline-${shift.id}`,
              type: 'deadline',
              title: `${shift.year}年${shift.month}月分の希望休締切が近づいています`,
              message: `締切は${deadline.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}です。あと${daysUntilDeadline}日です。`,
              priority: daysUntilDeadline <= 3 ? 'high' : 'medium',
              createdAt: now.toISOString(),
              relatedShiftId: shift.id,
              daysUntilDeadline,
            });
          }
        }

        // 3. 確定したシフトの通知
        const recentConfirmedShifts = upcomingShifts
          .filter(shift => shift.confirmedAt)
          .filter(shift => {
            const confirmedAt = new Date(shift.confirmedAt!);
            const daysSinceConfirmed = (now.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceConfirmed <= 3; // 過去3日以内に確定
          })
          .sort((a, b) => new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime());

        for (const shift of recentConfirmedShifts) {
          notifications.push({
            id: `shift-confirmed-${shift.id}`,
            type: 'shift_published',
            title: `${shift.year}年${shift.month}月のシフトが確定しました`,
            message: 'シフトが確定しました。ご確認ください。',
            priority: 'medium',
            createdAt: shift.confirmedAt!,
            relatedShiftId: shift.id,
          });
        }

        // 日付順にソートして指定件数を返す
        return notifications
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }),

    getStats: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        const { employeeId } = input;
        const now = new Date();

        // 希望休の統計
        const allLeaveRequests = await db.getLeaveRequestsByEmployee(employeeId);
        const pendingRequests = allLeaveRequests.filter(req => req.status === 'pending').length;
        const approvedRequests = allLeaveRequests.filter(req => req.status === 'approved').length;
        const rejectedRequests = allLeaveRequests.filter(req => req.status === 'rejected').length;

        // 次の締切を取得
        const upcomingShifts = await db.getAllShifts();
        const nextDeadlineShift = upcomingShifts
          .filter(shift => shift.leaveRequestDeadline && shift.status !== 'archived')
          .filter(shift => new Date(shift.leaveRequestDeadline!) > now)
          .sort((a, b) =>
            new Date(a.leaveRequestDeadline!).getTime() - new Date(b.leaveRequestDeadline!).getTime()
          )[0];

        const upcomingDeadline = nextDeadlineShift ? {
          shiftId: nextDeadlineShift.id,
          year: nextDeadlineShift.year,
          month: nextDeadlineShift.month,
          deadline: nextDeadlineShift.leaveRequestDeadline!,
          daysRemaining: Math.ceil(
            (new Date(nextDeadlineShift.leaveRequestDeadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
        } : null;

        return {
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          upcomingDeadline,
        };
      }),
  }),

  // Shift Feedback
  shiftFeedback: router({
    getByShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        return await db.getShiftFeedback(input.shiftId);
      }),
    create: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        feedbackDate: z.string(),
        rating: z.number(),
        comment: z.string().optional(),
        wasUnderstaffed: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createShiftFeedback({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
  }),

  // Dashboard Statistics
  dashboard: router({
    getStats: protectedProcedure.query(async () => {
      const [
        employees,
        shifts,
        emergencyNotifications
      ] = await Promise.all([
        db.getAllEmployees(),
        db.getAllShifts(),
        db.getEmergencyNotifications()
      ]);

      // 今月のシフトを取得
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentShift = shifts.find(
        s => s.year === currentYear && s.month === currentMonth
      );

      // アーカイブ済みシフトのカウント
      const archivedShifts = shifts.filter(s => s.status === "archived").length;

      return {
        totalEmployees: employees.length,
        currentShift: currentShift ? {
          id: currentShift.id,
          year: currentShift.year,
          month: currentShift.month,
          status: currentShift.status,
          leaveRequestDeadline: currentShift.leaveRequestDeadline
            ? (typeof currentShift.leaveRequestDeadline === 'string'
                ? currentShift.leaveRequestDeadline
                : new Date(currentShift.leaveRequestDeadline).toISOString())
            : null,
        } : null,
        emergencyNotifications: emergencyNotifications.length,
        archivedShifts,
      };
    }),
  }),

  // Statistics
  statistics: router({
    getMonthlyStats: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        const { year, month } = input;

        // 対象月のシフトを取得
        const shifts = await db.getAllShifts();
        const targetShift = shifts.find(s => s.year === year && s.month === month);

        if (!targetShift) {
          return {
            employeeStats: [],
            timeSlotStats: [],
            summary: {
              totalEmployees: 0,
              totalShifts: 0,
              totalTimeSlots: 0,
              avgWorkDays: 0,
            }
          };
        }

        // シフト詳細を取得
        const shiftDetails = await db.getShiftDetailsByShiftId(targetShift.id);
        const employees = await db.getAllEmployees();
        const timeSlots = await db.getAllWorkTimeSlots();

        // 職員ごとの統計を計算
        const employeeStatsMap = new Map<number, {
          employeeId: number;
          employeeName: string;
          positionGroupId: number | null;
          workDays: number;
        }>();

        for (const detail of shiftDetails) {
          if (detail.status === 'working' && detail.timeSlotId) {
            const employee = employees.find(e => e.id === detail.employeeId);
            if (employee) {
              const stats = employeeStatsMap.get(detail.employeeId) || {
                employeeId: detail.employeeId,
                employeeName: employee.name,
                positionGroupId: employee.positionGroupId,
                workDays: 0,
              };
              stats.workDays++;
              employeeStatsMap.set(detail.employeeId, stats);
            }
          }
        }

        // 時間枠ごとの統計を計算
        const timeSlotStatsMap = new Map<number, {
          timeSlotId: number;
          timeSlotName: string;
          startTime: string;
          endTime: string;
          shiftCount: number;
        }>();

        for (const detail of shiftDetails) {
          if (detail.status === 'working' && detail.timeSlotId) {
            const timeSlot = timeSlots.find(ts => ts.id === detail.timeSlotId);
            if (timeSlot) {
              const stats = timeSlotStatsMap.get(detail.timeSlotId) || {
                timeSlotId: detail.timeSlotId,
                timeSlotName: timeSlot.name,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                shiftCount: 0,
              };
              stats.shiftCount++;
              timeSlotStatsMap.set(detail.timeSlotId, stats);
            }
          }
        }

        const employeeStats = Array.from(employeeStatsMap.values());
        const timeSlotStats = Array.from(timeSlotStatsMap.values());

        // サマリーを計算
        const totalEmployees = employeeStats.length;
        const totalShifts = timeSlotStats.reduce((sum, ts) => sum + ts.shiftCount, 0);
        const totalTimeSlots = timeSlotStats.length;
        const avgWorkDays = totalEmployees > 0
          ? employeeStats.reduce((sum, e) => sum + e.workDays, 0) / totalEmployees
          : 0;

        return {
          employeeStats,
          timeSlotStats,
          summary: {
            totalEmployees,
            totalShifts,
            totalTimeSlots,
            avgWorkDays: Math.round(avgWorkDays * 10) / 10, // 小数点第1位まで
          }
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
