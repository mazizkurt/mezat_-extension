/* global chrome */

// Background script - minimal setup
// All logic is handled in contentScript.js and popup.js

chrome.runtime.onInstalled.addListener(() => {
  console.log('[YT Mezat Sistemi] Extension installed');
});
