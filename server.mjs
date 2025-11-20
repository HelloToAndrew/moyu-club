// server.mjs
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createChatRoom } from "./utils/firestore.mjs"; // 若沒有這支，可以改成空函式或自行實作

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 3000;

// 靜態檔案：public 底下放 home.html / client.js / main.css 等
app.use(express.static(path.join(__dirname, "public")));

// --------- 匹配與聊天狀態 ---------

// 一輪聊天時間（目前 5 秒測試，要改成 5 分鐘就改這裡）
const MATCH_DURATION_MS = 5 * 1000;

// 等待配對的 socket（簡單版：只維持一個等待者）
let waitingSocket = null;

// socket.id -> partner.socket.id（只用在「隨機配對」階段）
const pairs = new Map();

// 一輪配對的暫存 session
// key: sessionId, value: { sessionId, socketIds: [idA, idB], messages: [], expireAt }
const activeSessions = new Map();
// sessionId -> setTimeout handle
const sessionTimers = new Map();

function generateRoomId(id1, id2) {
  return [id1, id2].sort().join("_");
}

function generateSessionId(socketA, socketB) {
  // 這裡用 socket.id 做 session key（只在伺服器內部用）
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

// 建立隨機配對
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

  // 伺服器自己的倒數計時，到點時通知前端顯示保留選項
  const timer = setTimeout(() => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    const [idA, idB] = session.socketIds;
    if (idA) io.to(idA).emit("timer-expired");
    if (idB) io.to(idB).emit("timer-expired");
  }, MATCH_DURATION_MS);

  sessionTimers.set(sessionId, timer);

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

  console.log(
    `🎯 配對成功：${socketA.id}(${nicknameA}) <--> ${socketB.id}(${nicknameB})`
  );
}

// --------- Socket.io ---------
io.on("connection", (socket) => {
  const nickname = socket.handshake.query.nickname || "匿名魚";
  const uid = socket.handshake.query.uid || null;

  socket.nickname = nickname;
  socket.uid = uid;
  socket.currentSessionId = null;
  socket.currentRoomId = null;
  socket.keepRequest = false;

  console.log(`🐠 ${nickname} 已連線 (${socket.id}) uid=${uid || "無"}`);

  // 0. 訂閱所有已保留房間（用來收未讀訊息）
  socket.on("subscribe-saved-rooms", ({ roomIds }) => {
    if (!Array.isArray(roomIds)) return;

    roomIds.forEach((roomId) => {
      if (typeof roomId === "string" && roomId.trim()) {
        socket.join(roomId);
      }
    });

    console.log(
      `🔔 ${socket.nickname} 訂閱保留房間：`,
      roomIds.filter((r) => typeof r === "string")
    );
  });

  // 1. 開始隨機配對
  socket.on("start-matching", () => {
    console.log(`🎣 ${nickname} 要開始配對 (${socket.id})`);

    // 若已經有舊的 session，先清掉
    if (socket.currentSessionId) {
      cleanupSession(socket.currentSessionId);
      socket.currentSessionId = null;
    }
    socket.currentRoomId = null;
    socket.keepRequest = false;

    // 有人在排隊，而且不是自己，就直接配對
    if (waitingSocket && waitingSocket.id !== socket.id) {
      const partner = waitingSocket;
      waitingSocket = null;
      pairUsers(socket, partner);
    } else {
      // 沒有人在排隊，自己當等待者
      waitingSocket = socket;
      socket.emit("status", "🎣 正在尋找另一隻魚...");
    }
  });

  // 2. 收到前端傳來訊息（隨機配對 or 保留房間）
  socket.on("chat", (msg) => {
    const text = msg.text || msg.message || "";
    if (!text) return;

    const timestamp = new Date().toISOString();

    // 🔹 2-1) 保留房間訊息：前端會帶 roomId
    if (msg.roomId) {
      const roomId = msg.roomId;

      // 只發給同房間的其他人，不包含自己 → 不會重複看到一次
      socket.to(roomId).emit("chat", {
        text,
        from: socket.nickname || "匿名魚",
        fromUid: socket.uid || null,
        timestamp,
        roomId,
      });

      // 若之後要記錄歷史訊息，可以在這裡寫 DB
      return;
    }

    // 🔹 2-2) 隨機配對訊息：沒有 roomId，就走 session 流程
    if (socket.currentSessionId && !socket.currentRoomId) {
      const session = activeSessions.get(socket.currentSessionId);
      if (!session) return;

      // 伺服器也檢查是否超時
      if (session.expireAt && Date.now() > session.expireAt) {
        socket.emit("timer-expired");
        return;
      }

      // 紀錄訊息內容（之後保留緣分要用）
      session.messages.push({
        fromUid: socket.uid || null,
        fromNickname: socket.nickname || "匿名魚",
        text,
        timestamp,
      });

      const [idA, idB] = session.socketIds;
      const partnerId = idA === socket.id ? idB : idA;

      // ✅ 僅發給對方，不發回自己 → 不會在自己畫面再多一則
      if (partnerId) {
        io.to(partnerId).emit("chat", {
          text,
          from: socket.nickname || "匿名魚",
          timestamp,
        });
      }

      return;
    }

    // 其他狀況（沒有 session、也沒有 room）就忽略
  });

  // 3. 保留緣分
  socket.on("keep-request", async () => {
    socket.keepRequest = true;

    const partnerId = pairs.get(socket.id);
    if (!partnerId) return;

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return;

    const sessionId = socket.currentSessionId || partnerSocket.currentSessionId;
    const session = sessionId ? activeSessions.get(sessionId) : null;

    if (session && session.expireAt && Date.now() > session.expireAt) {
      socket.emit("keep-denied-expired");
      return;
    }

    // 雙方都按下「保留」
    if (partnerSocket.keepRequest) {
      const userKeyA = socket.uid || socket.id;
      const userKeyB = partnerSocket.uid || partnerSocket.id;
      const roomId = generateRoomId(userKeyA, userKeyB);
      const createdAt = new Date().toISOString();
      const transcript = session ? session.messages || [] : [];

      if (sessionId) {
        cleanupSession(sessionId);
      }
      socket.currentSessionId = null;
      partnerSocket.currentSessionId = null;

      // 兩邊都加入這個 persistent 房間
      socket.join(roomId);
      partnerSocket.join(roomId);
      socket.currentRoomId = roomId;
      partnerSocket.currentRoomId = roomId;

      console.log(`💞 雙方保留成功 → 房間 ${roomId}`);

      io.to(socket.id).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
        partnerUid: partnerSocket.uid || null,
        partnerNickname: partnerSocket.nickname || "摸魚夥伴",
      });
      io.to(partnerId).emit("keep-confirmed", {
        roomId,
        createdAt,
        transcript,
        partnerUid: socket.uid || null,
        partnerNickname: socket.nickname || "摸魚夥伴",
      });

      try {
        await createChatRoom(roomId, userKeyA, userKeyB, transcript, createdAt);
      } catch (err) {
        console.error("❗ createChatRoom 發生錯誤：", err);
      }
    } else {
      // 提醒對方顯示保留選項
      io.to(partnerId).emit("show-keep-option");
    }
  });

  // 4. 結束對話（隨機配對 or 保留房間）
    socket.on("end-chat", () => {
      const partnerId = pairs.get(socket.id);
      const sessionId = socket.currentSessionId;

      // 1) 隨機配對：真的結束，兩邊都斷開
      if (partnerId) {
        io.to(partnerId).emit("chat-end");
        pairs.delete(socket.id);
        pairs.delete(partnerId);
      }

      if (sessionId) {
        cleanupSession(sessionId);
        socket.currentSessionId = null;
      }

      // 2) 已保留房間：不要離開房間，保留 socket.join(roomId) 的關係
      //    這樣對方之後傳訊息，你仍然會收到 "chat" 事件，
      //    前端因為 chatMode !== 'saved' 或 currentRoomId 不同，
      //    就會當成未讀訊息，亮紅點。
      // if (socket.currentRoomId) {
      //   socket.leave(socket.currentRoomId);   // ← 把這段拿掉
      //   socket.currentRoomId = null;
      // }

      socket.keepRequest = false;
      socket.emit("chat-end");
    });

  // 5. 進入已保留房間（左邊列表點某個緣分）
  socket.on("join-saved-room", ({ roomId }) => {
    if (!roomId) return;

    // 若是「隨機配對聊天中」，先不允許切到已保留房間
    if (socket.currentSessionId && !socket.currentRoomId) {
      socket.emit("cannot-join-room-while-chatting");
      return;
    }

    // 如果原本在某個保留房間，就先離開舊的
    if (socket.currentRoomId && socket.currentRoomId !== roomId) {
      socket.leave(socket.currentRoomId);
    }

    // 加入新的保留房間，並把 currentRoomId 更新成這個房間
    socket.join(roomId);
    socket.currentRoomId = roomId;
    socket.currentSessionId = null;

    console.log(`📁 ${socket.nickname}(${socket.id}) 進入已保留房間 ${roomId}`);

    socket.emit("saved-room-joined", { roomId });
  });

  // 6. 斷線
  socket.on("disconnect", () => {
    console.log(`❌ ${socket.nickname} (${socket.id}) 離線`);

    // 如果在等待配對列表裡，把自己移除
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

// --------- 啟動伺服器 ---------
server.listen(PORT, () => {
  console.log(`🚀 Mōyu Club server running at http://localhost:${PORT}`);
});
