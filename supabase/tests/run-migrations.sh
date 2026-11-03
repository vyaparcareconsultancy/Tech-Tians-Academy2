#!/usr/bin/env bash
# Applies every migration to a throwaway Postgres and runs security checks.
# Uses the standard PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE env vars.
# Never point this at the real Supabase database.
set -euo pipefail

cd "$(dirname "$0")/../.."
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

echo "== stub.sql"
"${PSQL[@]}" -f supabase/tests/stub.sql

for f in supabase/migrations/*.sql; do
  echo "== $f"
  "${PSQL[@]}" -f "$f"
done

echo "== checks.sql"
"${PSQL[@]}" -f supabase/tests/checks.sql
echo "All migration checks passed."
