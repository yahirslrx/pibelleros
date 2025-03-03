@echo off
echo Iniciando el servidor...
cd /d "C:\Users\yahir\Documents\chetonios"
start node server.js
timeout /t 2 >nul
start http://localhost:3000
echo Servidor iniciado. Abriendo la página...