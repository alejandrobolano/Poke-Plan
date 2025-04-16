/*
  # Create rooms and participants tables

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `voting_system` (jsonb)
      - `current_voting` (boolean)
      - `revealed` (boolean)
      - `created_at` (timestamp)
    - `participants`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key)
      - `name` (text)
      - `emoji` (text)
      - `is_admin` (boolean)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since we're using anonymous authentication)
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  voting_system jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_voting boolean DEFAULT false,
  revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to rooms"
  ON rooms
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to rooms"
  ON rooms
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to rooms"
  ON rooms
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to participants"
  ON participants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to participants"
  ON participants
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to participants"
  ON participants
  FOR UPDATE
  TO public
  USING (true);