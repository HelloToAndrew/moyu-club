// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public")); // 提供前端靜態檔案

// 簡單記錄目前在線使用者
const waiting = [];

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("🟢 使用者連線:", socket.id);

  if (!waitingUser) {
    waitingUser = socket;
    socket.emit("status", "等待配對中... 🕐");
  } else {
    const partner = waitingUser;
    waitingUser = null;

    const roomId = `room-${socket.id}-${partner.id}`;
    socket.join(roomId);
    partner.join(roomId);

    io.to(roomId).emit("match", `配對成功！遇見摸魚夥伴 🐟 代號 ${roomId.slice(-4)}`);

    socket.on("chat", (msg) => io.to(roomId).emit("chat", `🗣 ${msg}`));
    partner.on("chat", (msg) => io.to(roomId).emit("chat", `🗣 ${msg}`));
  }
});


function tryPairing() {
  while (waiting.length >= 2) {
    const fishA = waiting.shift();
    const fishB = waiting.shift();
    fishA.partner = fishB;
    fishB.partner = fishA;

    fishA.emit("paired", { partnerId: fishB.id });
    fishB.emit("paired", { partnerId: fishA.id });

    console.log("✨ 配對成功：", fishA.id, "<->", fishB.id);
  }
}

const PORT = 3000;
server.listen(PORT, () => console.log(`🌊 Mōyu Server 游在 http://localhost:${PORT}`));
