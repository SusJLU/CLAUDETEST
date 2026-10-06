# Luiten CRM – volledige deployment op een TransIP-VPS

Stap voor stap van een lege VPS tot een werkende app op `https://crm.voorbeeld.nl`, met:

- **versleuteling onderweg**: HTTPS (nginx + Let's Encrypt), HSTS;
- **versleuteling in rust**: versleutelde VPS-schijf (LUKS, via TransIP) en versleutelde back-ups (`age`).

Vervang overal **`crm.voorbeeld.nl`** door het echte domein en **`beheer`** door de gewenste Linux-gebruikersnaam.
Opdrachten met `$` voer je uit op de server, tenzij er *(op je eigen pc)* bij staat.

| Onderdeel | Wat |
|---|---|
| Besturingssysteem | Ubuntu 24.04 LTS (Debian 12 werkt ook) |
| Webserver / TLS | nginx + certbot (Let's Encrypt) |
| Applicatie | Flask 3 + Waitress (Python 3), via systemd |
| Database | SQLite-bestand + foto's in `/var/lib/luiten-crm` |

Benodigde tijd: ongeveer 1 tot 1,5 uur.

---

## 0. Voorbereiding (checklist)

- [ ] Toegang tot het TransIP-controlepaneel (VPS + DNS van het domein).
- [ ] Een gekozen subdomein, bijvoorbeeld `crm.luitenfood.com`.
- [ ] Een wachtwoordkluis voor: het **schijfwachtwoord**, het wachtwoord van de Linux-gebruiker, het beheerderswachtwoord van de app en de **back-upsleutel**.
- [ ] Op je eigen pc: een terminal met `ssh` en `scp` (Windows 10/11: PowerShell heeft die standaard).
- [ ] De map `luiten-crm-webapp` uit de repository (of als zip).

> **Afspraak vooraf:** na **elke herstart** van de VPS (ook bij onderhoud door TransIP) moet iemand het
> schijfwachtwoord intypen in de TransIP-console. Tot die tijd is de app offline. Leg vast wie dat doet.

---

## 1. VPS opnieuw installeren met versleutelde schijf (TransIP)

> Dit wist alles op de VPS. Doe dit nu, zolang er nog niets op staat.

1. TransIP-controlepaneel → **VPS** → jouw VPS → **Installeer besturingssysteem**.
2. Kies **Ubuntu 24.04** en kies **"Install the OS manually"** (alleen dan kun je de schijf versleutelen).
3. Doorloop de installer in de **console** van het controlepaneel:
   - Kies bij het partitioneren voor de **versleutelde** optie (LVM + encryption / LUKS).
   - Kies een sterk **schijfwachtwoord** zonder letters met accenten (`é`, `ï`, `ø`…). Leestekens als `$#@!%` mogen wel. Zet het direct in de wachtwoordkluis.
   - Maak een gewone gebruiker aan (bijv. `beheer`) met een sterk wachtwoord.
   - Vink **OpenSSH server** aan.
4. Na de installatie start de VPS opnieuw: voer het schijfwachtwoord in via de **console** (met een fysiek toetsenbord, niet op telefoon/tablet).
5. Noteer het **IP-adres** (IPv4 en eventueel IPv6) van de VPS.

Bron: [TransIP – Je VPS disk encrypten](https://www.transip.nl/knowledgebase/1610-je-vps-disk-encrypten)

---

## 2. DNS instellen

TransIP-controlepaneel → **Domeinen** → jouw domein → **DNS**:

| Naam | Type | Waarde |
|---|---|---|
| `crm` | A | IPv4-adres van de VPS |
| `crm` | AAAA | IPv6-adres van de VPS (alleen als de VPS IPv6 heeft) |

Controleer na een paar minuten *(op je eigen pc)*: `nslookup crm.voorbeeld.nl` → moet het IP van de VPS geven.

---

## 3. Eerste keer inloggen en de server afschermen

### 3.1 SSH-sleutel *(op je eigen pc)*

```powershell
ssh-keygen -t ed25519                     # Enter voor de standaardlocatie, kies een wachtzin
type $env:USERPROFILE\.ssh\id_ed25519.pub # kopieer deze regel
```

### 3.2 Inloggen en sleutel plaatsen

```bash
ssh beheer@<IP-van-de-VPS>
$ mkdir -p ~/.ssh && chmod 700 ~/.ssh
$ nano ~/.ssh/authorized_keys             # plak de regel uit 3.1, opslaan met Ctrl+O, Ctrl+X
$ chmod 600 ~/.ssh/authorized_keys
```

Test in een **tweede** venster dat `ssh beheer@<IP>` werkt zonder wachtwoord (alleen de wachtzin van je sleutel). Pas dan verder.

### 3.3 Wachtwoord-login en root-login via SSH uitzetten

```bash
$ sudo tee /etc/ssh/sshd_config.d/10-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
$ sudo systemctl restart ssh
```

### 3.4 Updates, tijdzone en automatische beveiligingsupdates

```bash
$ sudo apt update && sudo apt full-upgrade -y
$ sudo timedatectl set-timezone Europe/Amsterdam
$ sudo apt install -y unattended-upgrades
$ sudo dpkg-reconfigure -plow unattended-upgrades     # kies "Yes"
```

> Laat `Automatic-Reboot` **uit** (standaard): een automatische herstart betekent hier dat de app offline blijft
> tot iemand het schijfwachtwoord invoert. Plan herstarts zelf (`sudo reboot`) en voer daarna het wachtwoord in.

### 3.5 Firewall

```bash
$ sudo ufw allow OpenSSH
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
$ sudo ufw enable
$ sudo ufw status
```

Poort 8000 blijft dicht; de app luistert alleen intern.

---

## 4. Software installeren

```bash
$ sudo apt install -y python3 python3-venv nginx certbot python3-certbot-nginx age unzip
$ sudo useradd --system --home /opt/luiten-crm --shell /usr/sbin/nologin lcrm
```

---

## 5. De app op de server zetten

### 5.1 Bestanden kopiëren *(op je eigen pc, in de map boven `luiten-crm-webapp`)*

```powershell
scp -r luiten-crm-webapp beheer@<IP-van-de-VPS>:~/
```

### 5.2 Installeren *(op de server)*

```bash
$ sudo mkdir -p /opt/luiten-crm
$ cd ~/luiten-crm-webapp
$ sudo cp -r app.py requirements.txt static deploy /opt/luiten-crm/
$ sudo python3 -m venv /opt/luiten-crm/.venv
$ sudo /opt/luiten-crm/.venv/bin/pip install -r /opt/luiten-crm/requirements.txt
$ sudo chown -R root:root /opt/luiten-crm
$ sudo chmod 700 /opt/luiten-crm/deploy/backup.sh
```

De code is daarmee niet schrijfbaar voor de app zelf; alleen `/var/lib/luiten-crm` is dat.

### 5.3 Bestaande gegevens overnemen (alleen als de app al op een laptop draaide)

Stop de app op de laptop (venster sluiten) en kopieer de map `data` *(op je eigen pc)*:

```powershell
scp -r C:\LuitenCRM\data beheer@<IP-van-de-VPS>:~/lcrm-data
```

Deze map wordt in stap 6.3 op zijn plek gezet.

---

## 6. De app als service starten

### 6.1 Service installeren en domein invullen

```bash
$ sudo cp /opt/luiten-crm/deploy/luiten-crm.service /etc/systemd/system/
$ sudo nano /etc/systemd/system/luiten-crm.service     # LCRM_PUBLIC_URL=https://<jouw domein>  (exact, met https://)
$ sudo systemctl daemon-reload
```

### 6.2 Starten (nieuwe installatie)

```bash
$ sudo systemctl enable --now luiten-crm
$ systemctl status luiten-crm --no-pager           # moet "active (running)" tonen
$ sudo journalctl -u luiten-crm -n 30 --no-pager   # toont het EERSTE beheerderswachtwoord
```

Het eerste wachtwoord staat ook in `/var/lib/luiten-crm/EERSTE-WACHTWOORD.txt`. Zet het in de kluis; je wijzigt het in stap 8.

### 6.3 Starten met overgenomen gegevens (in plaats van 6.2)

```bash
$ sudo systemctl enable luiten-crm
$ sudo systemctl start luiten-crm && sudo systemctl stop luiten-crm   # maakt /var/lib/luiten-crm aan
$ sudo rm -rf /var/lib/luiten-crm/*
$ sudo cp -r ~/lcrm-data/. /var/lib/luiten-crm/
$ sudo chown -R lcrm:lcrm /var/lib/luiten-crm
$ sudo chmod -R go-rwx /var/lib/luiten-crm
$ sudo systemctl start luiten-crm
$ rm -rf ~/lcrm-data
```

Inloggen gaat dan met de bestaande accounts en wachtwoorden.

### 6.4 Controleren

```bash
$ curl -sI http://127.0.0.1:8000/login | head -1   # HTTP/1.1 200 OK
```

---

## 7. nginx en HTTPS

```bash
$ sudo cp /opt/luiten-crm/deploy/nginx-luiten-crm.conf /etc/nginx/sites-available/luiten-crm
$ sudo nano /etc/nginx/sites-available/luiten-crm      # server_name <jouw domein>;
$ sudo ln -s /etc/nginx/sites-available/luiten-crm /etc/nginx/sites-enabled/
$ sudo rm -f /etc/nginx/sites-enabled/default
$ sudo nginx -t && sudo systemctl reload nginx
$ sudo certbot --nginx -d crm.voorbeeld.nl --redirect --agree-tos -m it@luitenfood.com
```

Certbot vraagt een certificaat aan, zet HTTPS aan in de nginx-config en stuurt `http://` door naar `https://`.

Controleren:

```bash
$ sudo certbot renew --dry-run                     # automatische vernieuwing werkt
$ curl -sI https://crm.voorbeeld.nl/login | grep -iE "^HTTP|strict-transport"
```

Verwacht: `HTTP/2 200` (of `HTTP/1.1 200`) en een `Strict-Transport-Security`-regel.

> Twee instellingen in de nginx-config zijn essentieel (staan er al in): `client_max_body_size 13m` (anders
> mislukken foto-uploads) en het doorgeven van `X-Forwarded-Proto`/`X-Forwarded-Host`/`Host` (anders weigert de
> app elke login met "Geweigerd").

---

## 8. App inrichten

1. Open `https://crm.voorbeeld.nl` en log in als **beheerder** met het eerste wachtwoord.
2. Kies een eigen wachtwoord (minstens 10 tekens) en zet het in de kluis.
3. Verwijder het bestand met het eerste wachtwoord:
   ```bash
   $ sudo rm /var/lib/luiten-crm/EERSTE-WACHTWOORD.txt
   ```
4. **Gebruikers**: maak per collega een account aan (naam, gebruikersnaam, rol, startwachtwoord). Deel startwachtwoorden persoonlijk, niet per mail.
5. **Export & beurs**: controleer de naam en de datums van de beurs.

---

## 9. Versleutelde back-up

Elke nacht maakt de server een versleutelde back-up in `/var/backups/luiten-crm/` (30 dagen bewaard).
Controleer in het TransIP-controlepaneel of de VPS-back-ups van TransIP aanstaan; die zijn bij een versleutelde schijf ook versleuteld.

### 9.1 Sleutel maken *(op de server)*

```bash
$ age-keygen -o ~/luiten-crm-backup.key
$ cat ~/luiten-crm-backup.key
```

1. Kopieer de **volledige inhoud** (alle drie de regels, inclusief `AGE-SECRET-KEY-…`) naar de wachtwoordkluis,
   als notitie "Luiten CRM back-upsleutel". **Zonder deze sleutel kan niemand een back-up terugzetten.**
2. Noteer de regel `# public key: age1…`: dat is de publieke sleutel voor stap 9.2.
3. Verwijder de privésleutel van de server (anders heeft wie de server heeft ook de sleutel):
   ```bash
   $ shred -u ~/luiten-crm-backup.key
   ```

### 9.2 Back-up instellen

```bash
$ sudo nano /opt/luiten-crm/deploy/backup.sh       # zet de age1…-sleutel bij AGE_RECIPIENT
$ sudo /opt/luiten-crm/deploy/backup.sh            # testrun: toont het pad van de back-up
$ sudo crontab -e
```

Voeg toe (elke nacht om 02:15):

```
15 2 * * * /opt/luiten-crm/deploy/backup.sh >/var/log/luiten-crm-backup.log 2>&1
```

### 9.3 Terugzetten testen (doe dit één keer nu)

Zet de privésleutel tijdelijk terug op de server en ontsleutel de testback-up:

```bash
$ nano ~/backup.key                                # plak de sleutel uit de kluis, opslaan
$ sudo ls /var/backups/luiten-crm/                 # kies de nieuwste
$ sudo cat /var/backups/luiten-crm/luiten-crm-JJJJMMDD_UUMM.tar.gz.age | age -d -i ~/backup.key > ~/test.tar.gz
$ tar -tzf ~/test.tar.gz                           # moet luiten-crm.db, secret.key en uploads/ tonen
$ shred -u ~/backup.key ~/test.tar.gz              # sleutel en test weer verwijderen
```

Echt terugzetten (bij een noodgeval) gaat op dezelfde manier, en daarna:

```bash
$ sudo systemctl stop luiten-crm
$ sudo rm -rf /var/lib/luiten-crm/*
$ sudo tar -xzf ~/test.tar.gz -C /var/lib/luiten-crm
$ sudo chown -R lcrm:lcrm /var/lib/luiten-crm && sudo chmod -R go-rwx /var/lib/luiten-crm
$ sudo systemctl start luiten-crm
$ shred -u ~/backup.key ~/test.tar.gz
```

> Deze back-ups staan op dezelfde VPS: ze helpen bij fouten in de app of per ongeluk verwijderde gegevens, niet als
> de hele VPS verloren gaat (daarvoor zijn de TransIP-back-ups, als die aanstaan). Een kopie buiten de VPS kan later worden toegevoegd.

---

## 10. Eindcontrole

- [ ] `https://crm.voorbeeld.nl` opent met een slotje; `http://` stuurt door naar `https://`.
- [ ] Inloggen als beheerder werkt; een collega-account kan inloggen en moet een nieuw wachtwoord kiezen.
- [ ] Op een telefoon: notitie maken met foto, visitekaartje en gescande notitie → zichtbaar in Beheer.
- [ ] Tijd van een nieuwe notitie klopt (Nederlandse/Parijse tijd).
- [ ] Vliegtuigmodus aan → notitie maken → vliegtuigmodus uit → notitie komt binnen.
- [ ] Exports in Beheer (Excel, ZIP, JSON, CSV) downloaden en openen.
- [ ] `sudo /opt/luiten-crm/deploy/backup.sh` werkt en de back-up is terug te zetten (9.3).
- [ ] **Herstarttest:** `sudo reboot` → schijfwachtwoord invoeren in de TransIP-console → app is na ± 1 minuut weer bereikbaar, gegevens zijn er nog.

---

## 11. Telefoons

1. Open `https://crm.voorbeeld.nl/app` in Safari (iPhone) of Chrome (Android).
2. Log in met het eigen account.
3. Zet op het beginscherm: iPhone: Deel → *Zet op beginscherm*; Android: ⋮ → *Toevoegen aan startscherm*.
4. Zorg dat elke telefoon een **pincode/schermvergrendeling** heeft (de offline kopie in de browser is alleen zo beschermd).

---

## 12. Beheer na livegang

**Na een herstart van de VPS**
TransIP-controlepaneel → VPS → **Console** → schijfwachtwoord invoeren. nginx en de app starten daarna vanzelf.

**Status en logboek**
```bash
$ systemctl status luiten-crm nginx --no-pager
$ sudo journalctl -u luiten-crm -n 100 --no-pager
$ sudo tail -n 50 /var/log/nginx/error.log
```

**Nieuwe versie van de app installeren**
```bash
(op je eigen pc)  scp -r luiten-crm-webapp beheer@crm.voorbeeld.nl:~/
$ sudo /opt/luiten-crm/deploy/backup.sh
$ cd ~/luiten-crm-webapp && sudo cp -r app.py requirements.txt static deploy /opt/luiten-crm/
$ sudo /opt/luiten-crm/.venv/bin/pip install -U -r /opt/luiten-crm/requirements.txt
$ sudo chown -R root:root /opt/luiten-crm && sudo chmod 700 /opt/luiten-crm/deploy/backup.sh
$ sudo systemctl restart luiten-crm
```
Let op: `cp` overschrijft `deploy/backup.sh`; zet daarna de `AGE_RECIPIENT` opnieuw (of bewaar je ingevulde versie apart).

**Wachtwoord vergeten**: Beheer → Gebruikers → *Wachtwoord*. Maak bij voorkeur twee beheerdersaccounts aan, zodat het ene het andere kan resetten.

**Account van vertrokken medewerker**: Beheer → Gebruikers → uitschakelen (logt direct overal uit).

---

## 13. Problemen oplossen

| Probleem | Oorzaak / oplossing |
|---|---|
| Site onbereikbaar na herstart | Schijf nog vergrendeld → wachtwoord invoeren in de TransIP-console. |
| "Geweigerd" bij inloggen | nginx geeft de `X-Forwarded-*`-headers niet door, of `LCRM_PUBLIC_URL` wijkt af van het echte adres (let op `https://` en exact hetzelfde domein). |
| Foto-upload mislukt (413) | `client_max_body_size 13m` ontbreekt in de nginx-config. |
| `certbot` faalt | DNS wijst (nog) niet naar de VPS, of poort 80 is dicht (`sudo ufw status`). |
| Service start niet | `sudo journalctl -u luiten-crm -n 50`; controleer rechten: `sudo chown -R lcrm:lcrm /var/lib/luiten-crm`. |
| 502 Bad Gateway | App draait niet → `sudo systemctl restart luiten-crm` en bekijk het logboek. |
| "Te veel mislukte pogingen" | 15 minuten wachten, of `sudo systemctl restart luiten-crm`. |
| Tijden van notities 2 uur verschoven | `TZ=Europe/Amsterdam` ontbreekt in de service → `sudo systemctl daemon-reload && sudo systemctl restart luiten-crm`. |

---

## Wat is versleuteld

| | Versleuteld | Door |
|---|---|---|
| Verbinding telefoon/laptop ↔ server | Ja | HTTPS (Let's Encrypt), HSTS |
| Database, foto's, logboeken op de VPS | Ja (in rust) | LUKS-schijfversleuteling (TransIP) |
| TransIP-schijfback-ups | Ja | TransIP (bij versleutelde schijf) |
| Eigen back-ups | Ja | `age`, sleutel buiten de server |
| Offline kopie op de telefoon | Alleen met pincode | Versleuteling van de telefoon |
| Gedownloade exports (Excel/ZIP/CSV) | Nee | Behandel als vertrouwelijk; niet in privé-opslag zetten |

Schijfversleuteling beschermt tegen het uitlezen van schijven, snapshots en back-ups. Tegen inbraak op de draaiende
server beschermen vooral: updates (3.4), de firewall (3.5), alleen SSH-sleutels (3.3), sterke wachtwoorden en weinig
beheerders. Overweeg extra afscherming (VPN of IP-filter van kantoor) als de app na de beurs blijft draaien.

**AVG**: neem de app op in het verwerkingsregister (persoonsgegevens van contactpersonen, foto's van visitekaartjes)
en spreek een bewaartermijn af.
