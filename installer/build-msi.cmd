@echo off
rem Builds release\LuachDigitali-<version>-x64.msi from release\win-unpacked.
rem Needs: WiX Toolset 5  (dotnet tool install --global wix --version 5.0.2)
rem Run from the project folder after:  npm run build  and  npx electron-builder --win dir
setlocal
cd /d "%~dp0.."
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set VER=%%v
if not exist "release\win-unpacked\Luach Digitali.exe" (
  echo release\win-unpacked is missing. Run: npm run build ^&^& npx electron-builder --win dir
  exit /b 1
)
rem AppDir must be absolute: WiX resolves relative harvest paths from the .wxs folder.
wix build installer\LuachDigitali.wxs -arch x64 -d Version=%VER% -d AppDir="%CD%\release\win-unpacked" -o "release\LuachDigitali-%VER%-x64.msi" -wx
if errorlevel 1 exit /b 1
echo Built release\LuachDigitali-%VER%-x64.msi
