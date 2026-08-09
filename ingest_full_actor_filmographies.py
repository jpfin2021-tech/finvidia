import concurrent.futures
import json
import os
import threading
import time
import urllib.parse
import urllib.request


def load_env_local():
  env_path = os.path.join(os.path.dirname(__file__), '.env.local')
  if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
      for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
          k, v = line.split('=', 1)
          os.environ[k.strip()] = v.strip().strip('"').strip("'")


load_env_local()

SUPABASE_URL = os.environ.get(
    'NEXT_PUBLIC_SUPABASE_URL', 'https://gvaqcosswaaywgduztgc.supabase.co'
)
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '')

progress_lock = threading.Lock()
processed_actors = 0
added_movies_count = 0
added_links_count = 0


def fetch_supabase_paginated(endpoint):
  all_records = []
  offset = 0
  page_size = 1000
  while True:
    url = f'{SUPABASE_URL}/rest/v1/{endpoint}'
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Range-Unit': 'items',
        'Range': f'{offset}-{offset + page_size - 1}',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
      with urllib.request.urlopen(req) as resp:
        if resp.status in (200, 206):
          data = json.loads(resp.read().decode('utf-8'))
          if not data:
            break
          all_records.extend(data)
          if len(data) < page_size:
            break
          offset += page_size
        else:
          break
    except Exception:
      break
  return all_records


def tmdb_get_actor_movie_credits(person_id, actor_name):
  if not TMDB_API_KEY:
    return []

  if not person_id:
    # Resolve TMDB person ID if missing
    query = urllib.parse.quote(actor_name)
    search_url = f'https://api.themoviedb.org/3/search/person?api_key={TMDB_API_KEY}&query={query}&include_adult=false'
    try:
      req = urllib.request.Request(search_url)
      with urllib.request.urlopen(req) as resp:
        search_data = json.loads(resp.read().decode('utf-8'))
        results = search_data.get('results', [])
        if results:
          person_id = results[0].get('id')
    except Exception:
      return []

  if not person_id:
    return []

  credits_url = f'https://api.themoviedb.org/3/person/{person_id}/movie_credits?api_key={TMDB_API_KEY}'
  try:
    req = urllib.request.Request(credits_url)
    with urllib.request.urlopen(req) as resp:
      credits_data = json.loads(resp.read().decode('utf-8'))
      cast_list = credits_data.get('cast', [])
      return cast_list
  except Exception:
    return []


def insert_movie_if_missing(movie):
  tmdb_id = movie.get('id')
  title = movie.get('title')
  release_date = movie.get('release_date', '')
  release_year = (
      int(release_date.split('-')[0])
      if release_date and '-' in release_date
      else 0
  )
  poster_path = movie.get('poster_path')
  backdrop_path = movie.get('backdrop_path')

  poster_url = (
      f'https://image.tmdb.org/t/p/w500{poster_path}' if poster_path else ''
  )
  backdrop_url = (
      f'https://image.tmdb.org/t/p/original{backdrop_path}'
      if backdrop_path
      else ''
  )

  # Check if movie exists by tmdb_id or title/year
  url = f'{SUPABASE_URL}/rest/v1/media_items?tmdb_id=eq.{tmdb_id}'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
  }
  req = urllib.request.Request(url, headers=headers)
  try:
    with urllib.request.urlopen(req) as resp:
      existing = json.loads(resp.read().decode('utf-8'))
      if existing:
        return existing[0]['id']
  except Exception:
    pass

  # Insert missing movie record
  insert_url = f'{SUPABASE_URL}/rest/v1/media_items'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
  }
  payload = json.dumps({
      'tmdb_id': tmdb_id,
      'title': title,
      'media_type': 'movie',
      'release_year': release_year,
      'synopsis': movie.get('overview', ''),
      'poster_url': poster_url,
      'backdrop_url': backdrop_url,
  }).encode('utf-8')

  req = urllib.request.Request(
      insert_url, data=payload, headers=headers, method='POST'
  )
  try:
    with urllib.request.urlopen(req) as resp:
      data = json.loads(resp.read().decode('utf-8'))
      if data:
        return data[0]['id']
  except Exception:
    pass
  return None


def link_actor_to_movie(actor_id, media_id):
  url = f'{SUPABASE_URL}/rest/v1/media_actors?actor_id=eq.{actor_id}&media_id=eq.{media_id}'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
  }
  req = urllib.request.Request(url, headers=headers)
  try:
    with urllib.request.urlopen(req) as resp:
      existing = json.loads(resp.read().decode('utf-8'))
      if existing:
        return False
  except Exception:
    pass

  insert_url = f'{SUPABASE_URL}/rest/v1/media_actors'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
  }
  payload = json.dumps({'actor_id': actor_id, 'media_id': media_id}).encode(
      'utf-8'
  )
  req = urllib.request.Request(
      insert_url, data=payload, headers=headers, method='POST'
  )
  try:
    with urllib.request.urlopen(req) as resp:
      return resp.status in (200, 201, 204)
  except Exception:
    return False


def process_actor_filmography(actor, total_total):
  global processed_actors, added_movies_count, added_links_count

  actor_id = actor.get('id')
  actor_name = actor.get('name')
  person_id = actor.get('tmdb_person_id')

  cast_movies = tmdb_get_actor_movie_credits(person_id, actor_name)

  local_added_links = 0
  for movie in cast_movies[:100]:  # Limit to top 100 career credits per actor
    if not movie.get('title') or not movie.get('id'):
      continue

    media_id = insert_movie_if_missing(movie)
    if media_id:
      if link_actor_to_movie(actor_id, media_id):
        local_added_links += 1

  with progress_lock:
    processed_actors += 1
    added_links_count += local_added_links

    if processed_actors % 50 == 0 or processed_actors == total_total:
      pct = round((processed_actors / total_total) * 100, 1)
      print(
          f'  [FILMOGRAPHY BATCH] {processed_actors} / {total_total} ({pct}%)'
          f' actors processed | Career Links Added: {added_links_count}'
      )


def main():
  print('==================================================')
  print('🎬 INGESTING COMPLETE CAREER FILMOGRAPHIES')
  print('==================================================')

  if not TMDB_API_KEY:
    print('❌ ERROR: TMDB_API_KEY missing in .env.local')
    return

  print('--> Fetching active actors from database...')
  media_actors = fetch_supabase_paginated(
      'media_actors?select=actor_id,actors(*)'
  )

  actor_map = {}
  for item in media_actors:
    act = item.get('actors')
    if act and isinstance(act, dict):
      actor_map[act['id']] = act

  active_actors = list(actor_map.values())
  total_actors = len(active_actors)

  print(
      f'--> Found {total_actors} active actors. Starting 10 parallel worker'
      ' threads...'
  )

  start_time = time.time()
  with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [
        executor.submit(process_actor_filmography, actor, total_actors)
        for actor in active_actors
    ]
    concurrent.futures.wait(futures)

  duration = round(time.time() - start_time, 1)
  print('\n==================================================')
  print(
      f'🎉 CAREER FILMOGRAPHY INGESTION COMPLETE in {duration}s!'
  )
  print(f'  • Total Career Links Added: {added_links_count}')
  print('==================================================')


if __name__ == '__main__':
  main()