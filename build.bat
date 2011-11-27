@ECHO OFF
SETLOCAL

REM Build the src directory

SET P7ZIP="C:\Program Files\7-Zip\7z.exe"

rmdir /s /q build
mkdir build
xcopy /s src build

REM Compress src into xpi
cd build
REM yes this SHOULD cause an infinite loop but 7zip is better than that
%P7ZIP% a -tzip pcookie.xpi *

echo.
echo Complete, file is in build directory
pause