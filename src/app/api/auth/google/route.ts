import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/googleCalendar';

export async function GET() {
  const authUrl = getGoogleAuthUrl();
  return NextResponse.redirect(authUrl);
}
