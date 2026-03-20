// ==UserScript==
// @name         AB2soft V6 pro1
// @namespace    Violentmonkey Scripts
// @description  Protected script - requires password

// @version      14
// @description  Automate HIT collection on Amazon Mechanical Turk and block unwanted requesters [General]
// @connect      https://ab2vps.com
// @updateURL    https://ab2vps.com/scipt/AB2softV6pro.user.js
// @downloadURL  https://ab2vps.com/scipt/AB2softV6pro.user.js
// @connect      https://api.ipify.org
// @connect      https://www.allbyjohn.com
// @connect      https://worker.mturk.com
// @connect      https://worker.mturk.com/projects/
// @connect      https://amazon.com/*
// @connect      https://aqua-theo-29.tiiny.site
// @connect      https://raw.githubusercontent.com
// @connect      https://api.github.com
// @author       Arun Balaji Bose MCA(AB2 SOFTWARE SOLUTIONS)
// @match        https://worker.mturk.com/tasks/
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_addStyle
// ==/UserScript==
(async function () {
  'use strict';
  const TASKS_CANONICAL_URL = "https://worker.mturk.com/tasks/";
  function normalizeTasksUrl(rawUrl) {
    try {
      const u = new URL(rawUrl, location.origin);
      if (u.origin !== "https://worker.mturk.com") return "";
      if (!u.pathname.startsWith("/tasks")) return "";
      if (u.pathname === "/tasks") u.pathname = "/tasks/";
      return u.toString();
    } catch (e) {
      return "";
    }
  }

  const normalizedCurrentTasksUrl = normalizeTasksUrl(location.href);
  if (!normalizedCurrentTasksUrl) {
    return;
  }
  if (location.href !== normalizedCurrentTasksUrl) {
    location.replace(normalizedCurrentTasksUrl);
    return;
  }

  GM_addStyle(`
    :root { --ab-bg: #F4C2C2; --ab-card: #efb8b8; --ab-border: rgba(120, 70, 70, 0.22); --ab-text: #111111; --ab-muted: #111111; --ab-accent: #8cc0a8; --ab-green: #3a7f52; --ab-red: #b94a48; --ab-blue: #3f6785; }

    .ab2-wrap { font-family: Arial, sans-serif; background: var(--ab-bg); border-radius: 16px; padding: 24px; max-width: 1200px; margin: 12px auto; color: var(--ab-text); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }

    .ab2-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--ab-border); }
    .ab2-logo { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #5f003b, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }
    .ab2-version { font-size: 11px; color: var(--ab-mutesd); background: rgba(148,163,184,0.1); padding: 3px 10px; border-radius: 12px; }

    .ab2-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .ab2-stat { background: var(--ab-card); border-radius: 12px; padding: 16px 20px; border: 1px solid var(--ab-border); position: relative; overflow: hidden; }
    .ab2-stat::after { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--ab-muted); border-radius: 4px 0 0 4px; }
    .ab2-stat.green::after { background: var(--ab-green); }
    .ab2-stat.blue::after { background: var(--ab-blue); }
    .ab2-stat.red::after { background: var(--ab-red); }
    .ab2-stat-label { font-size: 11px; color: var(--ab-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .ab2-stat-val { font-size: 28px; font-weight: 700; line-height: 1; }
    .ab2-stat.green .ab2-stat-val { color: var(--ab-green); }
    .ab2-stat.blue .ab2-stat-val { color: var(--ab-accent); }
    .ab2-stat.controls { padding: 12px 16px; }
    .ab2-stat-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .ab2-stat-actions .ab2-btn { padding: 8px 12px; font-size: 12px; }

    .ab2-card { background: var(--ab-card); border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--ab-border); overflow: hidden; }
    .ab2-card-head { padding: 14px 20px; display: flex; align-items: center; cursor: pointer; user-select: none; }
    .ab2-card-head:hover { background: rgba(255,255,255,0.02); }
    .ab2-card-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; flex-shrink: 0; }
    .ab2-card-icon.blue { background: rgba(59,130,246,0.15); color: var(--ab-blue); }
    .ab2-card-icon.green { background: rgba(34,197,94,0.15); color: var(--ab-green); }
    .ab2-card-icon.red { background: rgba(239,68,68,0.15); color: var(--ab-red); }
    .ab2-card-icon.purple { background: rgba(168,85,247,0.15); color: #a855f7; }
    .ab2-card-icon.amber { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .ab2-card-icon.cyan { background: rgba(6,182,212,0.15); color: #06b6d4; }
    .ab2-card-title { font-size: 14px; font-weight: 600; flex: 1; }
    .ab2-card-arrow { color: var(--ab-muted); font-size: 12px; transition: transform 0.2s; }
    .ab2-card.collapsed .ab2-card-arrow { transform: rotate(-90deg); }
    .ab2-card-body { padding: 4px 20px 18px; }
    .ab2-card.collapsed .ab2-card-body { display: none; }

    .ab2-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
    .ab2-field { display: flex; flex-direction: column; gap: 6px; }
    .ab2-field-label { font-size: 11px; color: var(--ab-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .ab2-input { padding: 9px 14px; border-radius: 8px; border: 1px solid #1a1a1a; background: #ffffff; color: #111111; font-size: 13px; height: 38px; outline: none; transition: border-color 0.2s; }
    .ab2-input::placeholder { color: #222222; opacity: 1; }
    .ab2-input:focus { border-color: var(--ab-accent); box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
    .ab2-input-wide { flex: 1; min-width: 200px; }

    .ab2-btn { padding: 9px 18px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
    .ab2-btn:hover { transform: translateY(-1px); }
    .ab2-btn:active { transform: translateY(0); }
    .ab2-btn-green { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
    .ab2-btn-green:hover { box-shadow: 0 4px 14px rgba(34,197,94,0.35); }
    .ab2-btn-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; }
    .ab2-btn-blue:hover { box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
    .ab2-btn-red { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
    .ab2-btn-red:hover { box-shadow: 0 4px 14px rgba(239,68,68,0.35); }
    .ab2-btn-ghost { background: rgba(148,163,184,0.12); color: var(--ab-text); border: 1px solid var(--ab-border); }
    .ab2-btn-ghost:hover { background: rgba(148,163,184,0.2); border-color: rgba(148,163,184,0.3); }
    .ab2-btn-ghost.active { border-color: var(--ab-accent); background: rgba(56,189,248,0.1); color: var(--ab-accent); }

    .ab2-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .ab2-chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--ab-border); background: rgba(148,163,184,0.08); color: var(--ab-text); transition: all 0.15s; }
    .ab2-chip:hover { background: rgba(148,163,184,0.18); transform: translateY(-1px); }

    .ab2-block-tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; }
    .ab2-block-tag { background: rgba(239,68,68,0.12); color: #fca5a5; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; border: 1px solid rgba(239,68,68,0.25); transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
    .ab2-block-tag:hover { background: rgba(239,68,68,0.25); transform: scale(1.03); }
    .ab2-block-tag .x { font-weight: 700; opacity: 0.6; }

    .ab2-msg-box { background: #8cc0a8; border: 1px solid rgba(0,0,0,0.22); border-radius: 10px; padding: 14px 18px; min-height: 48px; max-height: 80px; overflow-y: auto; font-size: 13px; color: #000000 !important; }
    .ab2-msg-box:not(:empty) { color: #000000 !important; }

    .ab2-divider { height: 1px; background: var(--ab-border); margin: 4px 0 12px; }
    .ab2-link { color: var(--ab-accent); text-decoration: none; font-size: 12px; }
    .ab2-link:hover { text-decoration: underline; }
    @keyframes ab2BlinkRed {
      0%, 100% {
        border-color: rgba(239,68,68,0.9);
        box-shadow: 0 0 14px rgba(239,68,68,0.55);
        background: rgba(127,29,29,0.88);
      }
      50% {
        border-color: rgba(249,115,22,1);
        box-shadow: 0 0 18px rgba(249,115,22,0.65);
        background: rgba(124,45,18,0.88);
      }
    }
    .ab2-accepted-blink {
      animation: ab2BlinkRed 1s infinite !important;
      border-color: rgba(239,68,68,0.9) !important;
      box-shadow: 0 0 14px rgba(239,68,68,0.55) !important;
    }
  `);

  const INTERVALS = {
    DIRECT_FETCH_MS: 900,
    DIRECT_MODE_FETCH_MS: 400,
    DIRECT_MODE_WINDOW_MS: 15000,
    SCAN_MS: 800,
    ACCEPT_QUEUE_CONCURRENCY: 3,
    PROJECT_ACCEPT_COOLDOWN_MS: 1500,
    SOUND_MUTE_GAP_MS: 2000,
    SOUND_MUTE_DURATION_MS: 60000,
    RATE_LIMIT_RETRY_MS: 10000,
    RATE_LIMIT_MAX_BACKOFF_MS: 30000,
    UNPROCESSABLE_RETRY_MS: 12000,
    CAPTCHA_TAB_TIMEOUT_MS: 96000,
    PREVIEW_CLOSE_MS: 5000,
    SESSION_PING_MS: 5000,
    NETWORK_TIMEOUT_MS: 3600000,
    CAPTCHA_COOLDOWN_MS: 15000,
    ACCEPTED_HITS_POLL_MS: 15000,
    RETRY_INITIAL_MS: 2000,
    RETRY_MAX_MS: 16000,
    RETRY_MAX_ATTEMPTS: 6,
    RETRY_JITTER_MS: 400,
    ACCEPT_HTML_TIMEOUT_MS: 12000,
    FETCH_STUCK_MS: 25000,
  };
  const BLOCK_CFG_URL = "https://github.com/Vinylgeorge/400err/raw/refs/heads/main/ab2_github_config.json";
  // MTurk feed sort token used by the working "newest first" query pattern.
  const NEWEST_SORT_VALUE = "updated_desc";
  const DEFAULT_FETCH_URL = "https://worker.mturk.com/?page_size=20&filters%5Bqualified%5D=true&filters%5Bmasters%5D=false&sort=" + NEWEST_SORT_VALUE + "&format=json";
  const VALUE_FILTER_BASE_URL = "https://worker.mturk.com/?page_size=20&filters%5Bqualified%5D=true&filters%5Bmasters%5D=false&sort=updated_desc&filters%5Bmin_reward%5D=";
  const ADVANCED_CARD_IDS = ["card-blocked", "card-hits", "card-tools", "card-presets", "card-values"];
  const ADVANCED_TABS = [
    { btnId: "tab-blocked-btn", cardId: "card-blocked" },
    { btnId: "tab-hits-btn", cardId: "card-hits" },
    { btnId: "tab-tools-btn", cardId: "card-tools" },
    { btnId: "tab-presets-btn", cardId: "card-presets" },
    { btnId: "tab-values-btn", cardId: "card-values" }
  ];
  const CUSTOM_VALUE_FILTERS_KEY = "ab2CustomValueFilters";
  const HIT_HISTORY_KEY = "ab2HitGroupHistory";
  const HIT_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
  const HIT_HISTORY_MAX = 5;
  const TEMP_BLOCKS_STORAGE_KEY = "ab2TempBlocks";
  const REQUESTER_ID_REGEX = /^A[0-9A-Z]{12,15}$/;
  const PROJECT_ID_REGEX = /^[0-9A-Z]{25,40}$/;

  let blockList = new Set();
  let fetchUrl = DEFAULT_FETCH_URL;
  let directFetchInterval = null;
  let timerInterval = null;
  let isFetchingTasks = false;
  let isDirectFetching = false;
  let isUpdatingAcceptedHits = false;
  let acceptedHitsInterval = null;
  let lastCaptchaTime = 0;
  let currentDirectFetchUrl = null;
  let lastConfiguredDirectFetchUrl = null;
  let lastAcceptTime = 0;
  let soundMutedUntil = 0;
  let sessionAccepted = 0;
  let sessionStartTime = Date.now();
  let hitGroupHistory = [];
  let permanentBlockedProjects = new Set();
  let tempBlockedRequesters = new Set();
  let tempBlockedProjects = new Set();
  let acceptedPanelLastTabOpenAt = 0;
  let ab2_fetchWatchdog = null;
  const SCAN_INTERVAL_MS = 800;
  let audioUnlocked = false;
  let directModeActive = false;
  let directModeNoHitTimer = null;
  let rateLimitBackoffMs = INTERVALS.RATE_LIMIT_RETRY_MS;
  let rateLimitResumeTimer = null;
  let hasAcceptedAnyHit = false;
  let currentUiPage = "main";
  let singleTasksTab = null;
  let acceptedWorkTab = null;
  let advancedOptionsEnabled = false;
  let advancedOptionsIdleTimer = null;
  let activeAdvancedCardId = null;
  const recentProjectAcceptAttempts = new Map();
  const ADVANCED_OPTIONS_IDLE_MS = 60000;

  const acceptSound = new Audio("https://www.allbyjohn.com/sounds/mturkscanner/lessthan15Short.mp3");
  const captchaSound = new Audio("https://www.allbyjohn.com/sounds/CrowCawSynthetic.wav");

  async function getConnectivityState() {
    if (!navigator.onLine) return "offline";
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: "https://worker.mturk.com/projects?format=json&t=" + Date.now(),
        timeout: 6000,
        onload: function (res) {
          const finalUrl = (res.finalUrl || "").toLowerCase();
          const body = (res.responseText || "").toLowerCase();
          const redirectedToSignIn = finalUrl.includes("amazon.com/ap/signin") || body.includes("openid.assoc_handle=amzn_mturk_worker");
          if (res.status >= 200 && res.status < 400 && !redirectedToSignIn) {
            resolve("online");
          } else if (res.status === 0 || res.status >= 500) {
            resolve("offline");
          } else {
            resolve("unknown");
          }
        },
        ontimeout: function () { resolve("offline"); },
        onerror: function () { resolve("offline"); }
      });
    });
  }

  function showMessage(msg) {
    const el = document.getElementById('message-display');
    if (el) el.textContent = msg;



  }

  function showDebug(msg) {
    const text = String(msg || "");
    const el = document.getElementById("ab2-debug-line");
    if (el) el.textContent = text;
    try { console.log("[AB2 DEBUG] " + text); } catch (e) {}
  }

  async function safePlayAudio(audioEl, label) {
    try {
      audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && typeof p.then === "function") await p;
    } catch (err) {
      // Ignore autoplay and audio errors silently.
    }
  }

  async function tryUnlockAudio() {
    if (audioUnlocked) return;
    try {
      const prevA = acceptSound.volume;
      const prevC = captchaSound.volume;
      acceptSound.volume = 0;
      captchaSound.volume = 0;
      await safePlayAudio(acceptSound, "accept-unlock");
      acceptSound.pause();
      await safePlayAudio(captchaSound, "captcha-unlock");
      captchaSound.pause();
      acceptSound.volume = prevA;
      captchaSound.volume = prevC;
      audioUnlocked = true;
    } catch (e) {
      // Keep silent; we'll try again on next interaction.
    }
  }

  function setupAudioUnlockListeners() {
    const unlock = () => { tryUnlockAudio(); };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("click", unlock, { passive: true });
  }

  function openMturkTabOnce(cooldownMs = 20000) {
    const now = Date.now();
    if (now - acceptedPanelLastTabOpenAt < cooldownMs) return;
    acceptedPanelLastTabOpenAt = now;
    openOrReuseTasksTab("https://worker.mturk.com/tasks/");
  }

  function openOrReuseTasksTab(url) {
    let targetUrl = String(url || "").trim();
    if (!targetUrl) return null;
    const normalizedTaskUrl = normalizeTasksUrl(targetUrl);
    if (normalizedTaskUrl) {
      targetUrl = normalizedTaskUrl;
    } else {
      return window.open(targetUrl, "_blank");
    }

    try {
      if (singleTasksTab && !singleTasksTab.closed) {
        singleTasksTab.location.href = targetUrl;
        singleTasksTab.focus();
        return singleTasksTab;
      }
    } catch (e) {
      // Cross-origin access can fail; open a new tab and overwrite handle.
    }

    singleTasksTab = window.open(targetUrl, "_blank");
    return singleTasksTab;
  }

  function ensureAcceptedWorkTab() {
    try {
      if (acceptedWorkTab && !acceptedWorkTab.closed) return acceptedWorkTab;
    } catch (e) {}
    acceptedWorkTab = window.open("https://worker.mturk.com/", "_blank");
    return acceptedWorkTab;
  }

  function openOrReuseAcceptedWorkTab(url) {
    const targetUrl = String(url || "").trim();
    if (!targetUrl) return null;
    try {
      if (acceptedWorkTab && !acceptedWorkTab.closed) {
        acceptedWorkTab.location.href = targetUrl;
        acceptedWorkTab.focus();
        return acceptedWorkTab;
      }
    } catch (e) {}
    acceptedWorkTab = window.open(targetUrl, "_blank");
    return acceptedWorkTab;
  }

  function pauseAndAutoRecoverFromAcceptedPanelError(reason) {
    if (acceptedHitsInterval) {
      clearInterval(acceptedHitsInterval);
      acceptedHitsInterval = null;
    }
    showMessage("Accepted panel paused: " + (reason || "Unknown error"));
  }

  function setUiPage(page) {
    currentUiPage = page === "accepted" ? "accepted" : "main";
    const mainWrap = document.querySelector(".ab2-wrap");
    const acceptedPanel = document.getElementById("accepted-hits-panel");
    if (mainWrap) mainWrap.style.display = "";
    if (acceptedPanel) {
      acceptedPanel.style.display = "block";
      if (currentUiPage === "accepted") {
        acceptedPanel.style.outline = "2px solid rgba(58,127,82,0.85)";
        acceptedPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setTimeout(() => {
          const panelNow = document.getElementById("accepted-hits-panel");
          if (panelNow) panelNow.style.outline = "none";
        }, 1400);
      } else {
        acceptedPanel.style.outline = "none";
      }
    }
  }

  function hideAllAdvancedCards() {
    ADVANCED_CARD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }

  function updateAdvancedTabButtons() {
    const tabsRow = document.getElementById("ab2-advanced-tabs");
    if (tabsRow) tabsRow.style.display = advancedOptionsEnabled ? "flex" : "none";
    ADVANCED_TABS.forEach(({ btnId, cardId }) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = advancedOptionsEnabled && activeAdvancedCardId === cardId;
      btn.className = isActive ? "ab2-btn ab2-btn-blue" : "ab2-btn ab2-btn-ghost";
    });
  }

  function toggleAdvancedCard(cardId) {
    if (!advancedOptionsEnabled) return;
    if (activeAdvancedCardId === cardId) {
      activeAdvancedCardId = null;
      hideAllAdvancedCards();
      updateAdvancedTabButtons();
      return;
    }
    hideAllAdvancedCards();
    const target = document.getElementById(cardId);
    if (target) target.style.display = "";
    activeAdvancedCardId = cardId;
    updateAdvancedTabButtons();
    resetAdvancedOptionsIdleTimer();
  }

  function enforceMainPageMinimalMode() {
    activeAdvancedCardId = null;
    hideAllAdvancedCards();
    updateAdvancedTabButtons();
    const controlsCard = document.getElementById("card-controls");
    const advancedRow = document.getElementById("ab2-main-controls-advanced-row");
    const requesterRow = document.getElementById("ab2-requester-row");
    const advancedDivider = document.getElementById("ab2-main-controls-advanced-divider");
    const tabsRow = document.getElementById("ab2-advanced-tabs");
    if (controlsCard) controlsCard.style.display = "none";
    if (advancedRow) advancedRow.style.display = "none";
    if (requesterRow) requesterRow.style.display = "none";
    if (advancedDivider) advancedDivider.style.display = "none";
    if (tabsRow) tabsRow.style.display = "none";

    const intervalInput = document.getElementById("filters-interval");
    if (intervalInput) {
      intervalInput.value = String(SCAN_INTERVAL_MS);
      intervalInput.readOnly = true;
      intervalInput.disabled = true;
      intervalInput.style.display = "none";
    }
  }

  function setAdvancedOptionsEnabled(enabled) {
    advancedOptionsEnabled = !!enabled;
    const toggleBtn = document.getElementById("ab2-options-toggle-btn");
    const controlsCard = document.getElementById("card-controls");
    if (toggleBtn) {
      toggleBtn.textContent = advancedOptionsEnabled ? "Options: ON" : "Options: OFF";
      toggleBtn.className = advancedOptionsEnabled ? "ab2-btn ab2-btn-green" : "ab2-btn ab2-btn-ghost";
      toggleBtn.style.display = "";
    }
    if (controlsCard) controlsCard.style.display = advancedOptionsEnabled ? "" : "none";

    // Keep all advanced cards hidden by default; user chooses a tab to open one.
    activeAdvancedCardId = null;
    hideAllAdvancedCards();
    const advancedRow = document.getElementById("ab2-main-controls-advanced-row");
    const requesterRow = document.getElementById("ab2-requester-row");
    const advancedDivider = document.getElementById("ab2-main-controls-advanced-divider");
    if (advancedRow) advancedRow.style.display = advancedOptionsEnabled ? "" : "none";
    if (requesterRow) requesterRow.style.display = advancedOptionsEnabled ? "" : "none";
    if (advancedDivider) advancedDivider.style.display = advancedOptionsEnabled ? "" : "none";

    const intervalInput = document.getElementById("filters-interval");
    if (intervalInput) {
      intervalInput.value = String(SCAN_INTERVAL_MS);
      intervalInput.readOnly = !advancedOptionsEnabled;
      intervalInput.disabled = !advancedOptionsEnabled;
      intervalInput.style.display = advancedOptionsEnabled ? "" : "none";
    }

    updateAdvancedTabButtons();

    if (!advancedOptionsEnabled && advancedOptionsIdleTimer) {
      clearTimeout(advancedOptionsIdleTimer);
      advancedOptionsIdleTimer = null;
    }
    if (advancedOptionsEnabled) {
      resetAdvancedOptionsIdleTimer();
      showMessage("Options ON. Use tabs to open only what you need.");
    }
  }

  function resetAdvancedOptionsIdleTimer() {
    if (!advancedOptionsEnabled) return;
    if (advancedOptionsIdleTimer) clearTimeout(advancedOptionsIdleTimer);
    advancedOptionsIdleTimer = setTimeout(() => {
      if (!advancedOptionsEnabled) return;
      setAdvancedOptionsEnabled(false);
      showMessage("Options auto OFF after 1 minute inactivity.");
    }, ADVANCED_OPTIONS_IDLE_MS);
  }

  function setupAdvancedOptionsIdleListeners() {
    const markActivity = () => {
      if (advancedOptionsEnabled) resetAdvancedOptionsIdleTimer();
    };
    document.addEventListener("click", markActivity, { passive: true });
    document.addEventListener("keydown", markActivity, { passive: true });
    document.addEventListener("pointerdown", markActivity, { passive: true });
    document.addEventListener("scroll", markActivity, { passive: true });
  }

  function setBlockInlineMessage(kind, msg, isError) {
    const id = kind === "add" ? "block-add-msg" : (kind === "remove" ? "block-remove-msg" : "temp-block-msg");
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#fca5a5" : "#86efac";
  }

  function parseBlockTarget(rawId) {
    const id = String(rawId || "").trim().toUpperCase();
    if (!id) return { ok: false, msg: "Enter Requester ID or Project ID." };
    if (REQUESTER_ID_REGEX.test(id)) return { ok: true, type: "requester", id };
    if (PROJECT_ID_REGEX.test(id)) return { ok: true, type: "project", id };
    return { ok: false, msg: "Invalid ID. Use valid Requester ID (A123...) or Project ID." };
  }

  function getTaskRequesterId(task) {
    return String(task?.requester_id || task?.requesterId || task?.project?.requester_id || task?.project?.requesterId || "").toUpperCase();
  }

  function getTaskProjectId(task) {
    return String(task?.hit_set_id || task?.project?.hit_set_id || extractProjectIdFromUrl(task?.project_tasks_url || task?.accept_project_task_url || task?.task_url || "") || "").toUpperCase();
  }

  function isTaskTempBlocked(task) {
    const requesterId = getTaskRequesterId(task);
    const projectId = getTaskProjectId(task);
    return tempBlockedRequesters.has(requesterId) || tempBlockedProjects.has(projectId);
  }

  function saveTempBlocks() {
    try {
      const payload = {
        requesters: Array.from(tempBlockedRequesters),
        projects: Array.from(tempBlockedProjects)
      };
      sessionStorage.setItem(TEMP_BLOCKS_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function loadTempBlocks() {
    try {
      const raw = sessionStorage.getItem(TEMP_BLOCKS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      tempBlockedRequesters = new Set(Array.isArray(parsed?.requesters) ? parsed.requesters.map(x => String(x || "").toUpperCase()) : []);
      tempBlockedProjects = new Set(Array.isArray(parsed?.projects) ? parsed.projects.map(x => String(x || "").toUpperCase()) : []);
    } catch (e) {
      tempBlockedRequesters = new Set();
      tempBlockedProjects = new Set();
    }
  }

  function forceTasksPageReload() {
    try { location.reload(); } catch (e) {}
    setTimeout(() => {
      const normalized = normalizeTasksUrl(location.href);
      if (!normalized || normalized !== location.href) {
        window.location.replace(TASKS_CANONICAL_URL);
      } else {
        window.location.assign(TASKS_CANONICAL_URL);
      }
    }, 450);
  }

  function isStartModeOn() {
    const timerBtn = document.getElementById("timer");
    return !!(timerBtn && timerBtn.textContent.includes("Stop"));
  }

  function updateStats() {
    const blockEl = document.getElementById('ab2-stat-blocked');
    const uptimeEl = document.getElementById('ab2-stat-uptime');
    if (blockEl) blockEl.textContent = (blockList.size + permanentBlockedProjects.size);
    if (uptimeEl) {
      const mins = Math.floor((Date.now() - sessionStartTime) / 60000);
      uptimeEl.textContent = mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
    }
  }

  function updateScriptRunState() {
    const statEl = document.getElementById("ab2-stat-status");
    if (!statEl) return;
    const running = !!(timerInterval || directFetchInterval);
    statEl.textContent = running ? "Running" : "Stopped";
    statEl.style.color = running ? "#14532d" : "#7f1d1d";
    statEl.style.fontWeight = "700";
    statEl.style.fontSize = "20px";
  }

  function playAcceptSound() {
    if (Date.now() < soundMutedUntil) return;
    safePlayAudio(acceptSound, "accept");
  }

  function playCaptchaSound() {
    safePlayAudio(captchaSound, "captcha");
  }

  async function loadBlockList() {
    try {
      const data = await fetchJSONViaGM("https://raw.githubusercontent.com/Vinylgeorge/400err/main/block_list.json?t=" + Date.now());
      blockList = new Set((data.block_list || []).map(x => String(x || "").toUpperCase()));
      permanentBlockedProjects = new Set((data.blocked_projects || []).map(x => String(x || "").toUpperCase()));
    } catch (err) {
      showMessage("Failed to load block list from the database");
    }
  }

  async function saveBlockList() {
    try {
      await GM.setValue("autoHitBL", JSON.stringify([...blockList]));
      await GM.setValue("autoHitBLProjects", JSON.stringify([...permanentBlockedProjects]));
      renderBlockList();
      showMessage("Loaded block list");
    } catch (err) {
      showMessage("Failed to save block list");
    }
  }

  async function loadGitHubBlockConfig() {
    const cfg = await fetchJSONViaGM(BLOCK_CFG_URL + "?t=" + Date.now());
    if (!cfg || !cfg.owner || !cfg.repo || !cfg.path || !cfg.branch || !cfg.token) {
      throw new Error("Config JSON missing required fields.");
    }
    return cfg;
  }

  async function loadGitHubBlockState(cfg) {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}`;
    const data = await fetchJSONViaGM(url, {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json"
    }, 15000);
    const decoded = atob(data.content);
    const parsed = JSON.parse(decoded);
    return {
      sha: data.sha,
      requesters: [...new Set((parsed.block_list || []).map(x => String(x || "").toUpperCase()))].sort(),
      projects: [...new Set((parsed.blocked_projects || []).map(x => String(x || "").toUpperCase()))].sort()
    };
  }

  async function writeGitHubBlockState(cfg, sha, requesters, projects, message) {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const content = btoa(JSON.stringify({
      block_list: requesters,
      blocked_projects: projects || []
    }, null, 2));
    const body = {
      message: message || "Update block_list.json via AB2soft tool",
      content,
      sha,
      branch: cfg.branch
    };
    const data = await putJSONViaGM(url, body, {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json"
    }, 20000);
    return data.content.sha;
  }

  async function addPermanentRemoteBlock(id) {
    const cfg = await loadGitHubBlockConfig();
    const state = await loadGitHubBlockState(cfg);
    const parsed = parseBlockTarget(id);
    if (!parsed.ok) return { ok: false, msg: parsed.msg };
    const upper = parsed.id;
    if (parsed.type === "requester" && state.requesters.includes(upper)) {
      const msg = "Requester ID " + upper + " is already blocked. If needed, unblock it.";
      showMessage(msg);
      return { ok: false, msg };
    }
    if (parsed.type === "project" && state.projects.includes(upper)) {
      const msg = "Project ID " + upper + " is already blocked. If needed, unblock it.";
      showMessage(msg);
      return { ok: false, msg };
    }
    if (parsed.type === "requester") state.requesters.push(upper); else state.projects.push(upper);
    state.requesters.sort();
    state.projects.sort();
    await writeGitHubBlockState(cfg, state.sha, state.requesters, state.projects, "Add permanent block ID");
    blockList = new Set(state.requesters);
    permanentBlockedProjects = new Set(state.projects);
    await saveBlockList();
    const msg = (parsed.type === "requester" ? "Requester ID " : "Project ID ") + upper + " blocked.";
    showMessage(msg);
    return { ok: true, msg };
  }

  async function removePermanentRemoteBlock(id) {
    const cfg = await loadGitHubBlockConfig();
    const state = await loadGitHubBlockState(cfg);
    const parsed = parseBlockTarget(id);
    if (!parsed.ok) return { ok: false, msg: parsed.msg };
    const upper = parsed.id;
    const source = parsed.type === "requester" ? state.requesters : state.projects;
    if (!source.includes(upper)) {
      const msg = (parsed.type === "requester" ? "Requester ID " : "Project ID ") + upper + " is not blocked.";
      showMessage(msg);
      return { ok: false, msg };
    }
    if (parsed.type === "requester") state.requesters = state.requesters.filter(x => x !== upper);
    else state.projects = state.projects.filter(x => x !== upper);
    await writeGitHubBlockState(cfg, state.sha, state.requesters, state.projects, "Remove permanent block ID");
    blockList = new Set(state.requesters);
    permanentBlockedProjects = new Set(state.projects);
    await saveBlockList();
    const msg = (parsed.type === "requester" ? "Requester ID " : "Project ID ") + upper + " unblocked.";
    showMessage(msg);
    return { ok: true, msg };
  }

  async function addRequesterToRemoteBlockList(id) { return addPermanentRemoteBlock(id); }
  async function removeRequesterFromRemoteBlockList(id) { return removePermanentRemoteBlock(id); }

  async function removeBlockItem(ev) {
    const id = ev.currentTarget?.id;
    if (id) {
      try {
        await removeRequesterFromRemoteBlockList(id);
      } catch (err) {
        showMessage("Failed to remove from remote block list: " + err.message);
      }
    }
  }

  async function directAcceptHit(url, allowRetryStart = true) {
    if (isDirectFetching) return;
    if (!navigator.onLine || document.hidden) return;
    const projectIdFromUrl = extractProjectIdFromUrl(url);
    if (projectIdFromUrl && permanentBlockedProjects.has(projectIdFromUrl)) {
      showMessage("Permanent block active for project " + projectIdFromUrl + ". Direct fetch skipped.");
      stopDirectFetcher();
      return;
    }
    if (projectIdFromUrl && tempBlockedProjects.has(projectIdFromUrl)) {
      showMessage("Temporary block active for project " + projectIdFromUrl + ". Direct fetch skipped.");
      stopDirectFetcher();
      return;
    }
    isDirectFetching = true;
    showMessage("Trying to accept: " + url);
    try {
      const res = await fetchTextViaGM(url, 10000);
      const htmlText = res.text || "";
      if (res.status === 422 || htmlText.includes("Unprocessable Entity")) {
        showMessage("Unprocessable Entity. Cooling down before retry...");
        if (allowRetryStart && (directModeActive || directFetchInterval)) {
          if (directFetchInterval) {
            clearInterval(directFetchInterval);
            directFetchInterval = null;
          }
          setTimeout(() => startDirectFetcher(url, INTERVALS.DIRECT_MODE_FETCH_MS), INTERVALS.UNPROCESSABLE_RETRY_MS + getJitterMs(700));
        }
        return;
      }
      const jobStatusEl = document.getElementById("jobstatus");
      if (jobStatusEl) jobStatusEl.innerText = htmlText + "\nJob URL: " + url;
      if (htmlText.includes('captcha') || htmlText.includes("To better protect your account")) {
        showMessage("CAPTCHA triggered. Opening validation page.");
        playCaptchaSound();
        openCaptchaTab();
        return;
      }
      if (htmlText.includes("Sign-In") || htmlText.includes("/ap/signin")) {
        showMessage("Login required. Opening sign-in page.");
        playCaptchaSound();
        openOrReuseTasksTab("https://worker.mturk.com/tasks/");
        return;
      }
      if (htmlText.includes("There are no more of these HITs available")) { showMessage("No more HITs available."); return; }
      if (htmlText.includes("You have exceeded the allowable page request rate")) {
        handleRateLimit("direct");
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const assignmentId = doc.querySelector("input[name=\"assignmentId\"]")?.value;
      const form = doc.querySelector("form[action*=\"submit\"]");
      if (assignmentId && assignmentId !== "ASSIGNMENT_ID_NOT_AVAILABLE" && form) {
        const now = Date.now();
        if (now - lastAcceptTime <= INTERVALS.SOUND_MUTE_GAP_MS) soundMutedUntil = now + INTERVALS.SOUND_MUTE_DURATION_MS;
        lastAcceptTime = now;
        resetRateLimitBackoff();
        sessionAccepted++;
        updateStats();
        resetDirectModeNoHitTimer();
        showMessage("HIT accepted!");
        const projectId = extractProjectIdFromUrl(url);
        addAcceptedHitToHistory("Untitled HIT", "UNKNOWN", projectId);
        playAcceptSound();
        openOrReuseAcceptedWorkTab(form.action.replace("w_wp_rtrn_top", "w_pl_prvw"));
        switchToAcceptedHitDirectFetcher(url);
      } else {
        showMessage("HIT not accepted (likely preview or expired).");
      }
    } catch (err) {
      showMessage("Error fetching HIT: " + err.message);
    } finally {
      isDirectFetching = false;
    }
  }

  function startDirectFetcher(url, intervalMs = INTERVALS.DIRECT_FETCH_MS) {
    const directUrl = toAbsoluteMturkUrl(url);
    if (!directUrl) {
      showMessage("Invalid direct URL.");
      return;
    }
    if (rateLimitResumeTimer) {
      clearTimeout(rateLimitResumeTimer);
      rateLimitResumeTimer = null;
    }
    if (directFetchInterval) {
      clearInterval(directFetchInterval);
      directFetchInterval = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    currentDirectFetchUrl = directUrl;
    lastConfiguredDirectFetchUrl = directUrl;
    directModeActive = true;
    const runEveryMs = Math.max(250, Number(intervalMs) || INTERVALS.DIRECT_FETCH_MS);
    directFetchInterval = setInterval(() => {
      if (navigator.onLine && !document.hidden && currentDirectFetchUrl) directAcceptHit(currentDirectFetchUrl);
    }, runEveryMs);
    resetDirectModeNoHitTimer();
    const intervalInput = document.getElementById("filters-interval");
    if (intervalInput) intervalInput.value = String(SCAN_INTERVAL_MS);
    const timerBtn = document.getElementById("timer");
    if (timerBtn) { timerBtn.innerHTML = "&#9724; Stop"; timerBtn.className = "ab2-btn ab2-btn-red"; }
    showMessage("Direct mode ON (" + runEveryMs + " ms).");
    updateStats();
    updateScriptRunState();
  }

  function stopDirectFetcher() {
    if (rateLimitResumeTimer) {
      clearTimeout(rateLimitResumeTimer);
      rateLimitResumeTimer = null;
    }
    if (directModeNoHitTimer) {
      clearTimeout(directModeNoHitTimer);
      directModeNoHitTimer = null;
    }
    directModeActive = false;
    if (directFetchInterval) {
      clearInterval(directFetchInterval); directFetchInterval = null; currentDirectFetchUrl = null;
      showMessage("Direct fetch stopped.");
    } else {
      showMessage("Direct fetch was not running.");
    }
    updateStats();
  }

  function toAbsoluteMturkUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    const normalize = (u) => u.replace("/tasks/accept_random.json", "/tasks/accept_random");
    if (raw.startsWith("https://worker.mturk.com")) return normalize(raw);
    if (raw.startsWith("/")) return normalize("https://worker.mturk.com" + raw);
    return "";
  }

  function ensureMainTimerRunningAtNormalSpeed() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!document.hidden) fetchTasksLoop();
    }, SCAN_INTERVAL_MS);
    const intervalInput = document.getElementById("filters-interval");
    if (intervalInput) intervalInput.value = String(SCAN_INTERVAL_MS);
    const timerBtn = document.getElementById("timer");
    if (timerBtn) { timerBtn.innerHTML = "&#9724; Stop"; timerBtn.className = "ab2-btn ab2-btn-red"; }
    updateScriptRunState();
  }

  function returnToNormalScanFromDirectMode() {
    if (!directModeActive && !directFetchInterval) return;
    if (directModeNoHitTimer) {
      clearTimeout(directModeNoHitTimer);
      directModeNoHitTimer = null;
    }
    directModeActive = false;
    if (directFetchInterval) {
      clearInterval(directFetchInterval);
      directFetchInterval = null;
      currentDirectFetchUrl = null;
    }
    ensureMainTimerRunningAtNormalSpeed();
    showMessage("No new HIT for 15s. Switched back to normal scan (800 ms).");
    updateStats();
  }

  function resetDirectModeNoHitTimer() {
    if (directModeNoHitTimer) clearTimeout(directModeNoHitTimer);
    directModeNoHitTimer = setTimeout(returnToNormalScanFromDirectMode, INTERVALS.DIRECT_MODE_WINDOW_MS);
  }

  function switchToAcceptedHitDirectFetcher(acceptUrl) {
    const directUrl = toAbsoluteMturkUrl(acceptUrl);
    if (!directUrl) return;
    startDirectFetcher(directUrl, INTERVALS.DIRECT_MODE_FETCH_MS);
    resetDirectModeNoHitTimer();
    showMessage("Accepted HIT detected. Boosted direct mode for " + Math.round(INTERVALS.DIRECT_MODE_WINDOW_MS / 1000) + "s.");
  }

  function renderMainPanel() {
    const panelHtml = `
    <div class="ab2-wrap">
      <div class="ab2-header">
        <div class="ab2-logo">MRPsoft V8.0 Pro</div>
        <span class="ab2-version">v6.8 &middot; 800ms</span>
      </div>

      <div class="ab2-stats">
        <div class="ab2-stat blue">
          <div class="ab2-stat-label">Status</div>
          <div class="ab2-stat-val" id="ab2-stat-status" style="font-size:20px;">Stopped</div>
        </div>
        <div class="ab2-stat red">
          <div class="ab2-stat-label">Blocked</div>
          <div class="ab2-stat-val" id="ab2-stat-blocked">0</div>
        </div>
        <div class="ab2-stat controls">
          <div class="ab2-stat-label">Controls</div>
          <div class="ab2-stat-actions">
            <button id="timer" class="ab2-btn ab2-btn-green">&#9654; Start</button>
            <button id="ab2-options-toggle-btn" class="ab2-btn ab2-btn-ghost">Options: OFF</button>
          </div>
        </div>
        <div class="ab2-stat">
          <div class="ab2-stat-label">Uptime</div>
          <div class="ab2-stat-val" id="ab2-stat-uptime">0m</div>
        </div>
      </div>

      <div class="ab2-card" id="card-controls">
        <div class="ab2-card-head">
          <div class="ab2-card-icon blue">&#9881;</div>
          <div class="ab2-card-title">Main Controls</div>
          <div class="ab2-card-arrow">&#9660;</div>
        </div>
        <div class="ab2-card-body">
          <div class="ab2-row" id="ab2-main-controls-advanced-row">
            <div class="ab2-field"><div class="ab2-field-label">Min Reward ($)</div><input class="ab2-input" id="filters-min-reward" value="0.00" min="0" step="0.01" type="number" style="width:100px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">Interval (ms)</div><input class="ab2-input" id="filters-interval" value="800" min="100" step="100" type="number" style="width:100px;"></div>
          </div>
          <div class="ab2-row" id="ab2-advanced-tabs" style="display:none;gap:8px;margin-top:8px;">
            <button id="tab-blocked-btn" class="ab2-btn ab2-btn-ghost" style="padding:7px 12px;">Blocked</button>
            <button id="tab-hits-btn" class="ab2-btn ab2-btn-ghost" style="padding:7px 12px;">HITs</button>
            <button id="tab-tools-btn" class="ab2-btn ab2-btn-ghost" style="padding:7px 12px;">Tools</button>
            <button id="tab-presets-btn" class="ab2-btn ab2-btn-ghost" style="padding:7px 12px;">Presets</button>
            <button id="tab-values-btn" class="ab2-btn ab2-btn-ghost" style="padding:7px 12px;">Values</button>
          </div>
          <div class="ab2-divider" id="ab2-main-controls-advanced-divider"></div>
          <div class="ab2-row" id="ab2-requester-row">
            <div class="ab2-field"><div class="ab2-field-label">Enter Requester ID / Project ID</div><input class="ab2-input" id="add-block-list" value="" type="text" placeholder="A12... or Project ID" style="width:200px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="Reqid" class="ab2-btn ab2-btn-blue">Add</button></div>
          </div>
        </div>
      </div>

      <div class="ab2-card" id="card-blocked">
        <div class="ab2-card-head">
          <div class="ab2-card-icon red">&#10006;</div>
          <div class="ab2-card-title">BLOCK/UNBLOCK Requester</div>
          <div class="ab2-card-arrow">&#9660;</div>
        </div>
        <div class="ab2-card-body">
          <div class="ab2-row">
            <div class="ab2-field"><div class="ab2-field-label">Add Permanent ID</div><input class="ab2-input" id="block-add-id" type="text" placeholder="Requester ID or Project ID" style="width:220px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="block-add-btn" class="ab2-btn ab2-btn-blue">Block</button></div>
            <div class="ab2-field"><div class="ab2-field-label">Remove Permanent ID</div><input class="ab2-input" id="block-remove-id" type="text" placeholder="Requester ID or Project ID" style="width:220px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="block-remove-btn" class="ab2-btn ab2-btn-red">Unblock</button></div>
          </div>
          <div class="ab2-row" style="margin-top:6px;">
            <div id="block-add-msg" style="font-size:12px;min-height:16px;flex:1;"></div>
            <div id="block-remove-msg" style="font-size:12px;min-height:16px;flex:1;"></div>
          </div>
          <div class="ab2-divider"></div>
          <div class="ab2-row">
            <div class="ab2-field"><div class="ab2-field-label">Temporary Block (Requester ID / Project ID)</div><input class="ab2-input" id="temp-block-id" type="text" placeholder="A12... or Project ID" style="width:240px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="temp-block-btn" class="ab2-btn ab2-btn-blue">Temp Block</button></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="temp-unblock-btn" class="ab2-btn ab2-btn-red">Temp Unblock</button></div>
          </div>
          <div class="ab2-row" style="margin-top:6px;">
            <div id="temp-block-msg" style="font-size:12px;min-height:16px;flex:1;"></div>
          </div>
          <div class="ab2-divider"></div>
          <div style="color:#94a3b8;font-size:12px;">Requester list is hidden. Use Unblock input to remove IDs.</div>
          <div id="block-list" class="ab2-block-tags" style="display:none;"></div>
        </div>
      </div>

      <div class="ab2-card" id="card-hits">
        <div class="ab2-card-head">
          <div class="ab2-card-icon green">&#9733;</div>
          <div class="ab2-card-title">HIT Groups</div>
          <a href="#" id="clear-tasks" class="ab2-link" style="margin-left:auto;margin-right:12px;">Clear</a>
          <div class="ab2-card-arrow">&#9733;</div>
        </div>
        <div class="ab2-card-body">
          <div id="hit-groups-history" style="font-size:12px;color:&#9733;"></div>
        </div>
      </div>

      <div class="ab2-card" id="card-tools">
        <div class="ab2-card-head">
          <div class="ab2-card-icon purple">&#9881;</div>
          <div class="ab2-card-title">Tools</div>
          <div class="ab2-card-arrow">&#9660;</div>
        </div>
        <div class="ab2-card-body">
          <div class="ab2-row">
            <button id="captcha-btn" class="ab2-btn ab2-btn-blue">CAPTCHA</button>
            <button id="stop-direct-btn" class="ab2-btn ab2-btn-red">Stop Direct</button>
          </div>
        </div>
      </div>

      <div class="ab2-card" id="card-presets">
        <div class="ab2-card-head">
          <div class="ab2-card-icon amber">&#9733;</div>
          <div class="ab2-card-title">Requester Presets</div>
          <div class="ab2-card-arrow">&#9660;</div>
        </div>
        <div class="ab2-card-body">
          <div class="ab2-chip-grid" id="preset-chips">
            <button id="panel-btn" class="ab2-chip">Carelin</button>
            <button id="mld-btn" class="ab2-chip">MLData</button>
            <button id="mturk-prod-btn" class="ab2-chip">Javan Martin</button>
            <button id="martin-btn" class="ab2-chip">Martin</button>
            <button id="brex-btn" class="ab2-chip">Wvp</button>
            <button id="purple-btn" class="ab2-chip">Purple</button>
            <button id="receipt-processing-btn" class="ab2-chip">Receipt</button>
          </div>
          <div class="ab2-divider"></div>
          <div class="ab2-row">
            <div class="ab2-field"><div class="ab2-field-label">Preset Name</div><input class="ab2-input" id="custom-preset-name" type="text" placeholder="e.g. My Requester" style="width:160px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">Requester ID</div><input class="ab2-input" id="custom-preset-id" type="text" placeholder="A12ABCD34EF56" style="width:200px;"></div>
            <div class="ab2-field"><div class="ab2-field-label">&nbsp;</div><button id="add-preset-btn" class="ab2-btn ab2-btn-blue">+ Add Preset</button></div>
          </div>
        </div>
      </div>

      <div class="ab2-card" id="card-values">
        <div class="ab2-card-head">
          <div class="ab2-card-icon cyan">$</div>
          <div class="ab2-card-title">Value Filters</div>
          <div class="ab2-card-arrow">&#9660;</div>
        </div>
        <div class="ab2-card-body">
          <div class="ab2-chip-grid">
            <button id="value-003-btn" class="ab2-chip">$0.03</button>
            <button id="value-005-btn" class="ab2-chip">$0.05</button>
            <button id="value-006-btn" class="ab2-chip">$0.06</button>
            <button id="value-010-btn" class="ab2-chip">$0.10</button>
            <button id="value-025-btn" class="ab2-chip">$0.25</button>
            <button id="value-100-btn" class="ab2-chip">$1.00</button>
          </div>
          <div class="ab2-divider"></div>
          <div class="ab2-row">
            <div class="ab2-field">
              <div class="ab2-field-label">Custom Value</div>
              <input class="ab2-input" id="custom-value-input" type="text" placeholder="e.g. 0.07" style="width:120px;">
            </div>
            <div class="ab2-field">
              <div class="ab2-field-label">&nbsp;</div>
              <button id="add-value-btn" class="ab2-btn ab2-btn-blue">+ Add Value</button>
            </div>
          </div>
          <div id="custom-value-chips" class="ab2-chip-grid" style="margin-top:8px;"></div>
        </div>
      </div>

      <div class="ab2-card" id="card-status">
        <div class="ab2-card-head">
          <div class="ab2-card-icon blue">&#128221;</div>
          <div class="ab2-card-title">Status</div>
        </div>
        <div class="ab2-card-body">
          <div id="message-display" class="ab2-msg-box"></div>

        </div>
      </div>

      <table style="width:100%;margin-top:12px;">
        <tbody id="tasks"></tbody>
      </table>
    </div>`;

    const mainContent = document.getElementById("MainContent");
    if (mainContent) mainContent.innerHTML = panelHtml;

    document.getElementById("timer").onclick = () => { toggleMainTimer(); };
    document.getElementById("ab2-options-toggle-btn").onclick = () => {
      setAdvancedOptionsEnabled(!advancedOptionsEnabled);
      showMessage(advancedOptionsEnabled ? "All options enabled." : "Minimal mode enabled.");
    };
    ADVANCED_TABS.forEach(({ btnId, cardId }) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.onclick = () => {
        toggleAdvancedCard(cardId);
      };
    });
    document.getElementById("Reqid").onclick = () => {
      let inputVal = document.getElementById("add-block-list").value.trim();
      if (!inputVal) { alert("Please enter Requester ID or Project ID"); return; }
      if (!isStartModeOn()) {
        showMessage("Start button is OFF. Click Start to run requester/project input.");
        return;
      }
      if (REQUESTER_ID_REGEX.test(inputVal)) {
        setRequesterFetchURL("https://worker.mturk.com/requesters/" + inputVal + "/projects?format=json");
        return;
      }
      if (PROJECT_ID_REGEX.test(inputVal)) {
        startDirectFetcher("https://worker.mturk.com/projects/" + inputVal + "/tasks/accept_random?ref=w_pl_prvw", INTERVALS.DIRECT_MODE_FETCH_MS);
        return;
      }
      alert("Invalid ID format. Enter valid Requester ID (A123...) or Project ID.");
    };
    document.getElementById('clear-tasks').onclick = function (e) {
      e.preventDefault();
      const tasks = document.getElementById("tasks");
      if (tasks) tasks.innerHTML = '';
      hitGroupHistory = [];
      renderHitGroupHistory();
      saveHitGroupHistory();
      showMessage("Clear Tasks");
    };
    document.getElementById('captcha-btn').onclick = () => { openCaptchaTab(); showMessage("Open CAPTCHA"); };
    document.getElementById('stop-direct-btn').onclick = stopDirectFetcher;
    document.getElementById("panel-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A45NRN4A6TJ14/projects?format=json"); showMessage("Fetching: Carelinx"); };
    document.getElementById("mturk-prod-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A13RN3XLOTM8EM/projects?format=json"); showMessage("Fetching: Javan Martin"); };
    document.getElementById("martin-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A36PE75QWXRPJ9/projects?format=json"); showMessage("Fetching: Martin"); };
    document.getElementById("mld-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A3K5D5S00LCHBB/projects?format=json"); showMessage("Fetching: MLData"); };
    document.getElementById("brex-btn").onclick = () => { setRequesterFetchURL('https://worker.mturk.com/requesters/A364WMN0XT1D3N/projects?format=json'); showMessage("Fetching: Wvp"); };
    document.getElementById("purple-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A1B0ZPH77KQTWM/projects?format=json"); showMessage("Fetching: Purple"); };
    document.getElementById("receipt-processing-btn").onclick = () => { setRequesterFetchURL("https://worker.mturk.com/requesters/A2GGM9CS2W3J65/projects?format=json"); showMessage("Fetching: Receipt"); };

    const valueUrls = { "value-003-btn": "0.03", "value-005-btn": "0.05", "value-006-btn": "0.06", "value-010-btn": "0.10", "value-025-btn": "0.25", "value-100-btn": "1" };
    for (const [btnId, value] of Object.entries(valueUrls)) {
      document.getElementById(btnId).onclick = () => { openPreviewAndClose(VALUE_FILTER_BASE_URL + value); showMessage("Value: $" + value); };
    }
    document.getElementById("block-add-btn").onclick = async () => {
      const id = (document.getElementById("block-add-id")?.value || "").trim().toUpperCase();
      const parsed = parseBlockTarget(id);
      if (!parsed.ok) {
        setBlockInlineMessage("add", parsed.msg, true);
        return;
      }
      try {
        const result = await addPermanentRemoteBlock(parsed.id);
        setBlockInlineMessage("add", result.msg, !result.ok);
        if (result.ok) {
          document.getElementById("block-add-id").value = "";
          forceTasksPageReload();
        }
      } catch (err) {
        setBlockInlineMessage("add", "Failed to block requester: " + err.message, true);
      }
    };
    document.getElementById("block-remove-btn").onclick = async () => {
      const id = (document.getElementById("block-remove-id")?.value || "").trim().toUpperCase();
      const parsed = parseBlockTarget(id);
      if (!parsed.ok) {
        setBlockInlineMessage("remove", parsed.msg, true);
        return;
      }
      try {
        const result = await removePermanentRemoteBlock(parsed.id);
        setBlockInlineMessage("remove", result.msg, !result.ok);
        if (result.ok) {
          document.getElementById("block-remove-id").value = "";
          forceTasksPageReload();
        }
      } catch (err) {
        setBlockInlineMessage("remove", "Failed to unblock requester: " + err.message, true);
      }
    };
    document.getElementById("temp-block-btn").onclick = () => {
      const parsed = parseBlockTarget(document.getElementById("temp-block-id")?.value);
      if (!parsed.ok) {
        setBlockInlineMessage("temp", parsed.msg, true);
        return;
      }
      if (parsed.type === "requester") {
        tempBlockedRequesters.add(parsed.id);
        setBlockInlineMessage("temp", "Temporary block added for Requester ID " + parsed.id, false);
      } else {
        tempBlockedProjects.add(parsed.id);
        setBlockInlineMessage("temp", "Temporary block added for Project ID " + parsed.id, false);
      }
      saveTempBlocks();
      document.getElementById("temp-block-id").value = "";
      showMessage("Temporary block active.");
      forceTasksPageReload();
    };
    document.getElementById("temp-unblock-btn").onclick = () => {
      const parsed = parseBlockTarget(document.getElementById("temp-block-id")?.value);
      if (!parsed.ok) {
        setBlockInlineMessage("temp", parsed.msg, true);
        return;
      }
      let removed = false;
      if (parsed.type === "requester") {
        removed = tempBlockedRequesters.delete(parsed.id);
      } else {
        removed = tempBlockedProjects.delete(parsed.id);
      }
      if (removed) saveTempBlocks();
      setBlockInlineMessage(
        "temp",
        removed ? ("Temporary unblock done for " + parsed.type + " ID " + parsed.id) : ("ID " + parsed.id + " was not in temporary block list."),
        !removed
      );
      document.getElementById("temp-block-id").value = "";
    };
    document.getElementById("add-preset-btn").onclick = addCustomPreset;
    document.getElementById("add-value-btn").onclick = addCustomValueFilter;
    renderBlockList();
    loadCustomPresets();
    loadCustomValueFilters();
    loadHitGroupHistory();
    updateStats();
    updateScriptRunState();
  }

  async function loadCustomPresets() {
    try {
      const saved = await GM.getValue("ab2CustomPresets", "[]");
      const presets = JSON.parse(saved);
      for (const p of presets) renderCustomPresetChip(p.name, p.id, p.type || 'requester');
    } catch (e) { console.error("Failed to load custom presets", e); }
  }

  async function saveCustomPresets() {
    const chips = document.querySelectorAll('.ab2-custom-preset');
    const presets = [];
    chips.forEach(chip => { presets.push({ name: chip.dataset.name, id: chip.dataset.rid, type: chip.dataset.type || 'requester' }); });
    await GM.setValue("ab2CustomPresets", JSON.stringify(presets));
  }

  function renderCustomPresetChip(name, id, type) {
    const grid = document.getElementById("preset-chips");
    if (!grid) return;
    const btn = document.createElement("button");
    btn.className = "ab2-chip ab2-custom-preset";
    btn.dataset.name = name;
    btn.dataset.rid = id;
    btn.dataset.type = type || 'requester';
    btn.innerHTML = name + ' <span style="opacity:0.5;margin-left:4px;font-size:10px;" title="Remove preset">&times;</span>';
    btn.onclick = (e) => {
      if (e.target.tagName === 'SPAN') {
        btn.remove();
        saveCustomPresets();
        showMessage("Removed preset: " + name);
        return;
      }
      if (!isStartModeOn()) {
        showMessage("Start button is OFF. Click Start to run preset: " + name);
        return;
      }
      if (btn.dataset.type === 'project') {
        startDirectFetcher(buildAcceptRandomUrl(id), INTERVALS.DIRECT_MODE_FETCH_MS);
        showMessage("Direct mode started for project preset: " + name);
      } else {
        setRequesterFetchURL("https://worker.mturk.com/requesters/" + id + "/projects?format=json");
        showMessage("Fetching: " + name);
      }
    };
    grid.appendChild(btn);
  }

  function addCustomPreset() {
    const nameInput = document.getElementById("custom-preset-name");
    const idInput = document.getElementById("custom-preset-id");
    const name = nameInput?.value.trim();
    const inputId = idInput?.value.trim();
    if (!name) { alert("Please enter a preset name."); return; }
    if (!inputId) { alert("Please enter a Requester ID."); return; }
    const requesterRegex = /^A[0-9A-Z]{12,15}$/;
    if (!requesterRegex.test(inputId)) {
      alert("Invalid ID format. Enter a valid Requester ID (A123...).");
      return;
    }
    renderCustomPresetChip(name, inputId, 'requester');
    saveCustomPresets();
    nameInput.value = '';
    idInput.value = '';
    showMessage("Added preset: " + name + " (" + inputId + ")");
  }

  function normalizeValueFilter(raw) {
    const value = String(raw || "").trim().replace(/^\$/, "");
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num.toFixed(2);
  }

  function renderCustomValueChip(value) {
    const grid = document.getElementById("custom-value-chips");
    if (!grid) return;
    const normalized = normalizeValueFilter(value);
    if (!normalized) return;
    if (grid.querySelector('[data-value="' + normalized + '"]')) return;

    const btn = document.createElement("button");
    btn.className = "ab2-chip";
    btn.dataset.value = normalized;
    btn.innerHTML = "$" + normalized + ' <span style="opacity:0.6;margin-left:4px;font-size:10px;" title="Remove value filter">&times;</span>';
    btn.onclick = (e) => {
      if (e.target.tagName === "SPAN") {
        btn.remove();
        saveCustomValueFilters();
        showMessage("Removed value filter: $" + normalized);
        return;
      }
      openPreviewAndClose(VALUE_FILTER_BASE_URL + normalized);
      showMessage("Value: $" + normalized);
    };
    grid.appendChild(btn);
  }

  async function loadCustomValueFilters() {
    try {
      const saved = await GM.getValue(CUSTOM_VALUE_FILTERS_KEY, "[]");
      const values = JSON.parse(saved);
      values.forEach(renderCustomValueChip);
    } catch (e) {
      console.error("Failed to load custom value filters", e);
    }
  }

  async function saveCustomValueFilters() {
    const chips = document.querySelectorAll("#custom-value-chips .ab2-chip");
    const values = Array.from(chips).map(chip => chip.dataset.value).filter(Boolean);
    await GM.setValue(CUSTOM_VALUE_FILTERS_KEY, JSON.stringify(values));
  }

  async function addCustomValueFilter() {
    const input = document.getElementById("custom-value-input");
    const normalized = normalizeValueFilter(input?.value);
    if (!normalized) {
      showMessage("Invalid custom value. Enter a number like 0.07");
      return;
    }
    renderCustomValueChip(normalized);
    await saveCustomValueFilters();
    if (input) input.value = "";
    showMessage("Added custom value filter: $" + normalized);
  }

  function extractProjectIdFromUrl(url) {
    const match = String(url || "").match(/\/projects\/([A-Z0-9]{10,50})\//i);
    return match ? match[1].toUpperCase() : "";
  }

  function buildAcceptRandomUrl(projectId) {
    return "https://worker.mturk.com/projects/" + projectId + "/tasks/accept_random?ref=w_pl_prvw";
  }

  function renderHitGroupHistory() {
    const el = document.getElementById("hit-groups-history");
    if (!el) return;
    if (!hitGroupHistory.length) {
      el.innerHTML = '<span style="color:&#9733;">No accepted HIT groups yet.</span>';
      return;
    }
    el.innerHTML = hitGroupHistory.map(item => {
      const title = (item.title || "Untitled HIT").replace(/</g, "&lt;");
      const requesterId = (item.requesterId || "UNKNOWN").replace(/</g, "&lt;");
      const projectId = item.projectId;
      return (
        '<div style="display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px;">' +
          '<span style="overflow:hidden;text-overflow:ellipsis;">' + title + '</span>' +
          '<span style="color:#94a3b8;">|</span>' +
          '<button class="ab2-chip" data-copy-requester="' + requesterId + '" style="padding:3px 10px;">' + requesterId + '</button>' +
          '<button class="ab2-btn ab2-btn-ghost" data-copy-hit-url="' + projectId + '" style="padding:4px 10px;">Copy HIT URL</button>' +
        '</div>'
      );
    }).join("");

    el.querySelectorAll("[data-copy-requester]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-copy-requester");
        try {
          await navigator.clipboard.writeText(id);
          showMessage("Copied Requester ID: " + id);
        } catch (e) {
          showMessage("Failed to copy Requester ID.");
        }
      };
    });
    el.querySelectorAll("[data-copy-hit-url]").forEach(btn => {
      btn.onclick = async () => {
        const projectId = btn.getAttribute("data-copy-hit-url");
        const url = buildAcceptRandomUrl(projectId);
        try {
          await navigator.clipboard.writeText(url);
          showMessage("Copied HIT URL.");
        } catch (e) {
          showMessage("Failed to copy HIT URL.");
        }
      };
    });
  }

  async function saveHitGroupHistory() {
    await GM.setValue(HIT_HISTORY_KEY, JSON.stringify(hitGroupHistory));
  }

  async function loadHitGroupHistory() {
    try {
      const raw = await GM.getValue(HIT_HISTORY_KEY, "[]");
      const list = JSON.parse(raw);
      const now = Date.now();
      hitGroupHistory = (Array.isArray(list) ? list : [])
        .filter(x => x && x.projectId && x.acceptedAt && (now - x.acceptedAt) <= HIT_HISTORY_TTL_MS)
        .slice(0, HIT_HISTORY_MAX);
      renderHitGroupHistory();
      await saveHitGroupHistory();
    } catch (e) {
      hitGroupHistory = [];
      renderHitGroupHistory();
    }
  }

  async function addAcceptedHitToHistory(title, requesterId, projectId) {
    if (!projectId) return;
    const now = Date.now();
    const item = {
      title: title || "Untitled HIT",
      requesterId: (requesterId || "UNKNOWN").toUpperCase(),
      projectId: projectId.toUpperCase(),
      acceptedAt: now
    };
    hitGroupHistory = hitGroupHistory.filter(x => x.projectId !== item.projectId && (now - x.acceptedAt) <= HIT_HISTORY_TTL_MS);
    hitGroupHistory.unshift(item);
    if (hitGroupHistory.length > HIT_HISTORY_MAX) hitGroupHistory = hitGroupHistory.slice(0, HIT_HISTORY_MAX);
    renderHitGroupHistory();
    await saveHitGroupHistory();
  }

  function renderBlockList() {
    const container = document.getElementById("block-list");
    if (!container) return;
    const fragment = document.createDocumentFragment();
    for (const id of blockList) {
      const span = document.createElement("span");
      span.id = id;
      span.className = "ab2-block-tag";
      span.innerHTML = id + ' <span class="x">&times;</span>';
      span.title = "Click to unblock";
      span.onclick = removeBlockItem;
      fragment.appendChild(span);
    }
    container.innerHTML = '';
    container.appendChild(fragment);
    updateStats();
  }

  function toggleMainTimer() {
    if (timerInterval || directFetchInterval) {
      if (rateLimitResumeTimer) { clearTimeout(rateLimitResumeTimer); rateLimitResumeTimer = null; }
      clearInterval(timerInterval);
      clearInterval(acceptedHitsInterval);
      clearInterval(directFetchInterval);
      if (directModeNoHitTimer) { clearTimeout(directModeNoHitTimer); directModeNoHitTimer = null; }
      directModeActive = false;
      timerInterval = null;
      acceptedHitsInterval = null;
      directFetchInterval = null;
      currentDirectFetchUrl = null;
      showMessage("Timer stopped");
      const timerBtn = document.getElementById("timer");
      if (timerBtn) { timerBtn.innerHTML = "&#9654; Start"; timerBtn.className = "ab2-btn ab2-btn-green"; }
    } else {
      if (rateLimitResumeTimer) { clearTimeout(rateLimitResumeTimer); rateLimitResumeTimer = null; }
      resetRateLimitBackoff();
      const intervalInput = document.getElementById("filters-interval");
      if (intervalInput) intervalInput.value = String(SCAN_INTERVAL_MS);
      showMessage("Timer started (800 ms)");
      timerInterval = setInterval(() => {
        if (!document.hidden) fetchTasksLoop();
      }, SCAN_INTERVAL_MS);
      const timerBtn = document.getElementById("timer");
      if (timerBtn) { timerBtn.innerHTML = "&#9724; Stop"; timerBtn.className = "ab2-btn ab2-btn-red"; }
    }
    updateStats();
    updateScriptRunState();
  }

  function setRequesterFetchURL(url) {
    if (url && url.startsWith("https://worker.mturk.com")) {
      let normalizedUrl = url;
      try {
        const parsed = new URL(url);
        const path = parsed.pathname.toLowerCase();
        const isProjectsEndpoint = path === "/projects" || /\/requesters\/[a-z0-9]+\/projects\/?$/i.test(path);
        if (isProjectsEndpoint) {
          // Always pin sort for project feeds so it never falls back to "most HITs".
          parsed.searchParams.set("sort", NEWEST_SORT_VALUE);
          if (!parsed.searchParams.get("format")) parsed.searchParams.set("format", "json");
        }
        normalizedUrl = parsed.toString();
      } catch (e) {
        normalizedUrl = url;
      }
      fetchUrl = normalizedUrl;
      showMessage("Fetch URL: " + fetchUrl);
      const tasks = document.getElementById("tasks");
      if (tasks) tasks.innerHTML = '';
    } else {
      showMessage("Invalid URL. Must start with: https://worker.mturk.com");
    }
  }

  function getJitterMs(maxJitter = INTERVALS.RETRY_JITTER_MS) {
    return Math.floor(Math.random() * (Math.max(0, maxJitter) + 1));
  }

  function resetRateLimitBackoff() {
    rateLimitBackoffMs = INTERVALS.RATE_LIMIT_RETRY_MS;
  }

  function pruneProjectAttemptCache(now = Date.now()) {
    const ttl = INTERVALS.PROJECT_ACCEPT_COOLDOWN_MS * 5;
    for (const [projectId, ts] of recentProjectAcceptAttempts.entries()) {
      if ((now - ts) > ttl) recentProjectAcceptAttempts.delete(projectId);
    }
  }

  function openCaptchaTab(force = false) {
    const now = Date.now();
    if (!force && (now - lastCaptchaTime) < INTERVALS.CAPTCHA_COOLDOWN_MS) return;
    lastCaptchaTime = now;
    const win = window.open("https://worker.mturk.com/errors/validateCaptcha", '_blank');
    setTimeout(() => { if (win) win.close(); }, INTERVALS.CAPTCHA_TAB_TIMEOUT_MS);
  }

  function handleRateLimit(source = "scan") {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (directFetchInterval) { clearInterval(directFetchInterval); directFetchInterval = null; }
    if (directModeNoHitTimer) { clearTimeout(directModeNoHitTimer); directModeNoHitTimer = null; }
    directModeActive = false;
    if (rateLimitResumeTimer) {
      clearTimeout(rateLimitResumeTimer);
      rateLimitResumeTimer = null;
    }
    const waitMs = Math.min(rateLimitBackoffMs + getJitterMs(1200), INTERVALS.RATE_LIMIT_MAX_BACKOFF_MS);
    rateLimitBackoffMs = Math.min(rateLimitBackoffMs * 2, INTERVALS.RATE_LIMIT_MAX_BACKOFF_MS);
    const resumeDirectUrl = currentDirectFetchUrl || lastConfiguredDirectFetchUrl;
    const shouldResumeDirect = source === "direct" && !!resumeDirectUrl;
    const intervalInput = document.getElementById("filters-interval");
    if (intervalInput) intervalInput.value = String(SCAN_INTERVAL_MS);
    showMessage("Rate limit hit. Cooling down for " + Math.ceil(waitMs / 1000) + "s.");
    rateLimitResumeTimer = setTimeout(() => {
      rateLimitResumeTimer = null;
      if (shouldResumeDirect && resumeDirectUrl) {
        startDirectFetcher(resumeDirectUrl, INTERVALS.DIRECT_FETCH_MS);
      } else {
        ensureMainTimerRunningAtNormalSpeed();
      }
      updateScriptRunState();
    }, waitMs);
    updateScriptRunState();
  }

  async function fetchTasksLoop() {
    if (isFetchingTasks || document.hidden) return;
    isFetchingTasks = true;
showMessage("Fetching new tasks...");
    if (ab2_fetchWatchdog) clearTimeout(ab2_fetchWatchdog);
    ab2_fetchWatchdog = setTimeout(() => {
      if (isFetchingTasks) {
        console.log("[AB2soft] Fetch stuck 25s – opening captcha tab");
        openCaptchaTab();
      }
    }, INTERVALS.FETCH_STUCK_MS);
    let delay = INTERVALS.RETRY_INITIAL_MS;
    let attempt = 0;
    const doFetch = async () => {
      let willRetry = false;
      try {
        const data = await fetchJSONviaGM(fetchUrl);
        resetRateLimitBackoff();
        try {
          await processFetchedTasks(data);
        } catch (procErr) {
          console.error("Process error:", procErr);
          showMessage("Error processing. Flow continues.");
        }
      } catch (err) {
        if (String(err?.message || "").includes("CAPTCHA")) {
          showMessage("CAPTCHA detected. Opening validation page.");
          showDebug("Fetch failed: CAPTCHA challenge.");
          openCaptchaTab();
          return;
        }
        if (String(err?.message || "").includes("RATE_LIMIT")) {
          showDebug("Fetch failed: RATE_LIMIT.");
          handleRateLimit("scan");
          return;
        }
        if (attempt < INTERVALS.RETRY_MAX_ATTEMPTS) {
          delay = Math.min(delay * 2, INTERVALS.RETRY_MAX_MS);
          attempt++;
          willRetry = true;
          const waitMs = delay + getJitterMs();
          showMessage("Retry " + attempt + "/" + INTERVALS.RETRY_MAX_ATTEMPTS + " in " + (waitMs / 1000).toFixed(1) + "s");
          showDebug("Retry " + attempt + " scheduled in " + (waitMs / 1000).toFixed(1) + "s.");
          setTimeout(doFetch, waitMs);
        } else {
          showMessage("Max retries reached. Flow continues.");
          showDebug("Max retries reached in fetch loop.");
        }
      } finally {
        if (!willRetry) {
          isFetchingTasks = false;
          if (ab2_fetchWatchdog) { clearTimeout(ab2_fetchWatchdog); ab2_fetchWatchdog = null; }
        }
      }
    };
    doFetch();
  }

  async function processAcceptQueue(tasks) {
    const concurrency = Math.max(1, INTERVALS.ACCEPT_QUEUE_CONCURRENCY);
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      await Promise.allSettled(batch.map((task) => {
        const projectId = getTaskProjectId(task);
        if (projectId) recentProjectAcceptAttempts.set(projectId, Date.now());
        return acceptTaskFromList(task);
      }));
      if (i + concurrency < tasks.length) {
        await new Promise(r => setTimeout(r, 80 + getJitterMs(140)));
      }
    }
  }

  async function processFetchedTasks(data) {
    const results = data.results || [];
    const now = Date.now();
    pruneProjectAttemptCache(now);
    const diag = {
      total: results.length,
      noAssignable: 0,
      blockedRequester: 0,
      blockedProject: 0,
      tempBlocked: 0,
      cooldown: 0,
      missingAcceptUrl: 0
    };
    const assignable = results.filter(t => {
      if (!(t.assignable_hits_count > 0)) {
        diag.noAssignable++;
        return false;
      }
      const requesterId = getTaskRequesterId(t);
      if (blockList.has(requesterId)) {
        diag.blockedRequester++;
        return false;
      }
      const projectId = getTaskProjectId(t);
      if (permanentBlockedProjects.has(projectId)) {
        diag.blockedProject++;
        return false;
      }
      if (isTaskTempBlocked(t)) {
        diag.tempBlocked++;
        return false;
      }
      if (!t.accept_project_task_url) {
        diag.missingAcceptUrl++;
        return false;
      }
      if (projectId) {
        const lastAttemptAt = recentProjectAcceptAttempts.get(projectId) || 0;
        if ((now - lastAttemptAt) < INTERVALS.PROJECT_ACCEPT_COOLDOWN_MS) {
          diag.cooldown++;
          return false;
        }
      }
      return true;
    });
    assignable.sort((a, b) => {
      const ra = Number(a?.monetary_reward?.amount_in_dollars || 0);
      const rb = Number(b?.monetary_reward?.amount_in_dollars || 0);
      return rb - ra;
    });
    showMessage("Processing " + assignable.length + " tasks...");
        await processAcceptQueue(assignable);
  }

  async function acceptTaskFromList(task) {
    showMessage("Accepting: " + task.title);
    const url = "https://worker.mturk.com" + task.accept_project_task_url;
    try {
      const doc = await fetchHTMLviaGM(url);
      const captchaImg = doc.querySelector("img[src^=\"https://images-na.ssl-images-amazon.com/\"]");
      if (captchaImg) {
        showMessage("CAPTCHA detected while accepting. Opening validation page.");
        openCaptchaTab();
        playCaptchaSound();
        return;
      }
      const assignmentId = doc.querySelector("input[name=\"assignmentId\"]")?.value;
      const submitForm = doc.querySelector("form[action*=\"submit\"]") || doc.getElementsByTagName("form")[0];
      const accepted = (assignmentId && assignmentId !== "ASSIGNMENT_ID_NOT_AVAILABLE" && submitForm) ||
        doc.querySelector("div.task-project-title");
      if (accepted) {
        hasAcceptedAnyHit = true;
        task.isAccepted = true;
        const now = Date.now();
        if (now - lastAcceptTime <= INTERVALS.SOUND_MUTE_GAP_MS) soundMutedUntil = now + INTERVALS.SOUND_MUTE_DURATION_MS;
        lastAcceptTime = now;
        resetRateLimitBackoff();
        sessionAccepted++;
        updateStats();
        startAcceptedPanelPolling();
        setUiPage("accepted");
        showMessage("Accepted: " + task.hit_set_id + ", " + task.title);
        renderAcceptedTaskRow(task);
        const projectId = extractProjectIdFromUrl(task.project_tasks_url || task.accept_project_task_url || "");
        addAcceptedHitToHistory(task.title, task.requester_id || task.requesterId || "UNKNOWN", projectId);
        playAcceptSound();
        if (submitForm) openOrReuseAcceptedWorkTab(submitForm.action.replace("w_wp_rtrn_top", "w_pl_prvw"));
        switchToAcceptedHitDirectFetcher(url);
      }
    } catch (err) {
      showMessage("Failed to fetch task: " + err);
      showDebug("Accept fetch error: " + (err?.message || String(err)));
    }
  }

  function fetchHTMLviaGM(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: INTERVALS.ACCEPT_HTML_TIMEOUT_MS,
        onload: function (res) { resolve(new DOMParser().parseFromString(res.responseText, "text/html")); },
        ontimeout: function () { reject(new Error("Accept request timeout")); },
        onerror: reject
      });
    });
  }

  function fetchJSONviaGM(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: 10000,
        onload: function (res) {
          try {
            const status = res.status || 0;
            const finalUrl = (res.finalUrl || "").toLowerCase();
            const raw = res.responseText || "";
            const body = raw.toLowerCase();
            const trimmed = raw.trim();
            const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
            // Avoid false positives from the word "captcha" in JSON payload text.
            if (!looksJson && (body.includes("to better protect your account") || body.includes("validatecaptcha") || body.includes("/errors/validatecaptcha"))) {
              reject(new Error("CAPTCHA"));
              return;
            }
            if (finalUrl.includes("amazon.com/ap/signin") || body.includes("openid.assoc_handle=amzn_mturk_worker")) {
              reject(new Error("Login required"));
              return;
            }
            if (status === 429 || status === 503 || status === 422 || body.includes("exceeded") || body.includes("rate limit")) {
              reject(new Error("RATE_LIMIT"));
              return;
            }
            resolve(JSON.parse(res.responseText || "{}"));
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        },
        ontimeout: function () { reject(new Error("Request timeout")); },
        onerror: function () { reject(new Error("Request failed")); }
      });
    });
  }

  function fetchTextViaGM(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: timeoutMs,
        onload: function (res) {
          resolve({
            status: res.status,
            text: res.responseText || "",
            finalUrl: res.finalUrl || ""
          });
        },
        ontimeout: function () { reject(new Error("Request timeout")); },
        onerror: function () { reject(new Error("Request failed")); }
      });
    });
  }

  function fetchJSONViaGM(url, headers = {}, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: headers,
        timeout: timeoutMs,
        onload: function (res) {
          try {
            const status = res.status || 0;
            if (status < 200 || status >= 300) {
              reject(new Error("HTTP " + status + ": " + (res.responseText || "").slice(0, 180)));
              return;
            }
            resolve(JSON.parse(res.responseText || "{}"));
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        },
        ontimeout: function () { reject(new Error("Request timeout")); },
        onerror: function () { reject(new Error("Request failed")); }
      });
    });
  }

  function putJSONViaGM(url, bodyObj, headers = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "PUT",
        url: url,
        data: JSON.stringify(bodyObj),
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        timeout: timeoutMs,
        onload: function (res) {
          try {
            const status = res.status || 0;
            const data = JSON.parse(res.responseText || "{}");
            if (status < 200 || status >= 300) {
              reject(new Error("GitHub write error: " + JSON.stringify(data)));
              return;
            }
            resolve(data);
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        },
        ontimeout: function () { reject(new Error("Request timeout")); },
        onerror: function () { reject(new Error("Request failed")); }
      });
    });
  }

  function renderAcceptedTaskRow(task) {
    let row = document.getElementById(task.hit_set_id);
    if (!row) {
      row = document.createElement('tr');
      row.id = task.hit_set_id;
      const tasksEl = document.getElementById("tasks");
      if (tasksEl) tasksEl.insertBefore(row, tasksEl.firstChild);
    }
    row.innerHTML = `
      <td><span><a href="${task.requester_url}" target="_blank">${task.requester_name}</a></span></td>
      <td><span class="p-x-sm column text-truncate project-name-column hidden-sm-down" title="${task.title}"><a href="${task.project_tasks_url}" target="_blank">${task.title}</a></span></td>
      <td><span class="p-x-sm column reward-column hidden-sm-down text-xs-right">$${task.monetary_reward.amount_in_dollars}</span></td>
      <td><span class="p-x-sm column created-column hidden-sm-down text-xs-right">${task.isAccepted ? "Accepted" : ''}</span></td>`;
  }

  function openPreviewAndClose(url) {
    const win = window.open(url, "_blank");
    setTimeout(() => { if (win) win.close(); }, INTERVALS.PREVIEW_CLOSE_MS);
  }

  function startAcceptedPanelPolling() {
    if (!hasAcceptedAnyHit) return;
    updateAcceptedHits();
    if (!acceptedHitsInterval) {
      acceptedHitsInterval = setInterval(updateAcceptedHits, 5000);
    }
  }

  function createAcceptedHitsPanel() {
    if (document.getElementById("accepted-hits-panel")) return;
    const panel = document.createElement("div");
    panel.id = "accepted-hits-panel";
    panel.style.cssText = "position:fixed;top:80px;right:20px;width:400px;max-height:300px;overflow-y:auto;background:#8cc0a8;color:#000000;border:1px solid rgba(0,0,0,0.22);border-radius:12px;padding:14px;z-index:99999;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,0.2);";
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:10px;color:#000000;">Accepted HITs</div><div id="accepted-hits-content" style="color:#000000;">Loading...</div>';
    document.body.appendChild(panel);
  }

  function detectExistingQueuedHits() {
    const title = String(document.title || "");
    const m = title.match(/Your HITs Queue\s*\((\d+)\)/i);
    if (m && Number(m[1]) > 0) {
      hasAcceptedAnyHit = true;
    }
  }

  function renderAcceptedHitsList(tasks) {
    const content = document.getElementById("accepted-hits-content");
    const panel = document.getElementById("accepted-hits-panel");
    if (!content) return;
    if (!tasks || tasks.length === 0) {
      if (acceptedHitsInterval) {
        clearInterval(acceptedHitsInterval);
        acceptedHitsInterval = null;
      }
      if (panel) panel.classList.remove("ab2-accepted-blink");
      content.innerHTML = '<span style="color:#000000;">No accepted HITs</span>';
      showMessage("All accepted HITs completed. Accepted polling stopped.");
      return;
    }
    if (panel) panel.classList.add("ab2-accepted-blink");
    content.innerHTML = tasks.map(t => {
      const title = t.project?.title || "Untitled HIT";
      const requester = t.project?.requester_name || "Unknown";
      const reward = t.project?.monetary_reward?.amount_in_dollars || '?';
      const taskUrl = "https://worker.mturk.com" + (t.task_url?.replace('.json', '') || '#');
      return `<div style="margin-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.16);padding-bottom:8px;">
        <div style="font-weight:600;color:#000000;">${title}</div>
        <div style="color:#000000;font-size:12px;">$${reward} &middot; ${requester}</div>
        <div style="margin-top:4px;"><a href="${taskUrl}" target="_blank" style="color:#000000;text-decoration:none;font-size:12px;">Work &rarr;</a></div>
      </div>`;
    }).join('');
  }

  async function updateAcceptedHits() {
    const content = document.getElementById("accepted-hits-content");
    const panel = document.getElementById("accepted-hits-panel");
    if (!content) return;
    if (isUpdatingAcceptedHits) return;
    isUpdatingAcceptedHits = true;
    try {
      const res = await fetchTextViaGM("https://worker.mturk.com/tasks?format=json&t=" + Date.now(), 10000);
      const text = res.text;
      if (text.includes("Sign-In") || text.includes("captcha") || text.includes("To better protect your account")) {
        clearInterval(acceptedHitsInterval);
        if (panel) panel.classList.remove("ab2-accepted-blink");
        content.innerHTML = '<span style="color:#000000;">CAPTCHA or Login required.</span>';
        openMturkTabOnce();
        const now = Date.now();
        if (now - lastCaptchaTime > INTERVALS.CAPTCHA_COOLDOWN_MS) lastCaptchaTime = now;
        setTimeout(() => {
          updateAcceptedHits();
          acceptedHitsInterval = setInterval(updateAcceptedHits, 5000);
        }, INTERVALS.SESSION_PING_MS);
        return;
      }
      let json;
      try { json = JSON.parse(text); } catch (e) {
        if (panel) panel.classList.remove("ab2-accepted-blink");
        content.innerHTML = '<span style="color:#000000;">JSON Parse Error</span>';
        pauseAndAutoRecoverFromAcceptedPanelError("JSON Parse Error");
        return;
      }
      if (json && Array.isArray(json.tasks)) {
        renderAcceptedHitsList(json.tasks);
        json.tasks.forEach(t => {
          const title = t.project?.title || "Untitled HIT";
          const requesterId = t.project?.requester_id || t.project?.requesterId || "UNKNOWN";
          const projectId = extractProjectIdFromUrl(t.task_url || "");
          if (projectId) addAcceptedHitToHistory(title, requesterId, projectId);
        });
      }
      else {
        if (panel) panel.classList.remove("ab2-accepted-blink");
        content.innerHTML = '<span style="color:#000000;">Invalid HIT response</span>';
        pauseAndAutoRecoverFromAcceptedPanelError("Invalid HIT response");
      }
    } catch (err) {
      if (panel) panel.classList.remove("ab2-accepted-blink");
      content.innerHTML = '<span style="color:#000000;">Network error</span>';
      openMturkTabOnce();
    } finally {
      isUpdatingAcceptedHits = false;
    }
  }

  document.addEventListener("keydown", function (ev) {
    const key = ev.key?.toLowerCase();
    const btnMap = { 's': "timer", ' ': "captcha-btn" };
    const targetId = btnMap[key];
    if (targetId) { document.getElementById(targetId)?.click(); return; }
    if (key === 'w') { const link = document.querySelector("#accepted-hits-content a"); if (link) link.click(); return; }
    if (key === 't') { if (directFetchInterval) stopDirectFetcher(); }
  });

  function waitForMainContent(maxWait = 5000) {
    return new Promise((resolve) => {
      if (document.querySelector("#MainContent")) { resolve(true); return; }
      const start = Date.now();
      const check = () => {
        if (document.querySelector("#MainContent")) { resolve(true); return; }
        if (Date.now() - start >= maxWait) { resolve(false); return; }
        setTimeout(check, 100);
      };
      check();
    });
  }

  try {
    await waitForMainContent();
    setupAudioUnlockListeners();
    setupAdvancedOptionsIdleListeners();
    detectExistingQueuedHits();
    loadTempBlocks();
    renderMainPanel();
    ensureAcceptedWorkTab();
    createAcceptedHitsPanel();
    if (hasAcceptedAnyHit) startAcceptedPanelPolling();
    enforceMainPageMinimalMode();
    setAdvancedOptionsEnabled(false);
    setUiPage("main");
    await loadBlockList();
    setTimeout(() => {
      const timerBtn = document.getElementById("timer");
      if (timerBtn && timerBtn.textContent.includes("Start")) timerBtn.click();
    }, 100);
  } catch (err) {
    showMessage("Error: " + err);
  }

  if (location.href.includes('/tasks')) {
    createAcceptedHitsPanel();
  }
})();
