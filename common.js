/* Amoriva — shared logic (Firebase, auth guard, presence, helpers, nav, ads) */

// 1) Firebase — fill in apiKey / appId from Firebase Console → Project settings → Your apps (Web app)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  return `<div class="avatar ${size}" style="background:${colorFor(uid || user.name)}">
    ${esc(initials(user.name))}${online === undefined ? "" : `<span class="dot ${online ? "online" : ""}"></span>`}
  </div>`;
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
      if (!user) { location.replace("auth.html"); return; }
      const snap = await ref("users/" + user.uid).once("value");
      const profile = snap.val();
      if (needProfile && (!profile || !profile.profileComplete)) { location.replace("setup.html"); return; }
      CURRENT = { user, profile };
      startPresence(user.uid);
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
    <a href="chats.html" class="${active === "chats" ? "on" : ""}"><span class="ic">💬</span>Chats<span class="badge hidden" id="navUnread"></span></a>
    <a href="profile.html" class="${active === "profile" ? "on" : ""}"><span class="ic">👤</span>Profile</a>
  </div>`;
  document.body.appendChild(nav);
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
