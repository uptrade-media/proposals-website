-- Add deposit/payment fields to proposals for the new signing flow
-- Deposit percentage (e.g., 50 for 50%, 100 for full payment upfront)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposit_percentage integer DEFAULT 50;

-- Calculated deposit amount (auto-calculated from total_amount * deposit_percentage / 100)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposit_amount decimal(10, 2);

-- Track when deposit was paid
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposit_paid_at timestamp;

-- Square payment ID for the deposit
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposit_payment_id text;

-- Store all recipients when proposal was sent (for "contract signed" emails)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sent_to_recipients jsonb DEFAULT '[]';
