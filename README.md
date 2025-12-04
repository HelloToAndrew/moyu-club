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
| File/Folder | Type | Core Function and Responsibility |
| :--- | :--- | :--- |
| **`server.js`** | Backend (Node.js) | Server entry point. Manages the **Socket.io instance**, maintains the **in-memory matching pool**, executes matching logic, and forwards real-time chat messages. |
| **`public/`** | Folder | Contains all frontend static assets, including HTML pages, CSS (`main.css`), and images. All User Interface (UI) is served from this directory. |
| **`public/client.js`** | Frontend (JS) | **Core client-side logic.** Handles Firebase Auth state, all **Socket.io events** (connecting, sending/receiving messages, matching notifications), and data interaction with **Firestore** (saving connections). |
| **`public/signup.js`** | Frontend (JS) | Sign-up logic. Includes the **`classifyDomainFromEmail` function** to parse user email domains and write the `domainType` to Firestore, implementing the **domain classification mechanism**. |
| **`public/home.js`** | Frontend (JS) | Specific logic for `home.html`. Handles UI rendering after login, particularly applying the correct **nickname border color style** based on the user's `domainType` for visual verification status. |
| **`public/i18n.js`** | Frontend (JS) | **Internationalization (i18n) module.** Contains translation dictionaries for interface texts and provides an API for language switching. |
| **`public/firebase.js`** | Frontend (JS) | Firebase initialization configuration. Initializes the Firebase App and exports `auth` (authentication) and `db` (Firestore database) instances. |
| **Other HTML Pages** | Frontend (HTML) | `login.html`, `reset.html`, `nickname.html`, `verify.html`, etc. Handles all account management flows and interface navigation. |

---

## Technical Features 

---

## Installation and How to Run

---

## Design Decisions and Trade-offs 

---
