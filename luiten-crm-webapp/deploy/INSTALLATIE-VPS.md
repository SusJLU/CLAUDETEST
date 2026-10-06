# Luiten CRM op een Linux-VPS (nginx + HTTPS, zonder Docker)

Uitgaande van Ubuntu 22.04/24.04 of Debian 12. Vervang overal `crm.voorbeeld.nl` door het echte domein.

## Stack

| Laag | Wat |
|---|---|
| Webserver / TLS | **nginx** + Let's Encrypt (certbot), poort 80/443 |
| Applicatieserver | **Waitress** (WSGI, pure Python), gestart door `app.py`, luistert alleen op `127.0.0.1:8000` |
| Applicatie | **Flask 3** (Python 3.10+), `openpyxl` voor Excel-export |
| Database | **SQLite** (`luiten-crm.db`, WAL-modus) + foto's als bestanden in `uploads/` |
| Procesbeheer | **systemd** (`luiten-crm.service`) |

Er is geen aparte databaseserver, Redis of Node nodig.

## 1. Pakketten en gebruiker

```bash
sudo apt update
sudo apt install -y python3 python3-venv nginx certbot python3-certbot-nginx age
sudo useradd --system --home /opt/luiten-crm --shell /usr/sbin/nologin lcrm
```

## 2. App neerzetten

```bash
sudo mkdir -p /opt/luiten-crm
sudo cp -r app.py requirements.txt static deploy /opt/luiten-crm/      # vanuit de map luiten-crm-webapp
sudo python3 -m venv /opt/luiten-crm/.venv
sudo /opt/luiten-crm/.venv/bin/pip install -r /opt/luiten-crm/requirements.txt
sudo chown -R root:root /opt/luiten-crm        # code is niet schrijfbaar voor de app zelf
```

## 3. systemd-service

```bash
sudo cp /opt/luiten-crm/deploy/luiten-crm.service /etc/systemd/system/
sudo nano /etc/systemd/system/luiten-crm.service     # LCRM_PUBLIC_URL=https://crm.voorbeeld.nl
sudo systemctl daemon-reload
sudo systemctl enable --now luiten-crm
sudo journalctl -u luiten-crm -n 30                   # toont het eerste beheerderswachtwoord
```

De data komt in `/var/lib/luiten-crm` (map 0700, bestanden 0600, alleen gebruiker `lcrm`).
Het eerste wachtwoord staat ook in `/var/lib/luiten-crm/EERSTE-WACHTWOORD.txt`; verwijder dat bestand na de eerste login.

## 4. nginx en HTTPS

Het DNS A-record (en eventueel AAAA) moet al naar de VPS wijzen.

```bash
sudo cp /opt/luiten-crm/deploy/nginx-luiten-crm.conf /etc/nginx/sites-available/luiten-crm
sudo nano /etc/nginx/sites-available/luiten-crm       # server_name aanpassen
sudo ln -s /etc/nginx/sites-available/luiten-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.voorbeeld.nl --redirect   # certificaat + http -> https
```

Certbot vernieuwt het certificaat automatisch (`systemctl list-timers | grep certbot`).
De app zet zelf HSTS, CSP en de overige beveiligingsheaders.

**Belangrijk in de nginx-config** (staat al in het bestand):
- `client_max_body_size 13m` — anders weigert nginx foto's groter dan 1 MB.
- `X-Forwarded-Proto`, `X-Forwarded-Host` en `Host` doorgeven — anders weigert de app elke login ("Geweigerd").

## 5. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Poort 8000 hoeft niet open: de app luistert alleen op 127.0.0.1.

## 6. Back-up (versleuteld)

1. Maak op een **andere** computer een sleutelpaar: `age-keygen -o luiten-crm-backup.key`. Bewaar dat bestand veilig (kluis/wachtwoordmanager); zonder die sleutel zijn back-ups niet terug te zetten.
2. Zet de publieke sleutel (`age1…`) in `/opt/luiten-crm/deploy/backup.sh` bij `AGE_RECIPIENT`.
3. Dagelijks via cron (als root): `15 2 * * * /opt/luiten-crm/deploy/backup.sh`
4. Kopieer `/var/backups/luiten-crm/` ook naar opslag buiten de VPS.

Terugzetten: `age -d -i luiten-crm-backup.key luiten-crm-….tar.gz.age | tar -xzf - -C /var/lib/luiten-crm` (service eerst stoppen, daarna `chown -R lcrm:lcrm /var/lib/luiten-crm`).

## 7. Bijwerken

```bash
sudo cp app.py /opt/luiten-crm/ && sudo cp -r static /opt/luiten-crm/
sudo /opt/luiten-crm/.venv/bin/pip install -U -r /opt/luiten-crm/requirements.txt
sudo systemctl restart luiten-crm
sudo apt update && sudo apt upgrade        # ook het OS bijhouden (of unattended-upgrades aanzetten)
```

## Versleuteling: wat wel en niet

| | Versleuteld? |
|---|---|
| Telefoon/laptop ↔ server | **Ja**, HTTPS (TLS via nginx/Let's Encrypt), HSTS staat aan |
| Back-ups | **Ja**, met `age` (alleen te openen met de privésleutel die niet op de server staat) |
| Database en foto's op de VPS | **Nee, niet door de app.** Alleen afgeschermd met bestandsrechten (0600, gebruiker `lcrm`). Zie hieronder. |
| Offline kopie in de browser van de telefoon (localStorage/IndexedDB) | **Nee, niet door de app.** Beschermd door de apparaatversleuteling van de telefoon (pincode verplicht). Uitloggen wist deze kopie. |
| Exports (Excel/ZIP/CSV) | **Nee** — behandel ze als vertrouwelijke bestanden |

Opties voor versleuteling in rust op de VPS:
1. **Versleutelde schijf/volume bij de hostingpartij** — veel providers bieden dit aan. Eenvoudigst.
2. **LUKS-volume** voor `/var/lib/luiten-crm`. Nadeel: na elke herstart moet iemand het volume ontgrendelen (of automatisch via een sleutelserver).
3. **Versleuteling in de app zelf** (SQLCipher voor de database, versleutelde foto's met een sleutel buiten de datamap). Dit vraagt een codewijziging.

Let wel: versleuteling in rust beschermt vooral tegen diefstal van schijven/back-ups/snapshots. Tegen iemand die
op de draaiende server inbreekt, beschermen vooral updates, de firewall, sterke wachtwoorden en eventueel extra
afscherming (VPN, IP-filter of tweestapsverificatie via een identity-proxy).
