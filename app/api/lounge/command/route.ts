import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loungeToken, command } = body;

    if (!loungeToken || !command) {
      return NextResponse.json(
        { error: 'Missing active TV pairing token or command payload.' },
        { status: 400 }
      );
    }

    // Step 1: Establish Session Handshake with YouTube TV Lounge Channel
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

    // Extract SID and gsessionid from YouTube's response
    const sidMatch = initText.match(/\["c","([^"]+)","([^"]+)"/);
    let sid = '';
    let gsessionid = '';

    if (sidMatch && sidMatch[1] && sidMatch[2]) {
      sid = sidMatch[1];
      gsessionid = sidMatch[2];
    } else {
      const rawMatches = Array.from(initText.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
      if (rawMatches.length >= 3) {
        sid = rawMatches[1];
        gsessionid = rawMatches[2];
      }
    }

    // Step 2: Dispatch Command over Authenticated Channel
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

    if (!cmdRes.ok) {
      return NextResponse.json(
        { error: 'YouTube TV API rejected the command. Please re-pair your TV code.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: command.videoId || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}