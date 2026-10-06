#!/bin/sh
# Versleutelde dagelijkse back-up van Luiten CRM.
# Vereist: apt install age. Maak de sleutel op een ANDERE computer: age-keygen -o luiten-crm-backup.key
# en zet alleen de publieke sleutel (age1...) hieronder. Zonder de privésleutel is de back-up onleesbaar.
# Cron (root):  15 2 * * *  /opt/luiten-crm/deploy/backup.sh
set -eu
AGE_RECIPIENT="age1VERVANG-DOOR-JE-PUBLIEKE-SLEUTEL"
DATA=/var/lib/luiten-crm
OUT=/var/backups/luiten-crm
KEEP_DAYS=30

umask 077
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Consistente kopie van de database (veilig terwijl de app draait, ook in WAL-modus)
/opt/luiten-crm/.venv/bin/python -c "import sqlite3,sys; s=sqlite3.connect(sys.argv[1]); d=sqlite3.connect(sys.argv[2]); s.backup(d); d.close(); s.close()" \
  "$DATA/luiten-crm.db" "$TMP/luiten-crm.db"
cp -a "$DATA/uploads" "$DATA/secret.key" "$TMP/"

STAMP=$(date +%Y%m%d_%H%M)
tar -C "$TMP" -czf - . | age -r "$AGE_RECIPIENT" -o "$OUT/luiten-crm-$STAMP.tar.gz.age"
find "$OUT" -name 'luiten-crm-*.tar.gz.age' -mtime +"$KEEP_DAYS" -delete
echo "Back-up: $OUT/luiten-crm-$STAMP.tar.gz.age"
# Kopieer de back-ups ook naar een plek buiten deze server (rsync/rclone naar opslag van Luiten).
