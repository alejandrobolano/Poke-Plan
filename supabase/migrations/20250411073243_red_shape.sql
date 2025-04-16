/*
  # Add votes table and policies

  1. New Tables
    - `votes`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `task_id` (uuid, foreign key to tasks)
      - `user_id` (uuid, foreign key to participants)
      - `value` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on votes table
    - Add policies for vote management
*/

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON votes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Participants can vote"
  ON votes
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.user_id
      AND participants.room_id = votes.room_id
    )
  );

CREATE POLICY "Participants can update their own votes"
  ON votes
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.user_id
      AND participants.room_id = votes.room_id
    )
  );

-- Add completed status to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;