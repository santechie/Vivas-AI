-- Migration: Add advanced columns to vivas_completed_tasks_records for Tend layout drawer details
ALTER TABLE vivas_completed_tasks_records 
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(100) DEFAULT 'greenhouse_sow',
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS start_time VARCHAR(20) DEFAULT '09:00 AM',
  ADD COLUMN IF NOT EXISTS end_time VARCHAR(20) DEFAULT '05:00 PM',
  ADD COLUMN IF NOT EXISTS assignee VARCHAR(150),
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS tags VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS planting VARCHAR(255),
  ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inputs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_labor NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS actual_labor VARCHAR(50) DEFAULT '0h 00m',
  ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb;
