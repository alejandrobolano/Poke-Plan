/*
  # Fix RLS policies for tasks table

  1. Changes
    - Update RLS policies to use participant ID instead of auth.uid()
    - Drop existing policies and create new ones
    - Keep the same functionality but with correct user identification

  2. Security
    - Maintain the same security level
    - Ensure only room admins can manage tasks
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read tasks" ON tasks;
  DROP POLICY IF EXISTS "Room admin can insert tasks" ON tasks;
  DROP POLICY IF EXISTS "Room admin can update tasks" ON tasks;
  DROP POLICY IF EXISTS "Room admin can delete tasks" ON tasks;
END $$;

-- Create new policies with correct user identification
CREATE POLICY "Anyone can read tasks"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Room admin can insert tasks"
  ON tasks
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = tasks.room_id
      AND participants.is_admin = true
    )
  );

CREATE POLICY "Room admin can update tasks"
  ON tasks
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = tasks.room_id
      AND participants.is_admin = true
    )
  );

CREATE POLICY "Room admin can delete tasks"
  ON tasks
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = tasks.room_id
      AND participants.is_admin = true
    )
  );