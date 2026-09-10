@echo off
chcp 65001 >nul
title RPA Microsoft Edge Rewards
color 0A

echo ======================================================================
echo    INICIANDO RPA MICROSOFT EDGE REWARDS
echo ======================================================================
echo.

cd /d "%~dp0"

call pnpm start

echo.
echo ======================================================================
echo    PROCESO COMPLETADO AL 100%% - CERRANDO EN 3 SEGUNDOS...
echo ======================================================================
timeout /t 3 /nobreak >nul
exit
