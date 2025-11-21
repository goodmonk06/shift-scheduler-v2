/**
 * 既存職員に追加の希望休・希望勤務データを登録するスクリプト
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface EmployeeData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' | '夏' | '冬' }[];
  workPrefs: { date: string; type: '夜勤' | '明け'; startTime?: string; endTime?: string }[];
}

async function addAdditionalData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 追加職員の12月データ登録 ===\n");

  // 既存職員の追加データ
  const additionalData: EmployeeData[] = [
    // 大橋 健一
    {
      employeeName: "大橋 健一",
      leaves: [
        { date: "2025-12-10", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-24", type: "休" },
        { date: "2025-12-31", type: "休" },
      ],
      workPrefs: [
        { date: "2025-12-29", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2025-12-30", type: "明け", startTime: "00:00", endTime: "10:00" },
      ]
    },

    // 伊藤 美穂
    {
      employeeName: "伊藤 美穂",
      leaves: [
        { date: "2025-12-08", type: "休" },
        { date: "2025-12-15", type: "休" },
        { date: "2025-12-22", type: "休" },
        { date: "2025-12-29", type: "休" },
      ],
      workPrefs: []
    },

    // 山田 明美
    {
      employeeName: "山田 明美",
      leaves: [
        { date: "2025-12-28", type: "休" },
        { date: "2025-12-29", type: "休" },
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: []
    },

    // 近藤 由美子
    {
      employeeName: "近藤 由美子",
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
      workPrefs: []
    },

    // 加藤 広大
    {
      employeeName: "加藤 広大",
      leaves: [
        { date: "2025-12-24", type: "休" },
      ],
      workPrefs: [
        { date: "2025-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ]
    },

    // 平井 英子
    {
      employeeName: "平井 英子",
      leaves: [
        { date: "2025-12-04", type: "休" },
        { date: "2025-12-11", type: "休" },
        { date: "2025-12-14", type: "休" },
        { date: "2025-12-18", type: "休" },
        { date: "2025-12-25", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: []
    },

    // 野仲 彩香
    {
      employeeName: "野仲 彩香",
      leaves: [
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
        { date: "2026-01-02", type: "休" },
        { date: "2026-01-03", type: "休" },
      ],
      workPrefs: []
    },

    // 海野 はるか
    {
      employeeName: "海野 はるか",
      leaves: [],
      workPrefs: [
        { date: "2025-12-31", type: "夜勤", startTime: "16:00", endTime: "10:00" },
        { date: "2026-01-01", type: "明け", startTime: "00:00", endTime: "10:00" },
      ]
    },

    // 湯本 智子
    {
      employeeName: "湯本 智子",
      leaves: [
        { date: "2025-12-03", type: "休" },
        { date: "2025-12-04", type: "休" },
        { date: "2025-12-11", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-28", type: "夏" },
      ],
      workPrefs: []
    },

    // 若森 直子
    {
      employeeName: "若森 直子",
      leaves: [
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-18", type: "休" },
        { date: "2025-12-24", type: "休" },
        { date: "2025-12-30", type: "休" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
        { date: "2026-01-02", type: "休" },
      ],
      workPrefs: []
    },

    // 大堀SHIRLEY TAN
    {
      employeeName: "大堀SHIRLEY TAN",
      leaves: [
        { date: "2025-12-02", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-23", type: "休" },
        { date: "2025-12-30", type: "休" },
      ],
      workPrefs: []
    },

    // 関田 あゆみ
    {
      employeeName: "関田 あゆみ",
      leaves: [
        { date: "2025-12-06", type: "休" },
        { date: "2025-12-13", type: "休" },
        { date: "2025-12-20", type: "休" },
        { date: "2025-12-27", type: "休" },
        { date: "2026-01-03", type: "休" },
      ],
      workPrefs: []
    },

    // 宝本 龍騎
    {
      employeeName: "宝本 龍騎",
      leaves: [
        { date: "2025-12-04", type: "有休" },
        { date: "2025-12-11", type: "有休" },
        { date: "2025-12-20", type: "冬" },
        { date: "2025-12-24", type: "冬" },
        { date: "2025-12-31", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: []
    },

    // 楠 美佐
    {
      employeeName: "楠 美佐",
      leaves: [
        { date: "2025-12-13", type: "休" },
      ],
      workPrefs: []
    },

    // 上条 やえ子
    {
      employeeName: "上条 やえ子",
      leaves: [
        { date: "2025-12-09", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-23", type: "休" },
        { date: "2025-12-30", type: "休" },
      ],
      workPrefs: []
    },

    // 足立 豊子
    {
      employeeName: "足立 豊子",
      leaves: [
        { date: "2025-12-05", type: "休" },
        { date: "2025-12-12", type: "休" },
        { date: "2025-12-19", type: "休" },
        { date: "2025-12-26", type: "休" },
      ],
      workPrefs: []
    },

    // 足立 洋子
    {
      employeeName: "足立 洋子",
      leaves: [
        { date: "2025-12-07", type: "休" },
        { date: "2025-12-14", type: "休" },
        { date: "2025-12-21", type: "休" },
        { date: "2025-12-28", type: "休" },
      ],
      workPrefs: []
    },

    // 梅田 英津子
    {
      employeeName: "梅田 英津子",
      leaves: [
        { date: "2025-12-08", type: "休" },
        { date: "2025-12-15", type: "休" },
        { date: "2025-12-22", type: "休" },
        { date: "2025-12-29", type: "休" },
      ],
      workPrefs: []
    },

    // 桂川 美幸
    {
      employeeName: "桂川 美幸",
      leaves: [
        { date: "2025-12-10", type: "休" },
        { date: "2025-12-17", type: "休" },
        { date: "2025-12-24", type: "休" },
        { date: "2025-12-31", type: "休" },
      ],
      workPrefs: []
    },

    // 長山 真梨奈
    {
      employeeName: "長山 真梨奈",
      leaves: [
        { date: "2025-12-11", type: "休" },
        { date: "2025-12-18", type: "休" },
        { date: "2025-12-25", type: "休" },
        { date: "2026-01-01", type: "休" },
      ],
      workPrefs: []
    },

    // 岩崎 亜友美
    {
      employeeName: "岩崎 亜友美",
      leaves: [
        { date: "2025-12-06", type: "休" },
        { date: "2025-12-13", type: "休" },
        { date: "2025-12-20", type: "休" },
        { date: "2025-12-27", type: "休" },
      ],
      workPrefs: []
    },

    // 淺野 穂菜美
    {
      employeeName: "淺野 穂菜美",
      leaves: [
        { date: "2025-12-09", type: "休" },
        { date: "2025-12-16", type: "休" },
        { date: "2025-12-23", type: "休" },
        { date: "2025-12-30", type: "休" },
      ],
      workPrefs: []
    }
  ];

  let totalLeaves = 0;
  let totalWorkPrefs = 0;
  let successfulEmployees = 0;

  for (const data of additionalData) {
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
          // 既存データをチェック
          const existing = await db
            .select()
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.employeeId, employee.id),
                eq(leaveRequests.startDate, leave.date)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            console.log(`   - ${leave.date} (${leave.type}) - 既に登録済み`);
            continue;
          }

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
          // 既存データをチェック
          const existing = await db
            .select()
            .from(workPreferences)
            .where(
              and(
                eq(workPreferences.employeeId, employee.id),
                eq(workPreferences.startDate, pref.date)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            console.log(`   - ${pref.date} (${pref.type}) - 既に登録済み`);
            continue;
          }

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

    if (data.leaves.length === 0 && data.workPrefs.length === 0) {
      console.log("   - データなし");
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`📊 処理した職員: ${successfulEmployees}/${additionalData.length}人`);
  console.log(`📊 休暇: ${totalLeaves}件を追加`);
  console.log(`📊 勤務希望: ${totalWorkPrefs}件を追加`);
  console.log(`📊 合計: ${totalLeaves + totalWorkPrefs}件を登録`);
}

// and import を追加
import { and } from "drizzle-orm";

addAdditionalData().catch(console.error);