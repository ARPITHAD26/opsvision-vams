@echo off
start "VAMS Backend" cmd /k "cd /d %~dp0backend && npm install && npm run dev"
timeout /t 2 >nul
start "VAMS Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
