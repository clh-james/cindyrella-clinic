import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/googleCalendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    // In production, save this token to the database securely.
    // For local setup, we display it so the admin can copy it to .env
    return NextResponse.json({
      message: 'Authentication successful! Please copy the refresh token below and add it to your .env file as GOOGLE_REFRESH_TOKEN.',
      refresh_token: tokens.refresh_token,
      note: 'Keep this token secret! Do not commit it to version control.'
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
