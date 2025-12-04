// client.js
// Firebase + Socket.io + 前端主邏輯

// --- Firebase imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  reload,              // ✅ 新增：用來更新 emailVerified 狀態
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  increment,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// --- i18n ---
import { t, getCurrentLang, setCurrentLang } from "./i18n.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyB4oaUyo3RWJnnLLN3CkiiJ8wimp_43kko",
  authDomain: "moyu-club.firebaseapp.com",
  projectId: "moyu-club",
  storageBucket: "moyu-club.firebasestorage.app",
  messagingSenderId: "178708686787",
  appId: "1:178708686787:web:be7c38dfe3d29a6695bf76",
  measurementId: "G-GPV3CMCZ0T",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 語系 helper ---
let currentLang = getCurrentLang();
function tLocal(key, ...args) {
  return t("home", key, ...args);
}

// --- DOM 快速取用 ---
const nicknameText = document.getElementById("nickname-text");
const statusText = document.getElementById("status-text") || null;

const identityLabelEl = document.getElementById("identity-label");

const matchPanel = document.getElementById("match-panel");
const matchDesc = document.getElementById("match-desc");
const startMatchBtn = document.getElementById("start-match-btn");
const stopMatchBtn = document.getElementById("stop-match-btn");

const chatCard = document.getElementById("chat-card");
const chatTitle = document.getElementById("chat-title");
const chatroomLabel = document.getElementById("chatroom-label");
const chatPlaceholder = document.getElementById("chat-placeholder");
const messagesEl = document.getElementById("messages");
const countdownWrap = document.getElementById("countdown-wrap");
const countdownPrefix = document.getElementById("countdown-prefix");
const countdownEl = document.getElementById("countdown");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const forceEndBtn = document.getElementById("force-end-btn");

const keepActions = document.getElementById("keep-actions");
const keepBtn = document.getElementById("keep-btn");
const endBtn = document.getElementById("end-btn");
const keepQuestion = document.getElementById("keep-question");
const keepHint = document.getElementById("keep-hint");

const savedListEl = document.getElementById("saved-list");
const savedUsageEl = document.getElementById("saved-usage");

const settingsBtn = document.getElementById("settings-btn");
const logoutBtn = document.getElementById("logout-btn") || null;

// --- 狀態變數 ---
let socket = null;
let currentUser = null;
let currentUid = null;
let currentNickname = "";

let currentDomainType = "unknown"; // free / school / company / unknown
let currentEmailDomain = "";
let currentOrgLabel = ""; // ASML / NTU / GMAIL...

let chatMode = null; // "random" or "saved"
let chatLocked = false;
let countdownTimer = null;
let countdownRemaining = 5; // 聊天階段倒數秒數

// 🔹 保留階段 10 秒倒數
let keepCountdownTimer = null;
let keepCountdownRemaining = 10;

let currentPartnerUid = null;
let currentPartnerNickname = null;
let currentPartnerOrgLabel = "";
let currentPartnerIdentityType = "unknown";

let currentRoomId = null;

// 保留房間與未讀訊息
let savedRoomIds = [];
let savedMaxSlots = 1;
let savedUsedSlots = 0;

const unreadRooms = new Set();
const savedRoomMessages = new Map(); // roomId -> [{ text, from, timestamp, roomId }]

// 避免按 Enter 送出兩次
let lastSendAt = 0;

// --- UI helpers ---
function setStatus(msg) {
  if (statusText) statusText.textContent = msg;
}

function showMatchPanel() {
  if (!matchPanel) return;
  matchPanel.classList.remove("hidden");
  startMatchBtn.disabled = false;
  stopMatchBtn.classList.add("hidden");
  setMatchButtonIdle();
}

function hideMatchPanel() {
  if (!matchPanel) return;
  matchPanel.classList.add("hidden");
}

function disableMatchPanelWhileChat() {
  hideMatchPanel();
  startMatchBtn.disabled = true;
  stopMatchBtn.classList.add("hidden");
}

function showChatCard() {
  chatCard.classList.remove("hidden");
}

function hideChatCard() {
  chatCard.classList.add("hidden");
}

function showCountdown() {
  countdownWrap.classList.remove("hidden");
  if (countdownPrefix) {
    countdownPrefix.textContent = tLocal("countdownPrefix");
  }
}

function hideCountdown() {
  countdownWrap.classList.add("hidden");
}

function updateCountdownUI() {
  if (!countdownEl) return;
  countdownEl.textContent = `${countdownRemaining}s`;
}

function startCountdown() {
  stopCountdown();
  chatLocked = false;
  countdownRemaining = 5;
  showCountdown();
  updateCountdownUI();

  countdownTimer = setInterval(() => {
    countdownRemaining -= 1;
    if (countdownRemaining <= 0) {
      stopCountdown();
      chatLocked = true;
      hideCountdown();
      showKeepActions();
      appendSystemMessage(tLocal("timeUp"));
    } else {
      updateCountdownUI();
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// --- 保留階段 10 秒倒數 ---
function startKeepCountdown() {
  stopKeepCountdown();
  keepCountdownRemaining = 10;
  if (keepHint) {
    keepHint.textContent = tLocal("keepCountdownText", keepCountdownRemaining);
  }
  keepCountdownTimer = setInterval(() => {
    keepCountdownRemaining -= 1;
    if (keepCountdownRemaining <= 0) {
      stopKeepCountdown();
      if (socket) {
        socket.emit("end-chat");
      }
    } else if (keepHint) {
      keepHint.textContent = tLocal(
        "keepCountdownText",
        keepCountdownRemaining
      );
    }
  }, 1000);
}

function stopKeepCountdown() {
  if (keepCountdownTimer) {
    clearInterval(keepCountdownTimer);
    keepCountdownTimer = null;
  }
}

// --- 開始摸魚按鈕狀態 ---
function setMatchButtonSearching() {
  if (!startMatchBtn) return;
  startMatchBtn.disabled = true;
  startMatchBtn.classList.add("moyu-btn-searching");
  startMatchBtn.textContent = tLocal("matchingBtn");
  if (stopMatchBtn) {
    stopMatchBtn.classList.remove("hidden");
    stopMatchBtn.textContent = tLocal("stopMatching");
  }
}

function setMatchButtonIdle() {
  if (!startMatchBtn) return;
  startMatchBtn.disabled = false;
  startMatchBtn.classList.remove("moyu-btn-searching");
  startMatchBtn.textContent = tLocal("startMatching");
  if (stopMatchBtn) {
    stopMatchBtn.classList.add("hidden");
  }
}

function showKeepActions() {
  keepActions.classList.remove("hidden");
  startKeepCountdown();
}

function hideKeepActions() {
  keepActions.classList.add("hidden");
  keepHint.textContent = "";
  stopKeepCountdown();
}

function clearMessages() {
  messagesEl.innerHTML = "";
}

function appendSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "text-center text-[11px] text-slate-400 my-1";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- 身份顏色＋單位 label ---
function getOrgLabelFromDomain(emailDomain) {
  if (!emailDomain) return "";
  const head = emailDomain.split(".")[0] || "";
  if (!head) return "";
  return head.toUpperCase();
}

function renderIdentityLabel(userData) {
  if (!identityLabelEl) return;
  const type = userData?.domainType || "unknown";
  const emailDomain = userData?.emailDomain || "";
  const orgLabel = getOrgLabelFromDomain(emailDomain);

  currentDomainType = type;
  currentEmailDomain = emailDomain;
  currentOrgLabel = orgLabel;

  let typeClass = "moyu-id-unknown";
  if (type === "company") typeClass = "moyu-id-company";
  else if (type === "school") typeClass = "moyu-id-school";
  else if (type === "free") typeClass = "moyu-id-free";

  identityLabelEl.className = `moyu-identity-label ${typeClass}`;
  identityLabelEl.textContent = orgLabel || "";
}

// --- 聊天訊息泡泡（含暱稱＋單位）---
function appendChatMessage(text, isMe, meta) {
  if (!text) return;

  let name = "";
  let orgLabel = "";
  let identityType = "";

  if (typeof meta === "string") {
    name = meta;
  } else if (meta) {
    name = meta.name || "";
    orgLabel = meta.orgLabel || "";
    identityType = meta.identityType || "";
  }

  const wrap = document.createElement("div");
  wrap.className = `flex ${isMe ? "justify-end" : "justify-start"}`;

  const bubble = document.createElement("div");
  bubble.className =
    "moyu-chat-bubble " +
    (isMe ? "moyu-chat-bubble-me" : "moyu-chat-bubble-other");

  // Header：只有「對方」才顯示 暱稱＋身份匡
  if (!isMe) {
    const header = document.createElement("div");
    header.className = "flex items-center gap-1 mb-0.5";

    const nameSpan = document.createElement("span");
    nameSpan.className = "moyu-chat-name";
    nameSpan.textContent = name || "對方";
    header.appendChild(nameSpan);

    if (orgLabel) {
      const orgSpan = document.createElement("span");
      let typeClass = "moyu-id-unknown";
      if (identityType === "company") typeClass = "moyu-id-company";
      else if (identityType === "school") typeClass = "moyu-id-school";
      else if (identityType === "free") typeClass = "moyu-id-free";

      orgSpan.className = `moyu-identity-label moyu-identity-label-inline ${typeClass}`;
      orgSpan.textContent = orgLabel;
      header.appendChild(orgSpan);
    }

    bubble.appendChild(header);
  }

  const textSpan = document.createElement("div");
  textSpan.textContent = text;
  bubble.appendChild(textSpan);

  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateChatTitle() {
  if (!currentPartnerNickname) {
    chatTitle.textContent = tLocal("chatNotMatched");
    return;
  }
  if (chatMode === "saved") {
    chatTitle.textContent = tLocal("chatTitleSaved", currentPartnerNickname);
  } else {
    chatTitle.textContent = tLocal("chatTitleRandom", currentPartnerNickname);
  }
}

function resetChatState() {
  stopCountdown();
  stopKeepCountdown();
  hideCountdown();
  hideKeepActions();
  chatLocked = false;
  chatMode = null;
  currentPartnerUid = null;
  currentPartnerNickname = null;
  currentPartnerOrgLabel = "";
  currentPartnerIdentityType = "unknown";
  currentRoomId = null;
  clearMessages();
  chatInput.value = "";
  chatPlaceholder.textContent = tLocal("chatPlaceholder");
  updateChatTitle();
}

function backToHomeIdle() {
  resetChatState();
  hideChatCard();
  showMatchPanel();
  setStatus(tLocal("statusIdle"));
}

// --- 未讀紅點 UI ---
function refreshUnreadUI() {
  if (!savedListEl) return;

  savedListEl.querySelectorAll("div[data-room-id]").forEach((row) => {
    const roomId = row.getAttribute("data-room-id");
    const dot = row.querySelector(".unread-dot");
    if (!dot) return;

    if (unreadRooms.has(roomId)) {
      dot.classList.remove("hidden");
    } else {
      dot.classList.add("hidden");
    }
  });
}

// --- 保留上限顯示 ---
function updateSavedUsageUI() {
  if (!savedUsageEl) return;
  savedUsageEl.textContent = tLocal(
    "savedUsageLabel",
    savedUsedSlots,
    savedMaxSlots
  );
}

// --- Firestore：儲存 / 載入已保留緣分與訊息 ---

async function saveRoomToFirestore(roomId, myUid, partnerUid, partnerNickname) {
  if (!roomId || !myUid || !partnerUid) return;

  const createdAt = new Date().toISOString();

  await setDoc(
    doc(db, "rooms", roomId),
    {
      participants: [myUid, partnerUid],
      createdAt,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", myUid, "savedRooms", roomId),
    {
      roomId,
      partnerUid,
      partnerNickname,
      createdAt,
      lastReadAt: createdAt,
      unreadCount: 0,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", partnerUid, "savedRooms", roomId),
    {
      roomId,
      partnerUid: myUid,
      partnerNickname: currentNickname,
      createdAt,
      lastReadAt: createdAt,
      unreadCount: 0,
    },
    { merge: true }
  );
}

async function saveMessageToFirestore(roomId, text, fromUid, fromNickname) {
  if (!roomId || !fromUid || !text) return;

  const roomRef = doc(db, "rooms", roomId);
  const msgsCol = collection(roomRef, "messages");
  const now = serverTimestamp();

  await addDoc(msgsCol, {
    text,
    fromUid,
    fromNickname,
    createdAt: now,
  });

  await setDoc(
    roomRef,
    {
      lastMessageAt: now,
    },
    { merge: true }
  );
}

async function loadSavedRooms() {
  if (!currentUid) return;
  savedListEl.innerHTML = `<div class="text-xs text-slate-500">${tLocal(
    "savedLoading"
  )}</div>`;

  const colRef = collection(db, "users", currentUid, "savedRooms");
  const snap = await getDocs(colRef);

  if (snap.empty) {
    savedListEl.innerHTML = `<div class="text-xs text-slate-500">${tLocal(
      "savedEmpty"
    )}</div>`;
    savedRoomIds = [];
    unreadRooms.clear();
    savedUsedSlots = 0;
    updateSavedUsageUI();
    return;
  }

  const rows = [];
  unreadRooms.clear();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const roomId = data.roomId;
    const unreadCount = data.unreadCount || 0;

    rows.push({
      roomId,
      partnerUid: data.partnerUid,
      partnerNickname: data.partnerNickname || "摸魚夥伴",
      createdAt: data.createdAt,
      unreadCount,
    });

    if (unreadCount > 0) {
      unreadRooms.add(roomId);
    }
  });

  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  savedRoomIds = rows.map((r) => r.roomId);
  savedUsedSlots = rows.length;
  updateSavedUsageUI();

  let html = "";
  rows.forEach((r) => {
    html += `
      <div
        class="moyu-saved-row"
        data-room-id="${r.roomId}"
        data-partner-uid="${r.partnerUid}"
        data-partner-nickname="${r.partnerNickname}"
      >
        <div class="flex flex-col">
          <div class="text-sm text-slate-50">${r.partnerNickname}</div>
          <div class="text-[11px] text-slate-500">
            ID: ${r.roomId.slice(0, 8)}...
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="moyu-saved-btn-reopen text-[11px]"
            data-action="reopen"
            data-room-id="${r.roomId}"
          >
            ${tLocal("savedAgain")}
          </button>
          <button
            class="moyu-saved-btn-delete text-[11px]"
            data-action="delete"
            data-room-id="${r.roomId}"
          >
            ${tLocal("deleteButton")}
          </button>
          <span class="unread-dot w-2 h-2 rounded-full bg-red-500 hidden"></span>
        </div>
      </div>
    `;
  });

  savedListEl.innerHTML = html;

  savedListEl.querySelectorAll(".moyu-saved-row").forEach((row) => {
    const roomId = row.getAttribute("data-room-id");
    const partnerNickname = row.getAttribute("data-partner-nickname");

    row.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      if (action === "reopen") {
        openSavedChat(roomId, partnerNickname);
      } else if (action === "delete") {
        handleDeleteSavedRoom(roomId);
      }
    });
  });

  if (socket && savedRoomIds.length > 0) {
    socket.emit("subscribe-saved-rooms", { roomIds: savedRoomIds });
  }

  refreshUnreadUI();
}

async function loadRoomHistoryFromFirestore(roomId) {
  const roomRef = doc(db, "rooms", roomId);
  const msgsCol = collection(roomRef, "messages");
  const q = query(msgsCol, orderBy("createdAt", "asc"));

  const snap = await getDocs(q);
  const list = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    list.push({
      text: data.text || "",
      from: data.fromNickname || "對方",
      timestamp: data.createdAt ? data.createdAt.toDate().toISOString() : "",
      roomId,
    });
  });

  savedRoomMessages.set(roomId, list);
  return list;
}

async function markRoomAsRead(roomId) {
  if (!currentUid || !roomId) return;

  const savedRoomRef = doc(db, "users", currentUid, "savedRooms", roomId);
  try {
    await updateDoc(savedRoomRef, {
      lastReadAt: serverTimestamp(),
      unreadCount: 0,
    });
  } catch (err) {
    console.error("標記房間已讀失敗：", err);
  }
}

async function incrementUnreadForRoom(roomId) {
  if (!currentUid || !roomId) return;

  const savedRoomRef = doc(db, "users", currentUid, "savedRooms", roomId);
  try {
    await updateDoc(savedRoomRef, {
      unreadCount: increment(1),
    });
  } catch (err) {
    console.error("更新未讀數量失敗：", err);
  }
}

async function handleDeleteSavedRoom(roomId) {
  if (!roomId || !currentUid) return;
  const ok = window.confirm(tLocal("deleteConfirm"));
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "users", currentUid, "savedRooms", roomId));
    await deleteDoc(doc(db, "rooms", roomId));

    if (socket) {
      socket.emit("delete-saved-room", { roomId });
    }

    savedRoomMessages.delete(roomId);
    unreadRooms.delete(roomId);
    savedRoomIds = savedRoomIds.filter((id) => id !== roomId);
    savedUsedSlots = Math.max(savedUsedSlots - 1, 0);

    if (chatMode === "saved" && currentRoomId === roomId) {
      appendSystemMessage(tLocal("deleteHint"));
      backToHomeIdle();
    }

    await loadSavedRooms();
  } catch (err) {
    console.error("刪除保留房間失敗：", err);
  }
}

async function openSavedChat(roomId, partnerNickname) {
  if (!socket) return;

  chatMode = "saved";
  chatLocked = false;
  currentRoomId = roomId;
  currentPartnerNickname = partnerNickname || "摸魚夥伴";

  unreadRooms.delete(roomId);
  refreshUnreadUI();
  markRoomAsRead(roomId);

  disableMatchPanelWhileChat();
  showChatCard();
  hideCountdown();
  hideKeepActions();
  clearMessages();
  updateChatTitle();

  const msgs =
    savedRoomMessages.get(roomId) ||
    (await loadRoomHistoryFromFirestore(roomId));

  msgs.forEach((m) => {
    const isMe = m.from === currentNickname;
    appendChatMessage(m.text, isMe, { name: m.from });
  });

  appendSystemMessage(tLocal("reconnectedSaved", currentPartnerNickname));

  socket.emit("join-saved-room", { roomId });
}

// --- Socket.io ---
function setupSocketHandlers() {
  if (!socket) return;

  socket.on("connect", () => {
    console.log("🔌 socket 連線成功", socket.id);
  });

  socket.on("status", (text) => {
    setStatus(text);
  });

  socket.on("match", (payload) => {
    chatMode = "random";
    chatLocked = false;
    currentPartnerNickname = payload.partnerNickname || "摸魚夥伴";
    currentPartnerUid = payload.partnerUid || null;
    currentRoomId = null;

    currentPartnerOrgLabel = payload.partnerIdentity?.label || "";
    currentPartnerIdentityType = payload.partnerIdentity?.type || "unknown";

    setMatchButtonIdle();
    disableMatchPanelWhileChat();
    showChatCard();
    clearMessages();
    updateChatTitle();

    appendSystemMessage(payload.message || tLocal("matchSuccessSystem"));
    setStatus(tLocal("matchSuccessStatus"));
    startCountdown();
  });

  socket.on("chat", (msg) => {
    const text = msg.text || msg.message || "";
    if (!text) return;

    const fromName = msg.from || "對方";
    const roomId = msg.roomId || null;
    const timestamp = msg.timestamp || new Date().toISOString();
    const identity = msg.identity || null;

    if (roomId) {
      const list = savedRoomMessages.get(roomId) || [];
      list.push({
        text,
        from: fromName,
        timestamp,
        roomId,
      });
      savedRoomMessages.set(roomId, list);

      if (chatMode === "saved" && currentRoomId === roomId) {
        const isMe = fromName === currentNickname;
        appendChatMessage(text, isMe, { name: fromName });
      } else {
        unreadRooms.add(roomId);
        refreshUnreadUI();
        incrementUnreadForRoom(roomId);
      }
      return;
    }

    const isMe = fromName === currentNickname;
    appendChatMessage(text, isMe, {
      name: fromName,
      orgLabel: identity?.label || "",
      identityType: identity?.type || "unknown",
    });
  });

  socket.on("show-keep-option", () => {
    showKeepActions();
    keepHint.textContent = tLocal("keepHintPartner");
  });

  socket.on(
    "keep-confirmed",
    async ({ partnerUid, partnerNickname, roomId }) => {
      currentPartnerUid = partnerUid;
      currentPartnerNickname =
        partnerNickname || currentPartnerNickname || "摸魚夥伴";

      const uidA = currentUid;
      const uidB = partnerUid || currentUid;
      const finalRoomId = roomId || [uidA, uidB].sort().join("_");

      chatMode = "saved";
      chatLocked = false;
      currentRoomId = finalRoomId;

      stopCountdown();
      hideCountdown();
      hideKeepActions();
      updateChatTitle();
      appendSystemMessage(tLocal("keepSuccess"));

      socket.emit("join-saved-room", { roomId: finalRoomId });

      try {
        await saveRoomToFirestore(
          finalRoomId,
          currentUid,
          currentPartnerUid,
          currentPartnerNickname
        );
        await loadSavedRooms();
      } catch (err) {
        console.error("儲存保留緣分失敗：", err);
      }
    }
  );

  socket.on("saved-room-joined", ({ roomId }) => {
    console.log("🧵 已加入保留房間", roomId);
  });

  socket.on("chat-end", ({ reason } = {}) => {
    console.log("💨 chat-end：", reason);
    appendSystemMessage(tLocal("chatEnded"));
    backToHomeIdle();
  });

  socket.on("timer-expired", () => {
    stopCountdown();
    chatLocked = true;
    hideCountdown();
    showKeepActions();
    appendSystemMessage(tLocal("timeUp"));
  });

  socket.on("saved-room-deleted", async ({ roomId }) => {
    if (!roomId || !currentUid) return;

    try {
      await deleteDoc(doc(db, "users", currentUid, "savedRooms", roomId));
    } catch (err) {
      console.error("刪除本地 savedRoom 失敗：", err);
    }

    savedRoomMessages.delete(roomId);
    unreadRooms.delete(roomId);
    savedRoomIds = savedRoomIds.filter((id) => id !== roomId);
    savedUsedSlots = Math.max(savedUsedSlots - 1, 0);
    updateSavedUsageUI();
    await loadSavedRooms();

    if (chatMode === "saved" && currentRoomId === roomId) {
      appendSystemMessage(tLocal("deleteHint"));
      backToHomeIdle();
    }
  });
}

// --- 送訊息 ---
async function sendMessage() {
  if (chatLocked) return;
  if (!socket) return;

  const text = chatInput.value.trim();
  if (!text) return;

  const now = Date.now();
  if (now - lastSendAt < 400) {
    return;
  }
  lastSendAt = now;

  const payload = {
    text,
    from: currentNickname,
  };

  if (chatMode === "saved" && currentRoomId) {
    payload.roomId = currentRoomId;
  }

  socket.emit("chat", payload);

  appendChatMessage(text, true, {
    name: currentNickname,
    orgLabel: currentOrgLabel,
    identityType: currentDomainType,
  });

  if (chatMode === "saved" && currentRoomId) {
    const roomId = currentRoomId;
    const list = savedRoomMessages.get(roomId) || [];
    list.push({
      text,
      from: currentNickname,
      timestamp: new Date().toISOString(),
      roomId,
    });
    savedRoomMessages.set(roomId, list);

    saveMessageToFirestore(roomId, text, currentUid, currentNickname);
  }

  chatInput.value = "";
}

// --- ✅ 開始摸魚前：檢查是否已驗證 ---
async function ensureVerifiedBeforeMatch() {
  if (!currentUser || !currentUid) {
    alert(
      currentLang === "en"
        ? "Please log in again before starting to chat."
        : "請先登入後再開始摸魚。"
    );
    window.location.href = "login.html";
    return false;
  }

  // 先刷新一次 auth 狀態
  try {
    await reload(currentUser);
  } catch (err) {
    console.error("reload user failed:", err);
  }

  let firestoreVerified = false;
  try {
    const snap = await getDoc(doc(db, "users", currentUid));
    if (snap.exists()) {
      const data = snap.data();
      firestoreVerified = data.verified === true;
    }
  } catch (err) {
    console.error("check Firestore verified failed:", err);
  }

  const isVerified =
    currentUser.emailVerified === true || firestoreVerified === true;

  if (!isVerified) {
    alert(
      currentLang === "en"
        ? "Please verify your email from your inbox before starting to chat."
        : "請先到信箱完成驗證，驗證後才能開始摸魚。"
    );
    return false;
  }

  return true;
}

// --- 事件綁定 ---
if (startMatchBtn) {
  startMatchBtn.addEventListener("click", async () => {
    if (!socket) return;

    // 這裡先檢查「是否已驗證」，未驗證就只提示，不配對
    const ok = await ensureVerifiedBeforeMatch();
    if (!ok) return;

    // ✅ 已驗證 → 照原本配對流程跑
    setMatchButtonSearching();
    hideChatCard();
    socket.emit("start-matching");
  });
}

if (stopMatchBtn) {
  stopMatchBtn.addEventListener("click", () => {
    if (!socket) return;
    setMatchButtonIdle();
    setStatus(tLocal("statusIdle"));
    socket.emit("cancel-matching"); // 伺服器端要加對應 handler 才會真的取消
  });
}

sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

forceEndBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("end-chat");
});

endBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("end-chat");
});

keepBtn.addEventListener("click", () => {
  if (!socket) return;

  if (savedUsedSlots >= savedMaxSlots) {
    keepHint.textContent = tLocal("keepLimitReached");
    return;
  }

  stopKeepCountdown();

  keepHint.textContent =
    currentLang === "en"
      ? "Keep request sent. Waiting for the other side..."
      : "已送出保留請求，等待對方選擇...";
  socket.emit("keep-request");
});

if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    window.location.href = "settings.html";
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("moyuUid");
      localStorage.removeItem("moyuNickname");
      window.location.href = "login.html";
    }
  });
}

// --- Firebase Auth：確認登入狀態，建立 socket ---
setStatus(tLocal("statusLoading"));
if (chatInput) {
  chatInput.placeholder = tLocal("chatPlaceholderInput");
}
if (chatPlaceholder) {
  chatPlaceholder.textContent = tLocal("chatPlaceholder");
}
if (chatroomLabel) {
  chatroomLabel.textContent = tLocal("chatRoomLabel");
}
if (startMatchBtn) {
  startMatchBtn.textContent = tLocal("startMatching");
}
if (forceEndBtn) {
  forceEndBtn.textContent = tLocal("forceEndButton");
}
if (keepQuestion) {
  keepQuestion.textContent = tLocal("keepQuestion");
}
if (keepBtn) {
  keepBtn.textContent = tLocal("keepButton");
}
if (endBtn) {
  endBtn.textContent = tLocal("endButton");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  currentUid = user.uid;

  try {
    const userSnap = await getDoc(doc(db, "users", currentUid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      currentNickname = data.nickname || "匿名魚";

      currentDomainType = data.domainType || "unknown";
      currentEmailDomain = data.emailDomain || "";
      currentOrgLabel = getOrgLabelFromDomain(currentEmailDomain);
      if (currentDomainType === "company" || currentDomainType === "school") {
        savedMaxSlots = 3;
      } else {
        savedMaxSlots = 1;
      }

      savedUsedSlots = 0;
      updateSavedUsageUI();

      if (data.lang && (data.lang === "zh" || data.lang === "en")) {
        currentLang = data.lang;
        setCurrentLang(currentLang);
      }

      renderIdentityLabel(data);
    } else {
      currentNickname = "匿名魚";
      currentDomainType = "unknown";
      currentOrgLabel = "";
      savedMaxSlots = 1;
      savedUsedSlots = 0;
      updateSavedUsageUI();
      renderIdentityLabel(null);
    }
  } catch (err) {
    console.error("讀取使用者暱稱失敗：", err);
    currentNickname = "匿名魚";
    currentDomainType = "unknown";
    currentOrgLabel = "";
    savedMaxSlots = 1;
    savedUsedSlots = 0;
    updateSavedUsageUI();
    renderIdentityLabel(null);
  }

  nicknameText.textContent = currentNickname;
  localStorage.setItem("moyuUid", currentUid);
  localStorage.setItem("moyuNickname", currentNickname);

  setStatus(tLocal("statusIdle"));
  setMatchButtonIdle();

  socket = io({
    query: {
      uid: currentUid,
      nickname: currentNickname,
      domainType: currentDomainType,
      orgLabel: currentOrgLabel,
    },
  });

  setupSocketHandlers();
  await loadSavedRooms();
});
