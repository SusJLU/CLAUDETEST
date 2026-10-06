@echo off
rem Eenmalig uitvoeren als administrator (rechtermuisknop > Als administrator uitvoeren)
netsh advfirewall firewall add rule name="Luiten CRM (poort 8000)" dir=in action=allow protocol=TCP localport=8000 profile=private
echo.
echo  Klaar. Telefoons op hetzelfde (prive/bedrijfs)netwerk kunnen nu verbinden.
pause
