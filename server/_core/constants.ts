/**
 * Server-side constants
 * Centralized location for all shared constants to avoid duplication
 */

// Authentication cookie names
export const SIMPLE_AUTH_COOKIE_NAME = "simple_auth_token";
export const ADMIN_AUTH_COOKIE_NAME = "admin_auth_token";

// Rate limiting defaults (can be overridden by environment variables)
export const DEFAULT_LOGIN_RATE_LIMIT = {
  ADMIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5,
  },
  EMPLOYEE: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 10,
  },
};
