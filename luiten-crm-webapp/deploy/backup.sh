#!/bin/sh
# Dagelijkse back-up van Luiten CRM (FreeBSD). Alleen standaard Python + base-tools.
# Cron (root, /etc/crontab):  15  2  *  *  *  root  /usr/local/www/luitencrm/deploy/backup.sh
set -eu
DATA=${LCRM_DATA:-/var/db/luitencrm}
OUT=${LCRM_BACKUP_DIR:-/var/backups/luitencrm}
KEEP_DAYS=${LCRM_BACKUP_DAYS:-30}

umask 077
mkdir -p "$OUT"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/luitencrm.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# Consistente kopie van de database, ook terwijl de app draait (WAL-modus)
/usr/local/bin/python -c 'import sqlite3, sys
s = sqlite3.connect(sys.argv[1]); d = sqlite3.connect(sys.argv[2]); s.backup(d); d.close(); s.close()' \
  "$DATA/luiten-crm.db" "$TMP/luiten-crm.db"
cp -Rp "$DATA/uploads" "$DATA/secret.key" "$TMP/"

STAMP=$(date +%Y%m%d_%H%M)
tar -czf "$OUT/luitencrm-$STAMP.tar.gz" -C "$TMP" .
find "$OUT" -name 'luitencrm-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "Back-up: $OUT/luitencrm-$STAMP.tar.gz"
