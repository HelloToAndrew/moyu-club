// home.js
import { t } from "./i18n.js";

function applyHomeTexts() {
  document.title = t("home", "pageTitle");

  const appTitle = document.getElementById("app-title");
  const appSubtitle = document.getElementById("app-subtitle");
  const hiLabel = document.getElementById("hi-label");
  const settingsLabel = document.getElementById("settings-label");
  const statusSectionTitle = document.getElementById("status-section-title");
  const statusText = document.getElementById("status-text");
  const matchSectionTitle = document.getElementById("match-section-title");
  const matchDesc = document.getElementById("match-desc");
  const savedSectionTitle = document.getElementById("saved-section-title");
  const savedDesc = document.getElementById("saved-desc");
  const savedEmptyText = document.getElementById("saved-empty-text");
  const chatroomLabel = document.getElementById("chatroom-label");
  const chatPlaceholder = document.getElementById("chat-placeholder");
  const startMatchBtn = document.getElementById("start-match-btn");
  const sendBtn = document.getElementById("send-btn");
  const forceEndBtn = document.getElementById("force-end-btn");
  const keepQuestion = document.getElementById("keep-question");
  const keepBtn = document.getElementById("keep-btn");
  const endBtn = document.getElementById("end-btn");
  const chatInput = document.getElementById("chat-input");

  if (appTitle) appTitle.textContent = t("home", "appTitle");
  if (appSubtitle) appSubtitle.textContent = t("home", "appSubtitle");
  if (hiLabel) hiLabel.textContent = t("home", "hiLabel");
  if (settingsLabel) settingsLabel.textContent = t("home", "settingsLabel");
  if (statusSectionTitle)
    statusSectionTitle.textContent = t("home", "statusSectionTitle");
  if (statusText) statusText.textContent = t("home", "statusLoading");
  if (matchSectionTitle)
    matchSectionTitle.textContent = t("home", "matchSectionTitle");
  if (matchDesc) matchDesc.textContent = t("home", "matchSectionDesc");
  if (savedSectionTitle)
    savedSectionTitle.textContent = t("home", "savedSectionTitle");
  if (savedDesc) savedDesc.textContent = t("home", "savedSectionDesc");
  if (savedEmptyText)
    savedEmptyText.textContent = t("home", "savedEmpty");
  if (chatroomLabel)
    chatroomLabel.textContent = t("home", "chatRoomLabel");
  if (chatPlaceholder)
    chatPlaceholder.textContent = t("home", "chatPlaceholder");
  if (startMatchBtn)
    startMatchBtn.textContent = t("home", "startMatching");
  if (sendBtn) sendBtn.textContent = t("home", "sendButton");
  if (forceEndBtn)
    forceEndBtn.textContent = t("home", "forceEndButton");
  if (keepQuestion)
    keepQuestion.textContent = t("home", "keepQuestion");
  if (keepBtn) keepBtn.textContent = t("home", "keepButton");
  if (endBtn) endBtn.textContent = t("home", "endButton");
  if (chatInput)
    chatInput.placeholder = t("home", "chatPlaceholderInput");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyHomeTexts);
} else {
  applyHomeTexts();
}

const nicknameBox = document.getElementById("nickname-box");
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const userData = snap.data() || {};

  // 設定暱稱
  nicknameText.textContent = userData.nickname || "使用者";

  // 設定外框顏色
  applyIdentityFrame(userData.domainType);
});

function applyIdentityFrame(domainType) {
  nicknameBox.classList.remove("identity-free", "identity-company", "identity-school");

  if (domainType === "free") {
    nicknameBox.classList.add("identity-free");
  } else if (domainType === "school") {
    nicknameBox.classList.add("identity-school");
  } else {
    nicknameBox.classList.add("identity-company"); // 預設公司
  }
}