/**
 * 12月シフト生成データをDBにインポートするスクリプト
 *
 * 実行方法:
 * DATABASE_URL='...' pnpm tsx server/scripts/importDecemberData.ts
 *
 * 注意: DecemberShiftGeneration.tsx は一切変更しません
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import {
  employees,
  positionGroups,
  requiredStaffing,
  workplaceRules,
} from "../../drizzle/schema";

// ========================================
// 12月シフト生成からコピーしたデータ
// (DecemberShiftGeneration.tsx から抽出)
// ========================================

// 配置基準マトリクス（曜日別・30分刻み、48分割）
const REQUIRED_STAFF_BY_DAY = [
  // 日曜日 (0)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 4,4, 4,4, 4,4, 2,2, 3,3, 3,3, 3,3, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 月曜日 (1)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 8,8, 6,6, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 火曜日 (2)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 8,8, 2,2, 7,7, 6,6, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 水曜日 (3)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 8,8, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 木曜日 (4)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 6,6, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 金曜日 (5)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 土曜日 (6)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 6,6, 5,5, 6,6, 2,2, 6,6, 4,4, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1]
];

// 職員データ (constraintsのみ抽出)
// 日本語形式でAIが直接読み取れるフォーマット
interface StaffConstraints {
  name: string;
  constraints: any;
}

const STAFF_CONSTRAINTS: StaffConstraints[] = [
  // 正社員（フルタイム）
  { name: '髙野 幹成', constraints: { fixedTimeOnly: true, breakTime: 1 } },
  { name: '山口 夕香里', constraints: { defaultShift: '9～18', breakTime: 1 } },
  { name: '馬渕 尊至', constraints: { randomShifts: ['早', '8～17', '9～18'], forbiddenShifts: ['夜勤'], breakTime: 1 } },
  { name: '松嵜 愛梨', constraints: { defaultShift: '9～18', breakTime: 1 } },
  { name: '杉山 美佳子', constraints: { defaultShift: '9～18', specialRuleId: 'SUGIYAMA_FRIDAY', breakTime: 1 } },
  { name: '梅田 英津子', constraints: { defaultShift: '9～18', forbiddenShifts: ['遅番', '11～20'], breakTime: 1 } },
  { name: '大橋 健一', constraints: { defaultShift: '9～18', nightShiftTarget: 9, specialRuleId: 'OHASHI_NIGHT_COMBO', breakTime: 1 } },

  // パート（曜日・時間固定）
  { name: '上条 やえ子', constraints: { monthlyWorkDays: 18, defaultShift: '8～16', monthlyShiftCounts: { '9～15': 2 }, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '若森 直子', constraints: { monthlyWorkDays: 13, defaultShift: '8～14', monthlyShiftCounts: { '8～10': 1 }, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '足立 洋子', constraints: { fixedDays: { '月': '9～16', '木': '8～16' }, offDays: ['日', '火', '水', '金', '土'], fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '野仲 彩香', constraints: { defaultShift: '8半～13半', fixedTimeOnly: true, breakTime: 0 } },
  { name: '桂川 美幸', constraints: { fixedDays: { '月': '18～20', '水': '18～20', '金': '18～20', '日': '18～20' }, offDays: ['火', '木', '土'], fixedTimeOnly: true, breakTime: 0 } },
  { name: '加藤 広大', constraints: { fixedDays: { '水': '11～20', '土': '11～20' }, offDays: ['火'], defaultShift: '9～18', fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '湯本 智子', constraints: { defaultShift: '9～18', weeklyWorkDays: 4, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '楠 美佐', constraints: { holidayOff: true, offDays: ['日', '火', '土'], defaultShift: '9～16', fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '平井 英子', constraints: { fixedDays: { '水': '10～16', '金': '10～16' }, offDays: ['日', '月', '火', '木', '土'], fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 0.5 } } },
  { name: '海野 はるか', constraints: { holidayOff: true, offDays: ['日', '土'], defaultShift: '9～14', fixedTimeOnly: true, breakTimeRule: { threshold: 5, duration: 0.5 } } },
  { name: '山田 明美', constraints: { defaultShift: '9～15', monthlyWorkDays: 15, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '足立 豊子', constraints: { defaultShift: '9～17', monthlyWorkDays: 18, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '関田 あゆみ', constraints: { holidayOff: true, offDays: ['日', '土'], fixedDays: { '月': '9～15', '火': '9～15', '木': '9～15', '水': '9～16', '金': '9～16' }, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '長山 真梨奈', constraints: { holidayOff: true, offDays: ['日', '土'], defaultShift: '9～13半', fixedTimeOnly: true, breakTime: 0 } },
  { name: '近藤 由美子', constraints: { weeklyWorkDays: 1, defaultShift: '9～13', fixedTimeOnly: true, breakTime: 0 } },
  { name: '大堀SHIRLEY TAN', constraints: { holidayOff: true, offDays: ['日', '土'], weeklyWorkDays: 4, defaultShift: '9～18', fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '宝本 龍騎', constraints: { defaultShift: '10～14', weeklyWorkDays: 3, fixedTimeOnly: true, breakTime: 0 } },
  { name: '岩崎 亜友美', constraints: { offDays: ['日', '水', '土'], defaultShift: '8～17', weeklyWorkDays: 4, fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
  { name: '伊藤 美穂', constraints: { offDays: ['日', '月', '水', '金'], fixedDays: { '火': '11半～17', '木': '11半～17', '土': '11半～17' }, fixedTimeOnly: true, breakTime: 0 } },
  { name: '淺野 穂菜美', constraints: { holidayOff: true, offDays: ['日', '木', '土'], defaultShift: '8～16半', fixedTimeOnly: true, breakTimeRule: { threshold: 6, duration: 1 } } },
];

// 管理者として人数カウント除外する役職名
const ADMIN_POSITION_NAMES = ['施設長', '管理者兼サ責'];

// 職場ルール定数
const WORKPLACE_RULES = {
  REQUIRED_HOLIDAYS_FULLTIME: 9, // 正社員の公休数
  MAX_CONSECUTIVE_WORK_DAYS: 4,  // 最大連勤数
};

// ========================================
// インポート処理
// ========================================

async function main() {
  const connectionString = process.env.DATABASE_URL?.replace(/[?&]ssl-mode=[^&]*/g, '');
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const db = drizzle(connectionString);

  try {
    // 1. 必要人数マトリクスをインポート
    console.log("\n=== Importing required staffing matrix ===");
    await importRequiredStaffing(db);

    // 2. 職員の制約をインポート
    console.log("\n=== Importing employee constraints ===");
    await importEmployeeConstraints(db);

    // 3. 役職グループの管理者フラグを更新
    console.log("\n=== Updating position group admin flags ===");
    await updatePositionGroupAdminFlags(db);

    // 4. 職場ルールをインポート
    console.log("\n=== Importing workplace rules ===");
    await importWorkplaceRules(db);

    console.log("\n=== Import completed successfully! ===");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

async function importRequiredStaffing(db: ReturnType<typeof drizzle>) {
  // 既存データを削除
  await db.delete(requiredStaffing);
  console.log("Cleared existing required staffing data");

  let count = 0;
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayData = REQUIRED_STAFF_BY_DAY[dayOfWeek];
    for (let slot = 0; slot < 48; slot++) {
      const hour = Math.floor(slot / 2);
      const halfHour = (slot % 2) * 30;
      const requiredCount = dayData[slot];

      await db.insert(requiredStaffing).values({
        dayOfWeek,
        hour,
        halfHour,
        requiredCount,
      });
      count++;
    }
  }
  console.log(`Imported ${count} required staffing records (7 days x 48 slots)`);
}

async function importEmployeeConstraints(db: ReturnType<typeof drizzle>) {
  // 既存の職員を取得
  const existingEmployees = await db.select().from(employees);
  console.log(`Found ${existingEmployees.length} employees in database`);

  let updated = 0;
  let notFound = 0;

  for (const staffData of STAFF_CONSTRAINTS) {
    // 名前で職員を検索
    const employee = existingEmployees.find(e => e.name === staffData.name);

    if (employee) {
      // constraintsをJSON形式で保存
      await db.update(employees)
        .set({ additionalConstraints: staffData.constraints })
        .where(eq(employees.id, employee.id));
      console.log(`  Updated: ${staffData.name}`);
      updated++;
    } else {
      console.log(`  Not found in DB: ${staffData.name}`);
      notFound++;
    }
  }

  console.log(`Updated ${updated} employees, ${notFound} not found`);
}

async function updatePositionGroupAdminFlags(db: ReturnType<typeof drizzle>) {
  // 管理者役職を検索して isExcludedFromCount を true に設定
  const groups = await db.select().from(positionGroups);

  for (const group of groups) {
    const isAdmin = ADMIN_POSITION_NAMES.includes(group.name);
    if (isAdmin) {
      // Note: isExcludedFromCount カラムが本番DBに存在しない場合はエラーになる
      // その場合はALTER TABLEで追加が必要
      try {
        await db.update(positionGroups)
          .set({ isExcludedFromCount: true } as any)
          .where(eq(positionGroups.id, group.id));
        console.log(`  Set isExcludedFromCount=true for: ${group.name}`);
      } catch (e) {
        console.log(`  Warning: Could not update ${group.name} - isExcludedFromCount column may not exist`);
      }
    }
  }
}

async function importWorkplaceRules(db: ReturnType<typeof drizzle>) {
  // 既存ルールを削除
  await db.delete(workplaceRules);
  console.log("Cleared existing workplace rules");

  // 正社員の公休日数ルール
  await db.insert(workplaceRules).values({
    ruleType: "min_rest_days",
    employmentType: "fulltime",
    ruleValue: { minDays: WORKPLACE_RULES.REQUIRED_HOLIDAYS_FULLTIME },
    description: `正社員は月${WORKPLACE_RULES.REQUIRED_HOLIDAYS_FULLTIME}日以上の公休が必要`,
    isActive: true,
  });
  console.log(`  Added: min_rest_days for fulltime (${WORKPLACE_RULES.REQUIRED_HOLIDAYS_FULLTIME} days)`);

  // 最大連勤日数ルール
  await db.insert(workplaceRules).values({
    ruleType: "max_consecutive_days",
    employmentType: "all",
    ruleValue: { maxDays: WORKPLACE_RULES.MAX_CONSECUTIVE_WORK_DAYS },
    description: `最大${WORKPLACE_RULES.MAX_CONSECUTIVE_WORK_DAYS}日連勤まで`,
    isActive: true,
  });
  console.log(`  Added: max_consecutive_days for all (${WORKPLACE_RULES.MAX_CONSECUTIVE_WORK_DAYS} days)`);
}

main();
