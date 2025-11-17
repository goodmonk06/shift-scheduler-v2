-- Migration: Add workflow management tables and columns
-- Date: 2025-11-17
-- Purpose: Complete workflow implementation from vacation request to final confirmation

-- ============================================
-- 1. Add new columns to existing tables
-- ============================================

-- Add notification settings to employees table
ALTER TABLE employees
ADD COLUMN notificationEnabled BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN notificationEmail VARCHAR(320),
ADD COLUMN lineUserId VARCHAR(100);

-- Add workflow tracking to shifts table
ALTER TABLE shifts
ADD COLUMN feedbackDeadline TIMESTAMP,
ADD COLUMN notificationsSent JSON;

-- ============================================
-- 2. Create new tables
-- ============================================

-- Notifications table for system-wide notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipientType ENUM('all', 'employee', 'admin') NOT NULL,
  recipientId INT,
  shiftId INT,
  notificationType ENUM(
    'status_change',
    'deadline_reminder',
    'feedback_request',
    'approval',
    'rejection',
    'shift_published',
    'modification_request'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE NOT NULL,
  readAt TIMESTAMP NULL,
  actionUrl VARCHAR(500),
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium' NOT NULL,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY (recipientId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE,

  INDEX idx_recipient (recipientType, recipientId),
  INDEX idx_shift (shiftId),
  INDEX idx_read_status (isRead),
  INDEX idx_created_at (createdAt DESC)
);

-- Modification requests for tentative shift feedback
CREATE TABLE IF NOT EXISTS modificationRequests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shiftId INT NOT NULL,
  employeeId INT NOT NULL,
  requestDate VARCHAR(10) NOT NULL, -- YYYY-MM-DD format
  requestType ENUM('swap', 'off', 'time_change') NOT NULL,
  currentAssignment VARCHAR(100),
  requestedAssignment VARCHAR(100),
  swapTargetEmployeeId INT,
  reason TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium' NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'processed') DEFAULT 'pending' NOT NULL,
  processedAt TIMESTAMP NULL,
  processedBy INT,
  processingComment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (swapTargetEmployeeId) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (processedBy) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_shift_employee (shiftId, employeeId),
  INDEX idx_status (status),
  INDEX idx_request_date (requestDate),
  INDEX idx_priority (priority)
);

-- Workflow history for tracking status transitions
CREATE TABLE IF NOT EXISTS workflowHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shiftId INT NOT NULL,
  fromStatus VARCHAR(50),
  toStatus VARCHAR(50) NOT NULL,
  changedBy INT,
  comment TEXT,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_shift (shiftId),
  INDEX idx_created_at (createdAt DESC)
);

-- ============================================
-- 3. Insert initial data (if needed)
-- ============================================

-- Add sample notification templates (optional)
-- These can be used as templates for common notifications

-- ============================================
-- 4. Create views for common queries (optional)
-- ============================================

-- View for pending modification requests by shift
CREATE VIEW pending_modification_requests AS
SELECT
  mr.*,
  e.name as employeeName,
  s.year,
  s.month,
  s.status as shiftStatus
FROM modificationRequests mr
JOIN employees e ON mr.employeeId = e.id
JOIN shifts s ON mr.shiftId = s.id
WHERE mr.status = 'pending'
ORDER BY mr.priority DESC, mr.createdAt ASC;

-- View for unread notifications by employee
CREATE VIEW unread_notifications_by_employee AS
SELECT
  n.*,
  e.name as employeeName,
  s.year,
  s.month
FROM notifications n
LEFT JOIN employees e ON n.recipientId = e.id
LEFT JOIN shifts s ON n.shiftId = s.id
WHERE n.isRead = FALSE
  AND (n.expiresAt IS NULL OR n.expiresAt > NOW())
ORDER BY n.priority DESC, n.createdAt DESC;

-- ============================================
-- 5. Migration rollback script (save separately)
-- ============================================
-- To rollback this migration, run:
--
-- DROP VIEW IF EXISTS unread_notifications_by_employee;
-- DROP VIEW IF EXISTS pending_modification_requests;
-- DROP TABLE IF EXISTS workflowHistory;
-- DROP TABLE IF EXISTS modificationRequests;
-- DROP TABLE IF EXISTS notifications;
-- ALTER TABLE shifts DROP COLUMN feedbackDeadline, DROP COLUMN notificationsSent;
-- ALTER TABLE employees DROP COLUMN notificationEnabled, DROP COLUMN notificationEmail, DROP COLUMN lineUserId;