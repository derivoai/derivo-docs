@echo off
REM Derivo Docs — Fast Dev Server Launcher (Bypasses Windows PowerShell ExecutionPolicy)
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting Derivo Docs with startup route pre-compilation...
node scripts\dev.mjs
