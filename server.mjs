// server.mjs
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createChatRoom } from "./utils/firestore.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 3000;

// ✅ 這兩行是關鍵修正
app.use(express.static(path.join(__dirname, "public")));
app.use("/utils", express.static(path.join(__dirname, "utils")));

let waitingUser = null; // 尚未配對的使用者
const pairs = new Map(); // 記錄 socket.id ↔ partner.id

// 🔹 產生房間 ID
function generateRoomId(id1, id2) {
  return [id1, id2].sort().join("_");
}

// 🧠 Socket 連線事件
io.on("connection", (socket) => {
  const nickname = socket.handshake.query.nickname || "匿名魚";
  console.log(`🐠 ${nickname} 已連線 (${socket.id})`);

  // 若已有等待者 → 配對成功
  if (waitingUser && waitingUser.id !== socket.id) {
    const partner = waitingUser;
    waitingUser = null;

    pairs.set(socket.id, partner.id);
    pairs.set(partner.id, socket.id);

    io.to(socket.id).emit("match", `配對成功！遇見摸魚夥伴 🐡`);
    io.to(partner.id).emit("match", `配對成功！遇見摸魚夥伴 🐡`);

    console.log(`🎯 配對成功：${socket.id} <--> ${partner.id}`);
  } else {
    // 沒人可配 → 等待中
    waitingUser = socket;
    io.to(socket.id).emit("status", "🎣 正在尋找另一隻魚...");
  }

  // 📩 聊天事件
  socket.on("chat", (msg) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("chat", msg);
    }
  });

  // 🕒 保留請求（新版邏輯）
  socket.on("keep-request", () => {
    socket.keepRequest = true;
    const partnerId = pairs.get(socket.id);
    if (!partnerId) return;
    const partnerSocket = io.sockets.sockets.get(partnerId);

    if (partnerSocket?.keepRequest) {
      // ✅ 雙方都同意
      const roomId = generateRoomId(socket.id, partnerId);
      io.to(socket.id).emit("keep-confirmed", { roomId });
      io.to(partnerId).emit("keep-confirmed", { roomId });
      console.log(`💞 雙方保留成功 → 房間 ${roomId}`);
      createChatRoom(roomId, socket.id, partnerId);
    } else {
      // 🔔 通知對方顯示「保留選項」
      io.to(partnerId).emit("show-keep-option");
    }
  });

  // 🚪 結束對話
  socket.on("end-chat", () => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("chat-end");
      pairs.delete(socket.id);
      pairs.delete(partnerId);
    }
    socket.emit("chat-end");
  });

  // 🔌 離線處理
  socket.on("disconnect", () => {
    console.log(`❌ ${nickname} (${socket.id}) 離線`);
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("chat-end");
      pairs.delete(partnerId);
    }
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    pairs.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Mōyu Club server running at http://localhost:${PORT}`);
});
