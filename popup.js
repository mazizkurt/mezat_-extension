/* global chrome */
const $ = (s) => document.querySelector(s);

// View management
function showInitialView() {
  $("#initialView").classList.remove("hidden");
  $("#controlsView").classList.add("hidden");
}

function showControlsView() {
  $("#initialView").classList.add("hidden");
  $("#controlsView").classList.remove("hidden");
}

async function loadOptions() {
  const { options } = await chrome.storage.local.get("options");
  if (options) {
    const productIdEl = $("#productId");
    const priceEl = $("#price");
    const quantityEl = $("#quantity");

    if (productIdEl) productIdEl.value = options.productId || "";
    if (priceEl) priceEl.value = options.price || "";
    if (quantityEl) quantityEl.value = options.quantity || "";
  }
}

// Check if scanning is active on load
async function checkScanningState() {
  const res = await sendToActiveTab("GET_STATE");
  if (res?.running) {
    showControlsView();
  } else {
    showInitialView();
  }
}

async function saveOptions() {
  const productIdEl = $("#productId");
  const priceEl = $("#price");
  const quantityEl = $("#quantity");

  const data = {
    productId: productIdEl ? productIdEl.value.trim() : "",
    price: priceEl ? parseFloat(priceEl.value) : 0,
    quantity: quantityEl ? (parseInt(quantityEl.value || "0", 10) || null) : null
  };
  await chrome.storage.local.set({ options: data });
  return data;
}

async function sendToActiveTab(cmd, payload={}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.error("No active tab found");
    return null;
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { cmd, ...payload });
  } catch (e) {
    console.error("Error sending message to tab:", e);
    return null;
  }
}

const startBtn = $("#start");
if (startBtn) {
  startBtn.addEventListener("click", async () => {
    const statusEl = $("#status");
    const opts = await saveOptions();
    const res = await sendToActiveTab("START", { options: opts });
    if (res && res.ok) {
      showControlsView();
      if (statusEl) statusEl.textContent = "Chat taraması aktif";
    } else {
      if (statusEl) statusEl.textContent = "Hata: YouTube chat sayfasında olduğunuzdan emin olun.";
    }
  });
}

const stopBtn = $("#stop");
if (stopBtn) {
  stopBtn.addEventListener("click", async () => {
    const statusEl = $("#status");
    await sendToActiveTab("STOP");
    stopParticipantsPolling();
    showInitialView();
    if (statusEl) statusEl.textContent = "";
  });
}

// Kayıtlı kullanıcıları CSV olarak indir
const exportRegisteredBtn = $("#exportRegistered");
if (exportRegisteredBtn) {
  exportRegisteredBtn.addEventListener("click", async () => {
    const statusEl = $("#status");
    const { registeredUsers } = await chrome.storage.local.get("registeredUsers");
    const users = registeredUsers || [];

    if (users.length === 0) {
      if (statusEl) statusEl.textContent = "Kayıtlı kullanıcı yok.";
      return;
    }

    const csv = "username\n" + users.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "registered_users.csv"; a.click();
    URL.revokeObjectURL(url);
    if (statusEl) statusEl.textContent = `${users.length} kayıtlı kullanıcı indirildi.`;
  });
}

// CSV'den kayıtlı kullanıcıları yükle
const loadRegisteredBtn = $("#loadRegistered");
if (loadRegisteredBtn) {
  loadRegisteredBtn.addEventListener("click", () => {
    const statusEl = $("#status");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);

      // İlk satır header, geri kalanı kullanıcılar
      const users = lines.slice(1).filter(line => line.trim());

      await chrome.storage.local.set({ registeredUsers: users });
      if (statusEl) statusEl.textContent = `${users.length} kullanıcı yüklendi. Sayfayı yenileyin.`;
    };

    input.click();
  });
}

// const clearBtn = $("#clearRegistered");
// if (clearBtn) {
//   clearBtn.addEventListener("click", async () => {
//     const statusEl = $("#status");
//     if (confirm("Tüm kayıtlı kullanıcıları silmek istediğinize emin misiniz?")) {
//       await chrome.storage.local.set({ registeredUsers: [] });
//       if (statusEl) statusEl.textContent = "Kayıtlı kullanıcılar temizlendi. Sayfayı yenileyin.";
//     }
//   });
// }

// Mezat Başlat
const startAuctionBtn = $("#startAuction");
if (startAuctionBtn) {
  startAuctionBtn.addEventListener("click", async () => {
    const statusEl = $("#status");
    const opts = await saveOptions();

    if (!opts.price) {
      if (statusEl) statusEl.textContent = "Mezat fiyatı girilmedi!";
      return;
    }

    if (!opts.quantity || opts.quantity <= 0) {
      if (statusEl) statusEl.textContent = "Kazanan sayısı girilmedi!";
      return;
    }

    const res = await sendToActiveTab("START_AUCTION", { options: opts });

    if (res?.ok) {
      if (statusEl) statusEl.textContent = `MEZAT BAŞLADI! ${opts.price} TL - ${opts.quantity} kazanan`;
      // Start polling for participants
      startParticipantsPolling();
    } else {
      if (statusEl) statusEl.textContent = "Hata: YouTube chat sayfasında olduğunuzdan emin olun.";
    }
  });
}

// Mezat Durdur
const stopAuctionBtn = $("#stopAuction");
if (stopAuctionBtn) {
  stopAuctionBtn.addEventListener("click", async () => {
    const statusEl = $("#status");
    const res = await sendToActiveTab("STOP_AUCTION");
    stopParticipantsPolling();

    // Barkod yazdırma
    if (res?.winners && res.winners.length > 0) {
      const { options } = await chrome.storage.local.get("options");

      // Print dialog aç
      openBarcodePrintPage(res.winners, options);

      if (statusEl) statusEl.textContent = `✅ Mezat tamamlandı! ${res.winners.length} etiket yazdırma ekranında.`;
    } else {
      if (statusEl) statusEl.textContent = "Mezat durduruldu. Katılımcı bulunamadı.";
    }

    // Clear list
    const participantsList = $("#participantsList");
    if (participantsList) {
      participantsList.innerHTML = '<small class="empty-state">Mezat başlatıldığında katılımcılar burada görünecek...</small>';
    }
  });
}

// Barkod yazdırma - Yeni sekme ile yazdırma (Windows uyumlu)
function openBarcodePrintPage(winners, options) {
  const productId = options?.productId || "PRODUCT";
  const price = options?.price || 0;

  // HTML oluştur
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barkod Etiketleri - ${productId}</title>
  <style>
    @page {
      margin: 0;
      size: 10cm 6cm;
    }
    @media print {
      body { margin: 0; }
      .barcode-label { page-break-after: always; }
      .barcode-label:last-child { page-break-after: auto; }
      .no-print { display: none !important; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .no-print {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: linear-gradient(135deg, #065fd4 0%, #0449a8 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .no-print:hover {
      background: linear-gradient(135deg, #0449a8 0%, #033d80 100%);
    }
    .info-banner {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .barcode-label {
      width: 10cm;
      height: 6cm;
      border: 2px solid #000;
      padding: 15px;
      margin: 10px;
      box-sizing: border-box;
      background: white;
      color: black;
      display: inline-block;
      vertical-align: top;
    }
    .barcode-label h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      color: black;
    }
    .barcode-label .info {
      font-size: 16px;
      margin: 8px 0;
      color: black;
    }
    .barcode-label .barcode {
      text-align: center;
      margin: 15px 0;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
      color: black;
    }
    .barcode-label .username {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin: 10px 0;
      color: black;
    }
    .barcode-label .footer {
      font-size: 12px;
      color: black;
      text-align: center;
      margin-top: 10px;
      border-top: 1px solid #000;
      padding-top: 8px;
    }
  </style>
  <script>
    window.onload = function() {
      // Otomatik yazdırma - 500ms sonra
      setTimeout(function() {
        window.print();
      }, 500);
    };

    function printLabels() {
      window.print();
    }
  </script>
</head>
<body>
  <button class="no-print" onclick="printLabels()">🖨️ Yazdır (Ctrl+P)</button>

  <div class="info-banner no-print">
    <strong>📋 ${winners.length} Etiket Hazır</strong><br>
    Yazdırma penceresi otomatik açılacak. Barkod yazıcınızı seçip "Yazdır" butonuna basın.
  </div>
`;

  winners.forEach((w) => {
    const username = w.username || "Kullanıcı";
    const itemNum = w.itemNumber || 1;
    const qty = w.quantity || 1;
    const timestamp = new Date(w.timestamp).toLocaleString('tr-TR');

    html += `
  <div class="barcode-label">
    <h2>${productId}</h2>
    <div class="username">${username}</div>
    <div class="barcode">${productId}</div>
    <div class="info">Fiyat: ${price} TL</div>
    <div class="info">Adet: ${itemNum} / ${qty}</div>
    <div class="footer">${timestamp}</div>
  </div>
`;
  });

  html += `
</body>
</html>
`;

  // Yeni sekme aç ve yazdır
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  // Cleanup
  if (printWindow) {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } else {
    console.error('[YT Mezat] Pop-up blocker tarafından engellendi!');
    alert('Pop-up blocker yazdırma penceresini engelledi. Lütfen pop-up izni verin.');
  }
}

// CSV generator for winners - Her adet için ayrı barkod satırı
function generateWinnersCSV(winners) {
  const header = "username,productId,quantity,itemNumber,timestamp";
  const rows = winners.map(w => {
    const username = w.username || "";
    const productId = w.productId || "";
    const quantity = w.quantity || 1;
    const itemNumber = w.itemNumber || 1;
    const timestamp = new Date(w.timestamp).toISOString();
    return `${username},${productId},${quantity},${itemNumber},${timestamp}`;
  });
  return header + "\n" + rows.join("\n");
}

// Participants polling
let pollingInterval = null;

function startParticipantsPolling() {
  stopParticipantsPolling();

  pollingInterval = setInterval(async () => {
    const res = await sendToActiveTab("GET_AUCTION_PARTICIPANTS");

    if (res?.participants) {
      updateParticipantsList(res.participants, res.maxCount);
    }
  }, 500); // Her 500ms'de güncelle
}

function stopParticipantsPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function updateParticipantsList(participants, maxCount) {
  const participantsList = $("#participantsList");
  if (!participantsList) return;

  if (participants.length === 0) {
    participantsList.innerHTML = '<small class="empty-state">Henüz katılımcı yok...</small>';
    return;
  }

  let html = '';
  participants.forEach((p, index) => {
    const statusClass = p.registered ? 'registered' : 'unregistered';
    const statusText = p.registered ? '✓' : '✗';
    const winner = index < maxCount ? '' : '';
    const quantity = p.quantity || 1;
    const quantityText = quantity > 1 ? ` x${quantity}` : '';

    html += `
      <div class="participant ${statusClass}">
        <span class="username">${winner} ${statusText} ${p.username}${quantityText}</span>
        <span class="timestamp">${new Date(p.timestamp).toLocaleTimeString('tr-TR')}</span>
      </div>
    `;
  });

  html += `<div class="participant-count">${participants.length} katılımcı / ${maxCount} kazanan</div>`;

  participantsList.innerHTML = html;
}

// Cleanup on popup close
window.addEventListener('unload', () => {
  stopParticipantsPolling();
});

// Initialize
loadOptions();
checkScanningState();
