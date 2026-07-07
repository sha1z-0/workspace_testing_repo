import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth credentials - in production these should be stored in environment variables
// You'll need to replace these with your actual Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

// Function to get authenticated Google Calendar client
async function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  // In production, you would get the refresh token from a database or session
  if (GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN
    });
  } else {
    // For development, simulate auth
    console.log('Google OAuth credentials not configured properly');
    return null;
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function POST(request: Request) {
  try {
    // Parse the JSON body from the request
    const requestData = await request.json();
    const { title, description, startTime, endTime, location, attendees } = requestData;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert attendees array to Google Calendar format
    const calendarAttendees = attendees.map((email: string) => ({
      email,
      responseStatus: 'needsAction'
    }));

    // Create event object for Google Calendar
    const event = {
      summary: title,
      description,
      location,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'UTC'
      },
      attendees: calendarAttendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 15 } // 15 minutes before
        ]
      }
    };

    const calendar = await getCalendarClient();
    
    if (!calendar) {
      // For development when credentials aren't configured
      console.log('Google Calendar event would be created with:', event);
      return NextResponse.json({
        success: true,
        message: 'Event creation simulated (OAuth credentials not configured)',
        eventId: `mock-event-${Date.now()}`
      }, { status: 200 });
    }

    // Insert the event to Google Calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all' // Send email updates to attendees
    });

    return NextResponse.json({
      success: true,
      eventId: response.data.id
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding event to Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to add event to Google Calendar', details: (error as Error).message },
      { status: 500 }
    );
  }
} 