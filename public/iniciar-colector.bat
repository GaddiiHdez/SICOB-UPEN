@echo off
title Colector de Especificaciones SICOB
echo =============================================
echo      INICIANDO AGENTE COLECTOR SICOB        
echo =============================================
echo Ejecutando script con politicas de bypass...
powershell -ExecutionPolicy Bypass -File "%~dp0colector-sicob.ps1"
