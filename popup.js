document.getElementById("lazyBtn").addEventListener("click", () => {
  const status = document.getElementById("status");
  status.textContent = "配對中...（假裝一下 😎）";
  setTimeout(() => {
    status.textContent = "配對成功！遇見摸魚狐狸 #27 🦊";
  }, 2000);
});