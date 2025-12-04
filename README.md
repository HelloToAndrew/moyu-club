# Moyu (摸魚)
#### Video Demo:

## Description
- **Core Motivation: The "Moyu" Concept**
    - Moyu (摸魚) is a Chinese term meaning 'to sneak a break from work or study.' This app is built around the fundamental idea of finding a brief, restorative escape during a busy day. Moyu is designed as a lightweight, semi-anonymous chat matching web app that offers a quality, contained space where users can safely and casually share and exchange ideas, and then return to their main tasks without lingering distraction.
- **Quality Control & Domain Perks**
    - To ensure a high-quality community and to deter casual, low-commitment sign-ups, the app utilizes a crucial design decision based on email domain verification. Users registering with a Company or School Email are treated as 'verified users' and are granted a tangible benefit: more slots for their saved connection list compared to generic email users (e.g., 3 slots vs. 1 basic slot). This policy is the cornerstone of the quality environment, encouraging participation from individuals with verifiable organizational backgrounds.
- **Semi-Anonymous Identity & Timer**
    - Identity is deliberately semi-anonymous but contextually relevant. When a chat is successfully established, users can see the partner's Company or School label (derived from their email domain, leveraging the logic in signup.js), which helps foster relevant and professional conversation topics. Furthermore, to guide the conversation and respect the 'brief break' concept, upon successful random matching, a countdown timer immediately starts for the real-time chat session, ensuring interactions are focused and time-limited.
- **Technical Scope**
    - Firebase Authentication for user login, Firestore for persistent data storage (user profiles, saved connections), Node.js and Socket.io for real-time bi-directional communication (matching and chat), and a structured client-server design utilizing modern JavaScript. The entire application is packaged to run locally to clearly showcase the complete, integrated architecture.

## Project Structure / 專案結構說明 
| 檔案/資料夾 | 類型 | 核心功能與職責 (Core Function and Responsibility) |
| :--- | :--- | :--- |
| **`server.js`** | 後端 (Node.js) | 伺服器入口。負責啟動 HTTP 服務、服務靜態檔案，並管理 **Socket.io 實例**。核心職責是維護**記憶體中的配對池**、執行配對邏輯，以及在配對成功後轉發即時聊天訊息。 |
| **`public/`** | 資料夾 | 存放所有前端靜態資源，包括 HTML 頁面、CSS 樣式表 (`main.css`) 和圖片等。所有用戶介面 (UI) 均由此資料夾提供服務。 |
| **`public/client.js`** | 前端 (JS) | **客戶端主邏輯。** 負責監聽 Firebase 狀態、處理所有 **Socket.io 事件**（連線、發送/接收訊息、配對成功通知）、以及與 **Firestore** 進行數據互動（保留連線記錄）。 |
| **`public/signup.js`** | 前端 (JS) | 註冊邏輯。包含 **`classifyDomainFromEmail` 函式**，用於解析用戶信箱網域並將 `domainType` 寫入 Firestore，以實現**網域分級機制**。 |
| **`public/home.js`** | 前端 (JS) | `home.html` 頁面專屬邏輯。負責登入後 UI 的渲染，特別是根據用戶的 `domainType` 來設定**暱稱外框的顏色樣式**，以視覺化呈現用戶的驗證狀態。 |
| **`public/i18n.js`** | 前端 (JS) | **國際化 (i18n) 模組。** 包含所有中英文介面文本的翻譯字典，並提供統一的 API 供前端其他模組進行語言切換。 |
| **`public/firebase.js`** | 前端 (JS) | Firebase 初始化配置。負責初始化 Firebase App 並匯出 `auth` (身份驗證) 和 `db` (Firestore 資料庫) 實例。 |
| **其他 HTML 頁面** | 前端 (HTML) | `login.html`、`reset.html`、`nickname.html`、`verify.html` 等。處理所有帳戶管理流程和介面導航。 |

---

## Technical Features 

---

## Installation and How to Run

---

## Design Decisions and Trade-offs 

---
