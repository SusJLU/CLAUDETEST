# Luiten CRM – webapp

Notities, relaties, pijplijn en acties voor het inkoop- en verkoopteam. De app draait op één Windows-laptop in het lokale netwerk, of publiek op een server met HTTPS (hoofdstuk 9).

- **Mobiele app** (telefoon): `http://<adres-laptop>:8000/app`
- **Beheer** (laptop, alleen beheerder): `http://localhost:8000/admin`
- Alle gegevens staan in één bestand: `data\luiten-crm.db`. Foto's staan in `data\uploads\`.

---

## 1. Eenmalig: Python installeren

1. Ga naar https://www.python.org/downloads/ en download **Python 3** (3.10 of nieuwer).
2. Start de installer en vink onderin **"Add python.exe to PATH"** aan. Klik daarna op *Install Now*.

## 2. App starten

1. Pak de zip uit naar een vaste plek, bijvoorbeeld `C:\LuitenCRM`. Niet in Downloads laten staan.
2. Dubbelklik **`start.bat`**.
   - De eerste keer installeert het venster een paar onderdelen. Daarvoor is internet nodig, en het duurt ongeveer een minuut.
3. In het zwarte venster verschijnt:
   ```
   Op deze laptop:      http://localhost:8000
   Op telefoons (wifi): http://192.168.x.x:8000
   EERSTE KEER - log in als beheerder:
     gebruikersnaam: beheerder
     wachtwoord:     ••••••
   ```
   Het eerste wachtwoord staat ook in `data\EERSTE-WACHTWOORD.txt`.
4. **Laat dit venster open.** Sluit je het, dan stopt de app.

Krijg je een melding van **Windows Firewall**? Kies dan *Toegang toestaan* voor **particuliere netwerken**.

## 3. Eerste keer inrichten (op de laptop)

1. Open `http://localhost:8000` en log in als **beheerder**.
2. Je moet direct een eigen wachtwoord kiezen (minstens 10 tekens). Verwijder daarna `data\EERSTE-WACHTWOORD.txt`.
3. Ga naar **Gebruikers** en maak voor elke collega een account aan: naam, gebruikersnaam, rol (Inkoop of Verkoop) en een startwachtwoord. Bij de eerste keer inloggen kiest de collega zelf een nieuw wachtwoord.
4. Controleer bij **Export & beurs** de naam en de datums van de beurs.

## 4. Telefoons verbinden

1. De telefoon moet op **hetzelfde wifi-netwerk** zitten als de laptop.
2. Open in Safari (iPhone) of Chrome (Android) het adres uit het zwarte venster, met `/app` erachter, bijvoorbeeld `http://192.168.1.23:8000/app`. Het adres staat ook in Beheer, linksonder.
3. Log in met je eigen gebruikersnaam en wachtwoord.
4. Zet de app op het beginscherm:
   - **iPhone:** Deel-knop → *Zet op beginscherm*
   - **Android:** ⋮ → *Toevoegen aan startscherm*

## 5. Op de beurs

- **Wifi valt even weg?** Gewoon doorgaan. Nieuwe notities, foto's en afgevinkte acties worden op de telefoon bewaard. Bovenin zie je dan bijvoorbeeld "Offline · 3 wachtend". Zodra de laptop weer bereikbaar is, verstuurt de app alles vanzelf. Je kunt ook op het tandwiel tikken en *Nu synchroniseren* kiezen.
- **Let op:** laat de app open staan als je offline bent. Herlaad de pagina niet en log niet uit zolang er nog iets "wachtend" staat.
- **Foto's, visitekaartjes en handgeschreven notities:** in een notitie tik je op *Foto*, *Uit fotorol*, *Visitekaartje* of (onder **Notities scannen**) *Scan met camera*. De foto wordt verkleind voordat hij wordt verstuurd en bij de relatie bewaard. Neem naam, e-mail en telefoon zelf over in de velden.
- **Wie ziet wat?** Medewerkers zien alleen hun eigen notities, afspraken, relaties en de acties die aan hen zijn toegewezen. De beheerder ziet alles.

## 6. Back-up

- Dubbelklik aan het eind van elke dag **`backup.bat`**. Dat zet een kopie van de map `data` in `backups\<datum_tijd>`.
- Kopieer die map daarna ook naar een USB-stick of OneDrive.
- Terugzetten: stop de app, vervang de map `data` door de back-up en start opnieuw.

## 7. Exporteren

- **Beheer → Export & beurs:** Excel (alles), ZIP met foto's, JSON, en CSV per tabel.
- **ZIP met foto's** is ingedeeld per relatie, zodat je visitekaartjes later terugvindt:
  ```
  overzicht.xlsx              per bestand: relatie, contactpersoon, e-mail, telefoon, soort, datum, medewerker, link naar het bestand
  Estancia del Sur/
    visitekaartjes/2026-10-19_Martin_Alvarez_SV_1.jpg
    fotos/2026-10-19_Martin_Alvarez_SV_1.jpg
    gescande-notities/2026-10-19_Martin_Alvarez_SV_1.jpg
    notities.txt              alle notities en acties van deze relatie
  tabellen/                   CSV per tabel
  data.json                   alles, machineleesbaar
  ```
  Pak de ZIP eerst uit. Daarna openen de links in `overzicht.xlsx` de foto direct.
- **In de mobiele app → Overzicht:** CSV van de gekozen dag, Excel, JSON of ZIP, steeds alleen met je eigen gegevens.
- CSV-bestanden gebruiken `;` als scheidingsteken en openen direct goed in een Nederlandse Excel. Tekst die met `=`, `+`, `-` of `@` begint wordt beveiligd tegen formule-injectie.

## 8. Problemen oplossen

**Telefoon kan de laptop niet bereiken**
1. Zitten beide op hetzelfde wifi-netwerk? Een gastnetwerk werkt vaak niet.
2. Staat het netwerk in Windows op *Particulier*? Ga naar Instellingen → Netwerk → Wi-Fi → het netwerk → Netwerkprofiel: Particulier.
3. Klik met de rechtermuisknop op **`firewall-openzetten.bat`** en kies *Als administrator uitvoeren*.
4. Sommige bedrijfsnetwerken blokkeren verkeer tussen apparaten ("client isolation"). Vraag IT om dat toe te staan voor de laptop, of gebruik een eigen router of hotspot.

**Het adres is veranderd**
- Het IP-adres kan veranderen als de laptop opnieuw verbindt. Het actuele adres staat altijd in het zwarte venster en in Beheer.
- Vraag IT om een vast IP-adres voor de laptop als je dat wilt voorkomen.

**Laptop gaat in slaapstand**
- Stel in bij Windows → Energie: "Nooit in slaapstand" als de laptop aan de stroom zit.
- Klap de laptop niet dicht, of stel in dat dichtklappen niets doet.

**Andere poort gebruiken**
- Open een opdrachtprompt in de map en typ: `set LCRM_PORT=8080` en daarna `start.bat`.

**Wachtwoord vergeten**
- De beheerder kan in Beheer → Gebruikers bij elke collega op *Wachtwoord* klikken. De collega wordt dan op alle apparaten uitgelogd en kiest bij het inloggen een nieuw wachtwoord.

**"Te veel mislukte pogingen"**
- Na 8 foute wachtwoorden voor één gebruiker (of 20 vanaf één adres) is inloggen 15 minuten geblokkeerd. Wacht, of herstart de app.

## 9. Publiek online zetten (HTTPS)

Gebruik voor publiek gebruik **altijd HTTPS**. De app zet dan zelf beveiligde cookies (alleen via HTTPS) en HSTS aan, en luistert alleen intern achter de proxy.

**Optie 0 – Linux-VPS met nginx, zonder Docker:** zie [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) (systemd, nginx + Let's Encrypt, versleutelde back-up).

**Optie A – Linux-server met Docker**
1. Laat IT een DNS A-record maken, bijvoorbeeld `crm.luitenfood.com`, dat naar de server wijst. Zet de poorten 80 en 443 open; poort 8000 blijft dicht.
2. Kopieer de map naar de server en zet `.env.example` om naar `.env` met `LCRM_DOMAIN=crm.luitenfood.com`.
3. `docker compose up -d --build`. Caddy vraagt automatisch een Let's Encrypt-certificaat aan.
4. Het eerste beheerderswachtwoord: `docker compose logs app`.
5. Back-up: `docker run --rm -v lcrm_data:/d -v "$PWD":/b alpine tar czf /b/backup-$(date +%F).tgz -C /d .` (dagelijks via cron, en bewaar de back-up buiten de server).

**Optie B – Windows-server zonder Docker**
1. DNS en poorten zoals bij optie A.
2. Pas in `start-publiek.bat` het domein aan en start dat bestand. De app luistert dan alleen op 127.0.0.1:8000.
3. Installeer Caddy (caddyserver.com), zet `LCRM_DOMAIN` als omgevingsvariabele en start `caddy run --config Caddyfile` in deze map, of installeer het als Windows-service.
4. Gebruik `backup.bat` dagelijks via Taakplanner.

**Ingebouwde beveiliging**
- Wachtwoorden worden gehasht opgeslagen (scrypt). Minimaal 10 tekens; bij het eerste inloggen en na een reset moet de gebruiker een eigen wachtwoord kiezen.
- Blokkade na herhaalde foute inlogpogingen, met gelijke reactietijd voor bestaande en niet-bestaande gebruikers.
- Sessies: HttpOnly-cookie, SameSite, Secure bij HTTPS, verloopt na 7 dagen (`LCRM_SESSION_DAYS`). Wachtwoord wijzigen, rol wijzigen of uitschakelen logt de gebruiker overal uit.
- Bescherming tegen CSRF (eigen header en Origin-controle), XSS (Content-Security-Policy, alle invoer ge-escaped) en clickjacking (frame-ancestors none).
- Rechten worden per verzoek op de server gecontroleerd: medewerkers zien alleen hun eigen notities, foto's, afspraken en acties. Foto's zijn alleen na inloggen op te vragen.
- Uploads: alleen echte JPG-, PNG- of WebP-bestanden (gecontroleerd op inhoud), max 12 MB, met bestandsnamen die de server zelf maakt.
- Alle databasequery's zijn geparametriseerd; invoer wordt op lengte en formaat gecontroleerd.
- In de Docker-opstelling draait de app als gewone gebruiker, zonder extra rechten, met een alleen-lezen bestandssysteem.

**Wat jullie zelf moeten regelen**
- Houd server, Docker-images en Python-pakketten bijgewerkt: `docker compose pull && docker compose up -d --build`, of `pip install -U -r requirements.txt`.
- Maak dagelijks een back-up en test het terugzetten.
- **AVG:** de app bevat persoonsgegevens van contactpersonen (naam, e-mail, telefoon, foto's van visitekaartjes). Neem de app op in het verwerkingsregister, beperk het aantal beheerders en schakel accounts van vertrokken medewerkers direct uit.
- Overweeg extra afscherming, zoals alleen bereikbaar via VPN of het IP-adres van kantoor, of tweestapsverificatie via een identity-proxy (bijvoorbeeld Cloudflare Access of Entra ID).
- In de lokale netwerkmodus (zonder `LCRM_PUBLIC_URL`) is de verbinding gewone `http`. Gebruik die modus alleen op een vertrouwd netwerk.

## 10. Goed om te weten

- Relaties worden automatisch aangemaakt op bedrijfsnaam. Zijn er dubbelen ontstaan, voeg ze dan samen in Beheer: open een relatie en kies *Dubbele relatie samenvoegen*.
- Er is nog geen koppeling met CSB. Je kunt per relatie wel het CSB-nummer invullen.
- Uitloggen op een telefoon wist ook de lokale kopie en de wachtrij op dat toestel.

## Mappen

```
app.py                     de server (Flask + SQLite)
start.bat                  starten
backup.bat                 back-up maken
firewall-openzetten.bat    poort 8000 openzetten (als administrator)
start-publiek.bat          publiek starten op Windows achter Caddy
Dockerfile, docker-compose.yml, Caddyfile, .env.example   publiek draaien met HTTPS
requirements.txt           benodigde onderdelen
static/                    app, beheer, stijl, logo's en iconen
deploy/                    VPS-installatie: systemd-service, nginx-config, versleutelde back-up
data/                      wordt aangemaakt bij de eerste start: database, foto's, sleutel
```
