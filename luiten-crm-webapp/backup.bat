@echo off
cd /d "%~dp0"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmm"') do set STAMP=%%i
if not exist data (
  echo Er is nog geen map data. Start de app eerst een keer.
  pause
  exit /b 1
)
xcopy data "backups\%STAMP%\" /E /I /Y /Q >nul
echo.
echo  Back-up gemaakt in: backups\%STAMP%
echo  Tip: kopieer deze map ook naar een USB-stick of OneDrive.
echo.
pause
