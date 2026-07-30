import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.YOUTUBE_API_KEY || process.env.TMDB_API_KEY; // Uses Google API Key

  if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    return NextResponse.json({ error: 'Missing environment variables in .env.local' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const logs: string[] = [];

  try {
    // 1. Fetch un-audited videos from database
    const { data: videosToAudit, error } = await supabase
      .from('videos')
      .select(`
        id,
        yt_video_id,
        title,
        description,
        channels (name)
      `)
      .eq('ai_audited', false)
      .limit(limit);

    if (error || !videosToAudit || videosToAudit.length === 0) {
      return NextResponse.json({
        success: true,
        auditedCount: 0,
        message: 'No pending videos found requiring AI audit.',
      });
    }

    let auditedCount = 0;

    for (const vid of videosToAudit) {
      const channelName = (vid as any).channels?.name || 'Reaction Channel';

      const prompt = `You are FinVIDIA's AI Cinema Classifier. Analyze this YouTube reaction video submission:
Channel: "${channelName}"
Video Title: "${vid.title}"
Description: "${(vid.description || '').substring(0, 500)}"

Respond strictly with a valid JSON object matching this schema:
{
  "is_full_movie_reaction": true/false (Set false if it is a trailer, Q&A, podcast, gaming, tier list, vlog, unboxing, short, or non-reaction video),
  "film_title": "Clean Official Film Title",
  "film_release_year": 1999 (integer year, or null),
  "ai_summary": "Concise 2-sentence summary of the reactor's commentary and thoughts",
  "individual_reactors": ["Host Name 1", "Host Name 2"],
  "timestamps": [
    {"time": "00:00", "seconds": 0, "label": "Intro & Setup"},
    {"time": "02:30", "seconds": 150, "label": "Opening Scene Reaction"},
    {"time": "12:15", "seconds": 735, "label": "Mid-Movie Plot Twist"},
    {"time": "28:00", "seconds": 1680, "label": "Final Score & Review"}
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

          await supabase
            .from('videos')
            .update({
              ai_audited: true,
              is_valid_reaction: parsed.is_full_movie_reaction ?? true,
              ai_summary: parsed.ai_summary || '',
              ai_timestamps: parsed.timestamps || [],
              individual_reactors: parsed.individual_reactors || [],
            })
            .eq('id', vid.id);

          auditedCount++;
          logs.push(`Audited [${vid.title}]: Valid=${parsed.is_full_movie_reaction}, Film="${parsed.film_title}"`);
        }
      } catch (err: any) {
        console.error(`AI Audit failed for video ${vid.id}:`, err);
        // Mark as audited so it doesn't block future loops
        await supabase.from('videos').update({ ai_audited: true }).eq('id', vid.id);
      }
    }

    return NextResponse.json({
      success: true,
      auditedCount,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}