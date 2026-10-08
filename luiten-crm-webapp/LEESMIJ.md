# Luiten CRM – webapp

Notities, relaties, pijplijn en acties voor het inkoop- en verkoopteam. De app draait op de VPS van Luiten
(FreeBSD) en is bereikbaar via **https://luitencrm.luitenfood.net**.

- **Mobiele app** (telefoon): `https://luitencrm.luitenfood.net/app`
- **Beheer** (laptop/pc, alleen beheerder): `https://luitencrm.luitenfood.net/admin`
- **Status** (zonder inloggen): `https://luitencrm.luitenfood.net/health`

Installatie en beheer van de server: zie [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) (voor IT).

---

## 1. Inloggen

Er zijn twee sloten:

1. **Site-wachtwoord** (één gedeeld wachtwoord, vraag het aan IT). De browser vraagt het bij het eerste bezoek
   en onthoudt het meestal.
2. **Eigen login** met je persoonlijke gebruikersnaam en wachtwoord. Bij de eerste keer kies je een eigen
   wachtwoord (minstens 10 tekens).

## 2. Eerste keer inrichten (beheerder)

1. Open `https://luitencrm.luitenfood.net/admin` en log in als **beheerder** met het wachtwoord dat IT doorgeeft.
2. Kies direct een eigen wachtwoord.
3. Ga naar **Gebruikers** en maak voor elke collega een account aan: naam, gebruikersnaam, rol (Inkoop of
   Verkoop) en een startwachtwoord. Deel startwachtwoorden persoonlijk, niet per mail.
4. Controleer bij **Export & beurs** de naam en de datums van de beurs.

Tip: maak twee beheerdersaccounts, zodat de ene beheerder het wachtwoord van de andere kan resetten.

## 3. Telefoons

1. Open `https://luitencrm.luitenfood.net/app` in Safari (iPhone) of Chrome (Android).
2. Voer het site-wachtwoord in en log in met je eigen account.
3. Zet de app op het beginscherm:
   - **iPhone:** Deel-knop → *Zet op beginscherm*
   - **Android:** ⋮ → *Toevoegen aan startscherm*
4. Zorg dat de telefoon een pincode of schermvergrendeling heeft: de offline kopie van je gegevens staat op de
   telefoon.

Vraagt de app opnieuw om het site-wachtwoord (bijvoorbeeld na het herstarten van de telefoon)? Vul het in; je
gegevens en de wachtrij blijven bewaard.

## 4. Op de beurs

- **Geen of slechte verbinding?** Gewoon doorgaan. Nieuwe notities, foto's en afgevinkte acties worden op de
  telefoon bewaard. Bovenin zie je dan bijvoorbeeld "Offline · 3 wachtend". Zodra er weer verbinding is, verstuurt
  de app alles vanzelf. Je kunt ook op het tandwiel tikken en *Nu synchroniseren* kiezen.
- **Let op:** log niet uit zolang er nog iets "wachtend" staat — uitloggen wist de wachtrij op dat toestel.
- **Foto's, visitekaartjes en handgeschreven notities:** in een notitie tik je op *Foto*, *Uit fotorol*,
  *Visitekaartje* of (onder **Notities scannen**) *Scan met camera*. De foto wordt verkleind voordat hij wordt
  verstuurd en bij de relatie bewaard. Neem naam, e-mail en telefoon zelf over in de velden.
- **Wie ziet wat?** Medewerkers zien alleen hun eigen notities, afspraken, relaties en de acties die aan hen zijn
  toegewezen. De beheerder ziet alles.

## 5. Exporteren

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
- **In de mobiele app → Overzicht:** CSV van de gekozen dag, Excel, JSON of ZIP, steeds alleen met je eigen
  gegevens.
- CSV-bestanden gebruiken `;` als scheidingsteken en openen direct goed in een Nederlandse Excel. Tekst die met
  `=`, `+`, `-` of `@` begint wordt beveiligd tegen formule-injectie.
- Exports zijn **niet versleuteld**: bewaar ze alleen op zakelijke opslag en verwijder ze als ze niet meer nodig
  zijn.

## 6. Problemen oplossen

| Probleem | Oplossing |
|---|---|
| "Geen verbinding met de server" | Controleer je internet. Blijft het, kijk op de statuspagina of `/health` en meld het bij IT. |
| Wachtwoord vergeten | De beheerder klikt in Beheer → Gebruikers bij de collega op *Wachtwoord*. De collega wordt overal uitgelogd en kiest bij het inloggen een nieuw wachtwoord. |
| "Te veel mislukte pogingen" | Na 8 foute wachtwoorden voor één gebruiker (of 20 vanaf één adres) is inloggen 15 minuten geblokkeerd. Wacht, of vraag IT de app te herstarten. |
| Site-wachtwoord gevraagd | Dat is het slot van IT vóór de app; vraag het aan IT. |

## 7. Beveiliging

**Geregeld door IT (server)**
- HTTPS met TLS-certificaat voor `luitencrm.luitenfood.net` (data onderweg versleuteld).
- Versleuteling van de opslag op de VPS (data in rust versleuteld).
- Site-wachtwoord vóór de app; dagelijkse back-up.

**Ingebouwd in de app**
- Wachtwoorden worden gehasht opgeslagen (scrypt). Minimaal 10 tekens; bij het eerste inloggen en na een reset
  moet de gebruiker een eigen wachtwoord kiezen.
- Blokkade na herhaalde foute inlogpogingen, met gelijke reactietijd voor bestaande en niet-bestaande gebruikers.
- Sessies: HttpOnly-cookie, SameSite, Secure, verloopt na 7 dagen. Wachtwoord wijzigen, rol wijzigen of
  uitschakelen logt de gebruiker overal uit.
- Bescherming tegen CSRF (eigen header en Origin-controle), XSS (Content-Security-Policy, alle invoer ge-escaped)
  en clickjacking (frame-ancestors none). HSTS staat aan.
- Rechten worden per verzoek op de server gecontroleerd. Foto's zijn alleen na inloggen op te vragen.
- Uploads: alleen echte JPG-, PNG- of WebP-bestanden (gecontroleerd op inhoud), max 12 MB, met bestandsnamen die
  de server zelf maakt.
- Alle databasequery's zijn geparametriseerd; invoer wordt op lengte en formaat gecontroleerd.
- De app draait als eigen gebruiker zonder extra rechten en is alleen intern bereikbaar (achter Caddy).

**AVG:** de app bevat persoonsgegevens van contactpersonen (naam, e-mail, telefoon, foto's van visitekaartjes).
Neem de app op in het verwerkingsregister, beperk het aantal beheerders en schakel accounts van vertrokken
medewerkers direct uit.

## 8. Goed om te weten

- Relaties worden automatisch aangemaakt op bedrijfsnaam. Zijn er dubbelen ontstaan, voeg ze dan samen in Beheer:
  open een relatie en kies *Dubbele relatie samenvoegen*.
- Er is nog geen koppeling met CSB. Je kunt per relatie wel het CSB-nummer invullen.
- Uitloggen op een telefoon wist ook de lokale kopie en de wachtrij op dat toestel.

## Mappen

```
app.py              de app (Flask + SQLite, standaard Python-server), start met #!/usr/local/bin/python
static/             mobiele app, beheer, stijl, logo's en iconen
deploy/             FreeBSD: rc.d-script, Caddy-blok, back-upscript, DEPLOYMENT.md
```

Benodigde pakketten op FreeBSD: `python312`, `python`, `py312-flask`, `py312-openpyxl`, `py312-sqlite3` (geen pip).
