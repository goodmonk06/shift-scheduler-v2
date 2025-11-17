import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { shifts, shiftDetails, employees, workTimeSlots } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

dotenv.config();

interface VacationRequest {
  employeeName: string;
  requests: Record<string, string>; // date -> request type
}

// December 2025 vacation request data - actual data from user
const vacationData: VacationRequest[] = [
  {
    employeeName: "髙野 幹成",
    requests: {} // 全日程空白
  },
  {
    employeeName: "山口 夕香里",
    requests: {
      "12/1": "PM研修", "12/4": "研修1日", "12/7": "休み", "12/10": "研修1日"
    }
  },
  {
    employeeName: "馬渕 尊至",
    requests: {} // 全日程空白
  },
  {
    employeeName: "松嵜 愛梨",
    requests: {
      "12/12": "休み", "12/27": "冬休み", "12/31": "夜", "1/1": "明", "1/2": "休み"
    }
  },
  {
    employeeName: "杉山 美佳子",
    requests: {
      "12/5": "休み", "12/12": "休み", "12/13": "冬休み", "12/19": "休み", "12/26": "休み",
      "1/1": "夜", "1/2": "明", "1/3": "休み"
    }
  },
  {
    employeeName: "梅田 英津子",
    requests: {
      "12/3": "休み", "12/25": "休み", "12/28": "有給", "12/29": "冬休み",
      "12/30": "夜", "12/31": "明", "1/1": "休み", "1/3": "夜", "1/4": "明", "1/5": "休み"
    }
  },
  {
    employeeName: "大橋 健一",
    requests: {
      "12/6": "休み", "12/7": "休み", "12/28": "夜", "12/30": "明", "12/31": "休み",
      "1/2": "夜", "1/3": "明", "1/4": "休み"
    }
  },
  {
    employeeName: "上条 やえ子",
    requests: {
      "12/1": "休み", "12/7": "休み", "12/14": "休み", "12/16": "休み", "12/21": "休み",
      "12/27": "休み", "12/28": "休み", "1/1": "休み", "1/2": "休み", "1/3": "休み", "1/4": "休み"
    }
  },
  {
    employeeName: "若森 直子",
    requests: {
      "12/2": "休み", "12/3": "休み", "12/6": "休み", "12/7": "9時〜14時",
      "12/11": "休み", "12/12": "休み", "12/13": "休み", "12/14": "9時〜14時",
      "12/21": "休み", "12/22": "休み", "12/23": "休み", "12/27": "9時〜14時",
      "12/28": "9時〜14時", "12/29": "休み", "12/30": "休み",
      "1/1": "休み", "1/2": "休み", "1/3": "休み", "1/4": "休み"
    }
  },
  {
    employeeName: "足立 洋子",
    requests: {
      "12/1": "9時〜16時", "12/2": "休み", "12/3": "休み", "12/4": "8時〜16時",
      "12/5": "休み", "12/6": "休み", "12/7": "休み", "12/8": "9時〜16時",
      "12/9": "休み", "12/10": "休み", "12/11": "8時〜16時", "12/12": "休み",
      "12/13": "休み", "12/14": "休み", "12/15": "9時〜16時", "12/16": "休み",
      "12/17": "休み", "12/18": "8時〜16時", "12/19": "休み", "12/20": "休み",
      "12/21": "休み", "12/22": "9時〜16時", "12/23": "休み", "12/24": "休み",
      "12/25": "8時〜16時", "12/26": "休み", "12/27": "休み", "12/28": "休み",
      "12/29": "9時〜16時", "12/30": "休み", "12/31": "休み",
      "1/1": "8時〜13時", "1/2": "休み", "1/3": "休み", "1/4": "休み", "1/5": "9時〜16時"
    }
  },
  {
    employeeName: "野仲 彩香",
    requests: {
      "12/1": "8時半〜12時半", "12/2": "8時半〜12時半", "12/3": "休み",
      "12/4": "8時半〜13時", "12/5": "8時半〜12時半", "12/6": "休み",
      "12/7": "休み", "12/8": "8時半〜13時", "12/9": "休み",
      "12/10": "8時半〜12時半", "12/11": "8時半〜12時半", "12/12": "8時半〜13時",
      "12/13": "休み", "12/14": "休み", "12/15": "8時半〜13時",
      "12/16": "休み", "12/17": "8時半〜12時半", "12/18": "8時半〜12時半",
      "12/19": "8時〜12時半", "12/20": "休み", "12/21": "休み",
      "12/22": "8時半〜13時", "12/23": "8時半〜13時", "12/24": "8時半〜13時",
      "12/25": "休み", "12/26": "8時半〜12時半", "12/27": "休み",
      "12/28": "休み", "12/29": "休み", "12/30": "休み", "12/31": "休み",
      "1/1": "休み", "1/2": "休み", "1/3": "休み", "1/4": "休み"
    }
  },
  {
    employeeName: "桂川 美幸",
    requests: {
      "12/1": "18時〜20時", "12/2": "休み", "12/3": "18時〜20時", "12/4": "休み",
      "12/5": "18時〜20時", "12/6": "休み", "12/7": "18時〜20時", "12/8": "18時〜20時",
      "12/9": "休み", "12/10": "18時〜20時", "12/11": "休み", "12/12": "18時〜20時",
      "12/13": "休み", "12/14": "18時〜20時", "12/15": "18時〜20時", "12/16": "休み",
      "12/17": "18時〜20時", "12/18": "休み", "12/19": "18時〜20時", "12/20": "休み",
      "12/21": "18時〜20時", "12/22": "18時〜20時", "12/23": "休み", "12/24": "18時〜20時",
      "12/25": "休み", "12/26": "18時〜20時", "12/27": "休み", "12/28": "18時〜20時",
      "12/29": "18時〜20時", "12/30": "18時〜20時", "12/31": "18時〜20時",
      "1/1": "18時〜20時", "1/2": "休み", "1/3": "休み", "1/4": "18時〜20時", "1/5": "18時〜20時"
    }
  },
  {
    employeeName: "加藤 広大",
    requests: {
      "12/1": "休み", "12/2": "休み", "12/3": "休み", "12/4": "11時〜20時",
      "12/5": "休み", "12/6": "11時〜20時", "12/7": "休み", "12/8": "休み",
      "12/9": "休み", "12/10": "休み", "12/11": "休み", "12/12": "休み",
      "12/13": "11時〜20時", "12/14": "休み", "12/15": "休み", "12/16": "休み",
      "12/17": "休み", "12/18": "11時〜20時", "12/19": "休み", "12/20": "11時〜20時",
      "12/21": "休み", "12/22": "休み", "12/23": "休み", "12/24": "休み",
      "12/25": "11時〜20時", "12/26": "休み", "12/27": "11時〜20時", "12/28": "休み",
      "1/3": "11時〜20時", "1/4": "休み", "1/5": "休み"
    }
  },
  {
    employeeName: "湯本 智子",
    requests: {
      "12/3": "休み", "12/5": "休み", "12/6": "9時〜18時", "12/7": "9時〜18時",
      "12/10": "休み", "12/11": "休み", "12/13": "9時〜18時", "12/14": "9時〜18時",
      "12/17": "休み", "12/19": "休み", "12/20": "9時〜18時", "12/21": "9時〜18時",
      "12/27": "9時〜18時", "12/28": "9時〜18時"
    }
  },
  {
    employeeName: "楠 美佐",
    requests: {
      "12/1": "9時〜16時", "12/2": "休み", "12/3": "休み", "12/4": "9時〜12時",
      "12/5": "13時〜16時", "12/6": "休み", "12/7": "休み", "12/8": "9時〜16時",
      "12/9": "休み", "12/10": "休み", "12/11": "休み", "12/12": "13時〜16時",
      "12/13": "休み", "12/14": "休み", "12/15": "9時〜16時", "12/16": "休み",
      "12/17": "休み", "12/18": "9時〜16時", "12/19": "9時〜12時", "12/20": "休み",
      "12/21": "休み", "12/22": "9時〜12時", "12/23": "休み", "12/24": "休み",
      "12/25": "13時〜16時", "12/26": "13時〜16時", "12/27": "休み", "12/28": "休み",
      "12/29": "休み", "12/30": "休み", "12/31": "9時〜12時",
      "1/1": "休み", "1/2": "休み", "1/3": "9時〜12時", "1/4": "休み"
    }
  },
  {
    employeeName: "平井 英子",
    requests: {
      "12/1": "休み", "12/2": "休み", "12/3": "10時〜16時", "12/4": "休み",
      "12/5": "10時〜16時", "12/6": "休み", "12/7": "休み", "12/8": "休み",
      "12/9": "休み", "12/10": "10時〜16時", "12/11": "休み", "12/12": "10時〜16時",
      "12/13": "休み", "12/14": "休み", "12/15": "休み", "12/16": "休み",
      "12/17": "10時〜16時", "12/18": "休み", "12/19": "10時〜16時", "12/20": "休み",
      "12/21": "休み", "12/22": "休み", "12/23": "休み", "12/24": "10時〜16時",
      "12/25": "休み", "12/26": "10時〜16時", "12/27": "休み", "12/28": "休み",
      "12/29": "休み", "12/30": "休み", "12/31": "10時〜16時",
      "1/1": "休み", "1/2": "休み", "1/3": "休み", "1/4": "休み", "1/5": "休み"
    }
  },
  {
    employeeName: "海野 はるか",
    requests: {
      "12/1": "休み", "12/2": "9時〜14時", "12/3": "9時〜14時", "12/4": "休み",
      "12/5": "9時〜14時", "12/6": "休み", "12/7": "休み", "12/8": "9時〜13時",
      "12/9": "9時〜13時", "12/10": "休み", "12/11": "9時〜13時", "12/12": "9時〜13時",
      "12/13": "休み", "12/14": "休み", "12/15": "9時〜14時", "12/16": "休み",
      "12/17": "9時〜12時", "12/18": "9時〜14時", "12/19": "9時〜14時", "12/20": "休み",
      "12/21": "休み", "12/22": "9時〜14時", "12/23": "9時〜14時", "12/24": "9時〜14時",
      "12/25": "休み", "12/26": "9時〜14時", "12/27": "休み", "12/28": "休み",
      "12/29": "休み", "12/30": "9時〜14時",
      "1/3": "休み", "1/4": "休み"
    }
  },
  {
    employeeName: "山田 明美",
    requests: {
      "12/2": "休み", "12/4": "休み", "12/6": "9時〜15時", "12/7": "休み",
      "12/9": "休み", "12/16": "休み", "12/18": "休み", "12/25": "休み",
      "12/30": "休み", "1/2": "休み"
    }
  },
  {
    employeeName: "足立 豊子",
    requests: {
      "12/3": "休み", "12/6": "有給", "12/7": "休み", "12/9": "休み", "12/10": "休み",
      "12/18": "9時〜17時", "12/24": "休み", "12/25": "9時〜17時", "12/27": "休み",
      "12/28": "休み", "12/29": "休み", "12/30": "休み",
      "1/1": "休み", "1/2": "有給", "1/3": "休み", "1/4": "休み"
    }
  },
  {
    employeeName: "関田 あゆみ",
    requests: {
      "12/1": "9時〜15時", "12/2": "休み", "12/3": "有給", "12/4": "9時〜15時",
      "12/5": "9時〜16時", "12/6": "休み", "12/7": "休み", "12/8": "9時〜15時",
      "12/9": "9時〜15時", "12/10": "9時〜13時", "12/11": "9時〜13時",
      "12/12": "9時〜13時", "12/13": "休み", "12/14": "休み", "12/15": "9時〜13時",
      "12/16": "9時〜15時", "12/17": "有給", "12/18": "9時〜15時", "12/19": "9時〜16時",
      "12/21": "休み", "12/22": "休み", "12/25": "休み", "12/27": "休み", "12/28": "休み",
      "1/1": "休み", "1/2": "休み", "1/4": "休み", "1/5": "休み"
    }
  },
  {
    employeeName: "長山 真梨奈",
    requests: {
      "12/1": "休み", "12/2": "9時〜14時", "12/3": "9時〜14時", "12/4": "9時〜14時",
      "12/5": "休み", "12/6": "休み", "12/7": "休み", "12/8": "9時〜14時",
      "12/9": "9時〜14時", "12/10": "休み", "12/11": "9時〜12時半", "12/12": "9時〜12時半",
      "12/13": "休み", "12/14": "休み", "12/15": "9時〜13時", "12/16": "休み",
      "12/17": "9時〜13時", "12/18": "9時〜13時", "12/19": "休み", "12/20": "休み",
      "12/21": "休み", "12/22": "9時〜14時", "12/23": "9時〜14時", "12/24": "休み",
      "12/25": "9時〜14時", "12/26": "9時〜14時", "12/27": "休み", "12/28": "休み",
      "12/29": "休み", "12/30": "休み", "12/31": "9時〜12時半",
      "1/1": "休み", "1/2": "9時〜12時半", "1/3": "9時〜12時半", "1/4": "休み", "1/5": "休み"
    }
  },
  {
    employeeName: "近藤 由美子",
    requests: {
      "12/1": "休み", "12/2": "休み", "12/3": "休み", "12/4": "休み", "12/5": "9時〜13時",
      "12/6": "休み", "12/7": "休み", "12/8": "休み", "12/9": "休み", "12/10": "休み",
      "12/11": "休み", "12/12": "9時〜13時", "12/13": "休み", "12/14": "休み",
      "12/15": "休み", "12/16": "休み", "12/17": "休み", "12/18": "休み",
      "12/19": "9時〜13時", "12/20": "休み", "12/21": "休み", "12/22": "休み",
      "12/23": "休み", "12/24": "休み", "12/25": "休み", "12/26": "9時〜13時",
      "12/27": "休み", "12/28": "休み", "12/29": "休み", "12/30": "休み", "12/31": "休み",
      "1/1": "休み", "1/2": "休み", "1/3": "休み", "1/4": "休み", "1/5": "休み"
    }
  },
  {
    employeeName: "大堀SHIRLEY TAN",
    requests: {} // 全日程空白 (明日入力予定)
  },
  {
    employeeName: "宝本 龍騎",
    requests: {
      "12/1": "10時〜15時", "12/2": "休み", "12/3": "10時〜14時", "12/4": "休み",
      "12/5": "休み", "12/6": "休み", "12/7": "10時〜14時", "12/8": "休み",
      "12/9": "10時〜14時", "12/10": "休み", "12/11": "休み", "12/12": "10時〜14時",
      "12/13": "10時〜14時", "12/14": "休み", "12/15": "休み", "12/16": "休み",
      "12/17": "10時〜15時", "12/18": "10時〜14時", "12/19": "休み", "12/20": "10時〜15時",
      "12/21": "10時〜14時", "12/22": "休み", "12/23": "休み", "12/24": "休み",
      "12/25": "10時〜14時", "12/26": "休み", "12/27": "10時〜14時", "12/28": "休み",
      "12/29": "10時〜14時"
    }
  },
  {
    employeeName: "岩崎 亜友美",
    requests: {
      "12/1": "8時〜17時", "12/2": "8時〜17時", "12/3": "休み", "12/4": "休み",
      "12/5": "8時〜17時", "12/6": "8時〜17時", "12/7": "休み", "12/8": "休み",
      "12/9": "8時〜17時", "12/10": "8時〜17時", "12/11": "休み", "12/12": "休み",
      "12/13": "8時〜17時", "12/14": "休み", "12/15": "休み", "12/16": "8時〜17時",
      "12/17": "休み", "12/18": "8時〜17時", "12/19": "休み", "12/20": "8時〜17時",
      "12/21": "休み", "12/22": "休み", "12/23": "8時〜17時", "12/24": "8時〜17時",
      "12/25": "休み", "12/26": "休み", "12/27": "8時〜17時", "12/28": "休み",
      "12/29": "8時〜17時", "12/30": "8時〜17時", "12/31": "休み",
      "1/1": "8時〜17時", "1/2": "休み", "1/3": "8時〜17時", "1/4": "休み", "1/5": "8時〜17時"
    }
  },
  {
    employeeName: "伊藤 美穂",
    requests: {} // ずっと休職
  },
  {
    employeeName: "淺野 穂菜美",
    requests: {
      "12/1": "8時〜16時半", "12/2": "8時〜16時半", "12/3": "8時〜16時半", "12/4": "休み",
      "12/5": "8時〜16時半", "12/6": "休み", "12/7": "休み", "12/8": "8時〜16時半",
      "12/9": "8時〜16時半", "12/10": "8時〜16時半", "12/11": "休み", "12/12": "8時〜16時半",
      "12/13": "休み", "12/14": "休み", "12/15": "8時〜16時半", "12/16": "8時〜16時半",
      "12/17": "休み", "12/18": "休み", "12/19": "8時〜16時半", "12/20": "休み",
      "12/21": "休み", "12/22": "8時〜16時半", "12/23": "8時〜16時半", "12/24": "休み",
      "12/25": "休み", "12/26": "8時〜16時半", "12/27": "休み", "12/28": "休み",
      "12/29": "8時〜16時半", "12/30": "8時〜16時半", "12/31": "8時〜16時半",
      "1/1": "休み", "1/2": "休み", "1/3": "8時〜16時半", "1/4": "8時〜16時半", "1/5": "8時〜16時半"
    }
  }
];

// Parse date string (MM/DD or M/D format) to YYYY-MM-DD
function parseDate(dateStr: string, year: number = 2025): string {
  const [month, day] = dateStr.split('/').map(Number);
  // If month is January, it's next year (2026)
  const actualYear = month === 1 ? year + 1 : year;
  return `${actualYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface ParsedRequest {
  status: 'working' | 'off' | 'requested_off';
  timeSlotName?: string;
  leaveType?: '休' | '有休' | '時間指定';
  startTime?: string;
  endTime?: string;
}

// Parse time string (e.g., "8時半", "16時半") to HH:MM format
function parseTimeString(timeStr: string): string {
  // Handle "半" (half hour)
  const halfHourMatch = timeStr.match(/(\d+)時半/);
  if (halfHourMatch) {
    const hour = parseInt(halfHourMatch[1]);
    return `${String(hour).padStart(2, '0')}:30`;
  }

  // Handle regular hour
  const hourMatch = timeStr.match(/(\d+)時/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1]);
    return `${String(hour).padStart(2, '0')}:00`;
  }

  // Handle colon format (e.g., "8:00")
  const colonMatch = timeStr.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const hour = parseInt(colonMatch[1]);
    const minute = parseInt(colonMatch[2]);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return timeStr;
}

// Parse time range (e.g., "9時〜14時", "8時半〜12時半") to request details
function parseTimeRange(timeStr: string): ParsedRequest | null {
  // Check for empty
  if (timeStr === "空白" || timeStr === "") return null;

  // Check for various types of leave
  if (timeStr === "休み" || timeStr === "冬休み" || timeStr === "冬") {
    return { status: 'requested_off', leaveType: '休' };
  }
  if (timeStr === "有給") {
    return { status: 'requested_off', leaveType: '有休' };
  }
  if (timeStr === "PM研修" || timeStr === "研修1日" || timeStr === "1時間休") {
    return { status: 'requested_off', leaveType: '休' };
  }

  // Check for special shifts
  if (timeStr === "夜" || timeStr === "夜勤") return { status: 'working', timeSlotName: '夜' };
  if (timeStr === "明" || timeStr === "明け") return { status: 'working', timeSlotName: '明' };

  // Parse time ranges - various formats
  const timeRangeMatch = timeStr.match(/([0-9]+時?半?|[0-9]+:[0-9]+)[〜～〜]([0-9]+時?半?|[0-9]+:[0-9]+)/);
  if (timeRangeMatch) {
    const startTime = parseTimeString(timeRangeMatch[1]);
    const endTime = parseTimeString(timeRangeMatch[2]);

    // Try to match with existing time slots
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    if (startHour === 7 && endHour === 15) return { status: 'working', timeSlotName: '早' };

    // Return as time-specified work
    return {
      status: 'working',
      leaveType: '時間指定',
      startTime: startTime,
      endTime: endTime
    };
  }

  return null;
}

async function importVacationRequests() {
  console.log('Starting December vacation request import...');

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  const db = drizzle(connection);

  try {
    // First, get all employees from database
    const allEmployees = await db.select().from(employees);
    const employeeMap = new Map(allEmployees.map(e => [e.name, e.id]));

    // Get or create the December 2025 shift
    let existingShifts = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.year, 2025),
        eq(shifts.month, 12)
      ));

    let shift = existingShifts[0];

    if (!shift) {
      const result = await db.insert(shifts).values({
        year: 2025,
        month: 12,
        name: '2025年12月シフト',
        status: 'vacation_only' // Special status for vacation requests only
      });

      // Get the created shift
      existingShifts = await db
        .select()
        .from(shifts)
        .where(and(
          eq(shifts.year, 2025),
          eq(shifts.month, 12)
        ));
      shift = existingShifts[0];
      console.log('Created December 2025 shift');
    }

    // Clear existing vacation requests for this shift (for clean import)
    await db
      .delete(shiftDetails)
      .where(and(
        eq(shiftDetails.shiftId, shift.id),
        eq(shiftDetails.generatedBy, 'leave_request')
      ));
    console.log('Cleared existing vacation requests');

    // Get all work time slots for lookup
    const allTimeSlots = await db.select().from(workTimeSlots);
    const timeSlotMap = new Map(allTimeSlots.map(ts => [ts.displayLabel, ts.id]));

    // Process each employee's vacation requests
    let totalRequests = 0;
    for (const data of vacationData) {
      const employeeId = employeeMap.get(data.employeeName);
      if (!employeeId) {
        console.warn(`Employee not found in database: ${data.employeeName}`);
        continue;
      }

      console.log(`Processing requests for ${data.employeeName}...`);

      for (const [dateStr, requestType] of Object.entries(data.requests)) {
        const date = parseDate(dateStr);
        const requestDetails = parseTimeRange(requestType);

        if (!requestDetails) {
          console.log(`  Skipping empty request for ${dateStr}`);
          continue;
        }

        // Look up time slot ID if needed
        let timeSlotId = null;
        if (requestDetails.timeSlotName) {
          timeSlotId = timeSlotMap.get(requestDetails.timeSlotName) || null;
          if (!timeSlotId && requestDetails.status === 'working') {
            console.warn(`  Time slot not found: ${requestDetails.timeSlotName}`);
            continue;
          }
        }

        // Create the vacation request assignment
        await db.insert(shiftDetails).values({
          shiftId: shift.id,
          employeeId: employeeId,
          date: date,
          status: requestDetails.status,
          timeSlotId: timeSlotId,
          leaveType: requestDetails.leaveType || null,
          startTime: requestDetails.startTime || null,
          endTime: requestDetails.endTime || null,
          generatedBy: 'leave_request',
          isChanged: false
        });

        totalRequests++;
        const displayText = requestDetails.timeSlotName ||
                           requestDetails.leaveType ||
                           (requestDetails.startTime ? `${requestDetails.startTime}-${requestDetails.endTime}` : '?');
        console.log(`  Added: ${dateStr} (${date}) -> ${displayText}`);
      }
    }

    console.log(`\n✅ Import completed successfully!`);
    console.log(`Total requests imported: ${totalRequests}`);
    console.log(`Shift status: ${shift.status}`);
    console.log(`Shift ID: ${shift.id}`);

  } catch (error) {
    console.error('Error importing vacation requests:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the import
importVacationRequests()
  .then(() => {
    console.log('Import script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import script failed:', error);
    process.exit(1);
  });