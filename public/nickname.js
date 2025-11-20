// nickname.js
  // 用共用 firebase.js
  import { app, auth, db } from "./firebase.js";

  // 只從 CDN 拿需要的函式（v11）
  import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
  import {
    doc,
    getDoc,
    setDoc,
  } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
// ---------- DOM ----------
const titleEl = document.getElementById("nickname-title");
const subtitleEl = document.getElementById("nickname-subtitle");
const labelEl = document.getElementById("nickname-label");
const inputEl = document.getElementById("nickname-input");
const hintEl = document.getElementById("nickname-hint");
const saveBtn = document.getElementById("nickname-save-btn");
const statusEl = document.getElementById("nickname-status");

let currentUser = null;
let currentLang = getCurrentLang();

// ---------- i18n ----------
function applyLangTexts() {
  document.title = t("nickname", "pageTitle");
  if (titleEl) titleEl.textContent = t("nickname", "title");
  if (subtitleEl) subtitleEl.textContent = t("nickname", "subtitle");
  if (labelEl) labelEl.textContent = t("nickname", "label");
  if (hintEl) hintEl.textContent = t("nickname", "hint");
  if (saveBtn) saveBtn.textContent = t("nickname", "saveBtn");
  if (inputEl)
    inputEl.placeholder = t("nickname", "placeholder");
}

// 初始套用一次
applyLangTexts();

// ---------- Helper ----------
function setStatus(keyOrMsg, isError = false, raw = false) {
  const text = raw ? keyOrMsg : t("nickname", keyOrMsg);
  statusEl.textContent = text;
  statusEl.className =
    "mt-3 text-center text-[11px] " +
    (isError ? "text-red-500" : "text-slate-400");
}

// ---------- Auth + 資料載入 ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();

      // 讀取語言設定，同步到 i18n
      if (data.lang === "zh" || data.lang === "en") {
        currentLang = data.lang;
        setCurrentLang(currentLang);
        applyLangTexts();
      }

      // 如果之前已經有暱稱，預先帶入
      if (data.nickname) {
        inputEl.value = data.nickname;
      }
    }
  } catch (err) {
    console.error("載入暱稱失敗：", err);
  }
});

// ---------- 儲存暱稱 ----------
saveBtn.addEventListener("click", async () => {
  const nickname = inputEl.value.trim();
  if (!nickname) {
    setStatus("empty", true);
    return;
  }

  if (!currentUser) {
    setStatus("errorPrefix" + "No user.", true, true);
    window.location.href = "login.html";
    return;
  }

  setStatus("saving");

  try {
    const uid = currentUser.uid;
    await setDoc(
      doc(db, "users", uid),
      {
        nickname,
        lang: currentLang, // 跟 login / home 一致用 lang
      },
      { merge: true }
    );

    // 同步本地
    localStorage.setItem("moyu_nickname", nickname);
    setCurrentLang(currentLang);

    setStatus("saved");
    // 稍微停一下再導回首頁也可以，你如果想加 setTimeout 再說
    window.location.href = "home.html";
  } catch (err) {
    console.error(err);
    setStatus(t("nickname", "errorPrefix") + err.message, true, true);
  }
});
