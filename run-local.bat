@echo off
title Ritual Habit Tracker

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js chua duoc cai dat. Hay cai Node.js 22.13 tro len roi chay lai.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dang cai dat cac goi can thiet...
  call npm install
  if errorlevel 1 (
    echo Cai dat that bai. Kiem tra ket noi mang va thu lai.
    pause
    exit /b 1
  )
)

echo Dang mo Ritual Habit Tracker...
call npm run dev
pause
