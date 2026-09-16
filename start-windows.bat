@echo off
start "OpsVision VAMS Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 >nul
start "OpsVision VAMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
