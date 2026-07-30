import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const forceAll = searchParams.get('force') === 'true';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.YOUTUBE_API_KEY || process.env.TMDB_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    return NextResponse.json({ error: 'Missing environment variables in .env.local' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const logs: string[] = [];

  try {
    // 1. HARD DELETION OF YOUTUBE SHORTS
    const { data: shortsToDelete } = await supabase
      .from('videos')
      .select('id, title')
      .or('title.ilike.%#shorts%,title.ilike.%#short%,title.ilike.%shorts%,title.ilike.%trailer%,title.ilike.%teaser%,title.ilike.%spoiler talk%,title.ilike.%non-spoiler%');

    let deletedShorts = 0;
    if (shortsToDelete && shortsToDelete.length > 0) {
      const shortIds = shortsToDelete.map((v) => v.id);
      await supabase.from('videos').delete().in('id', shortIds);
      deletedShorts = shortIds.length;
      logs.push(`Hard Purge: Permanently deleted ${deletedShorts} YouTube Shorts / trailer records.`);
    }

    // 2. FETCH UN-AUDITED VIDEOS FOR GEMINI AI EVALUATION
    let query = supabase
      .from('videos')
      .select(`
        id,
        yt_video_id,
        title,
        description,
        channels (name)
      `)
      .limit(limit);

    if (!forceAll) {
      query = query.eq('ai_audited', false);
    }

    const { data: videosToAudit, error } = await query;

    if (error || !videosToAudit || videosToAudit.length === 0) {
      return NextResponse.json({
        success: true,
        deletedShorts,
        auditedCount: 0,
        logs,
        message: 'No pending videos found requiring AI audit.',
      });
    }

    let auditedCount = 0;
    let aiDeletedCount = 0;

    for (const vid of videosToAudit) {
      const channelName = (vid as any).channels?.name || 'Reaction Channel';

      const prompt = `You are FinVIDIA's AI Content Auditor. Evaluate if this YouTube video is a FULL MOVIE REACTION:
Channel: "${channelName}"
Title: "${vid.title}"
Description: "${(vid.description || '').substring(0, 500)}"

Respond ONLY with JSON:
{
  "is_full_movie_reaction": true/false (MUST be FALSE for Shorts, trailers, reviews, Q&As, podcasts, gameplay, tier lists, vlogs, unboxings, or short clips),
  "film_title": "Official Film Title",
  "ai_summary": "Two-sentence summary of commentary",
  "individual_reactors": ["Reactor Name"],
  "timestamps": [
    {"time": "00:00", "seconds": 0, "label": "Intro & Expectations"},
    {"time": "05:00", "seconds": 300, "label": "Key Reaction Moment"},
    {"time": "25:00", "seconds": 1500, "label": "Ending & Verdict"}
  ]
}`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: 'application/json' },
          }),
        });

        const geminiData = await geminiRes.json();
        const jsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonText) {
          const parsed = JSON.parse(jsonText);

          if (parsed.is_full_movie_reaction === false) {
            // PERMANENT HARD DELETION
            await supabase.from('videos').delete().eq('id', vid.id);
            aiDeletedCount++;
            logs.push(`DELETED FLUFF [${vid.title}]: Fluff / Non-reaction video.`);
          } else {
            await supabase
              .from('videos')
              .update({
                ai_audited: true,
                is_valid_reaction: true,
                ai_summary: parsed.ai_summary || '',
                ai_timestamps: parsed.timestamps || [],
                individual_reactors: parsed.individual_reactors || [],
              })
              .eq('id', vid.id);

            auditedCount++;
            logs.push(`APPROVED REACTION [${vid.title}]: Film="${parsed.film_title}"`);
          }
        }
      } catch (err: any) {
        console.error(`AI Audit failed for video ${vid.id}:`, err);
        await supabase.from('videos').update({ ai_audited: true }).eq('id', vid.id);
      }
    }

    // Purge orphaned media items
    const { data: allMedia } = await supabase.from('media_items').select('id, videos(id)');
    if (allMedia) {
      const orphanedIds = allMedia.filter((m: any) => !m.videos || m.videos.length === 0).map((m: any) => m.id);
      if (orphanedIds.length > 0) {
        await supabase.from('media_items').delete().in('id', orphanedIds);
        logs.push(`Purged ${orphanedIds.length} orphaned media items after AI fluff deletion.`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedShorts,
      auditedCount,
      aiDeletedCount,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}