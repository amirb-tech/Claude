-- SQLite schema (node:sqlite). Postgres port: TEXT ids -> uuid, INTEGER ms
-- timestamps -> timestamptz, same constraints. Access rules: data-layer
-- checks (one ownership check per mutating query in server/db.ts).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  genre TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS artists_name ON artists(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  release_date TEXT NOT NULL,            -- ISO date
  type TEXT NOT NULL CHECK (type IN ('album','single','ep')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS albums_artist ON albums(artist_id, release_date);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL CHECK (track_number > 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  audio_url TEXT NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (album_id, track_number)
);
CREATE INDEX IF NOT EXISTS tracks_artist ON tracks(artist_id, play_count DESC);
CREATE INDEX IF NOT EXISTS tracks_title ON tracks(title COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS playlists_owner ON playlists(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id TEXT PRIMARY KEY,                    -- a track may appear twice; rows are the unit
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position REAL NOT NULL,                 -- fractional index: reorder without renumbering
  added_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pt_playlist ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS pt_track ON playlist_tracks(track_id);

CREATE TABLE IF NOT EXISTS saved_tracks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, track_id)
);
CREATE INDEX IF NOT EXISTS saved_tracks_recent ON saved_tracks(user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS saved_albums (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, album_id)
);

CREATE TABLE IF NOT EXISTS followed_artists (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  followed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  context_type TEXT CHECK (context_type IN ('album','playlist','artist','liked','search', NULL)),
  context_id TEXT,
  played_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS history_user ON play_history(user_id, played_at DESC);
