@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   Planlama App - WPF Single EXE Builder
echo ===================================================
echo.
set "OUTPUT_DIR=%~dp0Dist"
set "TEMP_DIR=%~dp0temp_publish"
echo [1/4] Cleaning old build files...
if exist "!OUTPUT_DIR!" rmdir /s /q "!OUTPUT_DIR!"
if exist "!TEMP_DIR!" rmdir /s /q "!TEMP_DIR!"
echo [2/4] Publishing application to a single EXE...
dotnet publish -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o "!TEMP_DIR!"
if !ERRORLEVEL! neq 0 (
    echo.
    echo Publish failed!
    if exist "!TEMP_DIR!" rmdir /s /q "!TEMP_DIR!"
    pause
    exit /b !ERRORLEVEL!
)
echo [3/4] Creating distribution directories...
mkdir "!OUTPUT_DIR!"
mkdir "!OUTPUT_DIR!\Data"
echo [4/4] Copying files and cleaning up...
copy "!TEMP_DIR!\planlama_app.exe" "!OUTPUT_DIR!\" > nul
copy "!TEMP_DIR!\*.dll" "!OUTPUT_DIR!\Data\" > nul
rmdir /s /q "!TEMP_DIR!"
echo.
echo ===================================================
echo   Process completed successfully!
echo ===================================================
echo   Output Directory: !OUTPUT_DIR!
echo   Contents:
echo     - planlama_app.exe
echo     - Data/ (Contains tasks.db and e_sqlite3.dll)
echo ===================================================
echo.
pause
