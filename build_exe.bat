@echo off
chcp 65001 > nul
:: 관리자 권한 실행 시 작업 경로가 System32로 바뀌는 것을 방지
cd /d "%~dp0"

title Youtube L.ink EXE 빌더

echo =========================================
echo    Youtube L.ink EXE 빌드를 시작합니다.
echo =========================================
echo.

echo [1/2] 빌더 라이브러리 확인 중...
call npm install electron-builder --save-dev

echo.
echo [2/2] EXE 패키징 진행 중... (시간이 다소 걸릴 수 있습니다)
call npx electron-builder --win

echo.
echo =========================================
echo    🎉 빌드가 완료되었습니다!
echo    'dist' 폴더 안에 생성된 .exe 파일을 확인하세요.
echo =========================================
echo.

pause