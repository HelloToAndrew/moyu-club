const socket = io();
const joinBtn = document.getElementById("join");
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");
const logDiv = document.getElementById("log");
const sendBtn = document.getElementById("send");
const msgInput = document.getElementById("msg");

joinBtn.addEventListener("click", () => {
  socket.emit("join_pool");
  statusDiv.textContent = "正在尋找懂魚快樂的另一隻魚...";
});

socket.on("paired", ({ partnerId }) => {
  statusDiv.textContent = `已配對成功！對象：${partnerId}`;
  chatDiv.style.display = "block";
});

socket.on("receive_message", (msg) => {
  const bubble = document.createElement("div");
  bubble.textContent = "🐟：" + msg;
  logDiv.appendChild(bubble);
});

socket.on("partner_left", () => {
  const notice = document.createElement("div");
  notice.textContent = "🐠 對方游走了...";
  logDiv.appendChild(notice);
});

sendBtn.addEventListener("click", () => {
  const msg = msgInput.value;
  socket.emit("send_message", msg);
  const bubble = document.createElement("div");
  bubble.textContent = "我：" + msg;
  logDiv.appendChild(bubble);
  msgInput.value = "";
});
