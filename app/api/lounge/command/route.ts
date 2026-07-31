import { NextResponse } from 'next/server';

async function fetchFreshLoungeToken(screenId: string): Promise<string | null> {
  try {
    const tokenUrl = 'https://www.youtube.com/api/lounge/pairing/get_lounge_token_batch';
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ screen_ids: screenId }).toString(),
    });

    const tokenData = await tokenRes.json();
    return tokenData.screens?.[0]?.loungeToken || null;
  } catch (err) {
    return null;
  }
}

async function sendLoungeCommand(loungeToken: string, command: any): Promise<boolean> {
  const bindInitUrl = 'https://www.youtube.com/api/lounge/bc/bind?RID=1&VER=8&CVER=1';
  
  const initRes = await fetch(bindInitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-YouTube-Lounge-Id-Token': loungeToken,
    },
    body: 'count=0',
  });

  const initText = await initRes.text();
  const rawMatches = Array.from(initText.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  
  let sid = rawMatches[1] || '';
  let gsessionid = rawMatches[2] || '';

  let bindCmdUrl = 'https://www.youtube.com/api/lounge/bc/bind?RID=2&VER=8&CVER=1';
  if (sid && gsessionid) {
    bindCmdUrl += `&SID=${encodeURIComponent(sid)}&gsessionid=${encodeURIComponent(gsessionid)}`;
  }

  const params = new URLSearchParams();
  params.append('count', '1');
  params.append('ofs', '0');

  if (command.type === 'PLAY') {
    params.append('req0__sc', 'play');
  } else if (command.type === 'PAUSE') {
    params.append('req0__sc', 'pause');
  } else if (command.type === 'SEEK') {
    params.append('req0__sc', 'seekTo');
    params.append('req0_newTime', (command.seconds || 0).toString());
  } else if (command.type === 'LOAD_VIDEO') {
    params.append('req0__sc', 'setPlaylist');
    params.append('req0_videoId', command.videoId);
    params.append('req0_currentTime', (command.startSeconds || 0).toString());
  }

  const cmdRes = await fetch(bindCmdUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-YouTube-Lounge-Id-Token': loungeToken,
    },
    body: params.toString(),
  });

  return cmdRes.ok;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { loungeToken, screenId, command } = body;

    if (!command) {
      return NextResponse.json({ error: 'Missing command payload.' }, { status: 400 });
    }

    let activeToken = loungeToken;

    // Attempt 1: Send command with existing token
    if (activeToken) {
      const success = await sendLoungeCommand(activeToken, command);
      if (success) {
        return NextResponse.json({ success: true, loungeToken: activeToken });
      }
    }

    // Attempt 2: Self-healing automatic token refresh using saved screenId
    if (screenId) {
      const freshToken = await fetchFreshLoungeToken(screenId);
      if (freshToken) {
        const retrySuccess = await sendLoungeCommand(freshToken, command);
        if (retrySuccess) {
          return NextResponse.json({ success: true, loungeToken: freshToken, refreshed: true });
        }
      }
    }

    return NextResponse.json({ error: 'Session expired. Please un-link and enter a fresh TV code.' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}