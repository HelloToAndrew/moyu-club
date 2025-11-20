// settings.js - 使用 Firestore.verified 作為判斷標準，只從 firebase.js 拿連線

import { auth, db } from "./firebase.js";
import { getCurrentLang, setCurrentLang, t } from "./i18n.js";

import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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

const langSectionTitleEl = document.getElementById("settings-lang-section-title");
const langLabelEl = document.getElementById("settings-lang-label");
const langSelect = document.getElementById("lang-select");

const otherSectionTitleEl = document.getElementById("settings-other-section-title");
const otherDescEl = document.getElementById("settings-other-desc");

const btnBackHomeEl = document.getElementById("btn-back-home");
const btnSaveProfileEl = document.getElementById("btn-save-profile");
const btnLogoutEl = document.getElementById("btn-logout");

const msgEl = document.getElementById("msg");

// ---------- 狀態 ----------
let currentLang = getCurrentLang();
let currentUserId = null;
let verifiedFlag = null;        // Firestore 的 verified
let isLoggingOut = false;       // 🔑 用來避免登出時還被當成「未登入」

// ---------- 工具 ----------
function showMsg(text) {
  if (msgEl) msgEl.textContent = text || "";
}

// ---------- 套用 i18n ----------
function applyTexts() {
  document.title = t("settings", "pageTitle");

  if (titleEl) titleEl.textContent = t("settings", "title");
  if (subtitleEl) subtitleEl.textContent = t("settings", "subtitle");

  if (emailSectionTitleEl)
    emailSectionTitleEl.textContent = t("settings", "emailSectionTitle");
  if (emailLabelEl)
    emailLabelEl.textContent = t("settings", "emailLabel");

  if (nicknameSectionTitleEl)
    nicknameSectionTitleEl.textContent = t("settings", "nicknameSectionTitle");
  if (nicknameLabelEl)
    nicknameLabelEl.textContent = t("settings", "nicknameLabel");
  if (nicknameInput)
    nicknameInput.placeholder = t("settings", "nicknamePlaceholder");

  if (langSectionTitleEl)
    langSectionTitleEl.textContent = t("settings", "langSectionTitle");
  if (langLabelEl)
    langLabelEl.textContent = t("settings", "langLabel");

  if (otherSectionTitleEl)
    otherSectionTitleEl.textContent = t("settings", "otherSectionTitle");
  if (otherDescEl)
    otherDescEl.textContent = t("settings", "otherDesc");

  if (btnBackHomeEl)
    btnBackHomeEl.textContent = t("settings", "backHome");
  if (btnSaveProfileEl)
    btnSaveProfileEl.textContent = t("settings", "saveProfile");
  if (btnLogoutEl)
    btnLogoutEl.textContent = t("settings", "logoutBtn");
  if (resendBtn)
    resendBtn.textContent = t("settings", "resendBtn");

  // email badge 顯示
  if (!emailStatusEl) return;

  if (verifiedFlag === true) {
    emailStatusEl.textContent = t("settings", "emailVerified");
    emailStatusEl.classList.remove("warn");
    emailStatusEl.classList.add("ok");
  } else if (verifiedFlag === false) {
    emailStatusEl.textContent = t("settings", "emailUnverified");
    emailStatusEl.classList.remove("ok");
    emailStatusEl.classList.add("warn");
  } else {
    emailStatusEl.textContent = t("settings", "emailChecking");
    emailStatusEl.classList.remove("ok");
    emailStatusEl.classList.add("warn");
  }
}

// 初始語言
applyTexts();
if (langSelect) langSelect.value = currentLang;

// ---------- 讀 Firestore 的 user doc ----------
async function loadUserDoc(uid, email) {
  const ref = doc(db, "users", uid);
  let snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: email || "",
      nickname: "",
      lang: currentLang,
      verified: false,
      createdAt: new Date().toISOString(),
    });
    snap = await getDoc(ref);
  }

  return snap.data();
}

// ---------- Auth 監聽 ----------
onAuthStateChanged(auth, async (user) => {
  // 🔑 登出後的 user=null 也會觸發這裡
  if (!user) {
    if (isLoggingOut) {
      // 是使用者按「登出」造成的，就安靜地導回登入
      window.location.href = "login.html";
    } else {
      // 一開始就沒有登入，才給這個提示
      alert(t("settings", "alertNotLoggedIn"));
      window.location.href = "login.html";
    }
    return;
  }

  currentUserId = user.uid;
  if (emailTextEl) emailTextEl.textContent = user.email || "(無)";

  try {
    const data = await loadUserDoc(user.uid, user.email);

    // 暱稱
    if (nicknameInput) nicknameInput.value = data.nickname || "";

    // 語言：Firestore 優先，localStorage 次之
    if (data.lang === "zh" || data.lang === "en") {
      currentLang = data.lang;
      setCurrentLang(currentLang);
    } else {
      currentLang = getCurrentLang();
    }
    if (langSelect) langSelect.value = currentLang;

    // verified 只看 Firestore 的欄位
    verifiedFlag = data.verified === true;

    applyTexts();
  } catch (err) {
    console.error(err);
    showMsg(t("settings", "msgLoadErrorPrefix") + err.message);
  }
});

// ---------- 語言下拉切換 ----------
if (langSelect) {
  langSelect.addEventListener("change", async () => {
    const newLang = langSelect.value === "en" ? "en" : "zh";
    currentLang = newLang;
    setCurrentLang(newLang);
    applyTexts();

    if (!currentUserId) return;

    try {
      await updateDoc(doc(db, "users", currentUserId), { lang: newLang });
      showMsg(t("settings", "msgLangSaved"));
    } catch (err) {
      console.error(err);
      showMsg(t("settings", "msgLoadErrorPrefix") + err.message);
    }
  });
}

// ---------- 儲存暱稱 ----------
window.saveProfile = async function () {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    alert(t("settings", "alertNicknameEmpty"));
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert(t("settings", "alertNeedLogin"));
    window.location.href = "login.html";
    return;
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        nickname,
        lang: currentLang,
      },
      { merge: true }
    );
    showMsg(t("settings", "msgProfileSaved"));
  } catch (err) {
    console.error(err);
    alert(t("settings", "msgLoadErrorPrefix") + err.message);
  }
};

// ---------- 重新寄送驗證信 ----------
window.resendVerify = async function () {
  const user = auth.currentUser;
  if (!user) {
    alert(t("settings", "alertNeedLogin"));
    return;
  }

  try {
    await sendEmailVerification(user);
    alert(t("settings", "alertVerifySent"));
  } catch (err) {
    console.error(err);
    alert(t("settings", "alertVerifyFailPrefix") + err.message);
  }
};

// ---------- 回主畫面 ----------
window.goHome = function () {
  window.location.href = "home.html";
};

// ---------- 登出 ----------
window.logout = async function () {
  isLoggingOut = true; // ⬅️ 告訴 listener：接下來的 user=null 是我自己要的
  try {
    await signOut(auth);
    // 真的登出後會由 onAuthStateChanged 負責 redirect
  } catch (err) {
    isLoggingOut = false;
    alert(t("settings", "alertLogoutFailPrefix") + err.message);
  }
};
