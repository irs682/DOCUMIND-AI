@echo off
title DOCUMIND-AI Development Server
cls
echo ======================================================================
echo                     DOCUMIND-AI APPLICATION
echo ======================================================================
echo.
echo   CLICK TO OPEN FRONTEND:
echo   --^> http://localhost:5173
echo.
echo   [Status] Starting Backend (Node.js) and AI Engine (Python)...
echo   [Info]   Your browser will open automatically at http://localhost:5173
echo.
echo   Press Ctrl+C anytime to stop all services.
echo ======================================================================
echo.
npm run dev
pause



