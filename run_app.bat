@echo off
chcp 65001 > nul
title Youtube L.ink Sync Server

echo =========================================
echo    Youtube L.ink 동기화 서버 실행 중...
echo =========================================
echo.

npm run server
pause