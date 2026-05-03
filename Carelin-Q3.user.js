// ==UserScript==
// @name         Carelin Auto Answer
// @namespace    MTurkHelpers
// @version      6
// @description  For Q1/Q2/Q3 pages: human-like reading scroll + first-choice click in each question, then submit.
// @match        https://www.mturkcontent.com/*
// @match        https://*.mturkcontent.com/*
// @updateURL    https://github.com/mavericpartha/lokesh/raw/refs/heads/main/carelin.user.js
// @downloadURL  https://github.com/mavericpartha/lokesh/raw/refs/heads/main/carelin.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    BETWEEN_QUESTIONS_MIN_MS: 1400,
    BETWEEN_QUESTIONS_MAX_MS: 2800,
    BEFORE_SUBMIT_MIN_MS: 2200,
    BEFORE_SUBMIT_MAX_MS: 3800,
    POLL_MS: 450,
    // Humanlike-scroll tuning. Each "scroll-to-target" is broken into a few
    // smaller hops with eased animation and tiny random over/under-shoots so
    // the trace doesn't look like a single setTimeout-jump.
    SCROLL_HOP_MIN_MS: 220,
    SCROLL_HOP_MAX_MS: 520,
    SCROLL_HOPS_MIN: 2,
    SCROLL_HOPS_MAX: 4,
    SCROLL_OVERSHOOT_PX: 40,
    SCROLL_READ_MIN_MS: 600,
    SCROLL_READ_MAX_MS: 1400,
    DEBUG: false
  };

  const STATE_KEY_PREFIX = "mturk_carelin_submit_v2_";

  function log() {
    if (!CONFIG.DEBUG) return;
    const args = Array.from(arguments);
    args.unshift("[Carelin]");
    try { console.log.apply(console, args); } catch (e) {}
  }

  function randomBetween(minMs, maxMs) {
    const min = Math.max(0, Number(minMs) || 0);
    const max = Math.max(min, Number(maxMs) || min);
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
  function randSign() { return Math.random() < 0.5 ? -1 : 1; }

  function isMturkContentHost() {
    const host = location.hostname.toLowerCase();
    return host === "www.mturkcontent.com" || host.endsWith(".mturkcontent.com");
  }

  function isVisibleEnabled(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    const type = String(el.getAttribute("type") || "").toLowerCase();
    if (type === "hidden") return false;

    if (window.getComputedStyle) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
    }

    if (el.getBoundingClientRect) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
    }

    return true;
  }

  function clickElement(el) {
    if (!el || !isVisibleEnabled(el)) return false;
    try { if (el.focus) el.focus(); } catch (e) {}

    const events = ["mouseover", "mousedown", "mouseup", "click"];
    for (const eventName of events) {
      try {
        const ev = new MouseEvent(eventName, { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(ev);
      } catch (e) {}
    }

    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function markRadio(input) {
    if (!input) return;
    try { input.checked = true; } catch (e) {}
    try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    try { input.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
  }

  function getAssignmentId() {
    try {
      const fromQuery = new URLSearchParams(location.search).get("assignmentId");
      if (fromQuery && fromQuery !== "ASSIGNMENT_ID_NOT_AVAILABLE") return fromQuery;
    } catch (e) {}

    const hidden = document.querySelector('input[name="assignmentId"], input[name="assignment_id"]');
    if (hidden && hidden.value && hidden.value !== "ASSIGNMENT_ID_NOT_AVAILABLE") return hidden.value;

    return "no_assignment_id";
  }

  function getStateKey(assignmentId) {
    return `${STATE_KEY_PREFIX}${assignmentId}`;
  }

  function loadState(assignmentId) {
    const raw = sessionStorage.getItem(getStateKey(assignmentId));
    if (!raw) return { step: 0, nextActionAt: 0, done: false };
    try {
      const parsed = JSON.parse(raw);
      return {
        step: Math.max(0, Number(parsed.step) || 0),
        nextActionAt: Math.max(0, Number(parsed.nextActionAt) || 0),
        done: !!parsed.done
      };
    } catch (e) {
      return { step: 0, nextActionAt: 0, done: false };
    }
  }

  function saveState(assignmentId, state) {
    const safe = {
      step: Math.max(0, Math.min(4, Number(state.step) || 0)),
      nextActionAt: Math.max(0, Number(state.nextActionAt) || 0),
      done: !!state.done
    };
    sessionStorage.setItem(getStateKey(assignmentId), JSON.stringify(safe));
  }

  function pageLooksLikeQ1Q2Q3Template() {
    if (!document.querySelector("#mturk_form")) return false;
    if (!document.querySelector("#submitbutton")) return false;
    if (!document.querySelector("input[type='radio'][name='q1']")) return false;
    if (!document.querySelector("input[type='radio'][name='q2']")) return false;
    if (!document.querySelector("input[type='radio'][name='q3']")) return false;
    return true;
  }

  function getFirstVisibleChoice(questionName) {
    const radios = Array.from(
      document.querySelectorAll(`input[type="radio"][name="${questionName}"]`)
    ).filter((el) => isVisibleEnabled(el) && String(el.value || "").toLowerCase() !== "none");

    return radios[0] || null;
  }

  function hasAnswered(questionName) {
    const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${questionName}"]`));
    return radios.some((el) => el.checked && String(el.value || "").toLowerCase() !== "none");
  }

  function inferStepFromDom() {
    if (hasAnswered("q3")) return 3;
    if (hasAnswered("q2")) return 2;
    if (hasAnswered("q1")) return 1;
    return 0;
  }

  function submitButton() {
    return document.querySelector("#submitbutton") ||
      document.querySelector('#mturk_form input[type="submit"], #mturk_form button[type="submit"]');
  }

  function canSubmitNow() {
    const btn = submitButton();
    return !!(btn && isVisibleEnabled(btn) && !btn.disabled);
  }

  function trySubmit() {
    const btn = submitButton();
    if (btn && !btn.disabled) {
      return clickElement(btn);
    }
    return false;
  }

  // -------------------- Humanlike scrolling --------------------
  // Scrolls the document to a target element using:
  //   * 2-4 hops (real readers don't snap to a question in one motion)
  //   * Eased motion via requestAnimationFrame (CSS smooth-scroll has no
  //     awaitable hook; we use rAF + sleep for deterministic timing)
  //   * Small over/undershoot so the scroll position isn't exactly the
  //     target on the first try
  //   * A short "reading" pause at the end of each scroll
  // No keyboard or mouse-wheel events are needed: most page-behavior
  // detectors treat smooth window.scrollTo as user scrolling.

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function getScrollY() {
    return window.scrollY || window.pageYOffset ||
      (document.documentElement && document.documentElement.scrollTop) || 0;
  }

  function getMaxScrollY() {
    const docEl = document.documentElement || document.body;
    return Math.max(0, (docEl.scrollHeight || 0) - window.innerHeight);
  }

  function clampY(y) { return Math.max(0, Math.min(y, getMaxScrollY())); }

  // Animate a single scroll hop from current Y to targetY over duration ms.
  function animateScrollHop(targetY, durationMs) {
    return new Promise(function (resolve) {
      const startY = getScrollY();
      const endY = clampY(targetY);
      if (Math.abs(endY - startY) < 2 || durationMs <= 0) {
        try { window.scrollTo(0, endY); } catch (e) {}
        return resolve();
      }
      const startTs = performance.now();
      function frame(ts) {
        const t = Math.min(1, (ts - startTs) / durationMs);
        const k = easeInOutQuad(t);
        const y = startY + (endY - startY) * k;
        try { window.scrollTo(0, y); } catch (e) {}
        if (t >= 1) return resolve();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  // Scrolls so that `el` sits at ~30% from the top of the viewport, after
  // a few human-paced hops with random jitter.
  async function humanScrollToElement(el) {
    if (!el || !el.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    const targetCenter = getScrollY() + rect.top - Math.floor(window.innerHeight * 0.3);
    const finalY = clampY(targetCenter);
    const startY = getScrollY();
    const distance = finalY - startY;
    if (Math.abs(distance) < 12) {
      // Already close enough -- a tiny fidget motion still helps look human.
      const jitter = randInt(8, 24) * randSign();
      await animateScrollHop(getScrollY() + jitter, randInt(180, 320));
      await sleep(randInt(120, 260));
      await animateScrollHop(finalY, randInt(180, 320));
      return;
    }
    const hops = randInt(CONFIG.SCROLL_HOPS_MIN, CONFIG.SCROLL_HOPS_MAX);
    let cumY = startY;
    for (let i = 1; i <= hops; i++) {
      const fraction = i / hops;
      // Slightly bias progress so first hops are smaller (people accelerate
      // into a scroll then ease out).
      const eased = Math.pow(fraction, 1.15);
      let hopTarget = startY + distance * eased;
      // Add a small per-hop jitter (intentional over/undershoot).
      if (i < hops) {
        hopTarget += randInt(-CONFIG.SCROLL_OVERSHOOT_PX, CONFIG.SCROLL_OVERSHOOT_PX);
      }
      await animateScrollHop(hopTarget, randInt(CONFIG.SCROLL_HOP_MIN_MS, CONFIG.SCROLL_HOP_MAX_MS));
      cumY = hopTarget;
      // Brief micro-pause between hops (eye-fix moments).
      await sleep(randInt(80, 220));
    }
    // Final correction: snap-eased to the precise target.
    await animateScrollHop(finalY, randInt(180, 320));
    // "Reading" pause at the destination.
    await sleep(randInt(CONFIG.SCROLL_READ_MIN_MS, CONFIG.SCROLL_READ_MAX_MS));
  }

  // Tiny back-and-forth wobble to look like the worker re-checking the
  // current section before clicking.
  async function readingFidget() {
    const baseY = getScrollY();
    const jitter1 = randInt(15, 50) * randSign();
    await animateScrollHop(baseY + jitter1, randInt(160, 300));
    await sleep(randInt(120, 260));
    await animateScrollHop(baseY, randInt(160, 300));
    await sleep(randInt(180, 360));
  }

  // Scroll to the question by name, then run a small read-fidget.
  async function scrollToQuestion(questionName) {
    const radio = document.querySelector(`input[type="radio"][name="${questionName}"]`);
    let anchor = null;
    if (radio) {
      // Prefer the question's container row if we can find one -- looks
      // more like reading the question text than focusing on a radio.
      anchor = radio.closest("tr, .question, .panel, .card, fieldset, label, p, div") || radio;
    }
    if (anchor) {
      await humanScrollToElement(anchor);
      // Some pages have a long question stem; do one tiny re-read wobble.
      if (Math.random() < 0.6) await readingFidget();
    }
  }

  async function scrollToSubmit() {
    const btn = submitButton();
    if (btn) {
      await humanScrollToElement(btn);
    }
  }

  // -------------------- Main automation --------------------

  function startAutomation() {
    const assignmentId = getAssignmentId();
    let state = loadState(assignmentId);

    if (state.step === 0 && !state.done) {
      const inferred = inferStepFromDom();
      if (inferred > 0) {
        state.step = inferred;
        saveState(assignmentId, state);
      }
    }

    let busy = false;
    let observer = null;
    let poller = null;

    function cleanup() {
      if (observer) observer.disconnect();
      if (poller) clearInterval(poller);
    }

    function scheduleNext(step, minMs, maxMs) {
      saveState(assignmentId, {
        step,
        done: false,
        nextActionAt: Date.now() + randomBetween(minMs, maxMs)
      });
    }

    // One-shot top-of-page glance the first time we wake up. Helps mimic
    // a real worker who lands on the page and skims it before answering.
    let pageWarmedUp = false;
    async function warmUpScroll() {
      if (pageWarmedUp) return;
      pageWarmedUp = true;
      try {
        // Glance from current pos up to top, brief read pause, then back.
        const startY = getScrollY();
        await animateScrollHop(0, randInt(280, 520));
        await sleep(randInt(280, 600));
        await animateScrollHop(Math.min(startY, 200), randInt(220, 420));
        await sleep(randInt(180, 360));
      } catch (e) {}
    }

    async function answerStep(questionName, nextStep, minMs, maxMs) {
      busy = true;
      try {
        await warmUpScroll();
        await scrollToQuestion(questionName);
        const first = getFirstVisibleChoice(questionName);
        if (first) {
          markRadio(first);
          if (clickElement(first)) {
            log("Clicked", questionName, "first choice");
            scheduleNext(nextStep, minMs, maxMs);
          }
        }
      } finally {
        busy = false;
      }
    }

    async function doSubmitStep() {
      busy = true;
      try {
        await scrollToSubmit();
        // One last "looking it over" wobble before clicking submit.
        await readingFidget();
        if (canSubmitNow() && trySubmit()) {
          saveState(assignmentId, { step: 4, done: true, nextActionAt: Date.now() });
          log("Submitted form");
        }
      } finally {
        busy = false;
      }
    }

    function run() {
      if (busy) return;
      const now = Date.now();
      state = loadState(assignmentId);

      if (state.done || state.step >= 4) {
        cleanup();
        return;
      }

      if (now < state.nextActionAt) return;

      if (state.step === 0) {
        answerStep("q1", 1, CONFIG.BETWEEN_QUESTIONS_MIN_MS, CONFIG.BETWEEN_QUESTIONS_MAX_MS);
        return;
      }
      if (state.step === 1) {
        answerStep("q2", 2, CONFIG.BETWEEN_QUESTIONS_MIN_MS, CONFIG.BETWEEN_QUESTIONS_MAX_MS);
        return;
      }
      if (state.step === 2) {
        answerStep("q3", 3, CONFIG.BEFORE_SUBMIT_MIN_MS, CONFIG.BEFORE_SUBMIT_MAX_MS);
        return;
      }
      if (state.step === 3) {
        doSubmitStep();
        return;
      }
    }

    run();
    observer = new MutationObserver(run);
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    poller = setInterval(run, CONFIG.POLL_MS);
    window.addEventListener("beforeunload", cleanup);
  }

  if (!isMturkContentHost()) return;
  if (!pageLooksLikeQ1Q2Q3Template()) return;
  startAutomation();
})();
