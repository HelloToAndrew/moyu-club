// ----------------------------------------------------
//  server.mjs  —  Mōyu Club (完整整合版)
//  - Express 靜態檔伺服器
//  - Socket.io 隨機配對 + 保留緣分
//  - Firestore 保存房間
//  - SQLite 初始化（db/moyu.sqlite）
// ----------------------------------------------------

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import path from "path";
import { fileURLToPath } from "url";

// --- SQLite（DB 初始化）---
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// --- Firestore（保留緣分寫入）---
import { createChatRoom } from "./utils/firestore.mjs";

// --- dirname 設定 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 建立 SQLite DB ---
export const db = await open({
  filename: path.join(__dirname, "db", "moyu.sqlite"),
  driver: sqlite3.Database,
});

// ----------------------------------------------------
// Express / HTTP / Socket.io 初始化
// ----------------------------------------------------

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 3000;

// Static files (public)
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------------------------------
// 隨機配對邏輯
// ----------------------------------------------------

const MATCH_DURATION_MS = 5 * 1000; // 測試版 5 秒（正式版可以拉長）

let waitingSocket = null; // 等待配對的 socket

const pairs = new Map(); // socket.id -> partner.id

const activeSessions = new Map(); // sessionId -> { sessionId, socketIds, messages, expireAt }
const sessionTimers = new Map();

function generateRoomId(id1, id2) {
  return [id1, id2].sort().join("_");
}

function generateSessionId(socketA, socketB) {
  return generateRoomId(socketA.id, socketB.id);
}

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

function pairUsers(socketA, socketB) {
  const nicknameA = socketA.nickname || "匿名魚";
  const nicknameB = socketB.nickname || "匿名魚";

  // 🔹 身份資訊：從 socket 上拿 domainType + orgLabel
  const identityA = {
    type: socketA.domainType || "unknown",
    label: socketA.orgLabel || "",
  };
  const identityB = {
    type: socketB.domainType || "unknown",
    label: socketB.orgLabel || "",
  };

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

  // 倒數計時：時間到就通知前端進入「保留選擇階段」
  const timer = setTimeout(() => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    const [idA, idB] = session.socketIds;
    if (idA) io.to(idA).emit("timer-expired");
    if (idB) io.to(idB).emit("timer-expired");
  }, MATCH_DURATION_MS);

  sessionTimers.set(sessionId, timer);

  // 通知雙方（夾帶對方的身份資訊給前端）
  io.to(socketA.id).emit("match", {
    message: "配對成功！遇見摸魚夥伴 🐡",
    partnerNickname: nicknameB,
    partnerUid: socketB.uid || null,
    partnerIdentity: identityB,
    expireAt,
  });

  io.to(socketB.id).emit("match", {
    message: "配對成功！遇見摸魚夥伴 🐡",
    partnerNickname: nicknameA,
    partnerUid: socketA.uid || null,
    partnerIdentity: identityA,
    expireAt,
  });

  console.log(`🎯 配對成功：${socketA.id} <--> ${socketB.id}`);
}

// ----------------------------------------------------
// Socket.io：聊天 / 保留緣分
// ----------------------------------------------------

io.on("connection", (socket) => {
  const nickname = socket.handshake.query.nickname || "匿名魚";
  const uid = socket.handshake.query.uid || null;

  // 🔹 從前端 query 拿使用者身份資訊
  const domainType = socket.handshake.query.domainType || "unknown";
  const orgLabel = socket.handshake.query.orgLabel || "";

  socket.nickname = nickname;
  socket.uid = uid;
  socket.domainType = domainType;
  socket.orgLabel = orgLabel;

  socket.currentSessionId = null;
  socket.currentRoomId = null;
  socket.keepRequest = false;

  console.log(
    `🐠 ${nickname} 已連線 (${socket.id}) uid=${uid || "無"} type=${
      domainType
    } org=${orgLabel}`
  );

  // ----------------------------------------------------
  // 0. 訂閱已保留房間 → 用來收到未讀訊息
  // ----------------------------------------------------
  socket.on("subscribe-saved-rooms", ({ roomIds }) => {
    if (!Array.isArray(roomIds)) return;

    roomIds.forEach((roomId) => {
      if (roomId && typeof roomId === "string") {
        socket.join(roomId);
      }
    });
  });

  // ----------------------------------------------------
  // 1. 開始配對
  // ----------------------------------------------------
  socket.on("start-matching", () => {
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

  // ----------------------------------------------------
  // 2. 收到訊息（隨機配對 或 保留房間）
  // ----------------------------------------------------
  socket.on("chat", (msg) => {
    const text = msg.text || msg.message || "";
    if (!text) return;

    const timestamp = new Date().toISOString();

    // 2-1）保留房間訊息
    if (msg.roomId) {
      const roomId = msg.roomId;

      socket.to(roomId).emit("chat", {
        text,
        from: socket.nickname || "匿名魚",
        fromUid: socket.uid || null,
        timestamp,
        roomId,
        // 這裡也可以帶 identity，看你之後要不要讓保留房間也顯示身份匡
      });

      return;
    }

    // 2-2）隨機配對訊息
    if (socket.currentSessionId && !socket.currentRoomId) {
      const session = activeSessions.get(socket.currentSessionId);
      if (!session) return;

      // 這裡用 expireAt 限制聊天是否還能繼續
      if (session.expireAt && Date.now() > session.expireAt) {
        socket.emit("timer-expired");
        return;
      }

      session.messages.push({
        fromUid: socket.uid || null,
        fromNickname: socket.nickname,
        text,
        timestamp,
      });

      const [idA, idB] = session.socketIds;
      const partnerId = idA === socket.id ? idB : idA;

      if (partnerId) {
        io.to(partnerId).emit("chat", {
          text,
          from: socket.nickname,
          timestamp,
          // 🔹 把這個發話者的身份資訊一起丟給對方
          identity: {
            type: socket.domainType || "unknown",
            label: socket.orgLabel || "",
          },
        });
      }
      return;
    }
  });

  // ----------------------------------------------------
  // 3. 保留緣分（已移除「過期就不能保留」的判斷）
// ----------------------------------------------------
  socket.on("keep-request", async () => {
    socket.keepRequest = true;

    const partnerId = pairs.get(socket.id);
    if (!partnerId) return;

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return;

    const sessionId = socket.currentSessionId || partnerSocket.currentSessionId;
    const session = sessionId ? activeSessions.get(sessionId) : null;

    // ❌ 原本這裡會因為 expireAt 過期而直接擋掉
    // if (session && session.expireAt && Date.now() > session.expireAt) {
    //   socket.emit("keep-denied-expired");
    //   return;
    // }

    // ✅ 現在只要 session 還存在，雙方都按「保留」，就成立
    if (session && partnerSocket.keepRequest) {
      const userKeyA = socket.uid || socket.id;
      const userKeyB = partnerSocket.uid || partnerSocket.id;

      const roomId = generateRoomId(userKeyA, userKeyB);
      const createdAt = new Date().toISOString();

      const transcript = session.messages || [];

      if (sessionId) cleanupSession(sessionId);

      socket.join(roomId);
      partnerSocket.join(roomId);

      socket.currentRoomId = roomId;
      partnerSocket.currentRoomId = roomId;

      try {
        await createChatRoom(roomId, userKeyA, userKeyB, transcript, createdAt);
      } catch (err) {
        console.error("❗ createChatRoom 錯誤：", err);
      }

      io.to(socket.id).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
        partnerUid: partnerSocket.uid,
        partnerNickname: partnerSocket.nickname,
      });

      io.to(partnerId).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
        partnerUid: socket.uid,
        partnerNickname: socket.nickname,
      });
    } else {
      // 只有一方先按 → 通知對方畫面顯示「對方想保留」
      io.to(partnerId).emit("show-keep-option");
    }
  });

  // ----------------------------------------------------
  // 4. 結束對話
  // ----------------------------------------------------
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

    socket.emit("chat-end");
    socket.keepRequest = false;
  });

  // ----------------------------------------------------
  // 5. 進入已保留房間
  // ----------------------------------------------------
  socket.on("join-saved-room", ({ roomId }) => {
    if (!roomId) return;

    if (socket.currentSessionId && !socket.currentRoomId) {
      socket.emit("cannot-join-room-while-chatting");
      return;
    }

    if (socket.currentRoomId && socket.currentRoomId !== roomId) {
      socket.leave(socket.currentRoomId);
    }

    socket.join(roomId);
    socket.currentRoomId = roomId;
    socket.currentSessionId = null;

    socket.emit("saved-room-joined", { roomId });
  });

  // ----------------------------------------------------
  // 6. delete-saved-room：某人刪掉已保留緣分，通知該房間所有人
  // ----------------------------------------------------
  socket.on("delete-saved-room", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("saved-room-deleted", { roomId });
  });

  // ----------------------------------------------------
  // 7. 斷線
  // ----------------------------------------------------
  socket.on("disconnect", () => {
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

// ----------------------------------------------------
// 啟動伺服器
// ----------------------------------------------------
server.listen(PORT, () => {
  console.log(`🚀 Mōyu Club server running at http://localhost:${PORT}`);
});
