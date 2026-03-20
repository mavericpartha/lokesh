// ==UserScript==
// @name         MRPsoft V8 pro (Protected)
// @version      25
// @description  Protected AB2soft script (Persistent Encrypted Per-Worker Auth)
// @@match        https://worker.mturk.com/tasks/*

// Required grants for loader + loaded script
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_addStyle

// Required connects for remote script + resources
// @connect      https://mrp-turk-app.tiiny.site/
// @connect      worker.mturk.com
// @connect      worker.mturk.com/projects/
// @connect      api.ipify.org
// @connect      www.allbyjohn.com
// @connect      raw.githubusercontent.com
// @connect      github.com
// @connect      api.github.com
// ==/UserScript==

(async function () {
  'use strict';

  async function P() {
    try {
      const M = document.documentElement.innerHTML;
      const H = [
        /"workerId"\s*:\s*"([^"]+)"/i,
        /"worker_id"\s*:\s*"([^"]+)"/i,
        /workerId=([A-Za-z0-9]+)/i,
        /worker_id=([A-Za-z0-9]+)/i
      ];
      for (const U of H) {
        const d = M.match(U);
        if (d && d[1]) return d[1];
      }
    } catch (o) {}
    return 'UNKNOWN_WORKER';
  }

  const J = 'AB2soft::V6Pro::PermanentKey';

  async function V(M, H) {
    const U = new TextEncoder();
    const d = crypto.getRandomValues(new Uint8Array(16));
    const o = crypto.getRandomValues(new Uint8Array(12));
    const Z = await crypto.subtle.importKey(
      'raw',
      U.encode(J + '::' + H),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const E = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: d, iterations: 120000, hash: 'SHA-256' },
      Z,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const Q = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: o },
      E,
      U.encode(M)
    );
    const W = i => btoa(String.fromCharCode(...i));
    return { s: W(d), i: W(o), c: W(new Uint8Array(Q)) };
  }

  async function L(M, H) {
    const U = new TextDecoder();
    const d = new TextEncoder();
    const o = W => Uint8Array.from(atob(W), i => i.charCodeAt(0));
    const Z = await crypto.subtle.importKey(
      'raw',
      d.encode(J + '::' + H),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const E = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: o(M.s), iterations: 120000, hash: 'SHA-256' },
      Z,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const Q = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: o(M.i) },
      E,
      o(M.c)
    );
    return U.decode(Q);
  }

  function j(M, H) {
    let U = '';
    for (let d = 0; d < M.length; d++) {
      U += String.fromCharCode(M.charCodeAt(d) ^ H.charCodeAt(d % H.length));
    }
    return U;
  }

  function G(M) {
    return M.replace(/[A-Za-z0-9]/g, H => {
      if (H >= '0' && H <= '9') return String.fromCharCode((H.charCodeAt(0) - 48 + 7) % 10 + 48);
      if (H >= 'A' && H <= 'Z') return String.fromCharCode((H.charCodeAt(0) - 65 + 23) % 26 + 65);
      return String.fromCharCode((H.charCodeAt(0) - 97 + 23) % 26 + 97);
    });
  }

  async function B() {
    const M = await P();
    const H = 'AB2_AUTH::' + M;
    const U = await GM.getValue(H, null);

    if (U) {
      try {
        const i = await L(U, M);
        if (i === 'OK') return true;
      } catch (q) {}
    }

    const d = prompt('Enter AB2soft access code:');
    if (!d) return false;

    const o = 'mK7pX2';
    const Z = ',\t\x05 \n}_{_\x05D';
    const E = j(Z, o);
    const Q = G('DE5SUR5357');

    if (d !== E && d !== Q) {
      alert('Access denied!');
      return false;
    }

    const W = await V('OK', M);
    await GM.setValue(H, W);
    return true;
  }

  const f = await B();
  if (!f) return;

  // Load encrypted payload with GM_xmlhttpRequest + retry.
  const PAYLOAD_URLS = [
    "https://mrp-turk-app.tiiny.site/real_script.enc.json"
  ];
  const PAYLOAD_PASS_KEY = "AB2_PAYLOAD_PASSWORD";

  function requestTextWithRetry(url, maxAttempts = 5) {
    let attempt = 0;
    return new Promise(function (resolve, reject) {
      function run() {
        attempt += 1;
        GM_xmlhttpRequest({
          method: "GET",
          url,
          nocache: true,
          timeout: 20000,
          onload: function (r) {
            const shouldRetry = r.status === 429 || r.status === 503;
            if (shouldRetry && attempt < maxAttempts) {
              const waitMs = Math.min(1500 * Math.pow(2, attempt - 1), 12000) + Math.floor(Math.random() * 400);
              setTimeout(run, waitMs);
              return;
            }
            if (r.status === 200 && r.responseText) {
              resolve(r.responseText);
              return;
            }
            reject(new Error("HTTP " + r.status + " at " + url + " (attempt " + attempt + ")"));
          },
          onerror: function () {
            if (attempt < maxAttempts) {
              const waitMs = Math.min(1500 * Math.pow(2, attempt - 1), 12000) + Math.floor(Math.random() * 400);
              setTimeout(run, waitMs);
              return;
            }
            reject(new Error("Network/load error at " + url));
          },
          ontimeout: function () {
            if (attempt < maxAttempts) {
              const waitMs = Math.min(1500 * Math.pow(2, attempt - 1), 12000) + Math.floor(Math.random() * 400);
              setTimeout(run, waitMs);
              return;
            }
            reject(new Error("Timed out at " + url));
          }
        });
      }
      run();
    });
  }

  function b64ToBytes(b64) {
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function joinBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  async function decryptEncPayload(payload, password) {
    if (!payload || payload.alg !== "AES-256-GCM" || payload.kdf !== "PBKDF2-SHA256") {
      throw new Error("Invalid payload format.");
    }
    const iter = Number(payload.iter || 120000);
    const salt = b64ToBytes(payload.salt);
    const iv = b64ToBytes(payload.iv);
    const tag = b64ToBytes(payload.tag);
    const data = b64ToBytes(payload.data);
    const cipherWithTag = joinBytes(data, tag);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const aesKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      cipherWithTag
    );
    return new TextDecoder().decode(plainBuf);
  }

  async function getPayloadPassword() {
    const cached = await GM.getValue(PAYLOAD_PASS_KEY, "");
    if (cached) return cached;
    const input = prompt("Enter encrypted script password:");
    if (!input) throw new Error("No decryption password entered.");
    await GM.setValue(PAYLOAD_PASS_KEY, input);
    return input;
  }

  async function fetchEncryptedPayload() {
    const errors = [];
    for (const url of PAYLOAD_URLS) {
      try {
        const body = await requestTextWithRetry(url);
        const trimmed = body.trim();
        if (!trimmed || trimmed[0] === "<") {
          throw new Error("URL returned HTML, not JSON: " + url);
        }
        return JSON.parse(trimmed);
      } catch (e) {
        errors.push(e && e.message ? e.message : String(e));
      }
    }
    throw new Error(errors.join(" | "));
  }

  async function bootEncryptedScript() {
    try {
      const payload = await fetchEncryptedPayload();
      let password = await getPayloadPassword();
      let sourceCode;
      try {
        sourceCode = await decryptEncPayload(payload, password);
      } catch (e) {
        await GM.setValue(PAYLOAD_PASS_KEY, "");
        password = prompt("Wrong password. Re-enter encrypted script password:");
        if (!password) throw new Error("No decryption password entered.");
        await GM.setValue(PAYLOAD_PASS_KEY, password);
        sourceCode = await decryptEncPayload(payload, password);
      }
      eval(sourceCode); // direct eval keeps GM_* available
    } catch (e) {
      alert("AB2soft load error: " + (e && e.message ? e.message : e));
    }
  }

  bootEncryptedScript();
})();
