// signup.js — 連接 i18n + 初始化 verified = false + email domain 分級

import { auth, db } from "./firebase.js";
import { getCurrentLang, setCurrentLang, t } from "./i18n.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ---------- Email domain 分級工具 ----------

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.com.tw",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
]);

function looksLikeSchoolDomain(domain) {
  const d = domain.toLowerCase();

  if (
    d.endsWith(".edu") ||
    d.endsWith(".edu.tw") ||
    d.endsWith(".edu.hk")
  ) {
    return true;
  }

  if (d.endsWith(".ac.jp") || d.endsWith(".ac.uk")) {
    return true;
  }

  return false;
}

// 依照 email 回傳 domain 分類資訊
function classifyDomainFromEmail(email) {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");

  if (parts.length !== 2) {
    return {
      emailDomain: "",
      domainType: "unknown",
      domainSource: "client",
      domainConfidence: 0,
      isFreeEmail: false,
      isSchoolEmail: false,
    };
  }

  const domain = parts[1];

  let domainType = "company";
  let domainConfidence = 50;
  let isFreeEmail = false;
  let isSchoolEmail = false;

  if (FREE_EMAIL_DOMAINS.has(domain)) {
    domainType = "free";
    domainConfidence = 100;
    isFreeEmail = true;
  } else if (looksLikeSchoolDomain(domain)) {
    domainType = "school";
    domainConfidence = 80;
    isSchoolEmail = true;
  }

  return {
    emailDomain: domain,
    domainType,
    domainSource: "client",
    domainConfidence,
    isFreeEmail,
    isSchoolEmail,
  };
}

// ---------- DOM ----------
const titleEl = document.getElementById("signup-title");
const subtitleEl = document.getElementById("signup-subtitle");

const emailLabelEl = document.getElementById("signup-email-label");
const pwLabelEl = document.getElementById("signup-pw-label");
const pw2LabelEl = document.getElementById("signup-pw2-label");

const emailEl = document.getElementById("email");
const pwEl = document.getElementById("pw");
const pw2El = document.getElementById("pw2");

const signupBtn = document.getElementById("btn-signup");
const backLoginBtn = document.getElementById("signup-back-login");
const statusEl = document.getElementById("signup-status");

const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");

// ---------- 狀態 ----------
let currentLang = getCurrentLang();

// ---------- i18n 套用 ----------
function applyLangTexts() {
  document.title = t("signup", "pageTitle");

  if (titleEl) titleEl.textContent = t("signup", "title");
  if (subtitleEl) subtitleEl.textContent = t("signup", "subtitle");

  if (emailLabelEl) emailLabelEl.textContent = t("signup", "emailLabel");
  if (pwLabelEl) pwLabelEl.textContent = t("signup", "passwordLabel");
  if (pw2LabelEl)
    pw2LabelEl.textContent = t("signup", "passwordConfirmLabel");

  if (emailEl) {
    emailEl.placeholder = t("signup", "");
  }

  if (signupBtn) signupBtn.textContent = t("signup", "submitBtn");
  if (backLoginBtn) backLoginBtn.textContent = t("signup", "backToLogin");
}

function updateLangButtons(lang) {
  if (!langZhBtn || !langEnBtn) return;

  // 先清掉，避免 class 疊加
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

// 初始語言
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

// ---------- 狀態顯示 ----------
function setStatus(msgKeyOrText, isError = false, useI18nKey = true) {
  if (!statusEl) return;
  const msg = useI18nKey ? t("signup", msgKeyOrText) : msgKeyOrText;
  statusEl.textContent = msg;
  statusEl.className =
    "mt-3 text-center text-xs " +
    (isError ? "text-red-500" : "text-slate-500");
}

// ---------- 註冊流程 ----------
if (signupBtn) {
  signupBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pw = pwEl.value.trim();
    const pw2 = pw2El.value.trim();

    if (!email || !pw || !pw2) {
      setStatus("fillAllFields", true);
      return;
    }
    if (pw !== pw2) {
      setStatus("passwordNotMatch", true);
      return;
    }
    if (pw.length < 6) {
      setStatus("passwordTooShort", true);
      return;
    }

    try {
      setStatus("creating", false);

      const domainInfo = classifyDomainFromEmail(email);

      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      const user = cred.user;

      await setDoc(doc(db, "users", user.uid), {
        email,
        nickname: "",
        verified: false,
        lang: getCurrentLang(),
        createdAt: new Date().toISOString(),
        emailDomain: domainInfo.emailDomain,
        domainType: domainInfo.domainType,
        domainSource: domainInfo.domainSource,
        domainConfidence: domainInfo.domainConfidence,
        isFreeEmail: domainInfo.isFreeEmail,
        isSchoolEmail: domainInfo.isSchoolEmail,
      });

      await sendEmailVerification(user);

      setStatus("success", false);

      setTimeout(() => {
        window.location.href = "nickname.html";
      }, 800);
    } catch (err) {
      const prefix = t("signup", "failedPrefix");
      setStatus(prefix + err.message, true, false);
    }
  };
}

// 返回登入
if (backLoginBtn) {
  backLoginBtn.onclick = () => {
    window.location.href = "login.html";
  };
}
