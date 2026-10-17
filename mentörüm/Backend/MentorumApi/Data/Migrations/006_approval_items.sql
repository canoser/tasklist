CREATE TABLE IF NOT EXISTS approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  rejection_reason VARCHAR(255) NULL,
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_approval_items_program_status ON approval_items(program_id, status);
