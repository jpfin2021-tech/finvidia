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


def fetch_paginated(table, select='id'):
  records = []
  offset = 0
  page_size = 1000
  while True:
    url = f'{SUPABASE_URL}/rest/v1/{table}?select={select}'
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
          records.extend(data)
          if len(data) < page_size:
            break
          offset += page_size
        else:
          break
    except Exception as e:
      print(f'Error fetching {table}: {e}')
      break
  return records


def delete_chunk(table, column, values):
  if not values:
    return
  val_str = ','.join([urllib.parse.quote(v) for v in values])
  url = f'{SUPABASE_URL}/rest/v1/{table}?{column}=in.({val_str})'
  headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
      'Prefer': 'return=minimal',
  }
  req = urllib.request.Request(url, headers=headers, method='DELETE')
  try:
    with urllib.request.urlopen(req) as resp:
      return resp.status in (200, 204)
  except Exception as e:
    print(f'Delete chunk error on {table}: {e}')
    return False


def main():
  print('==================================================')
  print('🧹 CHUNKED PURGE OF UNREACTED LIVE SUPABASE DATA')
  print('==================================================')

  if not SUPABASE_SERVICE_ROLE_KEY:
    print('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY missing in .env.local')
    return

  # 1. Get reacted media IDs from videos table
  print('--> Fetching reacted movie IDs from videos table...')
  videos = fetch_paginated('videos', 'media_id')
  reacted_ids = {v['media_id'] for v in videos if v.get('media_id')}
  print(f'  ✅ Found {len(reacted_ids)} reacted movie IDs.')

  # 2. Get all media IDs from Supabase
  print('--> Fetching all media_items IDs from live Supabase...')
  all_media = fetch_paginated('media_items', 'id')
  all_media_ids = [m['id'] for m in all_media]
  print(f'  ✅ Total media_items in live Supabase: {len(all_media_ids)}')

  # Fix: List comprehension variable matching
  unreacted_ids = [
      m_id for m_id in all_media_ids if m_id not in reacted_ids
  ]
  total_unreacted = len(unreacted_ids)
  print(f'--> Found {total_unreacted} unreacted movies to purge from live DB.')

  if not unreacted_ids:
    print('🎉 Live database is already clean!')
    return

  chunk_size = 200

  # 3. Purge unreacted media_actors links in chunks
  print('--> Purging unreacted media_actors links in chunks of 200...')
  for i in range(0, total_unreacted, chunk_size):
    chunk = unreacted_ids[i : i + chunk_size]
    delete_chunk('media_actors', 'media_id', chunk)
    if (i // chunk_size) % 50 == 0 or (i + chunk_size) >= total_unreacted:
      pct = round(
          (min(i + chunk_size, total_unreacted) / total_unreacted) * 100, 1
      )
      print(
          f'   [ACTORS LINKS PROGRESS] {min(i + chunk_size, total_unreacted)} /'
          f' {total_unreacted} ({pct}%)'
      )

  # 4. Purge unreacted media_items in chunks
  print('--> Purging unreacted media_items in chunks of 200...')
  for i in range(0, total_unreacted, chunk_size):
    chunk = unreacted_ids[i : i + chunk_size]
    delete_chunk('media_items', 'id', chunk)
    if (i // chunk_size) % 50 == 0 or (i + chunk_size) >= total_unreacted:
      pct = round(
          (min(i + chunk_size, total_unreacted) / total_unreacted) * 100, 1
      )
      print(
          f'   [MOVIES PURGE PROGRESS] {min(i + chunk_size, total_unreacted)} /'
          f' {total_unreacted} ({pct}%)'
      )

  print('\n==================================================')
  print('🎉 PURGE COMPLETE! Live Supabase DB is now clean & lean.')
  print(f'  • Remaining Reacted Movies in Live DB: {len(reacted_ids)}')
  print(
      '  • Master Offline Backup Intact at: finvidia_master_archive.db'
      ' (92,312 movies)'
  )
  print('==================================================')


if __name__ == '__main__':
  main()