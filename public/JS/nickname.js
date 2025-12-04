// nickname.js — 設定暱稱 + 同 domain 不可重複

import { auth, db } from "./firebase.js";
import { getCurrentLang, setCurrentLang, t } from "./i18n.js";

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ---------- DOM ----------
const titleEl = document.getElementById("nickname-title");
const subtitleEl = document.getElementById("nickname-subtitle");
const labelEl = document.getElementById("nickname-label");
const inputEl = document.getElementById("nickname-input");
const hintEl = document.getElementById("nickname-hint");
const saveBtn = document.getElementById("nickname-save-btn");
const statusEl = document.getElementById("nickname-status");

const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");

// ---------- 狀態 ----------
let currentUser = null;
let currentLang = getCurrentLang() || "zh";
let currentDomain = ""; // emailDomain，用來檢查同公司暱稱重複

// ---------- i18n ----------
function applyLangTexts() {
  document.title = t("nickname", "pageTitle");
  if (titleEl) titleEl.textContent = t("nickname", "title");
  if (subtitleEl) subtitleEl.textContent = t("nickname", "subtitle");
  if (labelEl) labelEl.textContent = t("nickname", "label");
  if (hintEl) hintEl.textContent = t("nickname", "hint");
  if (saveBtn) saveBtn.textContent = t("nickname", "saveBtn");
  if (inputEl) inputEl.placeholder = t("nickname", "placeholder");
}

function updateLangButtons(lang) {
  if (!langZhBtn || !langEnBtn) return;

  langZhBtn.classList.remove("border-slate-300", "text-slate-600", "text-slate-400");
  langEnBtn.classList.remove("border-slate-300", "text-slate-600", "text-slate-400");

  if (lang === "en") {
    langEnBtn.classList.add("border-slate-300", "text-slate-600");
    langZhBtn.classList.add("text-slate-400");
  } else {
    langZhBtn.classList.add("border-slate-300", "text-slate-600");
    langEnBtn.classList.add("text-slate-400");
  }
}

// 初始套用一次
applyLangTexts();
updateLangButtons(currentLang);

// ---------- 語言切換 ----------
if (langZhBtn) {
  langZhBtn.onclick = () => {
    currentLang = "zh";
    setCurrentLang("zh");
    applyLangTexts();
    updateLangButtons("zh");
  };
}

if (langEnBtn) {
  langEnBtn.onclick = () => {
    currentLang = "en";
    setCurrentLang("en");
    applyLangTexts();
    updateLangButtons("en");
  };
}

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

      // 儲存 emailDomain，之後用來做同 domain 暱稱檢查
      if (data.emailDomain) {
        currentDomain = data.emailDomain;
      }

      // 讀取語言設定，同步到 i18n
      if (data.lang === "zh" || data.lang === "en") {
        currentLang = data.lang;
        setCurrentLang(currentLang);
        applyLangTexts();
        updateLangButtons(currentLang);
      }

      // 如果之前已經有暱稱，預先帶入
      if (data.nickname) {
        inputEl.value = data.nickname;
      }
    }
  } catch (err) {
    console.error("載入暱稱失敗：", err);
    setStatus(t("nickname", "errorPrefix") + err.message, true, true);
  }
});

// ---------- 儲存暱稱 ----------
saveBtn.addEventListener("click", async () => {
  const nickname = inputEl.value.trim();

  if (!nickname) {
    setStatus("empty", true);
    return;
  }

  // 可視需求加長度限制
  if (nickname.length < 2 || nickname.length > 20) {
    setStatus("lengthInvalid", true);
    return;
  }

  if (!currentUser) {
    setStatus(t("nickname", "errorPrefix") + "No user.", true, true);
    window.location.href = "login.html";
    return;
  }

  setStatus("saving");

  try {
    const uid = currentUser.uid;

    // --- 同 domain 暱稱不可重複檢查 ---
    if (currentDomain) {
      const usersCol = collection(db, "users");
      const q = query(
        usersCol,
        where("emailDomain", "==", currentDomain),
        where("nickname", "==", nickname)
      );

      const snap = await getDocs(q);
      const taken = snap.docs.some((docSnap) => docSnap.id !== uid);

      if (taken) {
        // 這個 key 要在 i18n.js 裡加入，例如：
        // zh: "這個暱稱在你公司已有人使用，換一個吧 🐟"
        setStatus("duplicateInDomain", true);
        return;
      }
    }

    // --- 寫回 Firestore ---
    await setDoc(
      doc(db, "users", uid),
      {
        nickname,
        lang: currentLang,
      },
      { merge: true }
    );

    // 同步本地
    localStorage.setItem("moyu_nickname", nickname);
    setCurrentLang(currentLang);

    setStatus("saved");

    // 短暫顯示「已儲存」，再進入首頁
    setTimeout(() => {
      window.location.href = "home.html";
    }, 600);
  } catch (err) {
    console.error(err);
    setStatus(t("nickname", "errorPrefix") + err.message, true, true);
  }
});
