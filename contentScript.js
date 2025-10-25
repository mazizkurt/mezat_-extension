/* global chrome */
let running = false;
let options = null;
let winners = []; // {username, messageText, price, at}
let registeredSet = new Set();
let clickCounts = {}; // Track clicks per username for registration

// Mezat variables
let auctionRunning = false;
let auctionParticipants = []; // {username, timestamp, registered, productId}
let auctionStartTime = null;

const PRICE_REGEX = /(?<!\d)(\d{1,6})(?!\d)/g;
const PRICE_WITH_QUANTITY_REGEX = /(\d{1,6})\s*\*\s*(\d{1,2})/g; // Matches "160*2" or "160 * 3"
const CLICKS_TO_REGISTER = 3; // Number of clicks needed to register a user

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(rows) {
  const header = ["username", "message", "price", "timestamp"].join(",");
  const body = rows
    .map((r) =>
      [r.username, r.messageText, r.price, new Date(r.at).toISOString()]
        .map(csvEscape)
        .join(",")
    )
    .join("\n");
  return header + "\n" + body + "\n";
}

function ensurePill() {
  let pill = document.querySelector("#yt-chat-helper-pill");
  if (!pill) {
    pill = document.createElement("div");
    pill.id = "yt-chat-helper-pill";
    document.body.appendChild(pill);
  }

  if (auctionRunning) {
    const maxParticipants = options?.quantity || 999;
    const current = auctionParticipants.length;
    const isFull = current >= maxParticipants;

    pill.textContent = isFull
      ? `✅ MEZAT TAMAMLANDI: ${current}/${maxParticipants} katılımcı`
      : `🔥 MEZAT AKTİF: ${current}/${maxParticipants} katılımcı`;
    pill.style.background = isFull
      ? "rgba(22, 163, 74, 0.9)"
      : "rgba(239, 68, 68, 0.9)";
  } else if (running) {
    pill.textContent = "Mezat Sistemi: Tarama aktif";
    pill.style.background = "rgba(0, 0, 0, 0.85)";
  } else {
    pill.textContent = "Mezat Sistemi: Beklemede";
    pill.style.background = "rgba(107, 114, 128, 0.85)";
  }
}

async function loadRegisteredUserSet() {
  const { options } = await chrome.storage.local.get("options");
  const wordLink = options?.wordLink;
  if (!wordLink) return;
  const resp = await chrome.runtime.sendMessage({
    cmd: "LOAD_REGISTERED_USERS_FROM_WORD",
    wordLink,
  });
  if (resp?.ok) {
    registeredSet = new Set(resp.usernames.map((s) => s.toLowerCase()));
  }
}

async function checkUserRegistered(username) {
  if (!registeredSet.size) await loadRegisteredUserSet();
  return { registered: registeredSet.has((username || "").toLowerCase()) };
}

function handleUsernameClick(username, badgeEl, authorEl, messageEl) {
  const lowerUsername = username.toLowerCase();

  // Initialize click count
  if (!clickCounts[lowerUsername]) {
    clickCounts[lowerUsername] = 0;
  }

  // Increment click count
  clickCounts[lowerUsername]++;

  console.log(
    `[YT Chat Helper] ${username} clicked ${clickCounts[lowerUsername]} times`
  );

  // Check if user should be registered
  if (clickCounts[lowerUsername] >= CLICKS_TO_REGISTER) {
    registeredSet.add(lowerUsername);

    // Save to storage
    chrome.storage.local.get("registeredUsers", (data) => {
      const registered = data.registeredUsers || [];
      if (!registered.includes(lowerUsername)) {
        registered.push(lowerUsername);
        chrome.storage.local.set({ registeredUsers: registered });
      }
    });

    // Update badge
    badgeEl.className = "yt-chat-helper-badge reg";
    badgeEl.textContent = "KAYITLI";

    // Update colors to green
    authorEl.style.color = "#16a34a";
    messageEl.style.color = "#16a34a";

    // Reset click count
    delete clickCounts[lowerUsername];

    console.log(`[YT Chat Helper] ${username} registered!`);
  } else {
    // Show progress
    const remaining = CLICKS_TO_REGISTER - clickCounts[lowerUsername];
    badgeEl.textContent = ` ${remaining} Kalan`;
  }
}

// Load registered users from local storage on init
async function loadLocalRegisteredUsers() {
  return new Promise((resolve) => {
    chrome.storage.local.get("registeredUsers", (data) => {
      const users = data.registeredUsers || [];
      users.forEach((u) => registeredSet.add(u.toLowerCase()));
      console.log(
        `[YT Chat Helper] Loaded ${users.length} registered users from storage`
      );
      resolve();
    });
  });
}

async function annotateMessage(el) {
  try {
    if (el.dataset.ytChatHelperDone === "1") return;
    el.dataset.ytChatHelperDone = "1";

    const authorEl =
      el.querySelector("#author-name") || el.querySelector("#author-name *");
    const messageEl =
      el.querySelector("#message") || el.querySelector("#message *");
    if (!authorEl || !messageEl) return;

    const username = (authorEl.textContent || "").trim();
    const text = (messageEl.textContent || "").trim();
    if (!username || !text) return;

    // Load local registered users if not loaded yet
    if (registeredSet.size === 0) {
      await loadLocalRegisteredUsers();
    }

    const registered = registeredSet.has(username.toLowerCase());

    // Color the author name
    authorEl.style.color = registered ? "#16a34a" : "#ef4444";
    authorEl.style.fontWeight = "600";

    // Color the message text
    messageEl.style.color = registered ? "#16a34a" : "#ef4444";

    // add badge
    let badge = document.createElement("span");
    badge.className = "yt-chat-helper-badge " + (registered ? "reg" : "unreg");
    badge.textContent = registered ? "KAYITLI" : "Kayıtlı Değil";
    badge.style.cursor = "pointer";

    // Add click handler to register user
    badge.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleUsernameClick(username, badge, authorEl, messageEl);
    });

    authorEl.appendChild(badge);

    // Mezat kontrolü
    if (auctionRunning && options && options.price) {
      const price = Number(options.price);
      let matched = false;
      let quantity = 1; // Default 1 adet

      // Önce "fiyat*adet" formatını kontrol et (örn: 160*2)
      const quantityMatches = [...text.matchAll(PRICE_WITH_QUANTITY_REGEX)];
      for (const match of quantityMatches) {
        const foundPrice = Number(match[1]);
        const foundQty = Number(match[2]);
        if (foundPrice === price && foundQty > 0 && foundQty <= 99) {
          matched = true;
          quantity = foundQty;
          break;
        }
      }

      // Eğer "fiyat*adet" bulunamadıysa, sadece fiyat ara
      if (!matched) {
        text.replace(PRICE_REGEX, (m) => {
          const n = Number(m);
          if (n === price) {
            matched = true;
            quantity = 1;
          }
          return m;
        });
      }

      if (matched) {
        addAuctionParticipant(username, quantity);
      }
    }

    // Normal running mode
    if (running && !auctionRunning && options && options.price) {
      // collect if contains exact price
      let matched = false;
      const price = Number(options.price);
      text.replace(PRICE_REGEX, (m) => {
        const n = Number(m);
        if (n === price) matched = true;
        return m;
      });

      if (matched) {
        const key = username + "|" + price;
        if (!winners.some((w) => w.__key === key)) {
          winners.push({
            __key: key,
            username,
            messageText: text,
            price,
            at: Date.now(),
          });
        }
      }
    }
  } catch (e) {}
}

let observer = null;
function startObserving() {
  if (observer) observer.disconnect();
  winners = [];

  // Mevcut mesajları işle
  const processExisting = () => {
    console.log("[YT Chat Helper] Processing existing messages...");
    document
      .querySelectorAll(
        "yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer"
      )
      .forEach(annotateMessage);
  };

  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (
          node.tagName &&
          node.tagName.toLowerCase().includes("yt-live-chat")
        ) {
          annotateMessage(node);
        }
        node
          .querySelectorAll?.(
            "yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer"
          )
          .forEach(annotateMessage);
      }
    }
  });

  // Chat container'ı bul ve observe et
  const chatContainer =
    document.querySelector("yt-live-chat-app") ||
    document.querySelector("#chat") ||
    document.body;

  console.log("[YT Chat Helper] Starting observer on:", chatContainer);
  observer.observe(chatContainer, { childList: true, subtree: true });

  // Mevcut mesajları işle
  processExisting();

  // Chat yüklenmesi için tekrar dene
  setTimeout(processExisting, 1000);
  setTimeout(processExisting, 3000);
}

function stopObserving() {
  observer?.disconnect();
  observer = null;
}

// Mezat fonksiyonları
function startAuction(opts) {
  auctionRunning = true;
  auctionParticipants = [];
  auctionStartTime = Date.now();
  options = opts;

  console.log(
    `[YT Mezat] Mezat başladı! Fiyat: ${opts.price}, Kazanan: ${opts.quantity}`
  );

  // Pill güncelle
  ensurePill();

  // Periyodik pill güncellemesi
  if (!window.auctionPillInterval) {
    window.auctionPillInterval = setInterval(() => {
      if (auctionRunning) ensurePill();
    }, 1000);
  }
}

function stopAuction() {
  auctionRunning = false;
  console.log(
    `[YT Mezat] Mezat durduruldu. Toplam katılımcı: ${auctionParticipants.length}`
  );

  // Stop interval
  if (window.auctionPillInterval) {
    clearInterval(window.auctionPillInterval);
    window.auctionPillInterval = null;
  }

  // Pill güncelle
  ensurePill();

  // Kazananları belirle
  const maxCount = options?.quantity || 10;
  const auctionWinners = auctionParticipants.slice(0, maxCount);

  // Kazananları winners'a ekle
  auctionWinners.forEach((p) => {
    const key = p.username + "|" + options.price;
    if (!winners.some((w) => w.__key === key)) {
      winners.push({
        __key: key,
        username: p.username,
        messageText: options.price + " TL",
        price: options.price,
        at: p.timestamp,
      });
    }
  });

  // Return winners for CSV export - her adet için ayrı satır (barkod için)
  const barcodeRows = [];
  auctionWinners.forEach((p) => {
    const quantity = p.quantity || 1;
    // Her adet için ayrı satır oluştur
    for (let i = 0; i < quantity; i++) {
      barcodeRows.push({
        username: p.username,
        productId: options?.productId || "N/A",
        quantity: quantity,
        itemNumber: i + 1,
        timestamp: p.timestamp,
      });
    }
  });

  return barcodeRows;
}

// Barkod yazdırma - Direkt iframe ile (yeni sekme YOK)
function printBarcodesDirectly(winners, options) {
  const productId = options?.productId || "PRODUCT";
  const price = options?.price || 0;

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barkod Etiketleri - ${productId}</title>
  <style>
    @page { margin: 0; size: 10cm 6cm; }
    @media print {
      body { margin: 0; }
      .barcode-label { page-break-after: always; }
      .barcode-label:last-child { page-break-after: auto; }
    }
    body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
    .barcode-label {
      width: 10cm; height: 6cm; border: 2px solid #000;
      padding: 15px; box-sizing: border-box;
      background: white; color: black;
    }
    .barcode-label h2 {
      margin: 0 0 10px 0; font-size: 24px;
      text-align: center; border-bottom: 2px solid #000;
      padding-bottom: 10px; color: black;
    }
    .barcode-label .info { font-size: 16px; margin: 8px 0; color: black; }
    .barcode-label .barcode {
      text-align: center; margin: 15px 0;
      font-size: 32px; font-weight: bold;
      letter-spacing: 2px; font-family: 'Courier New', monospace; color: black;
    }
    .barcode-label .username {
      font-size: 20px; font-weight: bold;
      text-align: center; margin: 10px 0; color: black;
    }
    .barcode-label .footer {
      font-size: 12px; color: black;
      text-align: center; margin-top: 10px;
      border-top: 1px solid #000; padding-top: 8px;
    }
  </style>
</head>
<body>`;

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
  </div>`;
  });

  html += `</body></html>`;

  // iframe ile yazdır - YENI SEKME YOK
  const iframe = document.createElement('iframe');
  iframe.id = 'mezat-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Yazdırma dialogunu aç
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      console.log('[YT Mezat] Barkod yazdırma başlatıldı:', winners.length, 'etiket');

      // Cleanup - 2 saniye sonra
      setTimeout(() => {
        const existingFrame = document.getElementById('mezat-print-frame');
        if (existingFrame && existingFrame.parentNode) {
          existingFrame.parentNode.removeChild(existingFrame);
        }
      }, 2000);
    } catch (e) {
      console.error('[YT Mezat] Print error:', e);
      // Cleanup on error
      const existingFrame = document.getElementById('mezat-print-frame');
      if (existingFrame && existingFrame.parentNode) {
        existingFrame.parentNode.removeChild(existingFrame);
      }
    }
  }, 300);
}

function addAuctionParticipant(username, quantity = 1) {
  // Check if already added
  if (auctionParticipants.some((p) => p.username === username)) {
    return;
  }

  const isRegistered = registeredSet.has(username.toLowerCase());

  // Sadece kayıtlı kullanıcıları ekle
  if (!isRegistered) {
    console.log(
      `[YT Mezat] Kayıtsız kullanıcı reddedildi: ${username}`
    );
    return;
  }

  // Maksimum katılımcı sayısını kontrol et
  const maxParticipants = options?.quantity || 999;
  if (auctionParticipants.length >= maxParticipants) {
    console.log(
      `[YT Mezat] Limit doldu! ${username} kabul edilmedi. (Max: ${maxParticipants})`
    );
    return;
  }

  auctionParticipants.push({
    username: username,
    timestamp: Date.now(),
    registered: isRegistered,
    productId: options?.productId || "N/A",
    quantity: quantity,
  });

  console.log(
    `[YT Mezat] Yeni katılımcı eklendi: ${username} (${auctionParticipants.length}/${maxParticipants}) (Adet: ${quantity})`
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "START") {
    options = msg.options || options;
    running = true;
    // State'i storage'a kaydet
    chrome.storage.local.set({ scanningActive: true, scanningOptions: options });
    ensurePill();
    startObserving();
    sendResponse({ ok: true });
  } else if (msg.cmd === "STOP") {
    running = false;
    // State'i storage'a kaydet
    chrome.storage.local.set({ scanningActive: false });
    ensurePill();
    stopObserving();
    sendResponse({ ok: true });
  } else if (msg.cmd === "GET_STATE") {
    sendResponse({
      ok: true,
      running: running,
      auctionRunning: auctionRunning,
    });
  } else if (msg.cmd === "EXPORT_CSV") {
    const csv = toCSV(winners);
    sendResponse({ ok: true, csv });
  } else if (msg.cmd === "START_AUCTION") {
    startAuction(msg.options);
    sendResponse({ ok: true });
  } else if (msg.cmd === "STOP_AUCTION") {
    const winners = stopAuction();

    // Otomatik barkod yazdırma - direkt burada yap
    if (winners && winners.length > 0) {
      printBarcodesDirectly(winners, options);
    }

    sendResponse({ ok: true, winners: winners });
  } else if (msg.cmd === "GET_AUCTION_PARTICIPANTS") {
    sendResponse({
      ok: true,
      participants: auctionParticipants,
      maxCount: options?.quantity || 10,
    });
  }
});

// Sayfa yüklendiğinde otomatik olarak taramayı başlat
async function initAutoStart() {
  await loadLocalRegisteredUsers();

  const data = await chrome.storage.local.get(['scanningActive', 'scanningOptions']);
  if (data.scanningActive) {
    console.log('[YT Mezat] Tarama otomatik olarak başlatılıyor...');
    options = data.scanningOptions || {};
    running = true;
    ensurePill();
    startObserving();
  } else {
    ensurePill();
  }
}

initAutoStart();
