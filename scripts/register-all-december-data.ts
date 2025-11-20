/**
 * 12月～1月の全データを正しく登録するスクリプト
 * 休暇、勤務希望（夜勤・明け）、研修を適切に分類して登録
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface EmployeeData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' | '夏' | '冬' }[];
  workPrefs: { date: string; type: '夜勤' | '明け'; startTime?: string; endTime?: string }[];
  trainings: { date: string; type: string; }[]; // PM研修、研修1日など
}

async function clearAndRegisterAll() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月～1月の全データ登録 ===\n");

  // まず既存の12月～1月のデータをクリア
  console.log("📝 既存データをクリア中...");

  await db.delete(leaveRequests).where(
    and(
      gte(leaveRequests.startDate, '2024-12-01'),
      lte(leaveRequests.endDate, '2025-01-05')
    )
  );

  await db.delete(workPreferences).where(
    and(
      gte(workPreferences.startDate, '2024-12-01'),
      lte(workPreferences.endDate, '2025-01-05')
    )
  );

  console.log("✅ 既存データをクリアしました\n");

  // 最初の5人分のデータ（正しく分類）
  const employeeData: EmployeeData[] = [
    // 1. 髙野 幹成 - データなし
    {
      employeeName: "髙野 幹成",
      leaves: [],
      workPrefs: [],
      trainings: []
    },

    // 2. 山口 夕香里
    {
      employeeName: "山口 夕香里",
      leaves: [
        { date: "2024-12-07", type: "休" },
      ],
      workPrefs: [],
      trainings: [
        { date: "2024-12-01", type: "PM研修" },
        { date: "2024-12-04", type: "研修1日" },
        { date: "2024-12-10", type: "研修1日" },
      ]
    },

    // 3. 馬渕 尊至 - データなし
    {
      employeeName: "馬渕 尊至",
      leaves: [],
      workPrefs: [],
      trainings: []
    },

    // 4. 松嵜 愛梨
    {
      employeeName: "松嵜 愛梨",
      leaves: [
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-27", type: "冬" },
        { date: "2025-01-02", type: "休" },
      ],
      workPrefs: [
        { date: "2024-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2025-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 5. 杉山 美佳子
    {
      employeeName: "杉山 美佳子",
      leaves: [
        { date: "2024-12-05", type: "休" },
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-13", type: "冬" },
        { date: "2024-12-19", type: "休" },
        { date: "2024-12-26", type: "休" },
        { date: "2025-01-03", type: "休" },
      ],
      workPrefs: [
        { date: "2025-01-01", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2025-01-02", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },
  ];

  let totalLeaves = 0;
  let totalWorkPrefs = 0;
  let totalTrainings = 0;

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
                    leave.type === '夏' ? '夏季休暇' : '希望休',
            isAdditional: false,
          });
          console.log(`   ✓ ${leave.date} (${leave.type})`);
          totalLeaves++;
        } catch (error) {
          console.error(`   ❌ ${leave.date} の登録失敗:`, error);
        }
      }
    }

    // 勤務希望（夜勤・明け）を登録
    if (data.workPrefs.length > 0) {
      console.log("   【勤務希望】");
      for (const pref of data.workPrefs) {
        try {
          await db.insert(workPreferences).values({
            employeeId: employee.id,
            startDate: pref.date,
            endDate: pref.date,
            startTime: pref.startTime || (pref.type === '夜勤' ? '16:00' : '00:00'),
            endTime: pref.endTime || '10:00',
            status: 'approved',
            reason: pref.type,
            isAdditional: false,
          });
          console.log(`   ✓ ${pref.date} (${pref.type})`);
          totalWorkPrefs++;
        } catch (error) {
          console.error(`   ❌ ${pref.date} の登録失敗:`, error);
        }
      }
    }

    // 研修を登録（現時点では表示のみ、後で専用テーブルを作成）
    if (data.trainings.length > 0) {
      console.log("   【研修】※別途管理が必要");
      for (const training of data.trainings) {
        console.log(`   ！ ${training.date} (${training.type})`);
        totalTrainings++;
      }
    }

    if (data.leaves.length === 0 && data.workPrefs.length === 0 && data.trainings.length === 0) {
      console.log("   - データなし");
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`📊 休暇: ${totalLeaves}件`);
  console.log(`📊 勤務希望: ${totalWorkPrefs}件`);
  console.log(`📊 研修: ${totalTrainings}件（別途管理が必要）`);
  console.log(`📊 合計: ${totalLeaves + totalWorkPrefs}件を登録`);
}

clearAndRegisterAll().catch(console.error);