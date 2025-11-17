// server.mjs
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createChatRoom } from "./utils/firestore.mjs"; // 目前只有使用這個

// --------------- 基本設定 ---------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 3000;

// 靜態檔案
app.use(express.static(path.join(__dirname, "public")));
app.use("/utils", express.static(path.join(__dirname, "utils")));

// --------------- 匹配與對話狀態 ---------------

// 一輪隨機配對的聊天時間（目前 5 秒測試，要改 5 分鐘：5 * 60 * 1000）
const MATCH_DURATION_MS = 5 * 1000;

// 尚未配對的使用者（等待池只放一個）
let waitingSocket = null;

// socket.id ↔ partner.socket.id
const pairs = new Map();

// 「一輪隨機配對」的暫時 session 狀態
// key: sessionId, value: { sessionId, socketIds: [idA, idB], messages: [...], expireAt }
const activeSessions = new Map();

// sessionId -> setTimeout handle
const sessionTimers = new Map();

function generateRoomId(id1, id2) {
  return [id1, id2].sort().join("_");
}

// 一輪隨機配對用的 sessionId（用 socket.id 組）
function generateSessionId(socketA, socketB) {
  return generateRoomId(socketA.id, socketB.id);
}

// 建立一輪配對＋啟動伺服器倒數
function pairUsers(socketA, socketB) {
  const nicknameA = socketA.nickname || "匿名魚";
  const nicknameB = socketB.nickname || "匿名魚";

  const sessionId = generateSessionId(socketA, socketB);
  const expireAt = Date.now() + MATCH_DURATION_MS;

  activeSessions.set(sessionId, {
    sessionId,
    socketIds: [socketA.id, socketB.id],
    messages: [],
    expireAt,
  });

  pairs.set(socketA.id, socketB.id);
  pairs.set(socketB.id, socketA.id);

  socketA.currentSessionId = sessionId;
  socketB.currentSessionId = sessionId;
  socketA.currentRoomId = null;
  socketB.currentRoomId = null;
  socketA.keepRequest = false;
  socketB.keepRequest = false;

  // 伺服器端倒數：到時間就發 timer-expired 給雙方
  const timer = setTimeout(() => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    const [idA, idB] = session.socketIds;
    if (idA) io.to(idA).emit("timer-expired");
    if (idB) io.to(idB).emit("timer-expired");
  }, MATCH_DURATION_MS);

  sessionTimers.set(sessionId, timer);

  // 通知雙方：配對成功＋帶 expireAt 給前端顯示倒數
  io.to(socketA.id).emit("match", {
    message: "配對成功！遇見摸魚夥伴 🐡",
    partnerNickname: nicknameB,
    partnerUid: socketB.uid || null,
    expireAt,
  });

  io.to(socketB.id).emit("match", {
    message: "配對成功！遇見摸魚夥伴 🐡",
    partnerNickname: nicknameA,
    partnerUid: socketA.uid || null,
    expireAt,
  });

  console.log(`🎯 配對成功：${socketA.id}(${nicknameA}) <--> ${socketB.id}(${nicknameB})`);
}

// 清除 session（倒數、配對狀態一起清）
function cleanupSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    const [idA, idB] = session.socketIds;
    if (idA) pairs.delete(idA);
    if (idB) pairs.delete(idB);
  }
  activeSessions.delete(sessionId);

  const timer = sessionTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    sessionTimers.delete(sessionId);
  }
}

// --------------- Socket 連線 ---------------
io.on("connection", (socket) => {
  const nickname = socket.handshake.query.nickname || "匿名魚";
  const uid = socket.handshake.query.uid || null;

  socket.nickname = nickname;
  socket.uid = uid;

  console.log(`🐠 ${nickname} 已連線 (${socket.id}) uid=${uid || "無"}`);

  // ===== 1. 開始配對 =====
  socket.on("start-matching", () => {
    console.log(`🎣 ${nickname} 要開始配對 (${socket.id})`);

    // 若已在舊 session，先清掉
    if (socket.currentSessionId) {
      cleanupSession(socket.currentSessionId);
      socket.currentSessionId = null;
    }
    socket.currentRoomId = null;
    socket.keepRequest = false;

    if (waitingSocket && waitingSocket.id !== socket.id) {
      const partner = waitingSocket;
      waitingSocket = null;
      pairUsers(socket, partner);
    } else {
      waitingSocket = socket;
      socket.emit("status", "🎣 正在尋找另一隻魚...");
    }
  });

  // ===== 2. 取消配對 =====
  socket.on("cancel-matching", () => {
    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
      socket.emit("status", "已取消配對");
      console.log(`⏹️ ${nickname} 取消配對`);
    }
  });

  // ===== 3. 一般聊天 =====
  socket.on("chat", (msg) => {
    const text = msg.text || msg.message || "";
    if (!text) return;

    const now = new Date();
    const timestamp = now.toISOString();

    // --- A. 尚在「隨機配對」階段 ---
    if (!socket.currentRoomId && socket.currentSessionId) {
      const session = activeSessions.get(socket.currentSessionId);
      if (!session) return;

      // 伺服器檢查倒數：超時就不送訊息
      if (session.expireAt && Date.now() > session.expireAt) {
        socket.emit("timer-expired");
        return;
      }

      session.messages.push({
        fromUid: socket.uid || null,
        fromNickname: socket.nickname || "匿名魚",
        text,
        timestamp,
      });

      const partnerId = pairs.get(socket.id);
      if (!partnerId) return;

      const payload = {
        text,
        from: socket.nickname || "摸魚夥伴",
        fromUid: socket.uid || null,
        timestamp,
      };

      // 訊息一律走 "chat" 事件；前端只在這裡 append UI（避免重複）
      io.to(socket.id).emit("chat", payload);      // 自己也收到（自己那邊顯示在右側）
      io.to(partnerId).emit("chat", payload);      // 對方收到（顯示在左側）

      return;
    }

    // --- B. 已在「保留緣分的房間」內 ---
    if (socket.currentRoomId) {
      const payload = {
        text,
        from: socket.nickname || "摸魚夥伴",
        fromUid: socket.uid || null,
        roomId: socket.currentRoomId,
        timestamp,
      };

      // 房間內所有人都收到（包含自己）
      io.to(socket.currentRoomId).emit("chat", payload);
      return;
    }
  });

  // ===== 4. 保留緣分 =====
  socket.on("keep-request", async () => {
    socket.keepRequest = true;

    const partnerId = pairs.get(socket.id);
    if (!partnerId) return;

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return;

    const sessionId = socket.currentSessionId || partnerSocket.currentSessionId;
    const session = sessionId ? activeSessions.get(sessionId) : null;

    // session 已過期 → 不允許保留
    if (session && session.expireAt && Date.now() > session.expireAt) {
      socket.emit("keep-denied-expired");
      return;
    }

    // 雙方都按了保留 → 建立永久房間
    if (partnerSocket.keepRequest) {
      const userKeyA = socket.uid || socket.id;
      const userKeyB = partnerSocket.uid || partnerSocket.id;
      const roomId = generateRoomId(userKeyA, userKeyB);
      const createdAt = new Date().toISOString();
      const transcript = session ? session.messages || [] : [];

      // 停止這一輪配對的 session
      if (sessionId) {
        cleanupSession(sessionId);
      }
      socket.currentSessionId = null;
      partnerSocket.currentSessionId = null;

      // 加入房間（之後聊天都走 roomId）
      socket.join(roomId);
      partnerSocket.join(roomId);
      socket.currentRoomId = roomId;
      partnerSocket.currentRoomId = roomId;

      console.log(`💞 雙方保留成功 → 房間 ${roomId}`);

      io.to(socket.id).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
      });
      io.to(partnerId).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
      });

      // 寫入 Firestore（如果 utils/firestore.mjs 有支援 transcript / createdAt 就會存進去）
      try {
        await createChatRoom(roomId, userKeyA, userKeyB, transcript, createdAt);
      } catch (err) {
        console.error("❗ createChatRoom 發生錯誤：", err);
      }
    } else {
      // 提醒對方顯示「保留緣分」按鈕
      io.to(partnerId).emit("show-keep-option");
    }
  });

  // ===== 5. 結束對話 =====
  socket.on("end-chat", () => {
    const partnerId = pairs.get(socket.id);
    const sessionId = socket.currentSessionId;

    if (partnerId) {
      io.to(partnerId).emit("chat-end");
      pairs.delete(socket.id);
      pairs.delete(partnerId);
    }

    if (sessionId) {
      cleanupSession(sessionId);
      socket.currentSessionId = null;
    }

    socket.currentRoomId = null;
    socket.keepRequest = false;
    socket.emit("chat-end");
  });

  // ===== 6. 進入已保留房間 =====
  socket.on("join-saved-room", ({ roomId }) => {
    if (!roomId) return;

    // ⚠️ 若目前正在配對或聊天，不允許切到已保留房間
    if (socket.currentSessionId || socket.currentRoomId) {
      socket.emit("cannot-join-room-while-chatting");
      return;
    }

    socket.join(roomId);
    socket.currentRoomId = roomId;
    socket.currentSessionId = null;

    console.log(`📁 ${socket.nickname}(${socket.id}) 進入已保留房間 ${roomId}`);
  });

  // ===== 7. 刪除緣分 =====
  // 前端：socket.emit("delete-room", { roomId })
  socket.on("delete-room", ({ roomId }) => {
    if (!roomId) return;

    console.log(`🗑️ ${socket.nickname} 要刪除房間 ${roomId}`);

    // 通知房間內所有人：這個緣分被刪除了
    io.to(roomId).emit("room-deleted", { roomId });

    // 把房間內 socket 的 currentRoomId 清掉，並讓他們離開房間
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      for (const id of room) {
        const s = io.sockets.sockets.get(id);
        if (!s) continue;
        if (s.currentRoomId === roomId) {
          s.leave(roomId);
          s.currentRoomId = null;
        }
      }
    }

    // 若未來要同步刪除 Firestore，可以在這裡呼叫 deleteChatRoom(roomId)
    // 目前先只做到「前端列表消失＋socket 狀態更新」
  });

  // ===== 8. 斷線 =====
  socket.on("disconnect", () => {
    console.log(`❌ ${socket.nickname} (${socket.id}) 離線`);

    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
    }

    const partnerId = pairs.get(socket.id);
    const sessionId = socket.currentSessionId;

    if (partnerId) {
      io.to(partnerId).emit("chat-end");
      pairs.delete(partnerId);
    }

    if (sessionId) {
      cleanupSession(sessionId);
    }

    pairs.delete(socket.id);
  });
});

// --------------- 啟動伺服器 ---------------
server.listen(PORT, () => {
  console.log(`🚀 Mōyu Club server running at http://localhost:${PORT}`);
});
