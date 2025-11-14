-- Create table to track weekly reminder confirmations
CREATE TABLE public.weekly_reminder_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, confirmed_date)
);

-- Enable RLS
ALTER TABLE public.weekly_reminder_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own confirmations
CREATE POLICY "Users can view their own confirmations"
ON public.weekly_reminder_confirmations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own confirmations
CREATE POLICY "Users can insert their own confirmations"
ON public.weekly_reminder_confirmations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_weekly_reminder_user_date ON public.weekly_reminder_confirmations(user_id, confirmed_date);