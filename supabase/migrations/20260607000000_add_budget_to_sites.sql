-- Add budget column to sites table for Budget vs Actual tracking
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS budget NUMERIC(14,2) NOT NULL DEFAULT 0;
