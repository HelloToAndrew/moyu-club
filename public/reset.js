// reset.js
import { getCurrentLang, setCurrentLang, t } from "./i18n.js";

// 從 firebase.js 拿 auth
import { auth } from "./firebase.js";

//  只從 CDN 拿 sendPasswordResetEmail（v11）
import {
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// ---------- DOM ----------
const titleEl = document.getElementById("reset-title");
const subtitleEl = document.getElementById("reset-subtitle");
const emailLabelEl = document.getElementById("reset-email-label");
const emailInput = document.getElementById("reset-email");
const resetBtn = document.getElementById("reset-btn");
const statusEl = document.getElementById("reset-status");
const backLoginBtn = document.getElementById("reset-back-login");

const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");

// ---------- i18n ----------
function applyLangTexts() {
  document.title = t("reset", "pageTitle");
  if (titleEl) titleEl.textContent = t("reset", "title");
  if (subtitleEl) subtitleEl.textContent = t("reset", "subtitle");
  if (emailLabelEl) emailLabelEl.textContent = t("reset", "emailLabel");
  if (resetBtn) resetBtn.textContent = t("reset", "submitBtn");
  if (backLoginBtn)
    backLoginBtn.textContent = t("reset", "backToLogin");
  if (emailInput)
    emailInput.placeholder = t("reset", "emailPlaceholder");
}

function updateLangButtons(lang) {
  langZhBtn.classList.remove(
    "border-slate-300",
    "text-slate-600",
    "text-slate-400"
  );
  langEnBtn.classList.remove(
    "border-slate-300",
    "text-slate-600",
    "text-slate-400"
  );

  if (lang === "en") {
    langEnBtn.classList.add("border-slate-300", "text-slate-600");
    langZhBtn.classList.add("text-slate-400");
  } else {
    langZhBtn.classList.add("border-slate-300", "text-slate-600");
    langEnBtn.classList.add("text-slate-400");
  }
}

let currentLang = getCurrentLang();
applyLangTexts();
updateLangButtons(currentLang);

langZhBtn.onclick = () => {
  setCurrentLang("zh");
  currentLang = "zh";
  applyLangTexts();
  updateLangButtons("zh");
};

langEnBtn.onclick = () => {
  setCurrentLang("en");
  currentLang = "en";
  applyLangTexts();
  updateLangButtons("en");
};

// ---------- Helper ----------
function setStatus(keyOrMsg, isError = false, raw = false) {
  const text = raw ? keyOrMsg : t("reset", keyOrMsg);
  statusEl.textContent = text;
  statusEl.className =
    "mt-3 text-center text-xs " +
    (isError ? "text-red-500" : "text-slate-500");
}

// ---------- Reset flow ----------
resetBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    setStatus("emptyEmail", true);
    return;
  }

  try {
    setStatus("sending");
    await sendPasswordResetEmail(auth, email);
    setStatus("success");
  } catch (err) {
    console.error(err);
    setStatus(t("reset", "failedPrefix") + err.message, true, true);
  }
});

// 返回登入
backLoginBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});
