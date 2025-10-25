/* global chrome */

// Background script - Silent Printing Support

chrome.runtime.onInstalled.addListener(() => {
  console.log('[YT Mezat Sistemi] Extension installed');
});

// Silent printing with chrome.printing API
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === 'SILENT_PRINT') {
    silentPrint(msg.html)
      .then(() => {
        console.log('[YT Mezat] Barkodlar yazıcıya gönderildi');
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error('[YT Mezat] Yazdırma hatası:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async response
  }
});

async function silentPrint(htmlContent) {
  // Create a hidden offscreen document for printing
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

  try {
    // Use chrome.printing API for silent printing
    if (chrome.printing && chrome.printing.submitJob) {
      // Get default printer
      const printers = await chrome.printing.getPrinters();
      const defaultPrinter = printers.find(p => p.isDefault) || printers[0];

      if (!defaultPrinter) {
        throw new Error('Varsayılan yazıcı bulunamadı');
      }

      // Submit print job silently
      const ticket = {
        version: '1.0',
        print: {
          color: { type: 'STANDARD_MONOCHROME' },
          duplex: { type: 'NO_DUPLEX' },
          page_orientation: { type: 'PORTRAIT' },
          copies: { copies: 1 },
          dpi: { horizontal_dpi: 300, vertical_dpi: 300 },
          media_size: {
            width_microns: 100000, // 10cm
            height_microns: 60000   // 6cm
          },
          collate: { collate: false }
        }
      };

      await chrome.printing.submitJob({
        job: {
          printerId: defaultPrinter.id,
          title: 'Mezat Barkodları',
          ticket: ticket,
          contentType: 'text/html',
          document: new Blob([htmlContent], { type: 'text/html' })
        }
      });

      console.log('[YT Mezat] Sessiz yazdırma başarılı:', defaultPrinter.name);
    } else {
      throw new Error('chrome.printing API desteklenmiyor');
    }
  } catch (error) {
    console.error('[YT Mezat] Silent print failed:', error);
    throw error;
  }
}
