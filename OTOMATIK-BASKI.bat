@echo off
REM =====================================================
REM YouTube Mezat Sistemi - Otomatik Baskı
REM =====================================================

echo ========================================
echo   YouTube Mezat Sistemi
echo   Otomatik Barkod Baskisi
echo ========================================
echo.
echo Chrome otomatik yazdirma modunda baslatiliyor...
echo.

REM Chrome'un tam yolu
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

REM Otomatik yazdırma parametreleri
start "" %CHROME% --kiosk-printing --disable-print-preview --no-first-run --no-default-browser-check --disable-popup-blocking "https://www.youtube.com"

echo.
echo ===========================================
echo   Chrome otomatik baski moduyla baslatildi
echo ===========================================
echo.
echo KULLANIM:
echo 1. YouTube canli yayina git
echo 2. Mezat Durdur butonuna tikla
echo 3. Otomatik olarak varsayilan yaziciya gidecek!
echo.
echo ONEMLI: Barkod yazici VARSAYILAN yazici olmali!
echo.
pause
