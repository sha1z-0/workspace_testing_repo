-- Create calendar_events table to persist events and meetings

-- Drop existing policies first (in case table exists but policies are causing issues)
DROP POLICY IF EXISTS "Users can read all events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;

-- Drop table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS calendar_events;

-- Create the table
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('event', 'meeting')),
  organizer_id TEXT NOT NULL,
  organizer_name TEXT,
  organizer_email TEXT,
  attendees TEXT[], -- Array of email addresses
  invited_member_ids TEXT[], -- Array of user IDs who were invited via notification
  send_calendar_invite BOOLEAN DEFAULT false,
  send_email_reminder BOOLEAN DEFAULT false,
  add_to_google_calendar BOOLEAN DEFAULT false,
  notify_on_dashboard BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_calendar_events_organizer ON calendar_events(organizer_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all events (so they can see events they're invited to)
CREATE POLICY "Users can read all events" ON calendar_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own events
CREATE POLICY "Users can create own events" ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = organizer_id);

-- Users can update their own events
CREATE POLICY "Users can update own events" ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = organizer_id)
  WITH CHECK (auth.uid()::text = organizer_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events" ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = organizer_id);

-- Add comment
COMMENT ON TABLE calendar_events IS 'Stores calendar events and meetings with attendee information';
