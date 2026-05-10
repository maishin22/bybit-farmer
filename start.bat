@echo off
title Bybit Auto-Poster
echo ===============================
echo  Bybit Affiliate Auto-Poster
echo  Posting to @maishin2
echo  Every 2-6 hours
echo ===============================
echo.
node "%~dp0src\scheduler.js"
pause
