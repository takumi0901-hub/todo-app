@echo off
chcp 65001 > nul
echo ===================================
echo        ToDo アプリを起動中...
echo ===================================

:: ブラウザで index.html を開く
start "" "%~dp0index.html"

exit
