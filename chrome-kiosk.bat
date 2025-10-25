@echo off
REM YouTube Mezat Sistemi - Otomatik Yazdırma Modu
REM Bu dosyayı çift tıklayarak Chrome'u otomatik yazdırma modunda başlatın

start chrome.exe --kiosk-printing --disable-print-preview --auto-open-devtools-for-tabs=0

echo Chrome otomatik yazdırma modu ile başlatıldı!
echo Artık print dialog otomatik geçilecek ve varsayılan yazıcıya direkt gönderilecek.
pause
