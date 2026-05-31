@echo off
chcp 65001 >nul
title EchoFan
cd /d "%~dp0"

echo.
echo  ╔════════════════════════════════════╗
echo  ║            E C H O F A N            ║
echo  ╚════════════════════════════════════╝
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] No se ha encontrado Node.js / npm.
  echo  Instalalo desde https://nodejs.org y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  Primera vez: instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo  [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
  )
)

echo  Iniciando servidor de desarrollo en http://localhost:5173
echo  Abriendo el navegador... ^(cierra esta ventana para detener el juego^)
echo.

start "" http://localhost:5173
call npm run dev
