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
        positionGroupId: z.number().optional(),
        skillLevel: z.number().optional(),
        canWorkNightShift: z.boolean().optional(),
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
        ruleType: z.enum(["min_rest_days", "night_shift_quota", "post_night_shift_rest", "required_staff_pattern"]),
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
        ruleType: z.enum(["min_rest_days", "night_shift_quota", "post_night_shift_rest", "required_staff_pattern"]).optional(),
        employmentType: z.enum(["fulltime", "parttime", "all"]).optional(),
        ruleValue: z.any().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateWorkplaceRule(id, data);
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
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        name: z.string(),
        status: z.enum(["draft", "tentative", "confirmed", "archived"]).optional(),
        generatedBy: z.enum(["manual", "ai"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createShift({
          ...input,
          userId: ctx.user.id,
        });
      }),
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateShift(input.id, { isArchived: true, archivedAt: new Date() });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["draft", "tentative", "confirmed", "archived"]).optional(),
        tentativePublishedAt: z.date().optional(),
        confirmedAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateShift(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteShift(input.id);
      }),
    generateAI: protectedProcedure
      .input(z.object({ shiftId: z.number() }))
      .mutation(async ({ input }) => {
        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("Shift not found");
        await generateShiftWithAI({
          shiftId: input.shiftId,
          year: shift.year,
          month: shift.month,
        });
        return { success: true };
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
        timeSlotId: z.number().optional(),
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createShiftDetail(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        status: z.enum(["working", "off", "requested_off", "emergency_off"]).optional(),
        timeSlotId: z.number().optional(),
        isChanged: z.boolean().optional(),
        previousTimeSlotId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateShiftDetail(id, data);
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
        shiftId: z.number(),
        requestDate: z.string().optional(), // deprecated
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createLeaveRequest({
          ...input,
          requestDate: input.startDate, // fallback for backward compatibility
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateLeaveRequest(id, data);
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
});

export type AppRouter = typeof appRouter;
