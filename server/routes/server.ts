import { Router } from "express";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import rateLimit from "express-rate-limit";

const router = Router();

// レート制限: 1分間に最大10リクエスト
const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 10,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

interface ServerStats {
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    tables: number;
    totalRecords: number;
    lastBackup: string;
  };
  security: {
    sslEnabled: boolean;
    ipWhitelistEnabled: boolean;
    lastPasswordChange: string;
  };
}

/**
 * データベース統計を取得
 */
async function getDatabaseStats(db: any) {
  try {
    // テーブル数を取得
    const tablesResult = await db.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'defaultdb'
    `);
    const tableCount = tablesResult[0]?.count || 0;

    // 主要テーブルのレコード数を取得（並列処理）
    const [
      usersResult,
      employeesResult,
      shiftsResult,
      shiftDetailsResult,
      leaveRequestsResult,
      positionGroupsResult,
      workTimeSlotsResult,
    ] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM users"),
      db.execute("SELECT COUNT(*) as count FROM employees"),
      db.execute("SELECT COUNT(*) as count FROM shifts"),
      db.execute("SELECT COUNT(*) as count FROM shiftDetails"),
      db.execute("SELECT COUNT(*) as count FROM leaveRequests"),
      db.execute("SELECT COUNT(*) as count FROM positionGroups"),
      db.execute("SELECT COUNT(*) as count FROM workTimeSlots"),
    ]);

    const totalRecords =
      (usersResult[0]?.count || 0) +
      (employeesResult[0]?.count || 0) +
      (shiftsResult[0]?.count || 0) +
      (shiftDetailsResult[0]?.count || 0) +
      (leaveRequestsResult[0]?.count || 0) +
      (positionGroupsResult[0]?.count || 0) +
      (workTimeSlotsResult[0]?.count || 0);

    return {
      tables: tableCount,
      totalRecords,
      lastBackup: new Date().toISOString(), // Aivenは自動バックアップ
    };
  } catch (error) {
    console.error("[DatabaseStats] Error fetching database stats:", error);
    throw error;
  }
}

/**
 * サーバー統計を取得
 * GET /api/server/stats
 */
router.get("/stats", statsLimiter, async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("[ServerStats] Fetching server statistics...");

    const db = await getDb();
    if (!db) {
      console.error("[ServerStats] Database connection failed");
      return res.status(500).json({ error: "Database connection failed" });
    }

    // データベース統計を取得
    const databaseStats = await getDatabaseStats(db);

    const stats: ServerStats = {
      // ストレージ: 固定値（Aivenの現在の値）
      storage: {
        used: 298, // MB
        total: 1024, // 1GB
        percentage: 29.1,
      },
      // メモリ: 固定値（Aivenの現在の値）
      memory: {
        used: 492, // MB
        total: 1024, // 1GB
        percentage: 48.0,
      },
      // データベース統計: 動的に取得
      database: databaseStats,
      // セキュリティ設定: 固定値（Aiven管理画面で手動確認）
      security: {
        sslEnabled: true, // Aivenは常にSSL有効
        ipWhitelistEnabled: false, // Aiven管理画面で確認して更新
        lastPasswordChange: "2025-01-15", // 最後にパスワード変更した日
      },
    };

    const duration = Date.now() - startTime;
    console.log(`[ServerStats] Fetched successfully in ${duration}ms`);

    res.json(stats);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ServerStats] Error after ${duration}ms:`, error);

    // 詳細なエラー情報を返さない（セキュリティのため）
    res.status(500).json({
      error: "Failed to fetch server statistics",
    });
  }
});

export default router;
