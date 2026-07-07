import { NextResponse } from 'next/server';
import { timeTrackingAPI } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // End the time tracking session
    const result = await timeTrackingAPI.endSession(sessionId);

    return NextResponse.json({ 
      success: true, 
      message: 'Session ended successfully',
      result
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session', details: (error as Error).message },
      { status: 500 }
    );
  }
} 