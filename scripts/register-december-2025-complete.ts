/**
 * 2025年12月の全従業員データを登録する完全版スクリプト
 * 希望休、勤務希望（夜勤・明け）、研修を適切に分類して登録
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface EmployeeData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' | '夏' | '冬' }[];
  workPrefs: { date: string; type: '夜勤' | '明け'; startTime?: string; endTime?: string }[];
  trainings: { date: string; type: string; }[];
}

async function registerAllDecemberData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 2025年12月～2026年1月の全データ登録 ===\n");

  // まず既存の12月～1月のデータをクリア
  console.log("📝 既存データをクリア中...");

  await db.delete(leaveRequests).where(
    and(
      gte(leaveRequests.startDate, '2025-12-01'),
      lte(leaveRequests.endDate, '2026-01-05')
    )
  );

  await db.delete(workPreferences).where(
    and(
      gte(workPreferences.startDate, '2025-12-01'),
      lte(workPreferences.endDate, '2026-01-05')
    )
  );

  console.log("✅ 既存データをクリアしました\n");

  // 全従業員のデータ（2025年12月版）
  const employeeData: EmployeeData[] = [
    // 1. 髙野 幹成
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
        { date: "2025-12-07", type: "休" },
      ],
      workPrefs: [],
      trainings: [
        { date: "2025-12-01", type: "PM研修" },
        { date: "2025-12-04", type: "研修1日" },
        { date: "2025-12-10", type: "研修1日" },
      ]
    },

    // 3. 馬渕 尊至
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
        { date: "2025-12-12", type: "休" },
        { date: "2025-12-27", type: "冬" },
        { date: "2026-01-02", type: "休" },
      ],
      workPrefs: [
        { date: "2025-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 5. 杉山 美佳子
    {
      employeeName: "杉山 美佳子",
      leaves: [
        { date: "2025-12-05", type: "休" },
        { date: "2025-12-12", type: "休" },
        { date: "2025-12-13", type: "冬" },
        { date: "2025-12-19", type: "休" },
        { date: "2025-12-26", type: "休" },
        { date: "2026-01-03", type: "休" },
      ],
      workPrefs: [
        { date: "2026-01-01", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-02", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 6. 高本 早記
    {
      employeeName: "高本 早記",
      leaves: [
        { date: "2025-12-03", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-29", type: "休" },
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 7. 清水 博仁
    {
      employeeName: "清水 博仁",
      leaves: [
        { date: "2025-12-10", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-24", type: "休" },
        { date: "2025-12-31", type: "休" },
      ],
      workPrefs: [
        { date: "2025-12-29", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2025-12-30", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 8. 伊藤 朋広
    {
      employeeName: "伊藤 朋広",
      leaves: [
        { date: "2025-12-08", type: "休" },
        { date: "2025-12-15", type: "休" },
        { date: "2025-12-22", type: "休" },
        { date: "2025-12-29", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 9. 山下 千恵
    {
      employeeName: "山下 千恵",
      leaves: [
        { date: "2025-12-28", type: "休" },
        { date: "2025-12-29", type: "休" },
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 10. 村山 絵理
    {
      employeeName: "村山 絵理",
      leaves: [
        { date: "2025-12-02", type: "休" },
        { date: "2025-12-03", type: "休" },
        { date: "2025-12-10", type: "休" },
        { date: "2025-12-20", type: "有休" },
        { date: "2025-12-21", type: "有休" },
        { date: "2025-12-22", type: "有休" },
        { date: "2025-12-23", type: "有休" },
        { date: "2025-12-30", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 11. 三浦 涼平
    {
      employeeName: "三浦 涼平",
      leaves: [
        { date: "2025-12-24", type: "休" },
      ],
      workPrefs: [
        { date: "2025-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 12. 川原 明美
    {
      employeeName: "川原 明美",
      leaves: [
        { date: "2025-12-04", type: "休" },
        { date: "2025-12-11", type: "休" },
        { date: "2025-12-14", type: "休" },
        { date: "2025-12-18", type: "休" },
        { date: "2025-12-25", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 13. 近藤 紗世
    {
      employeeName: "近藤 紗世",
      leaves: [
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
        { date: "2026-01-02", type: "休" },
        { date: "2026-01-03", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 14. 南 紗也加
    {
      employeeName: "南 紗也加",
      leaves: [],
      workPrefs: [
        { date: "2025-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ],
      trainings: []
    },

    // 15. 佐々木 智也
    {
      employeeName: "佐々木 智也",
      leaves: [
        { date: "2025-12-03", type: "休" },
        { date: "2025-12-04", type: "休" },
        { date: "2025-12-11", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-28", type: "夏" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 16. 北野 美雪
    {
      employeeName: "北野 美雪",
      leaves: [
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-18", type: "休" },
        { date: "2025-12-24", type: "休" },
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
        { date: "2026-01-02", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 17. 大堀 友里
    {
      employeeName: "大堀 友里",
      leaves: [
        { date: "2025-12-02", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-23", type: "休" },
        { date: "2025-12-30", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 18. 篠田 進
    {
      employeeName: "篠田 進",
      leaves: [
        { date: "2025-12-06", type: "休" },
        { date: "2025-12-13", type: "休" },
        { date: "2025-12-20", type: "休" },
        { date: "2025-12-27", type: "休" },
        { date: "2026-01-03", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 19. 平田 みゆき
    {
      employeeName: "平田 みゆき",
      leaves: [
        { date: "2025-12-04", type: "有休" },
        { date: "2025-12-11", type: "有休" },
        { date: "2025-12-20", type: "冬" },
        { date: "2025-12-24", type: "冬" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    },

    // 20. 楢﨑 玲奈
    {
      employeeName: "楢﨑 玲奈",
      leaves: [
        { date: "2025-12-13", type: "休" },
      ],
      workPrefs: [],
      trainings: []
    }
  ];

  let totalLeaves = 0;
  let totalWorkPrefs = 0;
  let totalTrainings = 0;
  let successfulEmployees = 0;

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
    console.log(`   職員ID: ${employee.employeeId} (DB ID: ${employee.id})`);
    successfulEmployees++;

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
          console.log(`   ✓ ${pref.date} (${pref.type})`)
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
  console.log(`📊 処理した職員: ${successfulEmployees}/${employeeData.length}人`);
  console.log(`📊 休暇: ${totalLeaves}件`);
  console.log(`📊 勤務希望: ${totalWorkPrefs}件`);
  console.log(`📊 研修: ${totalTrainings}件（別途管理が必要）`);
  console.log(`📊 合計: ${totalLeaves + totalWorkPrefs}件を登録`);

  // 登録結果を確認
  console.log("\n=== 登録結果確認 ===");
  const [leaveCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(leaveRequests)
    .where(
      and(
        gte(leaveRequests.startDate, '2025-12-01'),
        lte(leaveRequests.endDate, '2026-01-05')
      )
    );

  const [workCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(workPreferences)
    .where(
      and(
        gte(workPreferences.startDate, '2025-12-01'),
        lte(workPreferences.endDate, '2026-01-05')
      )
    );

  console.log(`✅ データベースに登録された休暇: ${leaveCount[0].count}件`);
  console.log(`✅ データベースに登録された勤務希望: ${workCount[0].count}件`);
}

// sql import を追加
import { sql } from "drizzle-orm";

registerAllDecemberData().catch(console.error);