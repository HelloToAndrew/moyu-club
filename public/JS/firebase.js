// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4oaUyo3RWJnnLLN3CkiiJ8wimp_43kko",
  authDomain: "moyu-club.firebaseapp.com",
  projectId: "moyu-club",
  storageBucket: "moyu-club.firebasestorage.app",
  messagingSenderId: "178708686787",
  appId: "1:178708686787:web:be7c38dfe3d29a6695bf76",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
