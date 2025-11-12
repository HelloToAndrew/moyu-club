// utils/firestore.mjs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.mjs";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 💾 建立聊天室資料（或更新）
export async function createChatRoom(roomId, userA, userB) {
  try {
    await setDoc(doc(db, "chatRooms", roomId), {
      users: [userA, userB],
      createdAt: new Date(),
      messages: []
    });
    console.log(`💾 Firestore: 已建立聊天室 ${roomId}`);
  } catch (error) {
    console.error("❌ Firestore 建立聊天室失敗：", error);
  }
}
