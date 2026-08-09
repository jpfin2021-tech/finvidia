import json
import os
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


def fetch_supabase_actors():
  # Use select=* to avoid HTTP 400 errors on missing columns
  url = f'{SUPABASE_URL}/rest/v1/actors?select=*'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
  }
  req = urllib.request.Request(url, headers=headers)
  try:
    with urllib.request.urlopen(req) as resp:
      return json.loads(resp.read().decode('utf-8'))
  except Exception as e:
    print(f'Error fetching actors: {e}')
    return []


def search_tmdb_actor(actor_name):
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
    print(f'TMDB search error for {actor_name}: {e}')
  return None, None


def update_actor_profile(actor_id, profile_url, tmdb_person_id=None):
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
    # If profile_img_url column doesn't exist, log warning
    print(f'⚠️ Unable to update database for actor ID {actor_id}: {e}')
    return False


def main():
  print('==================================================')
  print('📸 SYNCING ACTOR PROFILE PICTURES FROM TMDB')
  print('==================================================')

  actors = fetch_supabase_actors()
  print(f'Found {len(actors)} total actors in database.')

  if not actors:
    print('No actors returned. Exiting.')
    return

  updated = 0
  for a in actors:
    actor_id = a.get('id')
    actor_name = a.get('name')
    existing_url = a.get('profile_img_url')

    if not existing_url and actor_name:
      tmdb_id, img_url = search_tmdb_actor(actor_name)
      if img_url:
        if update_actor_profile(actor_id, img_url, tmdb_id):
          print(f"  ✅ Updated '{actor_name}' headshot -> {img_url}")
          updated += 1
        else:
          print(
              f"  ℹ️ TMDB headshot found for '{actor_name}' -> {img_url} (Column"
              ' update skipped)'
          )

  print('\n==================================================')
  print(f'🎉 ACTOR HEADSHOT PROCESS COMPLETE! ({updated} profiles updated)')
  print('==================================================')


if __name__ == '__main__':
  main()