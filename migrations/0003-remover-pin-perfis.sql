-- LISOFLIX 1.6.0: remove somente o antigo PIN dos perfis.
-- NAO altera a senha principal em users.password_hash.
-- Arquivo idempotente, executar somente apos backup D1.
UPDATE profiles SET pin_hash = NULL WHERE pin_hash IS NOT NULL;
