import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loungeToken, command } = body;

    if (!loungeToken) {
      return NextResponse.json({ error: 'No active TV pairing token found. Please pair your Shield Pro first.' }, { status: 400 });
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
      params.append('req0_newTime', command.seconds.toString());
    } else if (command.type === 'LOAD_VIDEO') {
      params.append('req0__sc', 'setPlaylist');
      params.append('req0_videoId', command.videoId);
      params.append('req0_currentTime', (command.startSeconds || 0).toString());
    }

    const bindUrl = `https://www.youtube.com/api/lounge/bc/bind?RID=1337&VER=8&CVER=1&loungeIdToken=${encodeURIComponent(loungeToken)}`;

    const response = await fetch(bindUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'YouTube TV API rejected command. Pairing session may have expired.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      videoId: command.videoId || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}