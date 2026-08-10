import json
import os
import re
import sqlite3


def get_archive_db_path():
  candidates = [
      os.path.join(
          os.path.expanduser('~'),
          'OneDrive',
          'Desktop',
          'finvidia_master_archive.db',
      ),
      os.path.join(
          os.path.expanduser('~'), 'Desktop', 'finvidia_master_archive.db'
      ),
  ]
  for p in candidates:
    if os.path.exists(p):
      return p
  return None


def generate_clean_slug(name):
  if not name:
    return ''
  s = name.lower()
  s = re.sub(r'[^a-z0-9]+', '-', s)
  return s.strip('-')


def main():
  print('==================================================')
  print('📄 PRE-BUILDING STATIC ACTOR FILMOGRAPHY FILES')
  print('==================================================')

  db_path = get_archive_db_path()
  if not db_path:
    print("❌ ERROR: Master database 'finvidia_master_archive.db' not found!")
    return

  out_dir = os.path.join(
      os.path.dirname(__file__), 'public', 'data', 'filmographies'
  )
  os.makedirs(out_dir, exist_ok=True)

  conn = sqlite3.connect(db_path)
  cursor = conn.cursor()

  # 1. Map all media_ids that have verified reaction videos
  cursor.execute(
      'SELECT DISTINCT media_id FROM videos WHERE media_id IS NOT NULL'
  )
  reacted_media_ids = {r[0] for r in cursor.fetchall()}

  # 2. Fetch all actors from master database
  cursor.execute(
      'SELECT id, name, slug, profile_img_url FROM actors WHERE name IS NOT'
      ' NULL'
  )
  actors = cursor.fetchall()
  print(
      f'--> Found {len(actors)} actors in Master Archive'
      f' ({len(reacted_media_ids)} reacted movie IDs).'
  )

  created_count = 0
  for act in actors:
    actor_id, name, slug, profile_img_url = act
    clean_slug = slug if slug else generate_clean_slug(name)

    # 3. Pull complete career credit history for this actor
    cursor.execute(
        """
            SELECT m.id, m.title, m.release_year, m.studio_label, m.slug
            FROM media_items m
            INNER JOIN media_actors ma ON ma.media_id = m.id
            WHERE ma.actor_id = ?
            ORDER BY m.release_year ASC
        """,
        (actor_id,),
    )

    movies = cursor.fetchall()
    if not movies:
      continue

    credits_list = []
    for m in movies:
      mid, title, release_year, studio_label, mslug = m
      credits_list.append({
          'id': mid,
          'title': title,
          'release_year': release_year or 0,
          'studio_label': studio_label or '—',
          'slug': mslug if mslug else generate_clean_slug(title),
          'has_reactions': mid in reacted_media_ids,
      })

    payload = {
        'id': actor_id,
        'name': name,
        'slug': clean_slug,
        'profile_img_url': profile_img_url,
        'filmography': credits_list,
    }

    file_path = os.path.join(out_dir, f'{clean_slug}.json')
    with open(file_path, 'w', encoding='utf-8') as f:
      json.dump(payload, f, indent=2)

    created_count += 1

  conn.close()

  print('\n==================================================')
  print('🎉 STATIC FILMOGRAPHY PRE-BUILD COMPLETE!')
  print(f"  • Directory: '{out_dir}'")
  print(f'  • Generated Files: {created_count} actor JSONs')
  print('==================================================')


if __name__ == '__main__':
  main()