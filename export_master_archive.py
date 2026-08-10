import json
import os
import sqlite3
import time
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


def get_archive_db_path():
  desktop_onedrive = os.path.join(
      os.path.expanduser('~'), 'OneDrive', 'Desktop', 'finvidia_master_archive.db'
  )
  desktop_standard = os.path.join(
      os.path.expanduser('~'), 'Desktop', 'finvidia_master_archive.db'
  )

  if os.path.exists(os.path.dirname(desktop_onedrive)):
    return desktop_onedrive
  return desktop_standard


def fetch_supabase_table_paginated(table_name):
  all_records = []
  offset = 0
  page_size = 1000
  print(f"--> Fetching full table '{table_name}' from Supabase...")

  while True:
    url = f'{SUPABASE_URL}/rest/v1/{table_name}?select=*'
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
          if offset % 10000 == 0:
            print(f'   ...downloaded {offset} rows from {table_name}')
        else:
          break
    except Exception as e:
      print(f'   ❌ Error downloading {table_name}: {e}')
      break

  print(f"  ✅ Completed '{table_name}': {len(all_records)} total rows fetched.")
  return all_records


def build_local_archive_db(db_path, data_dict):
  print(f"\n--> Writing master dataset into new SQLite database at:\n    '{db_path}'")
  conn = sqlite3.connect(db_path)
  cursor = conn.cursor()

  # 1. Media Items Table
  cursor.execute('DROP TABLE IF EXISTS media_items')
  cursor.execute("""
        CREATE TABLE media_items (
            id TEXT PRIMARY KEY,
            media_type TEXT,
            title TEXT,
            release_year INTEGER,
            studio_label TEXT,
            synopsis TEXT,
            poster_url TEXT,
            backdrop_url TEXT,
            slug TEXT,
            tmdb_id INTEGER
        )
    """)
  for m in data_dict.get('media_items', []):
    cursor.execute(
        """
            INSERT OR REPLACE INTO media_items (
                id, media_type, title, release_year, studio_label, 
                synopsis, poster_url, backdrop_url, slug, tmdb_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            m.get('id'),
            m.get('media_type'),
            m.get('title'),
            m.get('release_year'),
            m.get('studio_label'),
            m.get('synopsis'),
            m.get('poster_url'),
            m.get('backdrop_url'),
            m.get('slug'),
            m.get('tmdb_id'),
        ),
    )

  # 2. Actors Table
  cursor.execute('DROP TABLE IF EXISTS actors')
  cursor.execute("""
        CREATE TABLE actors (
            id TEXT PRIMARY KEY,
            name TEXT,
            slug TEXT,
            tmdb_person_id INTEGER,
            profile_img_url TEXT
        )
    """)
  for a in data_dict.get('actors', []):
    cursor.execute(
        """
            INSERT OR REPLACE INTO actors (
                id, name, slug, tmdb_person_id, profile_img_url
            ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            a.get('id'),
            a.get('name'),
            a.get('slug'),
            a.get('tmdb_person_id'),
            a.get('profile_img_url'),
        ),
    )

  # 3. Media Actors Junction Table
  cursor.execute('DROP TABLE IF EXISTS media_actors')
  cursor.execute("""
        CREATE TABLE media_actors (
            media_id TEXT,
            actor_id TEXT
        )
    """)
  for ma in data_dict.get('media_actors', []):
    cursor.execute(
        'INSERT INTO media_actors (media_id, actor_id) VALUES (?, ?)',
        (ma.get('media_id'), ma.get('actor_id')),
    )

  # 4. Videos Table
  cursor.execute('DROP TABLE IF EXISTS videos')
  cursor.execute("""
        CREATE TABLE videos (
            id TEXT PRIMARY KEY,
            yt_video_id TEXT,
            media_id TEXT,
            channel_id TEXT,
            title TEXT,
            description TEXT,
            thumbnail_url TEXT,
            published_at TEXT,
            view_count INTEGER,
            verification_status TEXT
        )
    """)
  for v in data_dict.get('videos', []):
    cursor.execute(
        """
            INSERT OR REPLACE INTO videos (
                id, yt_video_id, media_id, channel_id, title, description,
                thumbnail_url, published_at, view_count, verification_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            v.get('id'),
            v.get('yt_video_id'),
            v.get('media_id'),
            v.get('channel_id'),
            v.get('title'),
            v.get('description'),
            v.get('thumbnail_url'),
            v.get('published_at'),
            v.get('view_count'),
            v.get('verification_status'),
        ),
    )

  # 5. Channels Table
  cursor.execute('DROP TABLE IF EXISTS channels')
  cursor.execute("""
        CREATE TABLE channels (
            id TEXT PRIMARY KEY,
            name TEXT,
            handle TEXT,
            slug TEXT,
            avatar_url TEXT,
            yt_channel_id TEXT
        )
    """)
  for c in data_dict.get('channels', []):
    cursor.execute(
        """
            INSERT OR REPLACE INTO channels (
                id, name, handle, slug, avatar_url, yt_channel_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            c.get('id'),
            c.get('name'),
            c.get('handle'),
            c.get('slug'),
            c.get('avatar_url'),
            c.get('yt_channel_id'),
        ),
    )

  conn.commit()
  conn.close()


def main():
  print('==================================================')
  print('📦 EXPORTING FULL MASTER DATABASE TO OFFLINE ARCHIVE')
  print('==================================================')

  db_path = get_archive_db_path()

  tables_to_export = [
      'media_items',
      'actors',
      'media_actors',
      'videos',
      'channels',
  ]
  data_dict = {}

  start_time = time.time()
  for tbl in tables_to_export:
    data_dict[tbl] = fetch_supabase_table_paginated(tbl)

  build_local_archive_db(db_path, data_dict)

  duration = round(time.time() - start_time, 1)

  print('\n==================================================')
  print('🎉 MASTER OFFLINE DATABASE CREATION COMPLETE!')
  print(f"  • Destination File: '{db_path}'")
  print(f"  • Total Movies Exported: {len(data_dict.get('media_items', []))}")
  print(
      '  • Total Actor Credit Links Exported:'
      f" {len(data_dict.get('media_actors', []))}"
  )
  print(f"  • Total Actors Exported: {len(data_dict.get('actors', []))}")
  print(f'  • Export Duration: {duration}s')
  print('==================================================')


if __name__ == '__main__':
  main()