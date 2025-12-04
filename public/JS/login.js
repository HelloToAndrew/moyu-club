// login.js — 允許登入，Verify / Nickname 由後續頁面決定是否限制聊天

import { auth, db } from "./firebase.js";
import { getCurrentLang, setCurrentLang, t } from "./i18n.js";

// 僅引入登入需要的功能（不重複初始化）
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  reload,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";


// ---------- DOM ----------
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const emailLoginBtn = document.getElementById("emailLoginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleBtnText = document.getElementById("googleBtnText");
const statusMsg = document.getElementById("statusMsg");

const titleText = document.getElementById("titleText");
const subtitleText = document.getElementById("subtitleText");
const emailLabel = document.getElementById("emailLabel");
const passwordLabel = document.getElementById("passwordLabel");
const forgotBtn = document.getElementById("forgotBtn");
const signupBtn = document.getElementById("signupBtn");
const orText = document.getElementById("orText");

// 語言按鈕
const langZh = document.getElementById("langZh");
const langEn = document.getElementById("langEn");


// ---------- 語言處理 ----------
let currentLang = getCurrentLang();
applyTexts();
updateLangButtons(currentLang);

function applyTexts() {
  document.title = t("login", "pageTitle");
  titleText.textContent = t("login", "title");
  subtitleText.textContent = t("login", "subtitle");
  emailLabel.textContent = t("login", "emailLabel");
  passwordLabel.textContent = t("login", "passwordLabel");
  emailLoginBtn.textContent = t("login", "emailLoginBtn");
  forgotBtn.textContent = t("login", "forgot");
  signupBtn.textContent = t("login", "signup");
  orText.textContent = t("login", "orText");
  googleBtnText.textContent = t("login", "googleBtn");
}

function updateLangButtons(lang) {
  // 先清空狀態，避免 class 疊加
  langZh.classList.remove("border-slate-300", "text-slate-600", "text-slate-400");
  langEn.classList.remove("border-slate-300", "text-slate-600", "text-slate-400");

  if (lang === "en") {
    langEn.classList.add("border-slate-300", "text-slate-600");
    langZh.classList.add("text-slate-400");
  } else {
    langZh.classList.add("border-slate-300", "text-slate-600");
    langEn.classList.add("text-slate-400");
  }
}

langZh.onclick = () => {
  currentLang = "zh";
  setCurrentLang("zh");
  applyTexts();
  updateLangButtons("zh");
};

langEn.onclick = () => {
  currentLang = "en";
  setCurrentLang("en");
  applyTexts();
  updateLangButtons("en");
};


// ---------- Firestore：確保 user doc 存在並同步狀態 ----------
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const lang = getCurrentLang() || "zh";

  if (!snap.exists()) {
    // 新使用者：建立文件
    await setDoc(ref, {
      email: user.email || "",
      nickname: "",
      verified: user.emailVerified || false,
      lang,
      createdAt: new Date().toISOString(),
    });
  } else {
    // 舊使用者：更新 verified / lang，但不改 nickname
    const data = snap.data() || {};
    await setDoc(
      ref,
      {
        verified:
          typeof data.verified === "boolean"
            ? (data.verified || user.emailVerified)
            : user.emailVerified,
        lang: data.lang || lang,
      },
      { merge: true }
    );
  }
}


// ---------- 登入後導向（不再強制 verify / nickname） ----------
async function goNext(user) {
  await ensureUserDoc(user);
  // 之後是否能聊天，由 home / setting 根據 verified / nickname 欄位決定
  window.location.href = "home.html";
}


// ---------- Email login ----------
emailLoginBtn.onclick = async () => {
  statusMsg.textContent = t("login", "loggingIn");

  const email = emailInput.value.trim();
  const pw = passwordInput.value.trim();

  if (!email || !pw) {
    alert(t("login", "emptyEmailPw"));
    statusMsg.textContent = "";
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    // 確保拿到最新的 emailVerified 狀態（給 ensureUserDoc 用）
    await reload(user);

    await goNext(user);
  } catch (err) {
    console.error(err);
    statusMsg.textContent = t("login", "loginFailed") + err.message;
  }
};


// ---------- Google login ----------
const provider = new GoogleAuthProvider();

googleLoginBtn.onclick = async () => {
  statusMsg.textContent = t("login", "loggingIn");

  try {
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    await goNext(user);
  } catch (err) {
    console.error(err);
    statusMsg.textContent = t("login", "loginFailed") + err.message;
  }
};


// ---------- 若已登入，自動進入 home ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    await reload(user);
    await goNext(user);
  } catch (err) {
    console.error(err);
  }
});
