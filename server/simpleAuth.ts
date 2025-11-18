import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { getDb } from "./db";
import { employees } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { ENV } from "./_core/env";

const SIMPLE_AUTH_COOKIE_NAME = "simple_auth_token";
const SIMPLE_AUTH_SECRET = ENV.jwtSecret;

// Rate limiter for employee login attempts
export const employeeLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs (more lenient than admin)
  message: { error: "ログイン試行回数が多すぎます。15分後に再試行してください。" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export interface SimpleAuthUser {
  id: number;
  employeeId: string;
  employeePrimaryId: number; // Employee.id (primary key)
  name: string;
  email: string | null;
  role: "employee";
}

/**
 * 職員用簡易ログイン
 * 職員IDまたはメールアドレスのみでログイン
 */
export async function simpleLogin(req: Request, res: Response) {
  const { identifier } = req.body; // 職員IDまたはメールアドレス

  if (!identifier) {
    return res.status(400).json({ error: "職員IDまたはメールアドレスを入力してください" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "データベースに接続できません" });
  }

  try {
    // 職員IDまたはメールアドレスで検索
    const result = await db
      .select()
      .from(employees)
      .where(
        or(
          eq(employees.employeeId, identifier),
          eq(employees.email, identifier)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(401).json({ error: "職員が見つかりません" });
    }

    const employee = result[0];

    // Ensure User record exists for this employee
    const { upsertUser, getUserByOpenId } = await import("./db");
    const openId = `employee-${employee.employeeId}`;

    await upsertUser({
      openId,
      name: employee.name,
      email: employee.email,
      role: "user", // Employees always have "user" role
      lastSignedIn: new Date(),
    });

    // Get the User record to link with Employee
    const userRecord = await getUserByOpenId(openId);

    if (!userRecord) {
      return res.status(500).json({ error: "ユーザーレコードの作成に失敗しました" });
    }

    // Update Employee's userId if not already set
    if (employee.userId !== userRecord.id) {
      await db
        .update(employees)
        .set({ userId: userRecord.id })
        .where(eq(employees.id, employee.id));
    }

    // JWTトークンを生成 - IMPORTANT: Use User.id, not Employee.id
    const user: SimpleAuthUser = {
      id: userRecord.id, // Use User.id instead of Employee.id
      employeeId: employee.employeeId,
      employeePrimaryId: employee.id, // Employee.id (primary key for leave requests, etc.)
      name: employee.name,
      email: employee.email,
      role: "employee",
    };

    const token = jwt.sign(user, SIMPLE_AUTH_SECRET, {
      expiresIn: "7d", // 7日間有効
    });

    // Cookieにトークンを設定
    res.cookie(SIMPLE_AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });

    return res.json({ success: true, user });
  } catch (error) {
    console.error("[SimpleAuth] Login error:", error);
    return res.status(500).json({ error: "ログインに失敗しました" });
  }
}

/**
 * 職員用簡易ログアウト
 */
export function simpleLogout(req: Request, res: Response) {
  res.clearCookie(SIMPLE_AUTH_COOKIE_NAME);
  return res.json({ success: true });
}

/**
 * 職員用簡易認証ミドルウェア
 */
export function simpleAuthMiddleware(req: Request, res: Response, next: Function) {
  const token = req.cookies[SIMPLE_AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "認証が必要です" });
  }

  try {
    const user = jwt.verify(token, SIMPLE_AUTH_SECRET) as SimpleAuthUser;
    (req as any).simpleAuthUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "認証トークンが無効です" });
  }
}

/**
 * 現在の職員情報を取得
 */
export function getSimpleAuthUser(req: Request, res: Response) {
  const token = req.cookies[SIMPLE_AUTH_COOKIE_NAME];

  if (!token) {
    return res.json({ user: null });
  }

  try {
    const user = jwt.verify(token, SIMPLE_AUTH_SECRET) as SimpleAuthUser;
    return res.json({ user });
  } catch (error) {
    return res.json({ user: null });
  }
}
