// utils/firebaseAuth.mjs

// ✅ 從官方 CDN 載入 Firebase 模組（適用前端直接使用）
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { firebaseConfig } from "./firebaseConfig.mjs";

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 📩 使用 Email 登入
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ 登入成功：", userCredential.user.uid);
    alert("登入成功！");
    window.location.href = "/index.html";
  } catch (error) {
    console.error("❌ 登入失敗：", error.message);
    alert("登入失敗：" + error.message);
  }
}

// 🌐 使用 Gmail 登入
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("✅ Google 登入成功：", result.user.uid);
    alert("Google 登入成功！");
    window.location.href = "/index.html";
  } catch (error) {
    console.error("❌ Google 登入失敗：", error.message);
    alert("Google 登入失敗：" + error.message);
  }
}
