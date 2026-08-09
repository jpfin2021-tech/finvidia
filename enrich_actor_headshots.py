import json
import os
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
    except Exception as e:
      print(f'Error fetching {endpoint}: {e}')
      break
  return all_records


def search_tmdb_actor_headshot(actor_name):
  if not TMDB_API_KEY:
    return None, None
  query = urllib.parse.quote(actor_name)
  url = f'https://api.themoviedb.org/3/search/person?api_key={TMDB_API_KEY}&query={query}&include_adult=false'
  try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
      data = json.loads(resp.read().decode('utf-8'))
      results = data.get('results', [])
      if results:
        person = results[0]
        person_id = person.get('id')
        path = person.get('profile_path')
        img_url = f'https://image.tmdb.org/t/p/w300{path}' if path else None
        return person_id, img_url
  except Exception as e:
    print(f'TMDB Error for {actor_name}: {e}')
  return None, None


def update_actor_record(actor_id, profile_url, tmdb_person_id=None):
  url = f'{SUPABASE_URL}/rest/v1/actors?id=eq.{actor_id}'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
  }
  payload = {'profile_img_url': profile_url}
  if tmdb_person_id:
    payload['tmdb_person_id'] = tmdb_person_id

  data = json.dumps(payload).encode('utf-8')
  req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
  try:
    with urllib.request.urlopen(req) as resp:
      return resp.status in (200, 204)
  except Exception as e:
    print(f'Failed updating actor ID {actor_id}: {e}')
    return False


def main():
  print('==================================================')
  print('🚀 DATABASE BATCH INGESTION: ACTOR HEADSHOTS')
  print('==================================================')

  if not TMDB_API_KEY:
    print('❌ ERROR: TMDB_API_KEY missing in .env.local')
    return

  # 1. Fetch only actors linked to indexed films
  print('--> Fetching actors linked to indexed films...')
  media_actors = fetch_supabase_paginated(
      'media_actors?select=actor_id,actors(*)'
  )

  actor_map = {}
  for item in media_actors:
    act = item.get('actors')
    if act and isinstance(act, dict):
      actor_map[act['id']] = act

  active_actors = list(actor_map.values())
  print(f'--> Found {len(active_actors)} active actors linked to films.')

  updated_count = 0
  for idx, actor in enumerate(active_actors, 1):
    actor_id = actor.get('id')
    actor_name = actor.get('name')
    existing_url = actor.get('profile_img_url')

    if existing_url:
      continue

    print(
        f"[{idx}/{len(active_actors)}] Fetching headshot for '{actor_name}'..."
    )
    tmdb_id, img_url = search_tmdb_actor_headshot(actor_name)

    if img_url:
      if update_actor_record(actor_id, img_url, tmdb_id):
        print(f"  ✅ Saved: '{actor_name}' -> {img_url}")
        updated_count += 1
      else:
        print(f"  ❌ DB Write Failed for '{actor_name}'")
    else:
      print(f"  ⚠️ No headshot found on TMDB for '{actor_name}'")

    time.sleep(0.1)  # Respect API limits

  print('\n==================================================')
  print(
      '🎉 INGESTION COMPLETE! Successfully enriched'
      f' {updated_count} actors in Supabase.'
  )
  print('==================================================')


if __name__ == '__main__':
  main()