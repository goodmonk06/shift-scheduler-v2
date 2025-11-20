/**
 * 12月～1月のデータ登録（第3バッチ：11-15人目）
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface EmployeeData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' | '夏' | '冬' }[];
  workPrefs: { date: string; startTime: string; endTime: string }[];
}

async function registerBatch3() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月～1月のデータ登録（第3バッチ：11-15人目） ===\n");

  const employeeData: EmployeeData[] = [
    // 11. 野仲 彩香
    {
      employeeName: "野仲 彩香",
      leaves: [
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-09", type: "休" },
        { date: "2024-12-13", type: "休" },
        { date: "2024-12-14", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-20", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-25", type: "休" },
        { date: "2024-12-27", type: "休" },
        { date: "2024-12-28", type: "休" },
        { date: "2024-12-29", type: "休" },
        { date: "2024-12-30", type: "休" },
        { date: "2024-12-31", type: "休" },
        { date: "2025-01-01", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-03", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-01", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-02", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-04", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-05", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-08", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-10", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-11", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-12", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-15", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-17", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-18", startTime: "08:30", endTime: "12:30" },
        { date: "2024-12-19", startTime: "08:00", endTime: "12:30" },
        { date: "2024-12-22", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-23", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-24", startTime: "08:30", endTime: "13:00" },
        { date: "2024-12-26", startTime: "08:30", endTime: "12:30" },
      ]
    },

    // 12. 桂川 美幸
    {
      employeeName: "桂川 美幸",
      leaves: [
        { date: "2024-12-02", type: "休" },
        { date: "2024-12-04", type: "休" },
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-09", type: "休" },
        { date: "2024-12-11", type: "休" },
        { date: "2024-12-13", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-18", type: "休" },
        { date: "2024-12-20", type: "休" },
        { date: "2024-12-23", type: "休" },
        { date: "2024-12-25", type: "休" },
        { date: "2024-12-27", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-03", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-01", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-03", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-05", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-07", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-08", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-10", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-12", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-14", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-15", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-17", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-19", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-21", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-22", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-24", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-26", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-28", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-29", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-30", startTime: "18:00", endTime: "20:00" },
        { date: "2024-12-31", startTime: "18:00", endTime: "20:00" },
        { date: "2025-01-01", startTime: "18:00", endTime: "20:00" },
        { date: "2025-01-04", startTime: "18:00", endTime: "20:00" },
        { date: "2025-01-05", startTime: "18:00", endTime: "20:00" },
      ]
    },

    // 13. 加藤 広大
    {
      employeeName: "加藤 広大",
      leaves: [
        { date: "2024-12-01", type: "休" },
        { date: "2024-12-02", type: "休" },
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-05", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-08", type: "休" },
        { date: "2024-12-09", type: "休" },
        { date: "2024-12-10", type: "休" },
        { date: "2024-12-11", type: "休" },
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-14", type: "休" },
        { date: "2024-12-15", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-17", type: "休" },
        { date: "2024-12-19", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-22", type: "休" },
        { date: "2024-12-23", type: "休" },
        { date: "2024-12-24", type: "休" },
        { date: "2024-12-26", type: "休" },
        { date: "2024-12-28", type: "休" },
        { date: "2025-01-04", type: "休" },
        { date: "2025-01-05", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-04", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-06", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-13", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-18", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-20", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-25", startTime: "11:00", endTime: "20:00" },
        { date: "2024-12-27", startTime: "11:00", endTime: "20:00" },
        { date: "2025-01-03", startTime: "11:00", endTime: "20:00" },
      ]
    },

    // 14. 湯本 智子
    {
      employeeName: "湯本 智子",
      leaves: [
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-05", type: "休" },
        { date: "2024-12-10", type: "休" },
        { date: "2024-12-11", type: "休" },
        { date: "2024-12-17", type: "休" },
        { date: "2024-12-19", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-06", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-07", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-13", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-14", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-20", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-21", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-27", startTime: "09:00", endTime: "18:00" },
        { date: "2024-12-28", startTime: "09:00", endTime: "18:00" },
      ]
    },

    // 15. 楠 美佐
    {
      employeeName: "楠 美佐",
      leaves: [
        { date: "2024-12-02", type: "休" },
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-09", type: "休" },
        { date: "2024-12-10", type: "休" },
        { date: "2024-12-11", type: "休" },
        { date: "2024-12-13", type: "休" },
        { date: "2024-12-14", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-17", type: "休" },
        { date: "2024-12-20", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-23", type: "休" },
        { date: "2024-12-24", type: "休" },
        { date: "2024-12-27", type: "休" },
        { date: "2024-12-28", type: "休" },
        { date: "2024-12-29", type: "休" },
        { date: "2024-12-30", type: "休" },
        { date: "2025-01-01", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-01", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-04", startTime: "09:00", endTime: "12:00" },
        { date: "2024-12-05", startTime: "13:00", endTime: "16:00" },
        { date: "2024-12-08", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-12", startTime: "13:00", endTime: "16:00" },
        { date: "2024-12-15", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-18", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-19", startTime: "09:00", endTime: "12:00" },
        { date: "2024-12-22", startTime: "09:00", endTime: "12:00" },
        { date: "2024-12-25", startTime: "13:00", endTime: "16:00" },
        { date: "2024-12-26", startTime: "13:00", endTime: "16:00" },
        { date: "2024-12-31", startTime: "09:00", endTime: "12:00" },
        { date: "2025-01-03", startTime: "09:00", endTime: "12:00" },
      ]
    },
  ];

  let totalLeaves = 0;
  let totalWorkPrefs = 0;

  for (const data of employeeData) {
    console.log(`\n👤 ${data.employeeName}`);

    // 職員を検索
    const employeeResult = await db
      .select()
      .from(employees)
      .where(eq(employees.name, data.employeeName))
      .limit(1);

    if (employeeResult.length === 0) {
      console.error(`   ❌ 職員 "${data.employeeName}" が見つかりません`);
      continue;
    }

    const employee = employeeResult[0];
    console.log(`   職員ID: ${employee.employeeId}`);

    // 休暇を登録
    if (data.leaves.length > 0) {
      console.log(`   【休暇】${data.leaves.length}件`);
      for (const leave of data.leaves) {
        try {
          await db.insert(leaveRequests).values({
            employeeId: employee.id,
            startDate: leave.date,
            endDate: leave.date,
            leaveType: leave.type,
            status: 'approved',
            reason: '希望休',
            isAdditional: false,
          });
          totalLeaves++;
        } catch (error) {
          console.error(`   ❌ ${leave.date} の登録失敗`);
        }
      }
    }

    // 勤務希望を登録
    if (data.workPrefs.length > 0) {
      console.log(`   【勤務希望】${data.workPrefs.length}件`);
      for (const pref of data.workPrefs) {
        try {
          await db.insert(workPreferences).values({
            employeeId: employee.id,
            startDate: pref.date,
            endDate: pref.date,
            startTime: pref.startTime,
            endTime: pref.endTime,
            status: 'approved',
            reason: `${pref.startTime}-${pref.endTime}勤務希望`,
            isAdditional: false,
          });
          totalWorkPrefs++;
        } catch (error) {
          console.error(`   ❌ ${pref.date} の登録失敗`);
        }
      }
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`📊 休暇: ${totalLeaves}件`);
  console.log(`📊 勤務希望: ${totalWorkPrefs}件`);
  console.log(`📊 合計: ${totalLeaves + totalWorkPrefs}件を登録`);
}

registerBatch3().catch(console.error);