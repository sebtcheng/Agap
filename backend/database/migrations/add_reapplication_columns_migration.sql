-- Idempotent migration: Reapplication workflow tracking on applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS reapplication_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reapplied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reapplication_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reapplication_reviewed_by TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_applications_reapplication_status'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT chk_applications_reapplication_status
      CHECK (
        reapplication_status IS NULL
        OR reapplication_status IN ('PENDING', 'ACCEPTED', 'REJECTED')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_reapplication_status
  ON applications (reapplication_status)
  WHERE reapplication_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_status_reapplication
  ON applications (LOWER(TRIM(COALESCE(status, ''))), reapplication_status);
