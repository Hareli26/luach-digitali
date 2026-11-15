@echo off
rem ============================================================================
rem  Luach Digitali - silent install for one PC (run as Administrator).
rem  Put this file, the .msi and (optionally) settings.json in the same folder,
rem  e.g. on a USB stick or a network share, and run it on each computer.
rem
rem  settings.json = a backup exported from the board (Settings > Display & backup >
rem  "Download backup file"). Every PC that has it starts with the same shul name,
rem  location, prayer times, announcements and screens.
rem ============================================================================
setlocal
net session >nul 2>&1
if errorlevel 1 (
  echo Please run this file as Administrator ^(right-click ^> Run as administrator^).
  pause
  exit /b 1
)
set "HERE=%~dp0"
set "MSI="
for %%f in ("%HERE%LuachDigitali-*-x64.msi") do set "MSI=%%f"
if not defined MSI (
  echo No LuachDigitali-*-x64.msi next to this file.
  pause
  exit /b 1
)

echo Installing %MSI% ...
msiexec /i "%MSI%" /qn /norestart AUTOSTART=1 DESKTOPSHORTCUT=1 /l*v "%TEMP%\LuachDigitali-install.log"
if errorlevel 1 (
  echo Install failed. Log: %TEMP%\LuachDigitali-install.log
  pause
  exit /b 1
)

if exist "%HERE%settings.json" (
  if not exist "%ProgramData%\LuachDigitali" mkdir "%ProgramData%\LuachDigitali"
  copy /y "%HERE%settings.json" "%ProgramData%\LuachDigitali\settings.json" >nul
  echo Shared settings copied to %ProgramData%\LuachDigitali\settings.json
)

echo Done. The board starts automatically when a user signs in.
endlocal
