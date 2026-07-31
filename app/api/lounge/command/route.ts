import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loungeToken, command } = body;

    if (!loungeToken || !command) {
      return NextResponse.json({ error: 'Missing loungeToken or command payload' }, { status: 400 });
    }

    // Translate FinVIDIA LoungeCommand to YouTube Lounge Bind Protocol parameters
    let reqAction = '';
    const params = new URLSearchParams();
    params.append('count', '1');
    params.append('ofs', '0');

    if (command.type === 'PLAY') {
      reqAction = 'play';
    } else if (command.type === 'PAUSE') {
      reqAction = 'pause';
    } else if (command.type === 'SEEK') {
      reqAction = 'seekTo';
      params.append('req0_newTime', command.seconds.toString());
    } else if (command.type === 'LOAD_VIDEO') {
      reqAction = 'setPlaylist';
      params.append('req0_videoId', command.videoId);
      params.append('req0_currentTime', (command.startSeconds || 0).toString());
    }

    params.append('req0__sc', reqAction);

    const bindUrl = `https://www.youtube.com/api/lounge/bc/bind?RID=1337&VER=8&CVER=1&loungeIdToken=${encodeURIComponent(loungeToken)}`;

    const response = await fetch(bindUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    return NextResponse.json({
      success: response.ok,
      actionSent: reqAction,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}