@echo off
echo ========================================
echo   YouTube Mezat Sistemi
echo   Otomatik Barkod Baskisi
echo ========================================
echo.
echo Chrome otomatik yazdirma modunda baslatiliyor...
echo.

start chrome.exe --kiosk-printing --disable-print-preview "https://www.youtube.com"

echo Basariyla baslatildi!
echo Artik mezat durdurunda otomatik baskı yapilacak.
pause
