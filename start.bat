@echo off
title DOCUMIND-AI One-Click Launcher
cls
echo ======================================================================
echo                     DOCUMIND-AI ONE-CLICK LAUNCH
echo ======================================================================
echo.
echo   CLICK TO OPEN FRONTEND:
echo   --^> http://localhost:5173
echo.
echo   [Status] Starting Backend (Port 5000), AI Engine (Port 8000), and Frontend...
echo   [Browser] Opening http://localhost:5173 automatically...
echo.
echo   Press Ctrl+C to stop all servers.
echo ======================================================================
echo.
npm run dev
pause
