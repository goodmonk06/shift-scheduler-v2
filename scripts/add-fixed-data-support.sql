-- データベーススキーマ修正スクリプト
-- 承認済み希望休・勤務希望を固定データとして扱うための改修

-- 1. shiftDetailsテーブルにisFixedフラグを追加
ALTER TABLE shiftDetails
ADD COLUMN isFixed BOOLEAN DEFAULT FALSE NOT NULL COMMENT '固定データフラグ（希望休・勤務希望由来の場合true）',
ADD COLUMN sourceType VARCHAR(50) COMMENT 'データソース（leave_request, work_preference, manual, ai_generated, rule_based）',
ADD COLUMN sourceId INT COMMENT 'ソースデータのID（leaveRequests.id または workPreferences.id）';

-- 既存データの更新
UPDATE shiftDetails
SET isFixed = TRUE, sourceType = 'leave_request'
WHERE generatedBy = 'leave_request';

UPDATE shiftDetails
SET isFixed = TRUE, sourceType = 'work_preference'
WHERE generatedBy = 'rule_based' AND startTime IS NOT NULL AND endTime IS NOT NULL;

-- 2. workPreferencesテーブルに詳細タイプを追加
ALTER TABLE workPreferences
ADD COLUMN preferenceType ENUM('time_specified', 'night_shift', 'post_night', 'training', 'other')
    DEFAULT 'time_specified' NOT NULL COMMENT '勤務希望タイプ',
ADD COLUMN isCountAsStaff BOOLEAN DEFAULT TRUE NOT NULL COMMENT '勤務人数にカウントするか（研修時false）',
ADD COLUMN displayIcon VARCHAR(10) COMMENT '表示用アイコン（研修時は！など）';

-- 既存データのタイプを判定して更新
UPDATE workPreferences
SET preferenceType = 'night_shift'
WHERE startTime = '16:00' AND endTime = '10:00';

UPDATE workPreferences
SET preferenceType = 'post_night'
WHERE reason LIKE '%明け%';

UPDATE workPreferences
SET preferenceType = 'training',
    isCountAsStaff = FALSE,
    displayIcon = '！'
WHERE reason LIKE '%研修%';

-- 3. leaveRequestsテーブルのleaveTypeに季節休暇を追加（既に完了済みの場合はスキップ）
-- ALTER TABLE leaveRequests
-- MODIFY COLUMN leaveType ENUM('休', '有休', '夏', '冬') NOT NULL DEFAULT '休';

-- 4. インデックスの追加（パフォーマンス向上）
CREATE INDEX idx_shiftDetails_isFixed ON shiftDetails(isFixed);
CREATE INDEX idx_shiftDetails_sourceType ON shiftDetails(sourceType);
CREATE INDEX idx_workPreferences_preferenceType ON workPreferences(preferenceType);
CREATE INDEX idx_workPreferences_status ON workPreferences(status);
CREATE INDEX idx_leaveRequests_status ON leaveRequests(status);

-- 5. ビューの作成（固定シフトの確認用）
CREATE OR REPLACE VIEW fixed_shifts_view AS
SELECT
    sd.id,
    sd.shiftId,
    sd.employeeId,
    e.name as employeeName,
    sd.date,
    sd.status,
    sd.startTime,
    sd.endTime,
    sd.leaveType,
    sd.sourceType,
    sd.sourceId,
    CASE
        WHEN sd.sourceType = 'leave_request' THEN lr.reason
        WHEN sd.sourceType = 'work_preference' THEN wp.reason
        ELSE NULL
    END as reason
FROM shiftDetails sd
LEFT JOIN employees e ON sd.employeeId = e.id
LEFT JOIN leaveRequests lr ON sd.sourceType = 'leave_request' AND sd.sourceId = lr.id
LEFT JOIN workPreferences wp ON sd.sourceType = 'work_preference' AND sd.sourceId = wp.id
WHERE sd.isFixed = TRUE;

-- 確認用クエリ
-- 固定データの件数を確認
SELECT
    sourceType,
    COUNT(*) as count
FROM shiftDetails
WHERE isFixed = TRUE
GROUP BY sourceType;

-- 研修データを確認
SELECT
    employeeId,
    startDate,
    endDate,
    startTime,
    endTime,
    preferenceType,
    isCountAsStaff,
    reason
FROM workPreferences
WHERE preferenceType = 'training';