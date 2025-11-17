import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

config();

// 職員の個別勤務条件データ
const employeeConstraintsData = [
  {
    name: "杉山 美佳子",
    constraints: {
      weeklyPattern: {
        friday: "offOrNightShift" as const, // 毎週金曜日 休み又は夜勤
      },
      notes: "毎週金曜日は休みまたは夜勤のみ",
    },
  },
  {
    name: "梅田 英津子",
    constraints: {
      shiftTypeConstraints: {
        allowed: ["夜勤", "早番", "日勤A", "日勤B"],
        forbidden: ["遅番"],
      },
      notes: "遅番なし、夜勤・早番・日勤だけ",
    },
  },
  {
    name: "松嵜 愛梨",
    constraints: {
      notes: "条件なし",
    },
  },
  {
    name: "大橋 健一",
    constraints: {
      weeklyPattern: {
        friday: "off" as const, // 毎週金曜日 夜勤無
      },
      shiftTypeConstraints: {
        // 夜勤多め（月9～10回）
      },
      specialRules: {
        canDoConsecutiveNightShifts: true,
        nightShiftPattern: "連続夜勤可能：夜勤・明け・夜勤・明け・休",
        description: "夜勤多め（月9～10回）、連続夜勤パターン可能",
      },
      notes: "毎週金曜日は夜勤不可、夜勤多め（月9～10回）",
    },
  },
  {
    name: "上条 やえ子",
    constraints: {
      workPatterns: [
        {
          startTime: "08:00",
          endTime: "16:00",
          daysPerMonth: 16,
          breakMinutes: 60,
          description: "メイン勤務",
        },
        {
          startTime: "09:00",
          endTime: "15:00",
          daysPerMonth: 2,
          breakMinutes: 60,
          description: "サブ勤務",
        },
      ],
      monthlyHoursTarget: 120,
      monthlyWorkDays: 18,
      notes: "①8時～16時勤務 月16日、②9時～15時勤務 月2日、合計月18日勤務（月120時間労働）",
    },
  },
  {
    name: "若森 直子",
    constraints: {
      workPatterns: [
        {
          startTime: "08:00",
          endTime: "14:00",
          daysPerMonth: 12,
          breakMinutes: 60,
          description: "メイン勤務",
        },
        {
          startTime: "08:00",
          endTime: "10:00",
          daysPerMonth: 1,
          breakMinutes: 0,
          description: "短時間勤務",
        },
      ],
      monthlyWorkDays: 13,
      notes: "①8時～14時勤務 月12日、②8時～10時勤務 月1日、合計月13日勤務",
    },
  },
  {
    name: "足立 洋子",
    constraints: {
      fixedSchedule: {
        monday: {
          startTime: "09:00",
          endTime: "16:00",
          breakMinutes: 60,
        },
        thursday: {
          startTime: "08:00",
          endTime: "16:00",
          breakMinutes: 60,
        },
      },
      notes: "月曜日 9時～16時勤務、木曜日 8時～16時勤務",
    },
  },
  {
    name: "野仲 彩香",
    constraints: {
      workPatterns: [
        {
          startTime: "08:30",
          endTime: "13:30",
          breakMinutes: 0,
          description: "基本勤務",
        },
      ],
      notes: "基本 8時半～13時半勤務、休憩なし",
    },
  },
  {
    name: "桂川 美幸",
    constraints: {
      fixedSchedule: {
        monday: { startTime: "18:00", endTime: "20:00", breakMinutes: 0 },
        wednesday: { startTime: "18:00", endTime: "20:00", breakMinutes: 0 },
        friday: { startTime: "18:00", endTime: "20:00", breakMinutes: 0 },
        sunday: { startTime: "18:00", endTime: "20:00", breakMinutes: 0 },
      },
      notes: "月曜・水曜・金曜・日曜日 18時～20時勤務、休憩なし",
    },
  },
  {
    name: "加藤 広大",
    constraints: {
      weeklyPattern: {
        tuesday: "off" as const, // 火曜日は休
      },
      fixedSchedule: {
        wednesday: { startTime: "11:00", endTime: "20:00", breakMinutes: 60 },
        saturday: { startTime: "11:00", endTime: "20:00", breakMinutes: 60 },
      },
      notes: "水曜・土曜日 11時～20時勤務、火曜日は休み",
    },
  },
  {
    name: "湯本 智子",
    constraints: {
      workPatterns: [
        {
          startTime: "08:00",
          endTime: "18:00",
          breakMinutes: 60,
          description: "8時間労働（8時～18時の間で調整）",
        },
      ],
      weeklyWorkDays: 4,
      weeklyOffDays: 3,
      notes: "8時～18時の間で8時間労働可、11月より週4日勤務・週3日休み（曜日指定なし）",
    },
  },
  {
    name: "楠 美佐",
    constraints: {
      weekendAndHolidayOff: true,
      weeklyPattern: {
        tuesday: "off" as const, // 12月より毎週火曜日休み希望
      },
      notes: "土日祝休み、12月より毎週火曜日休み希望、本人希望シフト",
    },
  },
  {
    name: "平井 英子",
    constraints: {
      fixedSchedule: {
        wednesday: { startTime: "10:00", endTime: "16:00", breakMinutes: 30 },
        friday: { startTime: "10:00", endTime: "16:00", breakMinutes: 30 },
      },
      notes: "毎週 水曜・金曜日 10時～16時勤務、休憩30分",
    },
  },
  {
    name: "海野 はるか",
    constraints: {
      weekendAndHolidayOff: true,
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "14:00",
          breakMinutes: 30,
          description: "平日勤務",
        },
      ],
      notes: "土日祝日休み、9時～14時勤務、休憩30分",
    },
  },
  {
    name: "山田 明美",
    constraints: {
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "15:00",
          daysPerMonth: 14,
          breakMinutes: 60,
          description: "有休を除き月14～15日勤務",
        },
      ],
      monthlyWorkDays: 14,
      notes: "有休を除き9時～15時で月14日～15日勤務",
    },
  },
  {
    name: "足立 豊子",
    constraints: {
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "17:00",
          daysPerMonth: 18,
          breakMinutes: 60,
          description: "月18日勤務",
        },
      ],
      monthlyHoursTarget: 120,
      monthlyWorkDays: 18,
      maxConsecutiveDays: 3,
      specialRules: {
        weekendWorkFollowedByRest: true,
        description: "土日出勤した場合、翌週の土日は休み",
      },
      notes: "9時～17時 月18日勤務（月120時間労働）、①土日出勤時は翌週土日休み、②連勤は最大3日まで",
    },
  },
  {
    name: "関田 あゆみ",
    constraints: {
      weekendAndHolidayOff: true,
      fixedSchedule: {
        monday: { startTime: "09:00", endTime: "15:00", breakMinutes: 60 },
        tuesday: { startTime: "09:00", endTime: "15:00", breakMinutes: 60 },
        wednesday: { startTime: "09:00", endTime: "16:00", breakMinutes: 60 },
        thursday: { startTime: "09:00", endTime: "15:00", breakMinutes: 60 },
        friday: { startTime: "09:00", endTime: "16:00", breakMinutes: 60 },
      },
      notes: "土日祝日休み、月火木：9時～15時勤務、水金：9時～16時勤務",
    },
  },
  {
    name: "長山 真梨奈",
    constraints: {
      weekendAndHolidayOff: true,
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "13:30",
          breakMinutes: 0,
          description: "平日勤務",
        },
      ],
      notes: "土日祝日休み、平日：9時～13時半勤務、休憩なし",
    },
  },
  {
    name: "伊藤 美穂",
    constraints: {
      fixedSchedule: {
        tuesday: { startTime: "11:30", endTime: "17:00", breakMinutes: 0 },
        thursday: { startTime: "11:30", endTime: "17:00", breakMinutes: 0 },
        saturday: { startTime: "11:30", endTime: "17:00", breakMinutes: 0 },
      },
      notes: "毎週火曜・木曜・土曜日 11時半～17時勤務、休憩なし",
    },
  },
  {
    name: "近藤 由美子",
    constraints: {
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "13:00",
          daysPerWeek: 1,
          breakMinutes: 0,
          description: "週1日勤務",
        },
      ],
      weeklyWorkDays: 1,
      notes: "本人希望シフト（週1日 9時～13時）、休憩なし",
    },
  },
  {
    name: "大堀SHIRLEY TAN",
    constraints: {
      weekendAndHolidayOff: true,
      workPatterns: [
        {
          startTime: "09:00",
          endTime: "18:00",
          daysPerWeek: 4,
          breakMinutes: 60,
          description: "週4日勤務",
        },
      ],
      weeklyWorkDays: 4,
      monthlyHoursTarget: 120,
      notes: "土日祝日休み、週4日 9時～18時勤務、本人希望シフト（月120時間労働）",
    },
  },
  {
    name: "宝本 龍騎",
    constraints: {
      workPatterns: [
        {
          startTime: "10:00",
          endTime: "14:00",
          breakMinutes: 0,
          description: "10時～14時（または15時）",
        },
      ],
      notes: "曜日不定 10時～14時（15時）本人希望シフト、休憩なし",
    },
  },
  {
    name: "岩崎 亜友美",
    constraints: {
      weeklyPattern: {
        wednesday: "off" as const,
        saturday: "off" as const,
        sunday: "off" as const,
      },
      workPatterns: [
        {
          startTime: "08:00",
          endTime: "18:00",
          breakMinutes: 60,
          description: "8時間勤務（8時～18時の間で調整）",
        },
      ],
      weeklyWorkDays: 4,
      notes: "8時～18時の間で8時間勤務、週4日、毎週(水)(土)(日)休み",
    },
  },
  {
    name: "淺野 穂菜美",
    constraints: {
      weeklyPattern: {
        thursday: "off" as const,
        saturday: "off" as const,
        sunday: "off" as const,
      },
      holidayOff: true,
      workPatterns: [
        {
          startTime: "08:00",
          endTime: "16:30",
          breakMinutes: 60,
          description: "事務員勤務",
        },
      ],
      notes: "木土日祝は基本休み、8時～16時半勤務",
    },
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  console.log("Setting up employee work constraints...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const data of employeeConstraintsData) {
    try {
      // 職員名で検索
      const result = await db
        .select()
        .from(employees)
        .where(eq(employees.name, data.name));

      if (result.length === 0) {
        console.log(`⚠ Employee not found: ${data.name}`);
        errorCount++;
        continue;
      }

      const employee = result[0];

      // additionalConstraintsを更新
      await db
        .update(employees)
        .set({ additionalConstraints: data.constraints as any })
        .where(eq(employees.id, employee.id));

      console.log(`✓ ${data.name}: Constraints set`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ ${data.name}: ${error.message}`);
      errorCount++;
    }
  }

  await connection.end();
  console.log(`\n✓ Completed: ${successCount} success, ${errorCount} errors`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
