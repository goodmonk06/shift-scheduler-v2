import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
// Dynamic import to avoid bundling OpenAI at build time
// import { generateShiftWithAI } from "./aiShiftGenerator";
import { generateShiftPDF } from "./pdfGenerator";
// Dynamic import to avoid bundling OpenAI at build time
// import { structureEmployeeData, getEmployeeConstraints } from "./employeeDataStructurer";
import { z } from "zod";
import * as db from "./db";

// Common validation schemas
const timeFormatRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const timeSchema = z.string().regex(timeFormatRegex, "時刻はHH:MM形式で入力してください (例: 09:00)");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください");

/**
 * シフトステータス遷移ルール（単一の信頼できるソース）
 */
const SHIFT_STATUS_TRANSITIONS: Record<string, string[]> = {
  'vacation_only': ['draft', 'ai_generated'], // 希望休入力後、下書きまたはAI生成へ
  'draft': ['ai_generated'], // AI生成へ
  'ai_generated': ['tentative'], // 仮確定へ
  'tentative': ['tentative_revised', 'confirmed'],
  'tentative_revised': ['confirmed'],
  'confirmed': ['actual'],
  'actual': ['archived'],
  'archived': [], // 変更不可
};

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
    // AI構造化: 自然言語を構造化データに変換
    structurePersonalData: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        naturalLanguageInput: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { structureEmployeeData } = await import("./employeeDataStructurer");
        return await structureEmployeeData(input.employeeId, input.naturalLanguageInput);
      }),
    // 職員の制約データを取得
    getConstraints: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        const { getEmployeeConstraints } = await import("./employeeDataStructurer");
        return await getEmployeeConstraints(input.employeeId);
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
        startTime: timeSchema,
        endTime: timeSchema,
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
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
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
        status: z.enum(["vacation_only", "draft", "ai_generated", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).optional(),
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
        status: z.enum(["vacation_only", "draft", "ai_generated", "tentative", "tentative_revised", "confirmed", "actual", "archived"]).optional(),
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
            throw new Error("シフトが見つかりません");
          }

          // ステータス遷移ルールを使用
          const currentStatus = currentShift.status;
          const newStatus = convertedData.status;

          // 同じステータスへの更新は許可
          if (currentStatus !== newStatus) {
            const allowed = SHIFT_STATUS_TRANSITIONS[currentStatus] || [];
            if (!allowed.includes(newStatus)) {
              throw new Error(
                `無効な状態遷移: ${currentStatus} → ${newStatus}。` +
                `${currentStatus} から遷移可能な状態: ${allowed.join(', ') || 'なし'}`
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
        if (!draftShift) throw new Error("シフトが見つかりません");

        // Verify the source shift is in vacation_only or draft status
        if (draftShift.status !== "vacation_only" && draftShift.status !== "draft") {
          throw new Error("AI生成は希望休のみまたは下書きのシフトでのみ実行できます");
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
        const { generateShiftWithAI } = await import("./aiShiftGenerator");
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

    // 段階的配置アルゴリズム（カスタム時間対応）
    generatePhaseBased: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const draftShift = await db.getShiftById(input.shiftId);
        if (!draftShift) throw new Error("シフトが見つかりません");

        // Verify the source shift is in vacation_only or draft status
        if (draftShift.status !== "vacation_only" && draftShift.status !== "draft") {
          throw new Error("段階的生成は希望休のみまたは下書きのシフトでのみ実行できます");
        }

        console.log('[generatePhaseBased API] Starting generation for shiftId:', input.shiftId);

        // Run phase-based generation
        const { generateShiftWithPhases } = await import("./phaseBasedShiftGenerator");
        const result = await generateShiftWithPhases(
          input.shiftId,
          draftShift.year,
          draftShift.month
        );

        // Save generated shifts to database
        for (const shift of result.allShifts) {
          await db.createShiftDetail({
            shiftId: input.shiftId,
            employeeId: shift.employeeId,
            date: shift.date,
            status: shift.status,
            timeSlotId: shift.timeSlotId,
            leaveType: shift.leaveType,
            startTime: shift.startTime,
            endTime: shift.endTime,
            generatedBy: shift.generatedBy || 'rule_based',
          });
        }

        console.log('[generatePhaseBased API] Generation completed:', {
          confirmedShifts: result.confirmedShifts.length,
          ruleBasedShifts: result.ruleBasedShifts.length,
          totalShifts: result.allShifts.length,
        });

        return {
          success: true,
          shiftId: input.shiftId,
          confirmedShifts: result.confirmedShifts.length,
          ruleBasedShifts: result.ruleBasedShifts.length,
          totalShifts: result.allShifts.length,
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
        if (!sourceShift) throw new Error("元のシフトが見つかりません");

        // Validate status transition using shared constant
        const allowed = SHIFT_STATUS_TRANSITIONS[sourceShift.status] || [];
        if (!allowed.includes(input.targetStatus)) {
          throw new Error(
            `無効な状態遷移: ${sourceShift.status} → ${input.targetStatus}。` +
            `${sourceShift.status} から遷移可能な状態: ${allowed.join(', ') || 'なし'}`
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
            timeSlotId: detail.timeSlotId,
            status: detail.status,
            leaveType: detail.leaveType,
            startTime: detail.startTime,
            endTime: detail.endTime,
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
        if (!shift) throw new Error("シフトが見つかりません");

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
        leaveType: z.enum(["休", "有休"]).nullable().optional(),
        startTime: z.string().nullable().optional(), // HH:MM format (時間指定勤務用)
        endTime: z.string().nullable().optional(), // HH:MM format (時間指定勤務用)
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        // Build sanitized input - ensure null values are properly handled
        const sanitizedInput = {
          shiftId: input.shiftId,
          employeeId: input.employeeId,
          date: input.date,
          status: input.status,
          timeSlotId: input.timeSlotId ?? null,
          leaveType: input.leaveType ?? null,
          startTime: (input.startTime && input.startTime !== "") ? input.startTime : null,
          endTime: (input.endTime && input.endTime !== "") ? input.endTime : null,
          previousTimeSlotId: input.previousTimeSlotId ?? null,
        };

        return await db.createShiftDetail(sanitizedInput);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        status: z.enum(["working", "off", "requested_off", "emergency_off"]).optional(),
        timeSlotId: z.number().nullable().optional(),
        leaveType: z.enum(["休", "有休"]).nullable().optional(),
        startTime: z.string().nullable().optional(), // HH:MM format (時間指定勤務用)
        endTime: z.string().nullable().optional(), // HH:MM format (時間指定勤務用)
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        // Build sanitized data - ensure null values are properly handled
        const sanitizedData: any = {};

        if (data.date !== undefined) sanitizedData.date = data.date;
        if (data.status !== undefined) sanitizedData.status = data.status;
        if (data.timeSlotId !== undefined) sanitizedData.timeSlotId = data.timeSlotId ?? null;
        if (data.leaveType !== undefined) sanitizedData.leaveType = data.leaveType ?? null;
        if (data.startTime !== undefined) sanitizedData.startTime = (data.startTime && data.startTime !== "") ? data.startTime : null;
        if (data.endTime !== undefined) sanitizedData.endTime = (data.endTime && data.endTime !== "") ? data.endTime : null;
        if (data.isChanged !== undefined) sanitizedData.isChanged = data.isChanged;
        if (data.previousTimeSlotId !== undefined) sanitizedData.previousTimeSlotId = data.previousTimeSlotId ?? null;

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
        startDate: dateSchema,
        endDate: dateSchema,
        leaveType: z.enum(["休", "有休"]).optional(),
        isAdditional: z.boolean().optional(), // 追加希望休（仮確定後）
        reason: z.string().optional(),
      }).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
        message: "開始日は終了日以前である必要があります",
        path: ["endDate"]
      }))
      .mutation(async ({ input }) => {
        // シフトIDが指定されている場合、締切を検証
        if (input.shiftId) {
          const shift = await db.getShiftById(input.shiftId);
          if (!shift) {
            throw new Error("シフトが見つかりません");
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
    createBatch: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        shiftId: z.number(),
        requests: z.array(z.object({
          date: z.string(), // YYYY-MM-DD
          leaveType: z.enum(["休", "有休"]).optional(),
          reason: z.string().optional(),
        })),
        isAdditional: z.boolean().optional(), // 追加希望休（仮確定後）
      }))
      .mutation(async ({ input }) => {
        // シフトを検証
        const shift = await db.getShiftById(input.shiftId);
        if (!shift) {
          throw new Error("シフトが見つかりません");
        }

        // 締切チェック
        if (!input.isAdditional && shift.leaveRequestDeadline) {
          const deadline = new Date(shift.leaveRequestDeadline);
          const now = new Date();
          if (now > deadline) {
            throw new Error(
              `希望休の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
            );
          }
        }

        if (input.isAdditional && shift.additionalRequestDeadline) {
          const deadline = new Date(shift.additionalRequestDeadline);
          const now = new Date();
          if (now > deadline) {
            throw new Error(
              `追加希望休の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
            );
          }
        }

        // 一括作成
        const createdRequests = [];
        for (const req of input.requests) {
          const created = await db.createLeaveRequest({
            employeeId: input.employeeId,
            shiftId: input.shiftId,
            requestDate: req.date,
            startDate: req.date,
            endDate: req.date,
            leaveType: req.leaveType,
            isAdditional: input.isAdditional,
            reason: req.reason,
          });
          createdRequests.push(created);
        }

        return {
          success: true,
          count: createdRequests.length,
          requests: createdRequests,
        };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        leaveType: z.enum(["休", "有休"]).optional(),
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

  // Work Preferences (勤務希望)
  workPreferences: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkPreferences();
    }),
    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkPreferencesByEmployee(input.employeeId);
      }),
    getByShift: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkPreferencesByShift(input.shiftId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        shiftId: z.number().optional(),
        requestDate: z.string().optional(), // deprecated
        startDate: dateSchema,
        endDate: dateSchema,
        startTime: timeSchema, // HH:MM format - required
        endTime: timeSchema, // HH:MM format - required
        isAdditional: z.boolean().optional(),
        reason: z.string().optional(),
      }).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
        message: "開始日は終了日以前である必要があります",
        path: ["endDate"]
      }))
      .mutation(async ({ input }) => {
        // シフトIDが指定されている場合、締切を検証（leaveRequestsと同様）
        if (input.shiftId) {
          const shift = await db.getShiftById(input.shiftId);
          if (!shift) {
            throw new Error("シフトが見つかりません");
          }

          // 通常の希望締切チェック
          if (!input.isAdditional && shift.leaveRequestDeadline) {
            const deadline = new Date(shift.leaveRequestDeadline);
            const now = new Date();
            if (now > deadline) {
              throw new Error(
                `勤務希望の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
              );
            }
          }

          // 追加希望締切チェック（仮確定後）
          if (input.isAdditional && shift.additionalRequestDeadline) {
            const deadline = new Date(shift.additionalRequestDeadline);
            const now = new Date();
            if (now > deadline) {
              throw new Error(
                `追加勤務希望の締切を過ぎています。締切: ${deadline.toLocaleString('ja-JP')}`
              );
            }
          }
        }

        return await db.createWorkPreference({
          ...input,
          requestDate: input.startDate, // fallback for backward compatibility
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        reason: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateWorkPreference(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteWorkPreference(input.id);
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateWorkPreference(input.id, { status: "approved" });
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateWorkPreference(input.id, { status: "rejected" });
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

  // Notifications (通知管理 - DBベース) - 削除: 1762行目の新しい実装に統合済み

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
              createdAt: req.submittedAt?.toISOString() || new Date().toISOString(),
              relatedShiftId: req.shiftId || undefined,
            });
          } else if (req.status === 'rejected') {
            notifications.push({
              id: `leave-rejected-${req.id}`,
              type: 'rejection',
              title: '希望休が却下されました',
              message: `${req.startDate}${req.startDate !== req.endDate ? `〜${req.endDate}` : ''}の希望休が却下されました。${req.reason ? `理由: ${req.reason}` : ''}`,
              priority: 'high',
              createdAt: req.submittedAt?.toISOString() || new Date().toISOString(),
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
            createdAt: shift.confirmedAt?.toISOString() || new Date().toISOString(),
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

  // Facility Events
  facilityEvents: router({
    list: publicProcedure.query(async () => {
      return await db.getAllFacilityEvents();
    }),
    getByMonth: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => {
        return await db.getFacilityEventsByMonth(input.year, input.month);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getFacilityEventById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        day: z.number(),
        title: z.string(),
        description: z.string().optional(),
        time: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("ユーザーが認証されていません");
        }
        return await db.createFacilityEvent({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        year: z.number().optional(),
        month: z.number().optional(),
        day: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        time: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateFacilityEvent(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteFacilityEvent(input.id);
      }),
  }),

  // Workflow Management
  workflow: router({
    // Get current workflow status for a shift
    getStatus: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');

        // Get shift details
        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("シフトが見つかりません");

        // Get workflow statistics
        const stats = await dbWorkflow.getWorkflowStatistics(input.shiftId);

        // Get latest workflow history
        const latestHistory = await dbWorkflow.getLatestWorkflowStatus(input.shiftId);

        // Calculate progress percentage based on status
        const statusProgress: Record<string, number> = {
          'vacation_only': 10,
          'draft': 30,
          'ai_generated': 40,
          'tentative': 60,
          'tentative_revised': 75,
          'confirmed': 90,
          'actual': 95,
          'archived': 100,
        };

        return {
          currentStatus: shift.status,
          progress: statusProgress[shift.status] || 0,
          leaveRequestDeadline: shift.leaveRequestDeadline,
          additionalRequestDeadline: shift.additionalRequestDeadline,
          feedbackDeadline: shift.feedbackDeadline,
          tentativePublishedAt: shift.tentativePublishedAt,
          confirmedAt: shift.confirmedAt,
          statistics: stats,
          latestChange: latestHistory,
          canTransitionTo: SHIFT_STATUS_TRANSITIONS[shift.status] || [],
        };
      }),

    // Check if transition to target status is allowed
    canTransition: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        targetStatus: z.string()
      }))
      .query(async ({ input }) => {
        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("シフトが見つかりません");

        const allowed = SHIFT_STATUS_TRANSITIONS[shift.status] || [];
        const canTransition = allowed.includes(input.targetStatus);

        // Additional business rules
        let blockers: string[] = [];

        if (input.targetStatus === 'tentative' && shift.status === 'draft') {
          // Check if there are any assignments
          const details = await db.getShiftDetailsByShiftId(input.shiftId);
          if (details.length === 0) {
            blockers.push("シフトの割り当てがありません");
          }
        }

        if (input.targetStatus === 'confirmed') {
          const dbWorkflow = await import('./dbWorkflow');
          const pendingMods = await dbWorkflow.getPendingModificationRequestsCount(input.shiftId);
          if (pendingMods > 0) {
            blockers.push(`未処理の修正希望が${pendingMods}件あります`);
          }
        }

        return {
          allowed: canTransition && blockers.length === 0,
          blockers,
          currentStatus: shift.status,
          targetStatus: input.targetStatus,
        };
      }),

    // Send bulk notifications
    sendBulkNotifications: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        notificationType: z.enum([
          'status_change',
          'deadline_reminder',
          'feedback_request',
          'shift_published'
        ]),
        title: z.string().optional(),
        message: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbWorkflow = await import('./dbWorkflow');

        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("シフトが見つかりません");

        // Generate default messages based on type
        let title = input.title;
        let message = input.message;

        if (!title || !message) {
          switch (input.notificationType) {
            case 'status_change':
              title = title || `${shift.year}年${shift.month}月シフトの状態が更新されました`;
              message = message || `シフトの状態が「${shift.status}」に変更されました。`;
              break;
            case 'deadline_reminder':
              title = title || `希望休締切が近づいています`;
              message = message || `${shift.year}年${shift.month}月分の希望休締切が近づいています。`;
              break;
            case 'feedback_request':
              title = title || `仮確定シフトの確認をお願いします`;
              message = message || `${shift.year}年${shift.month}月の仮確定シフトをご確認ください。修正希望がある場合はお早めにご連絡ください。`;
              break;
            case 'shift_published':
              title = title || `${shift.year}年${shift.month}月シフトが確定しました`;
              message = message || `最終確定したシフトをご確認ください。`;
              break;
          }
        }

        const notificationId = await dbWorkflow.sendBulkNotification({
          shiftId: input.shiftId,
          notificationType: input.notificationType,
          title: title!,
          message: message!,
          priority: input.priority,
        });

        // Record in workflow history
        await dbWorkflow.recordWorkflowHistory({
          shiftId: input.shiftId,
          toStatus: shift.status,
          changedBy: ctx.user?.id,
          comment: `通知送信: ${title}`,
          metadata: { notificationId, type: input.notificationType },
        });

        // Update shift's notificationsSent field
        const currentNotifications = (shift.notificationsSent || {}) as Record<string, any[]>;
        currentNotifications[input.notificationType] = currentNotifications[input.notificationType] || [];
        currentNotifications[input.notificationType].push({
          sentAt: new Date().toISOString(),
          notificationId,
        });

        await db.updateShift(input.shiftId, {
          notificationsSent: currentNotifications,
        });

        return {
          success: true,
          notificationId,
          recipientCount: 'all', // Since it's sent to all
        };
      }),

    // Get workflow history
    getHistory: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');
        return await dbWorkflow.getWorkflowHistory(input.shiftId);
      }),
  }),

  // Modification Requests (separate from change proposals)
  modificationRequests: router({
    // Create modification request(s)
    create: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        requests: z.array(z.object({
          date: z.string(),
          type: z.enum(['swap', 'off', 'time_change']),
          current: z.string().optional(),
          requested: z.string(),
          swapTargetEmployeeId: z.number().optional(),
          reason: z.string(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbWorkflow = await import('./dbWorkflow');

        // Get employee from user
        const employee = ctx.user ? await db.getEmployeeByUserId(ctx.user.id) : null;
        if (!employee) throw new Error("職員情報が見つかりません");

        const created = [];
        for (const req of input.requests) {
          const result = await dbWorkflow.createModificationRequest({
            shiftId: input.shiftId,
            employeeId: employee.id,
            requestDate: req.date,
            requestType: req.type,
            currentAssignment: req.current,
            requestedAssignment: req.requested,
            swapTargetEmployeeId: req.swapTargetEmployeeId,
            reason: req.reason,
            priority: req.priority,
          });
          created.push(result);
        }

        // Create notification for admin
        await dbWorkflow.createNotification({
          recipientType: 'admin',
          shiftId: input.shiftId,
          notificationType: 'modification_request',
          title: '新しい修正希望が提出されました',
          message: `${employee.name}さんから${created.length}件の修正希望が提出されました。`,
          priority: 'medium',
        });

        return {
          success: true,
          count: created.length,
          requests: created,
        };
      }),

    // Get modification requests by shift
    getByShift: protectedProcedure
      .input(z.object({
        shiftId: z.number(),
        status: z.enum(['pending', 'approved', 'rejected', 'processed']).optional(),
      }))
      .query(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');
        return await dbWorkflow.getModificationRequestsByShift(input.shiftId, input.status);
      }),

    // Get modification requests by employee
    getByEmployee: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        shiftId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');
        return await dbWorkflow.getModificationRequestsByEmployee(input.employeeId, input.shiftId?.toString());
      }),

    // Process modification requests (approve/reject)
    process: protectedProcedure
      .input(z.object({
        requestIds: z.array(z.number()),
        action: z.enum(['approved', 'rejected']),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbWorkflow = await import('./dbWorkflow');

        const processedCount = await dbWorkflow.batchProcessModificationRequests(
          input.requestIds,
          input.action,
          ctx.user?.id || 0,
          input.comment
        );

        // Get shift ID from first request for notification
        // Workflow functionality disabled - using empty array
        const requests: any[] = [];

        if (requests.length > 0) {
          const shiftId = requests[0].shiftId;

          // Notify employees about the decision
          for (const req of requests) {
            await dbWorkflow.createNotification({
              recipientType: 'employee',
              recipientId: req.employeeId,
              shiftId: shiftId,
              notificationType: input.action === 'approved' ? 'approval' : 'rejection',
              title: `修正希望が${input.action === 'approved' ? '承認' : '却下'}されました`,
              message: input.comment || `あなたの修正希望が${input.action === 'approved' ? '承認' : '却下'}されました。`,
              priority: 'high',
            });
          }

          // Record in workflow history
          await dbWorkflow.recordWorkflowHistory({
            shiftId: shiftId,
            toStatus: 'modification_processed',
            changedBy: ctx.user?.id,
            comment: `${processedCount}件の修正希望を${input.action === 'approved' ? '承認' : '却下'}`,
            metadata: { requestIds: input.requestIds, action: input.action },
          });
        }

        return {
          success: true,
          processedCount,
        };
      }),

    // Get pending count for a shift
    getPendingCount: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .query(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');
        return await dbWorkflow.getPendingModificationRequestsCount(input.shiftId);
      }),
  }),

  // Enhanced Notifications
  notifications: router({
    // Get notifications for current user/employee
    getMine: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(10),
        includeRead: z.boolean().optional().default(false),
      }))
      .query(async ({ input, ctx }) => {
        const dbWorkflow = await import('./dbWorkflow');

        // Get employee from user
        const employee = ctx.user ? await db.getEmployeeByUserId(ctx.user.id) : null;
        if (!employee) throw new Error("職員情報が見つかりません");

        return await dbWorkflow.getNotificationsForEmployee(
          employee.id,
          { limit: input.limit, includeRead: input.includeRead }
        );
      }),

    // Mark notification as read
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');
        await dbWorkflow.markNotificationAsRead(input.notificationId);
        return { success: true };
      }),

    // Mark all as read
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const dbWorkflow = await import('./dbWorkflow');

        // Get employee from user
        const employee = ctx.user ? await db.getEmployeeByUserId(ctx.user.id) : null;
        if (!employee) throw new Error("職員情報が見つかりません");

        await dbWorkflow.markAllNotificationsAsRead(employee.id);
        return { success: true };
      }),

    // Create custom notification
    create: protectedProcedure
      .input(z.object({
        recipientType: z.enum(['all', 'employee', 'admin']),
        recipientId: z.number().optional(),
        shiftId: z.number().optional(),
        title: z.string(),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        actionUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbWorkflow = await import('./dbWorkflow');

        const notification = await dbWorkflow.createNotification({
          recipientType: input.recipientType,
          recipientId: input.recipientId,
          shiftId: input.shiftId,
          notificationType: 'modification_request' as any, // Custom notification type
          title: input.title,
          message: input.message,
          priority: input.priority,
          actionUrl: input.actionUrl,
        });

        return {
          success: true,
          notification,
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

  // Database Maintenance
  maintenance: router({
    fixWorkTimeSlots: protectedProcedure
      .mutation(async () => {
        console.log('[fixWorkTimeSlots] Starting...');

        // 職場ルールに基づく正しい時間枠データ
        const CORRECT_TIME_SLOTS = [
          {
            name: "夜勤",
            displayLabel: "夜",
            startTime: "16:00",
            endTime: "09:00",
            isNightShift: true,
            requiredStaff: 1,
          },
          {
            name: "早番",
            displayLabel: "早",
            startTime: "06:00",
            endTime: "15:00",
            isNightShift: false,
            requiredStaff: 2,
          },
          {
            name: "日勤A",
            displayLabel: "日A",
            startTime: "08:00",
            endTime: "17:00",
            isNightShift: false,
            requiredStaff: 3,
          },
          {
            name: "日勤B",
            displayLabel: "日B",
            startTime: "09:00",
            endTime: "18:00",
            isNightShift: false,
            requiredStaff: 3,
          },
          {
            name: "遅番",
            displayLabel: "遅",
            startTime: "11:00",
            endTime: "20:00",
            isNightShift: false,
            requiredStaff: 2,
          },
        ];

        // 既存データを確認
        const existing = await db.getAllWorkTimeSlots();
        console.log(`[fixWorkTimeSlots] Existing slots: ${existing.length}`);

        // データベース接続を取得
        const database = await db.getDb();
        if (!database) {
          throw new Error("Database connection not available");
        }

        // トランザクションで実行
        await database.transaction(async (tx) => {
          // 既存データを削除
          await tx.execute({ sql: "DELETE FROM workTimeSlots" });
          console.log('[fixWorkTimeSlots] Deleted existing data');

          // 正しいデータを登録
          for (const slot of CORRECT_TIME_SLOTS) {
            await db.createWorkTimeSlot(slot);
            console.log(`[fixWorkTimeSlots] Created: ${slot.name}`);
          }
        });

        // 登録結果を確認
        const updated = await db.getAllWorkTimeSlots();
        console.log(`[fixWorkTimeSlots] Completed: ${updated.length} slots`);

        return {
          success: true,
          count: updated.length,
          slots: updated,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
