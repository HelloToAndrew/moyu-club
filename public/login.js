// login.js — Firestore verified 為唯一登入標準

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


// ---------- Firestore 判斷 verified ----------
async function checkVerified(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return false;
  
  return snap.data().verified === true;
}


// ---------- Email login ----------
emailLoginBtn.onclick = async () => {
  statusMsg.textContent = t("login", "loggingIn");

  const email = emailInput.value.trim();
  const pw = passwordInput.value.trim();

  if (!email || !pw) {
    alert(t("login", "emptyEmailPw"));
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    await reload(user);

    const ok = await checkVerified(user.uid);
    if (!ok) {
      alert(t("login", "needVerify"));
      return;
    }

    window.location.href = "home.html";
  } catch (err) {
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

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        email: user.email,
        nickname: "",
        verified: true,
        lang: getCurrentLang(),
        createdAt: new Date().toISOString(),
      });
    }

    window.location.href = "home.html";
  } catch (err) {
    statusMsg.textContent = t("login", "loginFailed") + err.message;
  }
};


// ---------- 若已登入且 verified = true，直接進入 home ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const ok = await checkVerified(user.uid);
  if (ok) window.location.href = "home.html";
});
