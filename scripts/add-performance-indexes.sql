-- パフォーマンス向上のためのインデックスを追加

-- Shiftテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS "Shift_companyId_date_status_idx" ON "Shift"("companyId", "date", "status");
CREATE INDEX IF NOT EXISTS "Shift_officeId_date_idx" ON "Shift"("officeId", "date");

-- ShiftAvailabilityテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS "ShiftAvailability_date_status_idx" ON "ShiftAvailability"("date", "status");

-- OfficeRequirementテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS "office_requirements_date_idx" ON "office_requirements"("date");

COMMIT;
