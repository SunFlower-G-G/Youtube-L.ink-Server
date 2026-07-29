@echo off
chcp 65001 > nul
title Git Initial Push Script

echo =========================================
echo       Git Initial Push Automator
echo =========================================
echo.

:: 1. Git 초기화
echo [1/5] Initializing Git repository...
git init
echo.

:: 2. 파일 스테이징
echo [2/5] Adding files...
git add .
echo.

:: 3. 커밋 메시지 입력 (엔터 치면 기본값 사용)
set /p msg="[3/5] Enter commit message (Default: Initial commit): "
if "%msg%"=="" set msg=Initial commit

git commit -m "%msg%"
echo.

:: 4. 브랜치 이름을 main으로 변경
echo [4/5] Setting default branch to 'main'...
git branch -M main
echo.

:: 5. 원격 저장소 URL 확인 및 설정
git remote | findstr "origin" > nul
if %errorlevel% neq 0 (
    echo [5/5] Remote 'origin' is not set.
    set /p remote_url="Enter Git Repository URL (e.g., https://github.com/SunFlower-G-G/Youtube-L.ink-Server.git): "
    if not "%remote_url%"=="" (
        git remote add origin %remote_url%
    )
) else (
    echo [5/5] Remote 'origin' already exists.
)

echo.
echo [Pushing to GitHub...]
git push -u origin main

echo.
echo =========================================
echo 작업이 완료되었습니다!
echo =========================================
pause