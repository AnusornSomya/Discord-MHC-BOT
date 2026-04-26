@echo off
setlocal

cd /d "%~dp0"
title Mode.HardCore Discord Bot

echo Starting Discord bot...
echo.

call npm start

echo.
echo Process exited. Press any key to close this window.
pause >nul
