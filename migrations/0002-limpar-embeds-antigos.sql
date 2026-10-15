-- LISOFLIX 1.6: substitui a tabela de embeds antigos.
-- Rode SOMENTE depois de fazer backup do banco remoto.
-- Nao altera users, profiles, sessions, comments, reactions, watching ou my_list.
-- Fontes antigas sem direitos conferidos NAO sao copiadas.
BEGIN TRANSACTION;
ALTER TABLE playback_embeds RENAME TO playback_embeds_previous;
CREATE TABLE playback_embeds (
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 media_id INTEGER NOT NULL,
 season INTEGER NOT NULL DEFAULT 0,
 episode INTEGER NOT NULL DEFAULT 0,
 provider TEXT NOT NULL CHECK(provider IN ('embedmovies')),
 mode TEXT NOT NULL DEFAULT 'standard' CHECK(mode IN ('standard')),
 label TEXT NOT NULL DEFAULT 'Player externo',
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 PRIMARY KEY(media_type,media_id,season,episode)
);
INSERT OR IGNORE INTO playback_embeds(media_type,media_id,season,episode,provider,mode,label,enabled)
 SELECT media_type,media_id,season,episode,provider,'standard',label,enabled
 FROM playback_embeds_previous WHERE provider='embedmovies';
DROP TABLE playback_embeds_previous;
COMMIT;
