import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
);

// In a real production app, this refresh token would be stored securely in the database
// per admin or per branch. For this implementation, we can use an environment variable
// for a single centralized clinic calendar.
const GLOBAL_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

export function getGoogleAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Forces consent screen to always issue a refresh token
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function insertCalendarEvent(eventDetails: {
  summary: string;
  description: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
}) {
  if (!GLOBAL_REFRESH_TOKEN) {
    console.warn("GOOGLE_REFRESH_TOKEN is not set. Skipping calendar sync.");
    return null;
  }

  oauth2Client.setCredentials({ refresh_token: GLOBAL_REFRESH_TOKEN });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startTime,
      timeZone: 'Asia/Manila', // Davao time
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: 'Asia/Manila',
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return response.data;
  } catch (error) {
    console.error("Error inserting Google Calendar event:", error);
    return null;
  }
}
