import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import type { SimpleAuthUser } from "../simpleAuth";
import type { AdminAuthUser } from "../adminAuth";
import { SIMPLE_AUTH_COOKIE_NAME, ADMIN_AUTH_COOKIE_NAME } from "./constants";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First, try Admin Auth (for administrators)
  try {
    const adminToken = opts.req.cookies?.[ADMIN_AUTH_COOKIE_NAME];
    if (adminToken) {
      const adminAuthUser = jwt.verify(adminToken, ENV.jwtSecret) as AdminAuthUser;
      user = {
        id: adminAuthUser.id,
        openId: `admin-${adminAuthUser.id}`,
        name: adminAuthUser.name,
        email: adminAuthUser.email,
        role: "admin",
        loginMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
  } catch (adminAuthError) {
    // Admin auth failed, try other methods
  }

  // If not admin, try SDK authentication (OAuth)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // If SDK auth fails, try Simple Auth (for employees)
      try {
        const token = opts.req.cookies?.[SIMPLE_AUTH_COOKIE_NAME];
        if (token) {
          const simpleAuthUser = jwt.verify(token, ENV.jwtSecret) as SimpleAuthUser;
          // Convert SimpleAuthUser to User type for compatibility
          user = {
            id: simpleAuthUser.id,
            openId: `employee-${simpleAuthUser.employeeId}`,
            name: simpleAuthUser.name,
            email: simpleAuthUser.email,
            role: "user", // Employees are always "user" role
            loginMethod: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
        }
      } catch (simpleAuthError) {
        // All authentication methods failed
        user = null;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
