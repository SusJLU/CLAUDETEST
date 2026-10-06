@echo off
title Luiten CRM
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Python is niet gevonden. Installeer Python 3 via https://www.python.org/downloads/
  echo  en vink tijdens de installatie "Add python.exe to PATH" aan.
  echo.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Eerste keer: omgeving aanmaken...
  %PY% -m venv .venv
)
call ".venv\Scripts\activate.bat"
echo Onderdelen controleren...
python -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 (
  echo.
  echo  Installeren mislukt. Is er internet? De eerste keer is internet nodig.
  pause
  exit /b 1
)
python app.py
pause
