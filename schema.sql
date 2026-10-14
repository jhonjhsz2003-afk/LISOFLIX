PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 id_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 profile_id TEXT,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS profiles (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 avatar TEXT NOT NULL DEFAULT '',
 is_kids INTEGER NOT NULL DEFAULT 0,
 pin_hash TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS profiles_user ON profiles(user_id);
CREATE TABLE IF NOT EXISTS my_list (
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 media_id INTEGER NOT NULL,
 payload TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 PRIMARY KEY(profile_id,media_type,media_id)
);
CREATE TABLE IF NOT EXISTS watching (
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 media_id INTEGER NOT NULL,
 season INTEGER NOT NULL DEFAULT 0,
 episode INTEGER NOT NULL DEFAULT 0,
 payload TEXT NOT NULL DEFAULT '{}',
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 PRIMARY KEY(profile_id,media_type,media_id)
);
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 media_id INTEGER NOT NULL,
 content TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS comments_media ON comments(media_type,media_id,created_at);
CREATE TABLE IF NOT EXISTS catalog_cache (
 section TEXT NOT NULL,
 page INTEGER NOT NULL,
 payload TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 PRIMARY KEY(section,page)
);

-- Limitação de tentativas de login: somente hash de e-mail, sem armazenar IP.
CREATE TABLE IF NOT EXISTS login_guards (
 email_hash TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 0,
 blocked_until INTEGER NOT NULL DEFAULT 0
);

-- Interações da comunidade: votos isolados por perfil e título, aplicáveis sem apagar dados antigos.
CREATE TABLE IF NOT EXISTS reactions (
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 media_id INTEGER NOT NULL,
 vote INTEGER NOT NULL CHECK(vote IN (-1,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 PRIMARY KEY(profile_id,media_type,media_id)
);
CREATE INDEX IF NOT EXISTS reactions_media ON reactions(media_type,media_id);
