import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pairCode, screenId } = body;

    let targetScreenId = screenId;

    // If user typed a 12-digit code from youtube.com/tv or TV settings
    if (pairCode) {
      const cleanCode = pairCode.replace(/\s+/g, '');
      const pairingUrl = `https://www.youtube.com/api/lounge/pairing/get_screen?pairing_code=${cleanCode}`;
      
      const pairRes = await fetch(pairingUrl, { method: 'POST' });
      const pairData = await pairRes.json();

      if (pairData.screen?.screenId) {
        targetScreenId = pairData.screen.screenId;
      }
    }

    if (!targetScreenId) {
      return NextResponse.json({ error: 'Invalid or expired TV pairing code' }, { status: 400 });
    }

    // Exchange screenId for official Lounge Session Token
    const tokenUrl = 'https://www.youtube.com/api/lounge/pairing/get_lounge_token_batch';
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ screen_ids: targetScreenId }).toString(),
    });

    const tokenData = await tokenRes.json();
    const loungeToken = tokenData.screens?.[0]?.loungeToken;

    if (!loungeToken) {
      return NextResponse.json({ error: 'Failed to generate Lounge Token from target screen' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      screenId: targetScreenId,
      loungeToken,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}