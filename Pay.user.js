// ==UserScript==
// @name         Smart Auto Payment Scheduler 
// @namespace    Violentmonkey Scripts
// @version      3.7
// @match        https://worker.mturk.com/payment_schedule*
// @grant        none
// @updateURL    https://github.com/Vinylgeorge/mturk-hit-monitor/raw/refs/heads/main/Pay_schedule.user.js
// @downloadURL  https://github.com/Vinylgeorge/mturk-hit-monitor/raw/refs/heads/main/Pay_schedule.user.js
// ==/UserScript==

(function () {
  'use strict';
  const page = location.pathname;
  const today = new Date();
  const date = today.getDate();
  const earnings = parseFloat(localStorage.getItem("mturk_current_earnings") || "10");
  const log = (msg) => console.log(`[AB2soft] ${msg}`);

  // --------------------------
  // PAGE 1: /payment_schedule
  // --------------------------
  if (page === "/payment_schedule") {
    console.clear();
    log(`📅 Date: ${date}, 💵 Earnings: $${earnings}`);

    setTimeout(() => {
      const bankOpt = document.querySelector("#GDS");
      const giftOpt = document.querySelector("#GCSharp");
      const updateBtn = document.querySelector("input[type='submit'][value='Update']");
      const radios = document.querySelectorAll("input[name='disbursement_schedule_form[frequency]']");
      if (!bankOpt || !giftOpt || !updateBtn || !radios.length) {
        log("⚠️ Missing form elements!");
        return;
      }

     
      const hasBank = !!document.querySelector("a[href*='/direct_deposit']");
      (hasBank ? bankOpt : giftOpt).checked = true;
      (hasBank ? bankOpt : giftOpt).dispatchEvent(new Event("change", { bubbles: true }));
      log(hasBank ? "🏦 Bank selected" : "🎁 Gift card selected");

      const current = Array.from(radios).find(r => r.checked)?.value;
      let newValue = null;

      // ---------- AUTO RULES ----------
      if (date >= 1 && date <= 17 && earnings < 20) {
        newValue = "14";
        log("📆 Auto: 14-day transfer (early, low earnings)");
      } else if (earnings >= 20) {
        if (current === "3") {
          log("✅ Already 3-day cycle (no change).");
          return;
        } else {
          newValue = "3";
          log("💰 Auto: 3-day transfer (high earnings)");
        }
      } else {
        log("⌨️ Manual Mode Active — Press 1→3d, 2→7d, 3→14d, 4→30d");
      }

      // ---------- MANUAL OVERRIDE ----------
      document.addEventListener("keydown", (e) => {
        const keyMap = { "1": "3", "2": "7", "3": "14", "4": "30" };
        if (keyMap[e.key]) {
          const val = keyMap[e.key];
          const target = Array.from(radios).find(r => r.value === val);
          if (target) {
            target.checked = true;
            target.dispatchEvent(new Event("change", { bubbles: true }));
            log(`🎯 Manual override → ${val}-day`);
            setTimeout(() => {
              const form = updateBtn.closest("form");
              if (form) {
                log("🚀 Submitting manual change …");
                form.submit();
              }
            }, 800);
          }
        }
      });

      // ---------- AUTO SUBMIT ----------
      if (newValue && newValue !== current) {
        const target = Array.from(radios).find(r => r.value === newValue);
        if (target) {
          target.checked = true;
          target.dispatchEvent(new Event("change", { bubbles: true }));
          log(`✅ Frequency set → ${newValue} days`);
          const form = updateBtn.closest("form");
          if (form) {
            setTimeout(() => {
              log(`🚀 Submitting update (${newValue}-day)`);
              form.submit();
            }, 1200);
          }
        }
      }
    }, 1200);
  }

  // --------------------------
  // PAGE 2: /payment_schedule/submit
  // --------------------------
  else if (page === "/payment_schedule/submit") {
    setTimeout(() => {
      const confirmBtn = document.querySelector("a.btn.btn-primary[href*='/payment_schedule/confirm']");
      if (confirmBtn) {
        log("🔘 Clicking Confirm …");
        confirmBtn.click();
      } else {
        log("⚠️ Confirm button not found.");
      }
    }, 1800);
  }

  // --------------------------
  // PAGE 3: /payment_schedule/confirm
  // --------------------------
  else if (page.startsWith("/payment_schedule/confirm")) {
    log("🎉 Payment schedule confirmed successfully!");
  }
})();
