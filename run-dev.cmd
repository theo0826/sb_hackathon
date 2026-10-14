@echo off
setlocal
cd /d "%~dp0"
for /d %%D in (".tools\node-*-win-x64") do set "FIT_NODE_DIR=%%~fD"
if defined FIT_NODE_DIR set "PATH=%FIT_NODE_DIR%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
call npm.cmd run dev
if errorlevel 1 pause
