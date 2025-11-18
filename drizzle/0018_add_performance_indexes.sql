-- Add indexes for performance optimization
-- These indexes improve query performance for frequently accessed data

-- Index for employee queries by userId (used in authentication)
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(userId);

-- Composite index for leave requests (frequently queried by employee and status)
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leaveRequests(employeeId, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leaveRequests(startDate, endDate);

-- Composite index for shift details (frequently queried by shift and date)
CREATE INDEX IF NOT EXISTS idx_shift_details_shift_date ON shiftDetails(shiftId, date);
CREATE INDEX IF NOT EXISTS idx_shift_details_employee_date ON shiftDetails(employeeId, date);
CREATE INDEX IF NOT EXISTS idx_shift_details_status ON shiftDetails(status);

-- Index for work preferences (queried by employee and date range)
CREATE INDEX IF NOT EXISTS idx_work_preferences_employee ON workPreferences(employeeId);
CREATE INDEX IF NOT EXISTS idx_work_preferences_dates ON workPreferences(startDate, endDate);

-- Index for change proposals (queried by shift and status)
CREATE INDEX IF NOT EXISTS idx_change_proposals_shift_status ON changeProposals(shiftId, status);

-- Index for modification requests (queried by shift and status)
CREATE INDEX IF NOT EXISTS idx_modification_requests_shift ON modificationRequests(shiftId, status);
CREATE INDEX IF NOT EXISTS idx_modification_requests_employee ON modificationRequests(employeeId, status);

-- Index for notifications (queried by recipient and read status)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipientType, recipientId, isRead);
CREATE INDEX IF NOT EXISTS idx_notifications_shift ON notifications(shiftId);

-- Unique index for shifts (year, month combination should be unique per user)
CREATE INDEX IF NOT EXISTS idx_shifts_year_month ON shifts(year, month, userId);

-- Index for workflow history (queried by shift)
CREATE INDEX IF NOT EXISTS idx_workflow_history_shift ON workflowHistory(shiftId, createdAt);
