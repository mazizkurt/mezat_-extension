@echo off
REM =====================================================
REM YouTube Mezat Sistemi - Otomatik Baskı
REM =====================================================

echo ========================================
echo   YouTube Mezat Sistemi
echo   Otomatik Barkod Baskisi
echo ========================================
echo.

REM Chrome'un tam yolu
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

echo Chrome otomatik yazdirma modunda baslatiliyor...
echo.

REM Tüm otomatik yazdırma parametreleri
start "" %CHROME% ^
--kiosk-printing ^
--disable-print-preview ^
--use-system-default-printer ^
--no-first-run ^
--no-default-browser-check ^
--disable-popup-blocking ^
--autoprint ^
"https://www.youtube.com"

echo.
echo ===========================================
echo   Chrome SESSIZ YAZDIRMA moduyla baslatildi
echo ===========================================
echo.
echo KULLANIM:
echo 1. YouTube canli yayina git
echo 2. Extension'i kullan
echo 3. Mezat Durdur tikla
echo 4. OTOMATIK BASKI YAPILACAK (dialog YOK!)
echo.
echo ONEMLI: 
echo - Barkod yazici VARSAYILAN olmali
echo - Registry ayarini yaptiniz mi? (AYAR.reg)
echo.
pause
