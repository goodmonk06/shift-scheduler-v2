import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { requiredStaffing } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

config();

// 必要人数設定データ
// dayOfWeek: 0=日曜, 1=月曜, 2=火曜, 3=水曜, 4=木曜, 5=金曜, 6=土曜
const requiredStaffingData = [
  // 月曜日 (dayOfWeek: 1)
  { dayOfWeek: 1, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 7, requiredCount: 4, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 8, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 9, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 10, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 11, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 12, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 13, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 14, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 15, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 1, hour: 16, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 17, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 18, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 19, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 20, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 1, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 火曜日 (dayOfWeek: 2)
  { dayOfWeek: 2, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 7, requiredCount: 4, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 8, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 9, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 10, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 11, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 12, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 13, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 14, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 15, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 2, hour: 16, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 17, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 18, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 19, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 20, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 2, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 水曜日 (dayOfWeek: 3)
  { dayOfWeek: 3, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 7, requiredCount: 4, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 8, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 9, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 10, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 11, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 12, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 13, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 14, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 15, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 3, hour: 16, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 17, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 18, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 19, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 20, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 3, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 木曜日 (dayOfWeek: 4)
  { dayOfWeek: 4, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 7, requiredCount: 4, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 8, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 9, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 10, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 11, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 12, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 13, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 14, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 15, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 4, hour: 16, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 17, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 18, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 19, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 20, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 4, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 金曜日 (dayOfWeek: 5)
  { dayOfWeek: 5, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 7, requiredCount: 4, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 8, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 9, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 10, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 11, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 12, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 13, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 14, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 15, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート", "事務員"], officeStaffRequired: 1 },
  { dayOfWeek: 5, hour: 16, requiredCount: 7, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 17, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 18, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 19, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 20, requiredCount: 4, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 5, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 土曜日 (dayOfWeek: 6)
  { dayOfWeek: 6, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 7, requiredCount: 3, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 8, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 9, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 10, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 11, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 12, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 13, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 14, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 15, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 16, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 17, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 18, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 19, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 20, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 6, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },

  // 日曜日 (dayOfWeek: 0)
  { dayOfWeek: 0, hour: 0, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 1, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 2, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 3, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 4, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 5, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 6, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 7, requiredCount: 3, roleGroups: ["正社員（早番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 8, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 9, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 10, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 11, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 12, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 13, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 14, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 15, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 16, requiredCount: 4, roleGroups: ["正社員（早・日A・日B）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 17, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 18, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 19, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 20, requiredCount: 3, roleGroups: ["正社員（遅番）", "パート"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 21, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 22, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
  { dayOfWeek: 0, hour: 23, requiredCount: 2, roleGroups: ["正社員（夜勤）"], officeStaffRequired: 0 },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  console.log("Setting up required staffing data...\n");
  console.log(`Total records to insert: ${requiredStaffingData.length}\n`);

  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const data of requiredStaffingData) {
    try {
      // 既存データを確認
      const existing = await db
        .select()
        .from(requiredStaffing)
        .where(
          and(
            eq(requiredStaffing.dayOfWeek, data.dayOfWeek),
            eq(requiredStaffing.hour, data.hour)
          )
        );

      const staffingDetails = {
        roleGroups: data.roleGroups,
        officeStaffRequired: data.officeStaffRequired,
      };

      if (existing.length === 0) {
        // 新規挿入
        await db.insert(requiredStaffing).values({
          dayOfWeek: data.dayOfWeek,
          hour: data.hour,
          requiredCount: data.requiredCount,
          staffingDetails: staffingDetails as any,
        });
        insertCount++;
      } else {
        // 既存レコードを更新
        await db
          .update(requiredStaffing)
          .set({
            requiredCount: data.requiredCount,
            staffingDetails: staffingDetails as any,
          })
          .where(
            and(
              eq(requiredStaffing.dayOfWeek, data.dayOfWeek),
              eq(requiredStaffing.hour, data.hour)
            )
          );
        updateCount++;
      }

      const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
      const dayName = dayNames[data.dayOfWeek];
      console.log(
        `✓ ${dayName}曜日 ${data.hour}時: ${data.requiredCount}人 (役職: ${data.roleGroups.join("、")})`
      );
    } catch (error: any) {
      const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
      const dayName = dayNames[data.dayOfWeek];
      console.error(
        `✗ ${dayName}曜日 ${data.hour}時: ${error.message || JSON.stringify(error)}`
      );
      console.error("Full error:", error);
      errorCount++;
    }
  }

  await connection.end();
  console.log(
    `\n✓ Completed: ${insertCount} inserted, ${updateCount} updated, ${errorCount} errors`
  );
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
