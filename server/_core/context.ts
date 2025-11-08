import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import type { SimpleAuthUser } from "../simpleAuth";

const SIMPLE_AUTH_COOKIE_NAME = "simple_auth_token";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First, try SDK authentication (OAuth for admins)
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
          role: "user", // Use "user" role (employee is not in the enum)
          loginMethod: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
    } catch (simpleAuthError) {
      // Both authentication methods failed
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
