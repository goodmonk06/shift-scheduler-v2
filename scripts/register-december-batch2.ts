/**
 * 12月～1月のデータ登録（第2バッチ：6-10人目）
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface EmployeeData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' | '夏' | '冬' }[];
  workPrefs: { date: string; startTime: string; endTime: string; type?: string }[];
}

async function registerBatch2() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月～1月のデータ登録（第2バッチ：6-10人目） ===\n");

  const employeeData: EmployeeData[] = [
    // 6. 梅田 英津子
    {
      employeeName: "梅田 英津子",
      leaves: [
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-25", type: "休" },
        { date: "2024-12-28", type: "有休" },
        { date: "2024-12-29", type: "冬" },
        { date: "2025-01-01", type: "休" },
        { date: "2025-01-05", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-30", startTime: "16:00", endTime: "10:00", type: "夜勤" },
        { date: "2024-12-31", startTime: "00:00", endTime: "10:00", type: "明け" },
        { date: "2025-01-03", startTime: "16:00", endTime: "10:00", type: "夜勤" },
        { date: "2025-01-04", startTime: "00:00", endTime: "10:00", type: "明け" },
      ]
    },

    // 7. 大橋 健一
    {
      employeeName: "大橋 健一",
      leaves: [
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-31", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-28", startTime: "16:00", endTime: "10:00", type: "夜勤" },
        { date: "2024-12-30", startTime: "00:00", endTime: "10:00", type: "明け" },
        { date: "2025-01-02", startTime: "16:00", endTime: "10:00", type: "夜勤" },
        { date: "2025-01-03", startTime: "00:00", endTime: "10:00", type: "明け" },
      ]
    },

    // 8. 上条 やえ子
    {
      employeeName: "上条 やえ子",
      leaves: [
        { date: "2024-12-01", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-14", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-27", type: "休" },
        { date: "2024-12-28", type: "休" },
        { date: "2025-01-01", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-03", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: []
    },

    // 9. 若森 直子
    {
      employeeName: "若森 直子",
      leaves: [
        { date: "2024-12-02", type: "休" },
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-11", type: "休" },
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-13", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-22", type: "休" },
        { date: "2024-12-23", type: "休" },
        { date: "2024-12-29", type: "休" },
        { date: "2024-12-30", type: "休" },
        { date: "2025-01-01", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-03", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-07", startTime: "09:00", endTime: "14:00" },
        { date: "2024-12-14", startTime: "09:00", endTime: "14:00" },
        { date: "2024-12-27", startTime: "09:00", endTime: "14:00" },
        { date: "2024-12-28", startTime: "09:00", endTime: "14:00" },
      ]
    },

    // 10. 足立 洋子
    {
      employeeName: "足立 洋子",
      leaves: [
        { date: "2024-12-02", type: "休" },
        { date: "2024-12-03", type: "休" },
        { date: "2024-12-05", type: "休" },
        { date: "2024-12-06", type: "休" },
        { date: "2024-12-07", type: "休" },
        { date: "2024-12-09", type: "休" },
        { date: "2024-12-10", type: "休" },
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-13", type: "休" },
        { date: "2024-12-14", type: "休" },
        { date: "2024-12-16", type: "休" },
        { date: "2024-12-17", type: "休" },
        { date: "2024-12-19", type: "休" },
        { date: "2024-12-20", type: "休" },
        { date: "2024-12-21", type: "休" },
        { date: "2024-12-23", type: "休" },
        { date: "2024-12-24", type: "休" },
        { date: "2024-12-26", type: "休" },
        { date: "2024-12-27", type: "休" },
        { date: "2024-12-28", type: "休" },
        { date: "2024-12-30", type: "休" },
        { date: "2024-12-31", type: "休" },
        { date: "2025-01-02", type: "休" },
        { date: "2025-01-03", type: "休" },
        { date: "2025-01-04", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-01", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-04", startTime: "08:00", endTime: "16:00" },
        { date: "2024-12-08", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-11", startTime: "08:00", endTime: "16:00" },
        { date: "2024-12-15", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-18", startTime: "08:00", endTime: "16:00" },
        { date: "2024-12-22", startTime: "09:00", endTime: "16:00" },
        { date: "2024-12-25", startTime: "08:00", endTime: "16:00" },
        { date: "2024-12-29", startTime: "09:00", endTime: "16:00" },
        { date: "2025-01-01", startTime: "08:00", endTime: "13:00" },
        { date: "2025-01-05", startTime: "09:00", endTime: "16:00" },
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
      console.log("   【休暇】");
      for (const leave of data.leaves) {
        try {
          await db.insert(leaveRequests).values({
            employeeId: employee.id,
            startDate: leave.date,
            endDate: leave.date,
            leaveType: leave.type,
            status: 'approved',
            reason: leave.type === '冬' ? '冬季休暇' :
                    leave.type === '夏' ? '夏季休暇' :
                    leave.type === '有休' ? '有給休暇' : '希望休',
            isAdditional: false,
          });
          const displayType = leave.type === '冬' ? '冬季' : leave.type;
          console.log(`   ✓ ${leave.date} (${displayType})`);
          totalLeaves++;
        } catch (error) {
          console.error(`   ❌ ${leave.date} の登録失敗`);
        }
      }
    }

    // 勤務希望を登録
    if (data.workPrefs.length > 0) {
      console.log("   【勤務希望】");
      for (const pref of data.workPrefs) {
        try {
          await db.insert(workPreferences).values({
            employeeId: employee.id,
            startDate: pref.date,
            endDate: pref.date,
            startTime: pref.startTime,
            endTime: pref.endTime,
            status: 'approved',
            reason: pref.type || `${pref.startTime}-${pref.endTime}勤務希望`,
            isAdditional: false,
          });
          const displayInfo = pref.type || `${pref.startTime}-${pref.endTime}`;
          console.log(`   ✓ ${pref.date} (${displayInfo})`);
          totalWorkPrefs++;
        } catch (error) {
          console.error(`   ❌ ${pref.date} の登録失敗`);
        }
      }
    }

    if (data.leaves.length === 0 && data.workPrefs.length === 0) {
      console.log("   - データなし");
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`📊 休暇: ${totalLeaves}件`);
  console.log(`📊 勤務希望: ${totalWorkPrefs}件`);
  console.log(`📊 合計: ${totalLeaves + totalWorkPrefs}件を登録`);
}

registerBatch2().catch(console.error);