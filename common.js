/* Amoriva — shared logic (Firebase, auth guard, presence, helpers, nav, ads) */

// 1) Firebase web config (from Firebase Console → Project settings → Your apps).
//    The web apiKey is safe to expose; your data is protected by the database rules.
const firebaseConfig = {
  apiKey: "AIzaSyCQE9O57a5qXV_ttl5P1tJq17pqXjGdTqc",
  authDomain: "aviabustout.firebaseapp.com",
  databaseURL: "https://aviabustout-default-rtdb.firebaseio.com",
  projectId: "aviabustout",
  storageBucket: "aviabustout.appspot.com",
  messagingSenderId: "206186525313",
  appId: "1:206186525313:web:e298094387b9082c285380",
  measurementId: "G-P0ZYKGRRFB"
};

// All Amoriva data lives under this node so it never touches CowCash / PaidTasks data
const ROOT = "amoriva";

// 2) Ads — Google AdSense. Leave empty to hide ad slots until approved.
const ADS = { client: "", slot: "" }; // e.g. client: "ca-pub-1234567890", slot: "9876543210"

// 3) Video-call ICE servers. STUN works for many networks out of the box.
//    For reliable calls on mobile data (Safaricom etc.) add a TURN server — get free
//    credentials at https://www.metered.ca (Open Relay) or self-host coturn, then
//    uncomment and fill the TURN entry below.
const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
  // , { urls: "turn:YOUR_TURN_HOST:3478", username: "YOUR_USER", credential: "YOUR_PASS" }
  // , { urls: "turn:YOUR_TURN_HOST:443?transport=tcp", username: "YOUR_USER", credential: "YOUR_PASS" }
];

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const TS = firebase.database.ServerValue.TIMESTAMP;
const ref = (path) => db.ref(ROOT + "/" + path);

/* ---------- Reference data ---------- */
const LANGUAGES = ["English", "Swahili", "French", "German", "Spanish", "Portuguese", "Italian",
  "Arabic", "Chinese", "Japanese", "Korean", "Hindi", "Russian", "Dutch", "Turkish", "Amharic", "Somali"];

const INTERESTS = ["Food & Cooking", "Music", "Football", "Athletics", "Travel", "Wildlife & Safari",
  "Movies & Series", "Books", "Tech", "Faith & Traditions", "Fashion", "Farming", "History",
  "Business", "Art & Design", "Photography", "Gaming", "Fitness"];

const COUNTRIES = [
  ["KE","Kenya"],["UG","Uganda"],["TZ","Tanzania"],["RW","Rwanda"],["ET","Ethiopia"],["SO","Somalia"],
  ["NG","Nigeria"],["GH","Ghana"],["ZA","South Africa"],["EG","Egypt"],["MA","Morocco"],["SN","Senegal"],
  ["US","United States"],["CA","Canada"],["MX","Mexico"],["BR","Brazil"],["AR","Argentina"],
  ["GB","United Kingdom"],["IE","Ireland"],["FR","France"],["DE","Germany"],["NL","Netherlands"],
  ["BE","Belgium"],["CH","Switzerland"],["AT","Austria"],["IT","Italy"],["ES","Spain"],["PT","Portugal"],
  ["SE","Sweden"],["NO","Norway"],["DK","Denmark"],["FI","Finland"],["PL","Poland"],["RU","Russia"],
  ["TR","Turkey"],["AE","United Arab Emirates"],["SA","Saudi Arabia"],["IN","India"],["PK","Pakistan"],
  ["CN","China"],["JP","Japan"],["KR","South Korea"],["PH","Philippines"],["ID","Indonesia"],
  ["AU","Australia"],["NZ","New Zealand"]
];

const CONVERSATION_STARTERS = [
  "Hi! How do you say “good morning” in your language?",
  "What's a typical breakfast where you live?",
  "What's one tradition from your country you love?",
  "Habari! Which language are you practising?",
  "What music is popular where you are right now?"
];

/* ---------- Demo (pseudo) chat scripts ----------
   A foreign example member asks the user about their country. Each pseudo account starts the
   topics at a different offset and uses different phrasing, so no two demo chats read the same.
   These are clearly-labelled DEMO conversations — the user always knows the member isn't real. */
const PSEUDO_TOPICS = [
  "the weather and climate where you live right now",
  "the most popular sport and which teams people support",
  "a tourist attraction a first-time visitor shouldn't miss",
  "a traditional dish you'd tell me to try",
  "the music and dances your country is known for",
  "what everyday life is like for young people there",
  "a festival or celebration you really look forward to",
  "a word or greeting in your language I could learn",
  "the kind of landscapes and wildlife you have",
  "something about your culture that makes you proud",
  "the best time of year for a visitor to come",
  "a street food or drink I have to taste"
];
function pseudoChatScript(seed, name, country) {
  const land = countryName(country) || "another country";
  const intros = [
    `Hi! 👋 I'm ${name} from ${land}. So nice to meet you... I'd love to learn about your country!`,
    `Hello from ${land}! 😊 I'm ${name}. I'm really curious about where you're from... mind if I ask you a few things?`,
    `Hey there! ${name} here, from ${land}. I love meeting people worldwide... tell me about your home!`
  ];
  const phr = [
    (t) => `First... what's ${t}?`,
    (t) => `That's great! I'd also love to know about ${t}.`,
    (t) => `Interesting 😊 And ${t}?`,
    (t) => `Thanks for sharing! So how about ${t}?`,
    (t) => `You're making me want to visit! What's ${t}?`,
    (t) => `One more thing I'm curious about... ${t}?`
  ];
  const lines = [intros[seed % intros.length]];
  for (let k = 0; k < phr.length; k++) {
    const t = PSEUDO_TOPICS[(seed + k) % PSEUDO_TOPICS.length];
    lines.push(phr[k](t));
  }
  lines.push(`This has been lovely... thank you! 🌍 (Just so you know, this is a demo chat with an example member. Invite a friend to start real conversations.)`);
  return lines;
}

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function flag(cc) {
  if (!cc || cc.length !== 2) return "🌍";
  return cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
function countryName(cc) {
  const c = COUNTRIES.find((x) => x[0] === cc);
  return c ? c[1] : "";
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function colorFor(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, 45%)`;
}
function avatarHTML(user, uid, online, size = "") {
  // Initials always render underneath; a photo (if any) overlays them and, if it fails to load
  // (e.g. a missing pseudoN.png), removes itself so the initials show instead of a broken icon.
  const ini = esc(initials(user && user.name));
  const img = user && user.photo
    ? `<img src="${esc(user.photo)}" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : "";
  return `<div class="avatar ${size}" style="background:${colorFor(uid || (user && user.name))}">
    <span>${ini}</span>${img}${online === undefined ? "" : `<span class="dot ${online ? "online" : ""}"></span>`}
  </div>`;
}

// Center-crop an image file to a square thumbnail data URL, so it fills the
// round avatar perfectly whatever the original shape (keeps the DB light too)
function resizeImage(file, size = 256, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image couldn't be loaded."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);   // largest centered square that fits
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size); // crop square → scale to size×size
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Resize a photo for a feed post (keeps aspect ratio, caps the long side). Bigger
// than an avatar but still compressed. Move to Firebase Storage when the feed grows.
function resizePhoto(file, max = 1080, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image couldn't be loaded."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > max) { height = Math.round(height * max / width); width = max; }
        else if (height > max) { width = Math.round(width * max / height); height = max; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        let out = c.toDataURL("image/jpeg", quality);
        // keep under the DB rule cap (~400KB) by stepping quality down if needed
        let q = quality;
        while (out.length > 390000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(ts).toLocaleDateString();
}
function clock(ts) {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

// Points a user earns for each reply they send (real or demo), between 0.40 and 1.00.
function randomPoints() { return Math.round((0.40 + Math.random() * 0.60) * 100) / 100; }
function awardPoints(uid, amt) {
  try { ref("users/" + uid + "/points").set(firebase.database.ServerValue.increment(amt)); } catch (e) {}
}
function fmtPoints(p) { return (Number(p) || 0).toFixed(2); }
function statusLabel(st) {
  if (st && st.state === "online") return { text: "Online now", online: true };
  return { text: st && st.at ? "Last seen " + timeAgo(st.at) : "Offline", online: false };
}

function toast(msg, isErr = false) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.toggle("err", isErr);
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2800);
}

function friendlyAuthError(e) {
  const map = {
    "auth/email-already-in-use": "That email already has an account. Try logging in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with that email.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "No internet connection. Check your network.",
    "auth/requires-recent-login": "For security, please log out, log in again, then retry."
  };
  return map[e && e.code] || (e && e.message) || "Something went wrong.";
}

function chatIdFor(a, b) { return [a, b].sort().join("_"); }

function guessCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const map = { "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ", "Africa/Kigali": "RW",
      "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Johannesburg": "ZA", "Europe/London": "GB",
      "Europe/Berlin": "DE", "Europe/Paris": "FR", "America/New_York": "US", "America/Chicago": "US",
      "America/Los_Angeles": "US", "America/Toronto": "CA", "Asia/Tokyo": "JP", "Australia/Sydney": "AU" };
    return map[tz] || "";
  } catch (e) { return ""; }
}

/* ---------- Theme (per-device convenience only) ---------- */
function applyTheme() {
  let t = null;
  try { t = localStorage.getItem("amoriva-theme"); } catch (e) {}
  if (t) document.documentElement.setAttribute("data-theme", t);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", cur);
  try { localStorage.setItem("amoriva-theme", cur); } catch (e) {}
  return cur;
}
applyTheme();

/* ---------- Auth guard + presence ---------- */
let CURRENT = { user: null, profile: null };

function requireAuth({ needProfile = true } = {}) {
  return new Promise((resolve) => {
    const off = auth.onAuthStateChanged(async (user) => {
      off();
      if (!user || user.isAnonymous) { location.replace("auth.html"); return; }
      const snap = await ref("users/" + user.uid).once("value");
      const profile = snap.val();
      if (needProfile && (!profile || !profile.profileComplete)) { location.replace("setup.html"); return; }
      CURRENT = { user, profile };
      startPresence(user.uid);
      if (!/call\.html$/.test(location.pathname)) listenForCalls(user.uid);
      resolve(CURRENT);
    });
  });
}

function startPresence(uid) {
  const statusRef = ref("status/" + uid);
  const seenRef = ref("users/" + uid + "/lastSeen");
  db.ref(".info/connected").on("value", (s) => {
    if (s.val() !== true) return;
    statusRef.onDisconnect().set({ state: "offline", at: TS }).then(() => {
      statusRef.set({ state: "online", at: TS });
      seenRef.set(TS);
      seenRef.onDisconnect().set(TS);
    });
  });
}

async function logout() {
  const u = auth.currentUser;
  if (u) {
    try { await ref("status/" + u.uid).set({ state: "offline", at: TS }); } catch (e) {}
  }
  await auth.signOut();
  location.replace("index.html");
}

/* ---------- Incoming video calls (app-wide ring) ---------- */
let _incomingShown = null;
function listenForCalls(uid) {
  ref("ring/" + uid).on("value", (s) => {
    const v = s.val();
    if (!v || !v.callId) { hideIncoming(); return; }
    if (_incomingShown === v.callId) return;
    ref("calls/" + v.callId + "/status").once("value").then((st) => {
      if (st.val() === "ringing") showIncoming(v, uid);
    });
  });
}
function showIncoming(v, uid) {
  _incomingShown = v.callId;
  let el = document.getElementById("incomingCall");
  if (!el) { el = document.createElement("div"); el.id = "incomingCall"; document.body.appendChild(el); }
  el.setAttribute("style", "position:fixed;inset:0;z-index:999;background:rgba(6,30,32,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;text-align:center;padding:24px");
  el.innerHTML = `
    <div style="font-size:3rem">📹</div>
    <div style="font-size:1.3rem;font-weight:800">${esc(v.callerName || "Someone")}</div>
    <div style="opacity:.8">is video-calling you…</div>
    <div style="display:flex;gap:16px;margin-top:10px">
      <button id="icDecline" style="background:#d64545;color:#fff;border:0;border-radius:999px;padding:14px 26px;font-weight:700;font-size:1rem;cursor:pointer">Decline</button>
      <button id="icAccept" style="background:#22a55a;color:#fff;border:0;border-radius:999px;padding:14px 26px;font-weight:700;font-size:1rem;cursor:pointer">Accept</button>
    </div>`;
  document.getElementById("icAccept").onclick = () => { location.href = "call.html?id=" + encodeURIComponent(v.callId) + "&role=callee"; };
  document.getElementById("icDecline").onclick = async () => {
    try { await ref("calls/" + v.callId + "/status").set("declined"); await ref("ring/" + uid).remove(); } catch (e) {}
    hideIncoming();
  };
  try { navigator.vibrate && navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) {}
}
function hideIncoming() {
  _incomingShown = null;
  const el = document.getElementById("incomingCall"); if (el) el.remove();
  try { navigator.vibrate && navigator.vibrate(0); } catch (e) {}
}

/* ---------- Blocks ---------- */
async function blockedEitherWay(me, other) {
  const [a, b] = await Promise.all([
    ref(`blocks/${me}/${other}`).once("value"),
    ref(`blocks/${other}/${me}`).once("value")
  ]);
  return { iBlocked: a.exists(), theyBlocked: b.exists() };
}

/* ---------- Bottom nav ---------- */
function renderNav(active) {
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `<div class="inner">
    <a href="members.html" class="${active === "members" ? "on" : ""}"><span class="ic">🌍</span>Members</a>
    <a href="feed.html" class="${active === "feed" ? "on" : ""}"><span class="ic">📸</span>Feed</a>
    <button class="nav-fab" id="redeemFab"><span class="ic">🎁</span>Redeem</button>
    <a href="chats.html" class="${active === "chats" ? "on" : ""}"><span class="ic">💬</span>Chats<span class="badge hidden" id="navUnread"></span></a>
    <a href="profile.html" class="${active === "profile" ? "on" : ""}"><span class="ic">👤</span>Profile</a>
  </div>`;
  document.body.appendChild(nav);
  initRedeem();
  if (CURRENT.user) {
    ref("userChats/" + CURRENT.user.uid).on("value", (s) => {
      let n = 0;
      s.forEach((c) => { n += (c.val().unread || 0); });
      const b = $("#navUnread");
      b.textContent = n > 99 ? "99+" : n;
      b.classList.toggle("hidden", n === 0);
    });
  }
}

// Redeem points popup (shared across pages via the bottom nav).
function initRedeem() {
  const uid = CURRENT.user && CURRENT.user.uid;
  if (!uid) return;
  const code = "Amoriva" + uid.slice(0, 6).toUpperCase();
  const sheet = document.createElement("div");
  sheet.className = "sheet-bg";
  sheet.id = "redeemSheet";
  sheet.innerHTML = `<div class="sheet">
    <div class="invite-hero">
      <div class="ih-ic">🎁</div><h3>Redeem your points</h3>
      <p>Move the points you've earned into your redeem balance.</p>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <div class="card" style="flex:1;text-align:center;margin:0;padding:14px"><div style="font-size:1.5rem;font-weight:800" id="rdAvail">0.00</div><div class="small muted">Points available</div></div>
      <div class="card" style="flex:1;text-align:center;margin:0;padding:14px"><div style="font-size:1.5rem;font-weight:800;color:#15803d" id="rdRedeemed">0.00</div><div class="small muted">Redeemed</div></div>
    </div>

    <div id="rdLocked">
      <p class="small muted" style="margin-bottom:12px">Invite <b>one friend</b> to unlock redeeming your points.</p>
      <label class="inv-label">Your invite code</label>
      <div class="code-display"><input class="input" id="rdCode" readonly value="${code}"></div>
      <div class="stack">
        <button class="btn btn-primary" id="rdShare">📤 Invite a friend to unlock</button>
        <button class="btn btn-green" id="rdCopy">📋 Copy code</button>
      </div>
    </div>

    <div id="rdForm" class="hidden">
      <label class="inv-label">Points to redeem</label>
      <input class="input" id="rdAmount" type="number" min="0.01" step="0.01" placeholder="Enter points, e.g. 20">
      <button class="btn btn-green" id="rdBtn" style="margin-top:12px">🎁 Redeem points</button>
    </div>

    <p class="small muted" style="margin:14px 0 4px">Redeemed points unlock video calls (20+ needed). Points are for in-app features only — not cash.</p>
    <button class="btn btn-outline" data-close style="margin-top:6px">Close</button>
  </div>`;
  document.body.appendChild(sheet);

  let avail = 0, redeemed = 0, unlocked = false;
  const paint = () => { $("#rdAvail").textContent = fmtPoints(avail); $("#rdRedeemed").textContent = fmtPoints(redeemed); };
  const applyGate = () => {
    $("#rdLocked").classList.toggle("hidden", unlocked);
    $("#rdForm").classList.toggle("hidden", !unlocked);
  };
  ref("users/" + uid + "/points").on("value", (s) => { avail = Number(s.val()) || 0; paint(); });
  ref("users/" + uid + "/redeemedPoints").on("value", (s) => { redeemed = Number(s.val()) || 0; paint(); });
  ref("users/" + uid + "/redeemUnlocked").on("value", (s) => { unlocked = s.val() === true; applyGate(); });

  $("#redeemFab").onclick = () => sheet.classList.add("show");
  sheet.onclick = (e) => { if (e.target === sheet) sheet.classList.remove("show"); };
  $$("[data-close]", sheet).forEach((b) => b.onclick = () => sheet.classList.remove("show"));

  function unlockRedeem() { unlocked = true; applyGate(); try { ref("users/" + uid + "/redeemUnlocked").set(true); } catch (e) {} }
  $("#rdCopy").onclick = () => { navigator.clipboard?.writeText(code); toast("Code copied — share it with a friend!"); unlockRedeem(); };
  $("#rdShare").onclick = () => {
    const data = { title: "Amoriva", text: `Join me on Amoriva! Use my invite code: ${code}`, url: location.origin + "/index.html" };
    if (navigator.share) navigator.share(data).then(unlockRedeem).catch(() => {});
    else { navigator.clipboard?.writeText(data.text + " " + data.url); toast("Invite copied"); unlockRedeem(); }
  };

  $("#rdBtn").onclick = async () => {
    const amt = Math.round((parseFloat($("#rdAmount").value) || 0) * 100) / 100;
    if (!amt || amt <= 0) { toast("Enter how many points to redeem.", true); return; }
    if (amt > avail) { toast("You only have " + fmtPoints(avail) + " points available.", true); return; }
    try {
      await db.ref(ROOT + "/users/" + uid).update({
        points: Math.round((avail - amt) * 100) / 100,
        redeemedPoints: firebase.database.ServerValue.increment(amt)
      });
      $("#rdAmount").value = "";
      toast("Redeemed " + fmtPoints(amt) + " points! 🎁");
    } catch (e) { toast("Couldn't redeem right now.", true); }
  };
}

/* ---------- Ads (AdSense) ---------- */
function renderAd(el) {
  if (!el) return;
  if (!ADS.client || !ADS.slot) { el.remove(); return; }
  if (!document.getElementById("adsbygoogle-js")) {
    const s = document.createElement("script");
    s.id = "adsbygoogle-js";
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADS.client;
    document.head.appendChild(s);
  }
  el.classList.add("ad-slot");
  el.innerHTML = `<div class="ad-label">Sponsored</div>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${ADS.client}" data-ad-slot="${ADS.slot}"
      data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
}

/* ---------- Chip pickers ---------- */
function chipPicker(container, options, selected = [], max = 99) {
  const set = new Set(selected);
  container.innerHTML = options.map((o) =>
    `<button type="button" class="chip ${set.has(o) ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("");
  container.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const v = b.dataset.v;
    if (set.has(v)) { set.delete(v); b.classList.remove("on"); }
    else {
      if (set.size >= max) { toast(`You can pick up to ${max}`); return; }
      set.add(v); b.classList.add("on");
    }
  });
  return () => [...set];
}
