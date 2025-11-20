// client.js
// Firebase + Socket.io + 前端主邏輯

// --- Firebase imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
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
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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

// --- DOM 快速取用 ---
const nicknameText = document.getElementById("nickname-text");
const langText = document.getElementById("lang-text") || null;
const statusText = document.getElementById("status-text");
const matchPanel = document.getElementById("match-panel");
const matchHint = document.getElementById("match-hint");
const startMatchBtn = document.getElementById("start-match-btn");

const chatCard = document.getElementById("chat-card");
const chatTitle = document.getElementById("chat-title");
const messagesEl = document.getElementById("messages");
const countdownWrap = document.getElementById("countdown-wrap");
const countdownEl = document.getElementById("countdown");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const forceEndBtn = document.getElementById("force-end-btn");

const keepActions = document.getElementById("keep-actions");
const keepBtn = document.getElementById("keep-btn");
const endBtn = document.getElementById("end-btn");
const keepHint = document.getElementById("keep-hint");
const savedListEl = document.getElementById("saved-list");
const logoutBtn = document.getElementById("logout-btn") || null;

// --- 狀態變數 ---
let socket = null;
let currentUser = null;
let currentUid = null;
let currentNickname = "";
let currentLang = localStorage.getItem("moyuLang") || "zh";

let chatMode = null; // "random" or "saved"
let chatLocked = false;
let countdownTimer = null;
let countdownRemaining = 5; // 目前 5 秒測試，之後要改時間只改這裡

let currentPartnerUid = null;
let currentPartnerNickname = null;
let currentRoomId = null;

// 保留房間與未讀訊息
let savedRoomIds = [];
const unreadRooms = new Set();
// 記錄各個保留房間的訊息（只在這次連線期間）
const savedRoomMessages = new Map(); // roomId -> [{ text, from, timestamp, roomId }]

// 避免按 Enter 送出兩次
let lastSendAt = 0;

// --- 簡單 i18n ---
const i18n = {
  zh: {
    startMatching: "開始摸魚配對",
    matching: "🎣 正在尋找另一隻魚...",
    idle: "你現在可以開始摸魚配對。",
    chatTitleRandom: (name) => `正在和 ${name} 聊天`,
    chatTitleSaved: (name) => `已保留緣分：${name}`,
    chatEnded: "對話已結束，可以重新配對或找已保留緣分。",
    timeUp: "時間到了，請選擇是否要保留這段緣分。",
    keepSuccess: "這段緣分已被保留，可以繼續聊天 ✨",
    partnerWantsKeep:
      "對方想保留這段緣分，如果你也按下，就會一起被收藏。",
  },
  en: {
    startMatching: "Start random match",
    matching: "🎣 Searching for another fish...",
    idle: "You can start a new match now.",
    chatTitleRandom: (name) => `Chatting with ${name}`,
    chatTitleSaved: (name) => `Saved connection: ${name}`,
    chatEnded: "Chat ended. You can start a new match or open a saved one.",
    timeUp: "Time's up. Decide whether to keep this connection.",
    keepSuccess: "Connection saved. You can keep chatting ✨",
    partnerWantsKeep:
      "Your partner wants to keep this connection. Tap keep to save it too.",
  },
};

function t(key, ...args) {
  const pack = i18n[currentLang] || i18n["zh"];
  const val = pack[key];
  if (typeof val === "function") return val(...args);
  return val ?? key;
}

function applyLangTexts() {
  if (!langText) return;   // 🔹 home 沒有語言文字就直接跳過
  langText.textContent =
    currentLang === "en" ? "Language: English" : "語言：中文（依帳戶設定）";
}

// --- UI helpers ---
function setStatus(msg) {
  statusText.textContent = msg;
}

function showMatchPanel() {
  matchPanel.classList.remove("opacity-50", "pointer-events-none");
  startMatchBtn.disabled = false;
}

function disableMatchPanelWhileChat() {
  matchPanel.classList.add("opacity-50", "pointer-events-none");
  startMatchBtn.disabled = true;
}

function showChatCard() {
  chatCard.classList.remove("hidden");
}

function hideChatCard() {
  chatCard.classList.add("hidden");
}

function showCountdown() {
  countdownWrap.classList.remove("hidden");
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
  countdownRemaining = 5; // 未來要改成 300 秒，就改這裡
  chatLocked = false;
  showCountdown();
  updateCountdownUI();

  countdownTimer = setInterval(() => {
    countdownRemaining -= 1;
    if (countdownRemaining <= 0) {
      stopCountdown();
      chatLocked = true;
      hideCountdown();
      showKeepActions();
      appendSystemMessage(t("timeUp"));
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

function showKeepActions() {
  keepActions.classList.remove("hidden");
  keepHint.textContent = "";
}

function hideKeepActions() {
  keepActions.classList.add("hidden");
  keepHint.textContent = "";
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

function appendChatMessage(text, isMe, fromName) {
  if (!text) return;

  const wrap = document.createElement("div");
  wrap.className = `flex ${isMe ? "justify-end" : "justify-start"}`;

  const bubble = document.createElement("div");
  bubble.className = `px-3 py-2 rounded-lg max-w-xs break-words shadow ${
    isMe ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-100"
  }`;

  if (!isMe) {
    const nameSpan = document.createElement("div");
    nameSpan.className = "text-[11px] text-slate-300 mb-0.5";
    nameSpan.textContent = fromName || "對方";
    bubble.appendChild(nameSpan);
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
    chatTitle.textContent = "尚未配對";
    return;
  }
  if (chatMode === "saved") {
    chatTitle.textContent = t("chatTitleSaved", currentPartnerNickname);
  } else {
    chatTitle.textContent = t("chatTitleRandom", currentPartnerNickname);
  }
}

function resetChatState() {
  stopCountdown();
  hideCountdown();
  hideKeepActions();
  chatLocked = false;
  chatMode = null;
  currentPartnerUid = null;
  currentPartnerNickname = null;
  currentRoomId = null;
  clearMessages();
  chatInput.value = "";
  updateChatTitle();
}

function backToHomeIdle() {
  resetChatState();
  hideChatCard();
  showMatchPanel();
  setStatus(t("idle"));
  matchHint.textContent = "";
}

// --- 未讀紅點 UI ---
function refreshUnreadUI() {
  if (!savedListEl) return;

  savedListEl.querySelectorAll("button[data-room-id]").forEach((btn) => {
    const roomId = btn.getAttribute("data-room-id");
    const dot = btn.querySelector(".unread-dot");
    if (!dot) return;

    if (unreadRooms.has(roomId)) {
      dot.classList.remove("hidden");
    } else {
      dot.classList.add("hidden");
    }
  });
}

// --- Firestore：儲存 / 載入已保留緣分與訊息 ---

async function saveRoomToFirestore(
  roomId,
  myUid,
  partnerUid,
  partnerNickname
) {
  if (!roomId || !myUid || !partnerUid) return;

  const createdAt = new Date().toISOString();

  // rooms collection
  await setDoc(
    doc(db, "rooms", roomId),
    {
      participants: [myUid, partnerUid],
      createdAt,
    },
    { merge: true }
  );

  // 自己這邊的 savedRooms，一開始 unreadCount = 0
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

  // 對方那邊的 savedRooms
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

// 儲存一則訊息到某個房間的 messages 子集合
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
  savedListEl.innerHTML =
    '<div class="text-xs text-slate-500">載入中...</div>';

  const colRef = collection(db, "users", currentUid, "savedRooms");
  const snap = await getDocs(colRef);

  if (snap.empty) {
    savedListEl.innerHTML =
      '<div class="text-xs text-slate-500">目前還沒有保留的對話。</div>';
    savedRoomIds = [];
    unreadRooms.clear();
    return;
  }

  const rows = [];
  unreadRooms.clear(); // 依 Firestore 狀態重建未讀列表

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

  // 新到舊
  rows.sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  savedRoomIds = rows.map((r) => r.roomId);

  let html = "";
  rows.forEach((r) => {
    html += `
      <button
        class="w-full text-left px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 flex items-center justify-between gap-2"
        data-room-id="${r.roomId}"
        data-partner-uid="${r.partnerUid}"
        data-partner-nickname="${r.partnerNickname}"
      >
        <div>
          <div class="text-sm text-slate-100">${r.partnerNickname}</div>
          <div class="text-[11px] text-slate-500">
            房間 ID: ${r.roomId.slice(0, 8)}...
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="unread-dot w-2 h-2 rounded-full bg-red-500 hidden"></span>
          <div class="text-[11px] text-emerald-300">
            再次摸魚
          </div>
        </div>
      </button>
    `;
  });

  savedListEl.innerHTML = html;

  // 綁定 click 事件
  savedListEl.querySelectorAll("button[data-room-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const roomId = btn.getAttribute("data-room-id");
      const partnerNickname = btn.getAttribute("data-partner-nickname");
      openSavedChat(roomId, partnerNickname);
    });
  });

  // 告訴 server：我要訂閱這些保留房間，以便收到未讀提醒（如果有實作）
  if (socket && savedRoomIds.length > 0) {
    socket.emit("subscribe-saved-rooms", { roomIds: savedRoomIds });
  }

  // 根據 unreadRooms 狀態刷新紅點
  refreshUnreadUI();
}

// 從 Firestore 抓歷史訊息
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

// 房間標記已讀：lastReadAt = serverTimestamp, unreadCount = 0
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

// 有新訊息進來時，對目前這個使用者的 unreadCount +1
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

// 打開已保留房間聊天
async function openSavedChat(roomId, partnerNickname) {
  if (!socket) return;

  chatMode = "saved";
  chatLocked = false;
  currentRoomId = roomId;
  currentPartnerNickname = partnerNickname || "摸魚夥伴";

  // 點進房間 → 視為已讀
  unreadRooms.delete(roomId);
  refreshUnreadUI();
  markRoomAsRead(roomId);

  disableMatchPanelWhileChat();
  showChatCard();
  hideCountdown();
  hideKeepActions();
  clearMessages();
  updateChatTitle();

  // 先從 Firestore 抓歷史，再顯示
  const msgs =
    savedRoomMessages.get(roomId) ||
    (await loadRoomHistoryFromFirestore(roomId));

  msgs.forEach((m) => {
    const isMe = m.from === currentNickname;
    appendChatMessage(m.text, isMe, m.from);
  });

  appendSystemMessage(
    `已重新連線 ${currentPartnerNickname}，這是你們保留的摸魚緣分。`
  );

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

    disableMatchPanelWhileChat();
    showChatCard();
    clearMessages();
    updateChatTitle();
    appendSystemMessage(payload.message || "配對成功！");
    matchHint.textContent = "";
    setStatus("配對成功，開始聊天吧！");
    startCountdown();
  });

  // 隨機配對 + 保留房間的共用 chat handler
  socket.on("chat", (msg) => {
    const text = msg.text || msg.message || "";
    if (!text) return;

    const fromName = msg.from || "對方";
    const roomId = msg.roomId || null;
    const timestamp = msg.timestamp || new Date().toISOString();

    // 🔹 保留房間訊息（有 roomId）
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
        appendChatMessage(text, isMe, fromName);
      } else {
        // 沒在看這個房間 → 設為未讀、顯示紅點，並且 Firestore 的 unreadCount +1
        unreadRooms.add(roomId);
        refreshUnreadUI();
        incrementUnreadForRoom(roomId);
      }
      return;
    }

    // 🔹 隨機配對訊息（沒有 roomId）
    const isMe = fromName === currentNickname;
    appendChatMessage(text, isMe, fromName);
  });

  socket.on("show-keep-option", () => {
    showKeepActions();
    keepHint.textContent = t("partnerWantsKeep");
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
      appendSystemMessage(t("keepSuccess"));

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
    appendSystemMessage(t("chatEnded"));
    backToHomeIdle();
  });

  socket.on("timer-expired", () => {
    stopCountdown();
    chatLocked = true;
    hideCountdown();
    showKeepActions();
    appendSystemMessage(t("timeUp"));
  });
}

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

  appendChatMessage(text, true, currentNickname);

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

    // 寫進 Firestore
    saveMessageToFirestore(roomId, text, currentUid, currentNickname);
  }

  chatInput.value = "";
}

// --- 事件綁定 ---
startMatchBtn.addEventListener("click", () => {
  if (!socket) return;
  matchHint.textContent = t("matching");
  setStatus(t("matching"));
  hideChatCard();
  socket.emit("start-matching");
});

sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (e) => {
  // e.isComposing = 中文輸入法正在組字時，Enter 不要送出
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
  keepHint.textContent = "已送出保留請求，等待對方選擇...";
  socket.emit("keep-request");
});

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
};

// --- Firebase Auth：確認登入狀態，建立 socket ---
applyLangTexts();
setStatus("正在檢查登入狀態...");

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
      if (data.lang && (data.lang === "zh" || data.lang === "en")) {
        currentLang = data.lang;
        localStorage.setItem("moyuLang", currentLang);
        applyLangTexts();
      }
    } else {
      currentNickname = "匿名魚";
    }
  } catch (err) {
    console.error("讀取使用者暱稱失敗：", err);
    currentNickname = "匿名魚";
  }

  nicknameText.textContent = currentNickname;
  localStorage.setItem("moyuUid", currentUid);
  localStorage.setItem("moyuNickname", currentNickname);

  setStatus(t("idle"));

  socket = io({
    query: {
      uid: currentUid,
      nickname: currentNickname,
    },
  });

  setupSocketHandlers();
  await loadSavedRooms();
});
