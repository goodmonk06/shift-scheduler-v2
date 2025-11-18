import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { ADMIN_AUTH_COOKIE_NAME, DEFAULT_LOGIN_RATE_LIMIT } from "./_core/constants";

const ADMIN_AUTH_SECRET = ENV.jwtSecret;

// Rate limiter for admin login attempts
export const adminLoginLimiter = rateLimit({
  windowMs: DEFAULT_LOGIN_RATE_LIMIT.ADMIN.WINDOW_MS,
  max: DEFAULT_LOGIN_RATE_LIMIT.ADMIN.MAX_ATTEMPTS,
  message: { error: "ログイン試行回数が多すぎます。15分後に再試行してください。" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export interface AdminAuthUser {
  id: number;
  name: string;
  email: string | null;
  role: "admin";
}

/**
 * 管理者用ログイン
 * メールアドレスのみでログイン（パスワード不要）
 */
export async function adminLogin(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "メールアドレスを入力してください" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "データベースに接続できません" });
  }

  try {
    // メールアドレスで管理者を検索（roleがadminのユーザーのみ）
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return res.status(401).json({ error: "管理者が見つかりません" });
    }

    const user = result[0];

    // 管理者権限を確認
    if (user.role !== "admin") {
      return res.status(403).json({ error: "管理者権限がありません" });
    }

    // JWTトークンを生成
    const adminUser: AdminAuthUser = {
      id: user.id,
      name: user.name || '管理者',
      email: user.email || '',
      role: "admin",
    };

    const token = jwt.sign(adminUser, ADMIN_AUTH_SECRET, {
      expiresIn: "7d", // 7日間有効
    });

    // Cookieにトークンを設定
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });

    return res.json({ success: true, user: adminUser });
  } catch (error) {
    console.error("[AdminAuth] Login error:", error);
    return res.status(500).json({ error: "ログインに失敗しました" });
  }
}

/**
 * 管理者用ログアウト
 */
export function adminLogout(req: Request, res: Response) {
  res.clearCookie(ADMIN_AUTH_COOKIE_NAME);
  return res.json({ success: true });
}

/**
 * 管理者用認証ミドルウェア
 */
export function adminAuthMiddleware(req: Request, res: Response, next: Function) {
  const token = req.cookies[ADMIN_AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "認証が必要です" });
  }

  try {
    const user = jwt.verify(token, ADMIN_AUTH_SECRET) as AdminAuthUser;
    (req as any).adminAuthUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "認証トークンが無効です" });
  }
}

/**
 * 現在の管理者情報を取得
 */
export function getAdminAuthUser(req: Request, res: Response) {
  const token = req.cookies[ADMIN_AUTH_COOKIE_NAME];

  if (!token) {
    return res.json({ user: null });
  }

  try {
    const user = jwt.verify(token, ADMIN_AUTH_SECRET) as AdminAuthUser;
    return res.json({ user });
  } catch (error) {
    return res.json({ user: null });
  }
}
