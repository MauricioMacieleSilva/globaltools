-- Update RLS policies to allow admins to see all follow-ups

-- Drop existing policies for budget_followups
DROP POLICY IF EXISTS "Users can view their own followups" ON budget_followups;
DROP POLICY IF EXISTS "Admins can manage all followups" ON budget_followups;

-- Create new policies that allow admins to see all follow-ups
CREATE POLICY "Admins can manage all followups" 
ON budget_followups 
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own followups" 
ON budget_followups 
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = sdr_id OR get_current_user_role() = 'admin');

CREATE POLICY "Users can create their own followups" 
ON budget_followups 
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() = sdr_id);

CREATE POLICY "Users can update their own followups" 
ON budget_followups 
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = sdr_id OR get_current_user_role() = 'admin')
WITH CHECK (auth.uid() = user_id OR auth.uid() = sdr_id OR get_current_user_role() = 'admin');

CREATE POLICY "Users can delete their own followups" 
ON budget_followups 
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = sdr_id OR get_current_user_role() = 'admin');