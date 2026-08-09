import json
import os
import sqlite3
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


def find_local_sqlite_path():
  candidates = [
      os.path.join(
          os.path.expanduser('~'), 'OneDrive', 'Desktop', 'finvidiatv.db'
      ),
      os.path.join(os.path.expanduser('~'), 'Desktop', 'finvidiatv.db'),
      os.path.join(os.path.dirname(__file__), 'finvidiatv.db'),
  ]
  for p in candidates:
    if os.path.exists(p):
      return p
  return None


def ensure_local_schema_parity(conn):
  cursor = conn.cursor()
  cursor.execute('PRAGMA table_info(youtube_videos)')
  existing_cols = {col[1].lower(): col[1] for col in cursor.fetchall()}

  required_columns = {
      'duration_seconds': 'INTEGER',
      'media_id': 'TEXT',
      'is_valid_reaction': 'INTEGER DEFAULT 1',
      'ai_audited': 'INTEGER DEFAULT 0',
      'ai_summary': 'TEXT',
      'verification_status': "TEXT DEFAULT 'pending'",
  }

  for col_name, col_type in required_columns.items():
    if col_name.lower() not in existing_cols:
      print(f"--> Migrating schema: Adding '{col_name}' to local SQLite...")
      cursor.execute(
          f'ALTER TABLE youtube_videos ADD COLUMN {col_name} {col_type}'
      )

  conn.commit()


def supabase_get_all(endpoint):
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


def main():
  db_path = find_local_sqlite_path()
  if not db_path:
    print("ERROR: Local 'finvidiatv.db' not found!")
    return

  print(f"--> Connected to local SQLite database at: '{db_path}'")
  conn = sqlite3.connect(db_path)

  ensure_local_schema_parity(conn)
  cursor = conn.cursor()

  print("--> Fetching all video records from Supabase Cloud...")
  sb_videos = supabase_get_all('videos?select=*')
  print(f"--> Fetched {len(sb_videos)} total videos from Supabase Cloud.")

  if not sb_videos:
    print("⚠️ Supabase returned 0 records. Aborting pull to protect local DB.")
    conn.close()
    return

  sb_yt_ids = set()
  updated_count = 0

  for v in sb_videos:
    yt_id = v.get('yt_video_id')
    if not yt_id:
      continue

    sb_yt_ids.add(yt_id)

    movie_id = v.get('media_id') or v.get('movie_id')
    duration = v.get('duration_seconds')
    duration_val = int(duration) if duration is not None else None

    title = v.get('title')
    description = v.get('description')
    thumbnail_url = v.get('thumbnail_url')
    published_at = v.get('published_at')
    view_count = v.get('view_count')
    is_full_reaction = 1 if v.get('is_full_reaction') else 0
    verification_status = v.get('verification_status') or 'pending'

    cursor.execute(
        'SELECT Id FROM youtube_videos WHERE yt_video_id = ?', (yt_id,)
    )
    row = cursor.fetchone()

    if row:
      cursor.execute(
          """
                UPDATE youtube_videos 
                SET title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    thumbnail_url = COALESCE(?, thumbnail_url),
                    published_at = COALESCE(?, published_at),
                    view_count = COALESCE(?, view_count),
                    is_full_reaction = ?,
                    verification_status = ?,
                    duration_seconds = COALESCE(?, duration_seconds),
                    movie_id = ?
                WHERE yt_video_id = ?
            """,
          (
              title,
              description,
              thumbnail_url,
              published_at,
              view_count,
              is_full_reaction,
              verification_status,
              duration_val,
              str(movie_id) if movie_id else None,
              yt_id,
          ),
      )
    else:
      cursor.execute(
          """
                INSERT INTO youtube_videos (
                    yt_video_id, title, description, thumbnail_url, 
                    published_at, view_count, is_full_reaction, 
                    verification_status, duration_seconds, movie_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
          (
              yt_id,
              title,
              description,
              thumbnail_url,
              published_at,
              view_count,
              is_full_reaction,
              verification_status,
              duration_val,
              str(movie_id) if movie_id else None,
          ),
      )

    updated_count += 1

  conn.commit()

  # Purge local rows deleted on Supabase
  cursor.execute(
      'SELECT yt_video_id FROM youtube_videos WHERE yt_video_id IS NOT NULL'
  )
  local_yt_ids = {r[0] for r in cursor.fetchall()}

  stale_local_ids = local_yt_ids - sb_yt_ids
  if stale_local_ids:
    print(
        f"--> Pruning {len(stale_local_ids)} local rows deleted from Supabase..."
    )
    cursor.executemany(
        'DELETE FROM youtube_videos WHERE yt_video_id = ?',
        [(vid,) for vid in stale_local_ids],
    )
    conn.commit()

  conn.close()

  print('\n==================================================')
  print('🎉 PARITY SYNC COMPLETE!')
  print(f'  • Synced/Updated: {updated_count} rows')
  print(f'  • Pruned Stale Local Rows: {len(stale_local_ids)}')
  print('==================================================')


if __name__ == '__main__':
  main()