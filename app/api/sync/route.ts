import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchAndFetchMovieMetadata, TMDBMovieData } from '@/lib/tmdb';

export const CHANNELS_TO_SYNC = [
  { name: 'Stacey RPG Watches', handle: 'StaceyRPGWatches', knownChannelId: null },
  { name: 'Popcorn In Bed', handle: 'PopcornInBed', knownChannelId: 'UCn1xtOr2wHQwYTxO_KTkqNg' },
  { name: 'The Coby Show', handle: 'CobyShow', knownChannelId: 'UC2A1ACqP0qXDdmTGx8D2SEQ' },
  { name: 'LiteWeight Reacting', handle: 'liteweightreacting', knownChannelId: null },
  { name: 'The Octobers React', handle: 'TheOctobersReact', knownChannelId: null },
  { name: 'Stef (iamjuststef)', handle: 'iamjuststef', knownChannelId: 'UCbtVNmjJT_SExLMDrzttDGw' },
  { name: 'MapleNuts React', handle: 'maplenutsreact', knownChannelId: null },
  { name: 'Natascha Summers', handle: 'nataschasummers', knownChannelId: null },
  { name: 'Diegesis', handle: 'Diegesis', knownChannelId: null },
  { name: 'CinePals', handle: 'CinePals', knownChannelId: null },
  { name: 'Reacts with Jax', handle: 'reactswithjax', knownChannelId: null },
  { name: 'Liz Reacts', handle: 'LizReacts4', knownChannelId: null },
  { name: "Flix 'n Feels", handle: 'Flix-n-Feels', knownChannelId: null },
  { name: 'Shanelle Riccio', handle: 'ShanelleRiccio', knownChannelId: null },
  { name: 'Reacts & Snacks', handle: 'reactsandsnackss', knownChannelId: null },
  { name: 'Run to the Movies', handle: 'RuntotheMovies', knownChannelId: null },
  { name: 'Mary Cherry', handle: 'MaryCherryOfficial', knownChannelId: 'UCr0PQL9UMsOOu_MEIOfVfvQ' },
  { name: 'Addie Counts', handle: 'AddieCounts', knownChannelId: null },
  { name: "Reelin' with Asia and BJ", handle: 'ReelinwithAsiaandBJ', knownChannelId: null },
  { name: 'Wind It Back Reactions', handle: 'WindItBackReactions', knownChannelId: null },
  { name: 'Meg Gets Reel', handle: 'MegGetsReel', knownChannelId: null },
  { name: 'Raine x Reacts', handle: 'Raine_xReacts', knownChannelId: null },
  { name: 'Abby Jane Reacts', handle: 'AbbyJaneReacts', knownChannelId: null },
  { name: 'Sessis', handle: 'Sessis', knownChannelId: null },
  { name: 'Hold Down A', handle: 'holddowna', knownChannelId: null },
  { name: "Don't Trust Ash", handle: 'justtrustash', knownChannelId: null },
  { name: 'Aria C', handle: 'ariachanson01', knownChannelId: null },
  { name: 'Oliver & Kylie', handle: 'OliverandKylie', knownChannelId: 'UCJ-nDYGfH_uHo_g9GDhDDLg' },
  { name: 'Eralia', handle: 'eralia', knownChannelId: null },
  { name: 'Natalie Gold', handle: 'NatalieGoldReacts', knownChannelId: null },
  { name: 'Spartan & Pudgey', handle: 'SpartanandPudgey', knownChannelId: null },
  { name: 'The Homies React', handle: 'TheHomiesReact', knownChannelId: null },
  { name: 'BissFlix', handle: 'BissFlix', knownChannelId: null },
  { name: 'Dasha Reacts', handle: 'DashaReacts', knownChannelId: null },
  { name: 'Andy & Lauren Watch Stuff', handle: 'AndyandLaurenWatchStuff', knownChannelId: null },
  { name: 'Evie Reacts', handle: 'eviereacts', knownChannelId: null }
];

export function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractCleanMovieTitle(rawTitle: string): { cleanTitles: string[]; year?: number; isNonMovieVideo: boolean } {
  const nonMovieOrTvRegex = /#shorts?|#short|\bshorts?\b|\btiktok\b|\breels?\b|\bclip\b|\btrailer\b|\bteaser\b|\breview\b|\bspoiler\s*talk\b|\bnon-spoiler\b|ep\s*\d+|episodes?|season\s*\d+|s\d+e\d+|s\d+|\b\d+x\d+\b|tv\s*show|series|live\s+recap|q&a|q\s*&\s*a|qa|bracket|channel\ announcement|vlog|livestream|\blive\b|mailbag|mail|pick-a-flick|nintendo|trivia|podcast|update|tier\s+list|patreon|schedule|haul|tiktok|milestone|thanks|subscriber|game\ of\ thrones|coldplay|\b\d+-\d+\b|\bep[\d-]+\b|obi-wan|kenobi|mandalorian|andor|ahsoka|loki|wandavision|hawkeye|moon\ knight|she-hulk|secret\ invasion|stranger\ things|last\ of\ us|house\ of\ the\ dragon|white\ lotus|ted\ lasso|severance|silo|foundation|succession|yellowstone|peacemaker|the\ boys|gen\ v|fallout|shogun|bear|beef|squid\ game|daredevil|falcon\ and\ the\ winter\ soldier|ptsd|has\ ptsd|tattoos|tattoo|unboxing|music\s*video|official\s*video|official\s*audio|\balbum\b|\bsong\b|\btrack\b|\bmv\b|\bcover\b|\bremix\b|singing|concert|live\s*performance|music\s*reaction|storytime|grwm|apartment|tour|makeup|try\s*on|behind\s*the\s*scenes|bts|gameplay|walkthrough|anime|manga|subbed|dubbed|stunt|stunts|airplane\ stunt|promo|just\ watched|interview|cinematheque/i;
  
  if (nonMovieOrTvRegex.test(rawTitle)) {
    return { cleanTitles: [], isNonMovieVideo: true };
  }

  const yearMatch = rawTitle.match(/\((19\d\d|20\d\d)\)/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  let cleanedTitle = rawTitle
    .replace(/\b(extended(\s+edition)?|director'?s?\s*cut|uncut|remastered|4k\s*uhd|part\s*\d+|pt\s*\d+|full\s*movie|commentary|teabag|discussion|thoughts|after\s*thoughts|recap|review)\b/gi, '')
    .replace(/\/\//g, '|');

  const candidates: string[] = [];

  const quoteMatches = cleanedTitle.match(/["'“’]([^"'“”’]+)["'”’]/g);
  if (quoteMatches) {
    for (const q of quoteMatches) {
      const cleanQ = q.replace(/["'“’]/g, '').trim();
      if (cleanQ.length > 2 && !/reaction|review|watching|commentary/i.test(cleanQ)) {
        candidates.push(cleanQ);
      }
    }
  }

  const rawSegments = cleanedTitle.split(/\||\s+[-—–]\s+|—|–|!|\?/);

  for (const seg of rawSegments) {
    let cleaned = seg
      .replace(/(?:first[-_ ]*time[-_ ]*watching|first[-_ ]*time[-_ ]*reaction(?:[-_ ]*to)?|reacting[-_ ]*to|movie[-_ ]*reaction|watching|reaction|review|commentary|maplenuts[-_ ]*reacts?)/gi, '')
      .replace(/\((?:19\d\d|20\d\d)\)/g, '')
      .replace(/^\d+\s*(hours?|hrs?|mins?|minutes?)\s*of\s+/i, '')
      .replace(/\b(is|was)\s+(a\s+)?(masterpiece|amazing|insane|crazy|mind\s*blowing|so\s*good|terrifying|a\s*work\s*of\s*art|peak|peak\s*cinema|incredible|unbelievable|wild|horrifying|masterclass|iconic|perfection|scary).*$/i, '')
      .replace(/\b(and|i)\s+(didn'?t|couldn'?t|wasn'?t|never|almost|blinked?).*$/i, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/["'“”!]/g, '')
      .trim();

    const isCommentary = /^(is|are|was|were|how|why|i|i'm|i've|i\s+was|this|what|my|so|a|unbelievable|insane|emotional|not\s+prepared|stunned|haven't|haven't\s+been|extended|part|commentary|teabag|live|just\s+watched|emotionally\s+wrecked\s+by)\b/i.test(cleaned);

    const isFirstTimeFiller = /^first\s*time$/i.test(cleaned);

    if (cleaned.length > 1 && !isCommentary && !isFirstTimeFiller && cleaned.toLowerCase() !== 'first' && cleaned.toLowerCase() !== 'time') {
      candidates.push(cleaned);
    }
  }

  if (yearMatch && yearMatch.index !== undefined) {
    let beforeYear = cleanedTitle.substring(0, yearMatch.index).trim();
    beforeYear = beforeYear.replace(/.*(?:first[-_ ]*time[-_ ]*watching|first[-_ ]*time[-_ ]*reaction|reacting[-_ ]*to|movie[-_ ]*reaction|watching|reaction)\s*/gi, '');
    beforeYear = beforeYear.split(/\||\s+[-—–]\s+|—|–|!|\?/)[0].replace(/["'“”!]/g, '').trim();
    if (beforeYear.length > 1 && !/^first\s*time$/i.test(beforeYear)) {
      candidates.push(beforeYear);
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  return { cleanTitles: uniqueCandidates, year, isNonMovieVideo: false };
}

async function resolveYouTubeChannelInfo(handle: string, knownId: string | null, apiKey: string): Promise<{ channelId: string; uploadsPlaylistId: string; avatarUrl: string } | null> {
  try {
    const cleanHandle = handle.replace('@', '').trim();

    let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`;
    if (knownId) {
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(knownId)}&key=${apiKey}`;
    }

    let res = await fetch(url);
    let data = await res.json();

    if ((!data.items || data.items.length === 0) && !knownId) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (searchData.items && searchData.items.length > 0) {
        const foundId = searchData.items[0].id?.channelId || searchData.items[0].snippet?.channelId;
        if (foundId) {
          return resolveYouTubeChannelInfo(handle, foundId, apiKey);
        }
      }
    }

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const channelId = item.id;
      const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || channelId.replace(/^UC/, 'UU');
      const avatarUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';

      return { channelId, uploadsPlaylistId, avatarUrl };
    }
  } catch (err) {
    console.error(`Error resolving YouTube handle @${handle}:`, err);
  }
  return null;
}

async function fetchAllRowsPaginated(supabase: any, table: string, selectFields: string) {
  let allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      if (data.length < pageSize) hasMore = false;
      page++;
    }
  }
  return allRows;
}

async function linkMediaCreditsAndGenres(supabase: any, mediaId: string, tmdbData: TMDBMovieData) {
  for (const dir of tmdbData.directors || []) {
    const slug = dir.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let dirId = null;
    const { data: existingDir } = await supabase.from('directors').select('id').eq('tmdb_person_id', dir.id).maybeSingle();
    if (existingDir) dirId = existingDir.id;
    else {
      const { data: newDir } = await supabase.from('directors').insert({ tmdb_person_id: dir.id, name: dir.name, slug }).select().single();
      if (newDir) dirId = newDir.id;
    }
    if (dirId) {
      const { data: link } = await supabase.from('media_directors').select('media_id').eq('media_id', mediaId).eq('director_id', dirId).maybeSingle();
      if (!link) await supabase.from('media_directors').insert({ media_id: mediaId, director_id: dirId });
    }
  }

  for (const actor of tmdbData.actors || []) {
    const slug = actor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let actorId = null;
    const { data: existingActor } = await supabase.from('actors').select('id').eq('tmdb_person_id', actor.id).maybeSingle();
    if (existingActor) actorId = existingActor.id;
    else {
      const { data: newActor } = await supabase.from('actors').insert({ tmdb_person_id: actor.id, name: actor.name, slug }).select().single();
      if (newActor) actorId = newActor.id;
    }
    if (actorId) {
      const { data: link } = await supabase.from('media_actors').select('media_id').eq('media_id', mediaId).eq('actor_id', actorId).maybeSingle();
      if (!link) await supabase.from('media_actors').insert({ media_id: mediaId, actor_id: actorId });
    }
  }

  for (const gen of tmdbData.genres || []) {
    const slug = gen.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let genId = null;
    const { data: existingGen } = await supabase.from('genres').select('id').eq('tmdb_genre_id', gen.id).maybeSingle();
    if (existingGen) genId = existingGen.id;
    else {
      const { data: newGen } = await supabase.from('genres').insert({ tmdb_genre_id: gen.id, name: gen.name, slug }).select().single();
      if (newGen) genId = newGen.id;
    }
    if (genId) {
      const { data: link } = await supabase.from('media_genres').select('media_id').eq('media_id', mediaId).eq('genre_id', genId).maybeSingle();
      if (!link) await supabase.from('media_genres').insert({ media_id: mediaId, genre_id: genId });
    }
  }
}

async function fetchYouTubeViewCounts(videoIds: string[], apiKey: string): Promise<Record<string, number>> {
  const statsMap: Record<string, number> = {};
  if (videoIds.length === 0) return statsMap;

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${chunk.join(',')}&key=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          const views = item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : 0;
          statsMap[item.id] = views;
        }
      }
    } catch (err) {
      console.error('Error fetching video view stats:', err);
    }
  }

  return statsMap;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelIndexParam = searchParams.get('channel_index');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !youtubeApiKey) {
    return NextResponse.json({ error: 'Missing environment variables in .env.local' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const syncLogs: string[] = [];

  try {
    // 1. HARD PURGE "FIRST TIME" FAKE MEDIA RECORD
    const { data: firstTimeFakes } = await supabase
      .from('media_items')
      .select('id')
      .ilike('title', 'First Time');

    if (firstTimeFakes && firstTimeFakes.length > 0) {
      const fakeIds = firstTimeFakes.map((m) => m.id);
      await supabase.from('videos').delete().in('media_id', fakeIds);
      await supabase.from('media_items').delete().in('id', fakeIds);
      syncLogs.push(`Sanitized DB: Purged ${fakeIds.length} fake "First Time" media items.`);
    }

    // 2. HARD PURGE ALL SHORTS AND NON-REACTION VIDEOS
    const { data: shortsToDelete } = await supabase
      .from('videos')
      .select('id, title')
      .or('title.ilike.%#shorts%,title.ilike.%#short%,title.ilike.%shorts%,title.ilike.%trailer%,title.ilike.%teaser%,title.ilike.%spoiler talk%,title.ilike.%non-spoiler%');

    if (shortsToDelete && shortsToDelete.length > 0) {
      const shortIds = shortsToDelete.map((v) => v.id);
      await supabase.from('videos').delete().in('id', shortIds);
      syncLogs.push(`Sanitized DB: Deleted ${shortIds.length} YouTube Shorts / trailer records.`);
    }

    // 3. HARD PURGE FAKE & MISMATCHED MEDIA ITEMS
    const { data: badFakes } = await supabase
      .from('media_items')
      .select('id')
      .or('title.ilike.%Lindsay Lohan%,title.ilike.%Double Crossed%,title.ilike.%The Little Rascals Save the Day%,title.ilike.%#Horror%,title.ilike.%1981年华北大阅兵%,title.ilike.%A Tormented Soul%,title.ilike.%Impossible Missions%,title.ilike.%Martin Scorsese Directs%,title.ilike.%American Cinematheque%');

    if (badFakes && badFakes.length > 0) {
      const fakeIds = badFakes.map((m) => m.id);
      await supabase.from('videos').delete().in('media_id', fakeIds);
      await supabase.from('media_items').delete().in('id', fakeIds);
      syncLogs.push(`Sanitized DB: Purged ${fakeIds.length} fake/mismatched media records.`);
    }

    let channelsToProcess = CHANNELS_TO_SYNC;
    if (channelIndexParam !== null) {
      const index = parseInt(channelIndexParam, 10);
      if (index >= 0 && index < CHANNELS_TO_SYNC.length) {
        channelsToProcess = [CHANNELS_TO_SYNC[index]];
      }
    }

    const allExistingVideos = await fetchAllRowsPaginated(supabase, 'videos', 'id, yt_video_id, media_id, view_count');
    const existingVideoMap = new Map<string, { id: string; media_id: string; view_count: number }>();
    for (const v of allExistingVideos) {
      existingVideoMap.set(v.yt_video_id, { id: v.id, media_id: v.media_id, view_count: v.view_count || 0 });
    }

    const allMediaItems = await fetchAllRowsPaginated(supabase, 'media_items', 'id, tmdb_id, title, release_year');
    const mediaTitleMap = new Map<string, string>();
    for (const m of allMediaItems) {
      const key = `${m.title.toLowerCase().trim()}_${m.release_year || 0}`;
      mediaTitleMap.set(key, m.id);
      mediaTitleMap.set(m.title.toLowerCase().trim(), m.id);
    }

    for (const channelConfig of channelsToProcess) {
      syncLogs.push(`=== Syncing Channel: ${channelConfig.name} ===`);

      const channelInfo = await resolveYouTubeChannelInfo(channelConfig.handle, channelConfig.knownChannelId, youtubeApiKey);

      if (!channelInfo) {
        syncLogs.push(`Warning: Could not resolve channel ID for ${channelConfig.name}`);
        continue;
      }

      const { channelId: ytChannelId, uploadsPlaylistId, avatarUrl } = channelInfo;
      const cleanSlug = generateCleanSlug(channelConfig.name);

      let channelRecord = null;
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('*')
        .or(`yt_channel_id.eq.${ytChannelId},handle.ilike.%${channelConfig.handle}%`)
        .maybeSingle();

      if (existingChannel) {
        channelRecord = existingChannel;
        await supabase.from('channels').update({
          yt_channel_id: ytChannelId,
          name: channelConfig.name,
          handle: `@${channelConfig.handle}`,
          avatar_url: avatarUrl || existingChannel.avatar_url,
          slug: cleanSlug,
        }).eq('id', existingChannel.id);
      } else {
        const { data: newChan } = await supabase
          .from('channels')
          .insert({
            yt_channel_id: ytChannelId,
            handle: `@${channelConfig.handle}`,
            name: channelConfig.name,
            avatar_url: avatarUrl,
            slug: cleanSlug,
          })
          .select()
          .single();
        if (newChan) channelRecord = newChan;
      }

      if (!channelRecord) continue;

      let pageToken: string | null = null;
      let movieReactionsMatched = 0;

      do {
        let playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${youtubeApiKey}`;
        if (pageToken) playlistUrl += `&pageToken=${pageToken}`;

        const playlistRes = await fetch(playlistUrl);
        const playlistData = await playlistRes.json();

        if (!playlistData.items) break;

        const validItems = playlistData.items.filter((item: any) => {
          const id = item.snippet?.resourceId?.videoId;
          const title = item.snippet?.title || '';
          const isShort = /#shorts?|#short|\bshorts?\b|\btiktok\b|\breels?\b|\bclip\b|\btrailer\b|\bteaser\b/i.test(title);
          return id && title !== 'Private video' && title !== 'Deleted video' && !isShort;
        });

        const unindexedVideoIds = validItems
          .map((item: any) => item.snippet.resourceId.videoId)
          .filter((id: string) => !existingVideoMap.has(id));

        const viewStats = unindexedVideoIds.length > 0 ? await fetchYouTubeViewCounts(unindexedVideoIds, youtubeApiKey) : {};

        for (const item of validItems) {
          const snippet = item.snippet;
          const ytVideoId = snippet.resourceId.videoId;
          const rawTitle = snippet.title;

          if (existingVideoMap.has(ytVideoId)) {
            continue;
          }

          const description = snippet.description;
          const publishedAt = snippet.publishedAt;
          const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url;
          const viewCount = viewStats[ytVideoId] || 0;

          const { cleanTitles, year, isNonMovieVideo } = extractCleanMovieTitle(rawTitle);

          if (isNonMovieVideo || cleanTitles.length === 0) continue;

          let mediaItemId: string | null = null;
          for (const candidate of cleanTitles) {
            const cacheKeyWithYear = `${candidate.toLowerCase().trim()}_${year || 0}`;
            const cacheKeyTitle = candidate.toLowerCase().trim();
            if (mediaTitleMap.has(cacheKeyWithYear)) {
              mediaItemId = mediaTitleMap.get(cacheKeyWithYear)!;
              break;
            } else if (mediaTitleMap.has(cacheKeyTitle)) {
              mediaItemId = mediaTitleMap.get(cacheKeyTitle)!;
              break;
            }
          }

          if (!mediaItemId) {
            const tmdbData = await searchAndFetchMovieMetadata(cleanTitles, year);
            if (!tmdbData) continue;

            const { data: existingMedia } = await supabase
              .from('media_items')
              .select('id')
              .eq('tmdb_id', tmdbData.tmdb_id)
              .maybeSingle();

            if (existingMedia) {
              mediaItemId = existingMedia.id;
            } else {
              const { data: newMedia } = await supabase
                .from('media_items')
                .insert({
                  tmdb_id: tmdbData.tmdb_id,
                  title: tmdbData.title,
                  media_type: 'movie',
                  release_year: tmdbData.release_year,
                  synopsis: tmdbData.synopsis,
                  poster_url: tmdbData.poster_url,
                  backdrop_url: tmdbData.backdrop_url,
                  studio_label: tmdbData.studio,
                })
                .select()
                .single();

              if (newMedia) {
                mediaItemId = newMedia.id;
              }
            }

            if (mediaItemId && tmdbData) {
              await linkMediaCreditsAndGenres(supabase, mediaItemId, tmdbData);
              const key = `${tmdbData.title.toLowerCase().trim()}_${tmdbData.release_year || 0}`;
              mediaTitleMap.set(key, mediaItemId);
            }
          }

          if (mediaItemId) {
            movieReactionsMatched++;
            await supabase.from('videos').insert({
              yt_video_id: ytVideoId,
              channel_id: channelRecord.id,
              media_id: mediaItemId,
              title: rawTitle,
              description,
              thumbnail_url: thumbnailUrl,
              published_at: publishedAt,
              view_count: viewCount,
            });

            existingVideoMap.set(ytVideoId, { id: mediaItemId, media_id: mediaItemId, view_count: viewCount });
          }
        }

        pageToken = playlistData.nextPageToken || null;
      } while (pageToken);

      syncLogs.push(`${channelConfig.name}: Completed backlog (${movieReactionsMatched} new reactions synced).`);
    }

    // 4. PURGE ORPHANED MEDIA ITEMS
    await supabase.from('videos').delete().is('media_id', null);
    const allMedia = await fetchAllRowsPaginated(supabase, 'media_items', 'id, videos(id)');
    const orphanedIds = allMedia.filter((m: any) => !m.videos || m.videos.length === 0).map((m: any) => m.id);
    if (orphanedIds.length > 0) {
      await supabase.from('media_items').delete().in('id', orphanedIds);
      syncLogs.push(`Purged ${orphanedIds.length} orphaned ghost media records.`);
    }

    // 5. PRE-COMPUTE AND STORE CHANNEL AGGREGATE STATS
    const { data: allChannels } = await supabase.from('channels').select('id');
    if (allChannels) {
      const allVids = await fetchAllRowsPaginated(supabase, 'videos', 'channel_id, view_count');
      const statsMap = new Map<string, { views: number; count: number }>();

      for (const v of allVids) {
        if (!v.channel_id) continue;
        const views = v.view_count || 0;
        if (!statsMap.has(v.channel_id)) {
          statsMap.set(v.channel_id, { views, count: 1 });
        } else {
          const s = statsMap.get(v.channel_id)!;
          s.views += views;
          s.count += 1;
        }
      }

      for (const c of allChannels) {
        const stat = statsMap.get(c.id) || { views: 0, count: 0 };
        const avg = stat.count > 0 ? Math.round(stat.views / stat.count) : 0;
        await supabase
          .from('channels')
          .update({
            total_views: stat.views,
            video_count: stat.count,
            avg_views_per_video: avg,
          })
          .eq('id', c.id);
      }
      syncLogs.push(`Cached aggregate metrics for all ${allChannels.length} creator profiles.`);
    }

    return NextResponse.json({
      success: true,
      channelsTotal: CHANNELS_TO_SYNC.length,
      logs: syncLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}