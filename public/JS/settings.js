// settings.js — 最終重構版（無 langSelect + 全 i18n）

import { auth, db } from "./firebase.js";
import { t, getCurrentLang, setCurrentLang } from "./i18n.js";

import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ---------- DOM ----------
const titleEl = document.getElementById("settings-title");
const subtitleEl = document.getElementById("settings-subtitle");

const emailSectionTitleEl = document.getElementById("settings-email-section-title");
const emailLabelEl = document.getElementById("settings-email-label");
const emailTextEl = document.getElementById("email-text");
const emailStatusEl = document.getElementById("email-status");
const resendBtn = document.getElementById("btn-resend");

const nicknameSectionTitleEl = document.getElementById("settings-nickname-section-title");
const nicknameLabelEl = document.getElementById("settings-nickname-label");
const nicknameInput = document.getElementById("nickname-input");

const otherSectionTitleEl = document.getElementById("settings-other-section-title");
const otherDescEl = document.getElementById("settings-other-desc");

const backHomeBtn = document.getElementById("btn-back-home");
const saveProfileBtn = document.getElementById("btn-save-profile");
const logoutBtn = document.getElementById("btn-logout");
const msgEl = document.getElementById("msg");

// 語言按鈕
const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");

// ---------- 狀態 ----------
let currentUser = null;

// ---------- UI 渲染 ----------
function applyTexts() {
  document.title = t("settings", "pageTitle");

  if (titleEl) titleEl.textContent = t("settings", "title");
  if (subtitleEl) subtitleEl.textContent = t("settings", "subtitle");

  if (emailSectionTitleEl) emailSectionTitleEl.textContent = t("settings", "emailSectionTitle");
  if (emailLabelEl) emailLabelEl.textContent = t("settings", "emailLabel");

  if (nicknameSectionTitleEl) nicknameSectionTitleEl.textContent = t("settings", "nicknameSectionTitle");
  if (nicknameLabelEl) nicknameLabelEl.textContent = t("settings", "nicknameLabel");

  if (otherSectionTitleEl) otherSectionTitleEl.textContent = t("settings", "otherSectionTitle");
  if (otherDescEl) otherDescEl.textContent = t("settings", "otherDesc");

  if (backHomeBtn) backHomeBtn.textContent = t("settings", "backHomeBtn");
  if (saveProfileBtn) saveProfileBtn.textContent = t("settings", "saveBtn");
  if (logoutBtn) logoutBtn.textContent = t("settings", "logoutBtn");
  if (resendBtn) resendBtn.textContent = t("settings", "resendBtn");
}

function updateLangButtons(lang) {
  if (!langZhBtn || !langEnBtn) return;

  if (lang === "en") {
    langEnBtn.classList.remove("opacity-50");
    langEnBtn.classList.add("border-slate-300");

    langZhBtn.classList.add("opacity-50");
    langZhBtn.classList.remove("border-slate-300");
  } else {
    langZhBtn.classList.remove("opacity-50");
    langZhBtn.classList.add("border-slate-300");

    langEnBtn.classList.add("opacity-50");
    langEnBtn.classList.remove("border-slate-300");
  }
}

function setMsg(text, isError = false) {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = "moyu-msg mt-3 text-xs " + (isError ? "text-red-400" : "text-slate-300");
}

function updateEmailStatus(verified) {
  if (!emailStatusEl) return;

  if (verified) {
    emailStatusEl.textContent = t("settings", "emailVerifiedText");
    emailStatusEl.className =
      "moyu-badge text-xs border border-emerald-400 text-emerald-300 bg-emerald-900/40";
    if (resendBtn) resendBtn.style.display = "none";
  } else {
    emailStatusEl.textContent = t("settings", "emailNotVerifiedText");
    emailStatusEl.className =
      "moyu-badge text-xs border border-amber-400 text-amber-200 bg-amber-900/40";
    if (resendBtn) resendBtn.style.display = "inline-flex";
  }
}

// 初次渲染
applyTexts();
updateLangButtons(getCurrentLang());

// ---------- 語言切換 ----------
if (langZhBtn) {
  langZhBtn.onclick = () => {
    setCurrentLang("zh");
    applyTexts();
    updateLangButtons("zh");
  };
}
if (langEnBtn) {
  langEnBtn.onclick = () => {
    setCurrentLang("en");
    applyTexts();
    updateLangButtons("en");
  };
}

// ---------- 讀取使用者資料 ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  setMsg(t("settings", "loadingProfile"));

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    let data;

    if (snap.exists()) {
      data = snap.data();
    } else {
      data = {
        email: user.email || "",
        nickname: "",
        verified: false,
        lang: getCurrentLang(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, data, { merge: true });
    }

    // email
    if (emailTextEl) {
      emailTextEl.textContent = data.email || user.email || "—";
    }

    // 驗證狀態（只看 Firestore）
    updateEmailStatus(data.verified === true);

    // 暱稱
    if (nicknameInput) nicknameInput.value = data.nickname || "";

    // 語言同步
    const lang = data.lang === "en" || data.lang === "zh" ? data.lang : getCurrentLang();
    setCurrentLang(lang);
    applyTexts();
    updateLangButtons(lang);

    setMsg(t("settings", "profileLoaded"));
  } catch (err) {
    console.error(err);
    setMsg(t("settings", "loadFailedPrefix") + err.message, true);
  }
});

// ---------- 重寄驗證信 ----------
if (resendBtn) {
  resendBtn.onclick = async () => {
    if (!currentUser) {
      setMsg(t("settings", "needLoginForResend"), true);
      return;
    }

    try {
      setMsg(t("settings", "resendSending"));
      await sendEmailVerification(currentUser);
      setMsg(t("settings", "resendSuccess"));
    } catch (err) {
      setMsg(t("settings", "resendFailedPrefix") + err.message, true);
    }
  };
}

// ---------- 儲存設定 ----------
if (saveProfileBtn) {
  saveProfileBtn.onclick = async () => {
    if (!currentUser) {
      setMsg(t("settings", "needLoginForSave"), true);
      return;
    }

    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      setMsg(t("settings", "nicknameEmpty"), true);
      return;
    }

    const langValue = getCurrentLang();

    try {
      setMsg(t("settings", "savingProfile"));

      await setDoc(
        doc(db, "users", currentUser.uid),
        { nickname, lang: langValue },
        { merge: true }
      );

      applyTexts();
      updateLangButtons(langValue);
      setMsg(t("settings", "saveSuccess"));
    } catch (err) {
      setMsg(t("settings", "saveFailedPrefix") + err.message, true);
    }
  };
}

// ---------- 回主畫面 ----------
if (backHomeBtn) {
  backHomeBtn.onclick = () => {
    window.location.href = "home.html";
  };
}

// ---------- 登出 ----------
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    try {
      await signOut(auth);
    } finally {
      window.location.href = "login.html";
    }
  };
}
