# Luiten CRM – deployment op FreeBSD (luitencrm.luitenfood.net)

Overdracht voor IT. De VPS, Caddy, TLS en versleuteling in rust worden door IT beheerd; dit document beschrijft
alleen wat de app nodig heeft.

## Samenvatting

| | |
|---|---|
| Adres | `https://luitencrm.luitenfood.net` (site-wachtwoord via Caddy, daarna eigen login per medewerker) |
| OS | FreeBSD 15.1-RELEASE |
| Webserver / TLS | Caddy → `reverse_proxy 127.0.0.1:8000` |
| Python | 3.12, `#!/usr/local/bin/python` |
| Python-pakketten (pkg) | `py312-flask`, `py312-openpyxl`, `py312-sqlite3` — **geen pip** |
| App-server | Standaardbibliotheek (`wsgiref` met threads), luistert alleen op `127.0.0.1:8000` |
| Database | SQLite-bestand + foto's in `/var/db/luitencrm` |
| Procesbeheer | rc.d-script `luitencrm` via `daemon(8)`; geen automatische herstart na een crash (`/health` en de statuspagina signaleren uitval) |
| Health | `GET /health` → JSON, zonder login of site-wachtwoord |

## Bestanden in `deploy/`

| Bestand | Doel |
|---|---|
| `luitencrm.rc` | rc.d-script → `/usr/local/etc/rc.d/luitencrm` |
| `Caddyfile` | site-blok voor `luitencrm.luitenfood.net` (met `basic_auth`, `/health` vrijgesteld) |
| `backup.sh` | consistente dagelijkse back-up van database + foto's |

---

## 1. Pakketten

```sh
pkg install python312 python py312-flask py312-openpyxl py312-sqlite3
/usr/local/bin/python -V          # moet Python 3.12.x tonen
/usr/local/bin/python -c 'import flask, openpyxl, sqlite3; print("ok", flask.__version__)'
```

`python` is het meta-pakket dat `/usr/local/bin/python` aanmaakt. Wijst dat naar een andere versie, pas dan de
eerste regel van `app.py` aan naar `#!/usr/local/bin/python3.12`.

## 2. Gebruiker en app

```sh
pw useradd luitencrm -d /nonexistent -s /usr/sbin/nologin -c "Luiten CRM"
mkdir -p /usr/local/www/luitencrm
cp -R app.py static deploy /usr/local/www/luitencrm/     # vanuit de map luiten-crm-webapp
chown -R root:wheel /usr/local/www/luitencrm              # code niet schrijfbaar voor de app
chmod 755 /usr/local/www/luitencrm/app.py /usr/local/www/luitencrm/deploy/backup.sh
```

## 3. Service

```sh
install -m 555 /usr/local/www/luitencrm/deploy/luitencrm.rc /usr/local/etc/rc.d/luitencrm
sysrc luitencrm_enable=YES
sysrc luitencrm_url=https://luitencrm.luitenfood.net    # exact het publieke adres, met https://
service luitencrm start
service luitencrm status
tail -n 20 /var/log/luitencrm.log                     # toont het EERSTE beheerderswachtwoord
```

Overige instellingen (standaardwaarden in het script): `luitencrm_dir`, `luitencrm_data` (`/var/db/luitencrm`),
`luitencrm_port` (8000), `luitencrm_tz` (`Europe/Amsterdam`, nodig voor de juiste tijden bij notities),
`luitencrm_log`.

Controle op de server:

```sh
fetch -qo - http://127.0.0.1:8000/health
# {"database":"ok","status":"ok","storage":"ok","time":"2026-10-17T09:00:00+02:00","version":"2026.10.1"}
```

Logrotatie — voeg toe aan `/etc/newsyslog.conf`:

```
/var/log/luitencrm.log   luitencrm:luitencrm   600  7  1000  *  JC  /var/run/luitencrm/luitencrm.pid
```

(newsyslog stuurt dan SIGHUP naar `daemon(8)`, dat het logbestand opnieuw opent.)

## 4. Caddy

Neem het blok uit `deploy/Caddyfile` over in de Caddyfile van de VPS en vul de hash in:

```sh
caddy hash-password          # wachtwoord van het site-slot invoeren, uitkomst bij <HASH…> plakken
caddy validate --config /usr/local/etc/caddy/Caddyfile
service caddy reload
```

Belangrijk in dat blok:
- `request_body max_size 13MB` — foto's tot 12 MB.
- `@beschermd not path /health` — de statuspagina kan `/health` zonder wachtwoord bereiken.
- Caddy geeft `Host` en `X-Forwarded-For/-Proto/-Host` standaard goed door; de app heeft die nodig voor de
  inlogcontrole. Zet géén `header_up`-regels die deze headers wijzigen.
- Zet géén `trusted_proxies` tenzij er nog een proxy vóór Caddy staat.

## 5. Statuspagina

Monitor `https://luitencrm.luitenfood.net/health`:
- HTTP **200** met `"status":"ok"` → alles goed;
- HTTP **503** met `"status":"error"` → database of opslag niet beschikbaar (zie `database` / `storage`);
- geen antwoord / 502 → app draait niet (`service luitencrm status`, `/var/log/luitencrm.log`).

Het endpoint toont geen gebruikers- of klantgegevens.

## 6. App inrichten

1. Open `https://luitencrm.luitenfood.net`, voer het site-wachtwoord in en log in als **beheerder** met het
   wachtwoord uit `/var/log/luitencrm.log` (ook in `/var/db/luitencrm/EERSTE-WACHTWOORD.txt`).
2. Kies een eigen wachtwoord en verwijder het bestand: `rm /var/db/luitencrm/EERSTE-WACHTWOORD.txt`.
3. Maak in **Gebruikers** de accounts voor de collega's aan; controleer in **Export & beurs** de beursgegevens.

## 7. Back-up

`/etc/crontab`:

```
15	2	*	*	*	root	/usr/local/www/luitencrm/deploy/backup.sh >/var/log/luitencrm-backup.log 2>&1
```

Maakt elke nacht `/var/backups/luitencrm/luitencrm-JJJJMMDD_UUMM.tar.gz` (database via de SQLite-backup-API,
dus consistent terwijl de app draait, plus `uploads/` en `secret.key`) en bewaart 30 dagen
(`LCRM_BACKUP_DIR`, `LCRM_BACKUP_DAYS` instelbaar). Neem `/var/backups/luitencrm` op in de back-up van de VPS.

Terugzetten:

```sh
service luitencrm stop
rm -rf /var/db/luitencrm/*
tar -xzf /var/backups/luitencrm/luitencrm-JJJJMMDD_UUMM.tar.gz -C /var/db/luitencrm
chown -R luitencrm:luitencrm /var/db/luitencrm && chmod -R go-rwx /var/db/luitencrm
service luitencrm start
```

## 8. Bijwerken

```sh
service luitencrm stop
/usr/local/www/luitencrm/deploy/backup.sh
cp -R app.py static deploy /usr/local/www/luitencrm/
chown -R root:wheel /usr/local/www/luitencrm && chmod 755 /usr/local/www/luitencrm/app.py /usr/local/www/luitencrm/deploy/backup.sh
service luitencrm start
fetch -qo - http://127.0.0.1:8000/health
```

Python-pakketten worden bijgewerkt met `pkg upgrade` (daarna `service luitencrm restart`).
Databasewijzigingen worden bij het starten automatisch doorgevoerd.

## 9. Problemen oplossen

| Probleem | Oplossing |
|---|---|
| 502 van Caddy | App draait niet: `service luitencrm status`, `tail /var/log/luitencrm.log`. |
| "Geweigerd" bij inloggen | `luitencrm_url` wijkt af van het echte adres, of een `header_up` in Caddy wijzigt `Host`/`X-Forwarded-*`. |
| Foto-upload mislukt (413) | `request_body max_size` ontbreekt in het Caddy-blok. |
| Tijden van notities verschoven | `luitencrm_tz` controleren, daarna `service luitencrm restart`. |
| `ModuleNotFoundError: _sqlite3` | `pkg install py312-sqlite3`. |
| "Te veel mislukte pogingen" | 15 min wachten of `service luitencrm restart`. |

## Getest

Achter Caddy 2.10 met `basic_auth` en HTTPS (lokale testomgeving, Linux): `/health` vrij (200), overige paden vragen
het site-wachtwoord (401), login, wachtwoord wijzigen, notitie opslaan, upload 5 MB (ok) en 14 MB (413), ZIP-export,
CSRF-weigering vanaf een ander domein, HSTS- en CSP-headers. Het rc.d-script is op syntax gecontroleerd maar niet op
FreeBSD zelf uitgevoerd — test `service luitencrm start|stop|restart|status` bij de installatie.
