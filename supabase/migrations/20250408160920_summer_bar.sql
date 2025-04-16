/*
  # Add tasks table and update rooms schema

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `title` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `voting_task_id` to rooms table to track current task being voted on
    
  3. Security
    - Enable RLS on tasks table
    - Add policies for task management
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add voting_task_id to rooms
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'voting_task_id'
  ) THEN
    ALTER TABLE rooms ADD COLUMN voting_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies for tasks
CREATE POLICY "Anyone can read tasks"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Room admin can manage tasks"
  ON tasks
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE room_id = tasks.room_id
      AND id = auth.uid()
      AND is_admin = true
    )
  );