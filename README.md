# Moyu
#### Video Demo:

## Description
- **Core Motivation**
    - Moyu (摸魚) is a Chinese term meaning 'to sneak a break from work or study.' This app is built around the fundamental idea of finding a brief, restorative escape during a busy day. Moyu is designed as a lightweight, semi-anonymous chat matching web app that offers a quality, contained space where users can safely and casually share and exchange ideas, and then return to their main tasks without lingering distraction.
- **Quality Control & Domain Perks**
    - To ensure a high-quality community and to deter casual, low-commitment sign-ups, the app utilizes a crucial design decision based on email domain verification. Users registering with a Company or School Email are treated as 'verified users' and are granted a tangible benefit: more slots for their saved connection list compared to generic email users (e.g., 3 slots vs. 1 basic slot). This policy is the cornerstone of the quality environment, encouraging participation from individuals with verifiable organizational backgrounds.
- **Semi-Anonymous Identity & Timer**
    - Identity is deliberately semi-anonymous but contextually relevant. When a chat is successfully established, users can see the partner's Company or School label (derived from their email domain, leveraging the logic in signup.js), which helps foster relevant and professional conversation topics. Furthermore, to guide the conversation and respect the 'brief break' concept, upon successful random matching, a countdown timer immediately starts for the real-time chat session, ensuring interactions are focused and time-limited.
- **Technical Scope**
    - Firebase Authentication for user login, Firestore for persistent data storage (user profiles, saved connections), Node.js and Socket.io for real-time bi-directional communication (matching and chat), and a structured client-server design utilizing modern JavaScript. The entire application is packaged to run locally to clearly showcase the complete, integrated architecture.
---
## Project Structure 
| File/Folder | Type | Core Function and Responsibility |
| :--- | :--- | :--- |
| **`server.js`** | Backend (Node.js) | Server entry point. Manages the **Socket.io instance**, maintains the **in-memory matching pool**, executes matching logic, and forwards real-time chat messages. |
| **`public/`** | Folder | Contains all client-side code and static assets, structured into sub-directories: **`js/`** (JavaScript modules), **`css/`** (stylesheets like `main.css`), and **`images/`** (logos and icons). All User Interface (UI) is served from this directory. |
| **`public/js/client.js`** | Frontend (JS) | **Core client-side logic.** Handles Firebase Auth state, all **Socket.io events** (connecting, sending/receiving messages, matching notifications), and data interaction with **Firestore** (saving connections). |
| **`public/js/signup.js`** | Frontend (JS) | Sign-up logic. Includes the **`classifyDomainFromEmail` function** to parse user email domains and write the `domainType` to Firestore, implementing the **domain classification mechanism**. |
| **`public/js/home.js`** | Frontend (JS) | Specific logic for `home.html`. Handles UI rendering after login, particularly applying the correct **nickname border color style** based on the user's `domainType` for visual verification status. |
| **`public/js/i18n.js`** | Frontend (JS) | **Internationalization (i18n) module.** Contains translation dictionaries for interface texts and provides an API for language switching. |
| **`public/js/firebase.js`** | Frontend (JS) | Firebase initialization configuration. Initializes the Firebase App and exports `auth` (authentication) and `db` (Firestore database) instances. |
| **Other HTML Pages** | Frontend (HTML) | `login.html`, `reset.html`, `nickname.html`, `verify.html`, etc. Handles all account management flows and interface navigation. |
---
## Technical Features 
**1. Real-Time Matching and Chat via Socket.io**
- The core functionality uses **Node.js** and **Socket.io** for low-latency, bi-directional communication, essential for instantaneous user matching and message transfer.
- The server maintains a simple, in-memory matching pool (`matchingPool`) and handles the logic for pairing up waiting users.

**2. Domain-Based User Tiering**
- The **`signup.js`** module implements a function (`classifyDomainFromEmail`) to categorize users by their email domain (e.g., `'company'`, `'school'`, or `'free'`).
- This categorization determines the user's allowance for **saved connections** (**Verified Users get 3 slots**, **Free Users get 1**), acting as a key mechanism for quality control.
- The user's domain status is visually represented on the home screen by an identity frame around their nickname (managed by **`home.js`**).

**3. Authentication and Persistent Data**
- **Firebase Authentication** manages user sign-up, sign-in, and password reset across pages (e.g., **`login.js`**, **`signup.js`**, **`reset.js`**).
- **Firestore** serves as the persistent database for storing user profiles, including nickname, `domainType`, language preference, and the list of saved connections.

**4. Time-Limited Chat Sessions**
- Upon successful matching, the server immediately initiates and enforces a **countdown timer** for the chat session, reinforcing the "brief break" concept.

**5. Internationalization (i18n)**
- The entire application supports **language switching** between Traditional Chinese and English, managed by the dedicated **`i18n.js`** module.
---

## Installation and How to Run
**Prerequisites**
- Node.js (Recommended version 18 or higher)
- npm (Installed with Node.js)
- Firebase Project: Configure your own Firebase credentials within public/js/firebase.js to run the application's authentication and database features.

**Step-by-Step Guide**
1. Clone the Repository Open your terminal and clone the project:
git clone 
cd Moyu-Project-Folder

2. Install Dependencies Install Node.js dependencies (primarily express and socket.io):
npm install

3. Start the Server Start your backend server using Node.js:
node server.js

4. Access the App Open in your browser: http://localhost:3000/login.html

5. Test the Matching Feature
    - It is recommended to use two different browsers or incognito windows to register/log in to two separate accounts.
    - Click the "Start Matching" button in both windows simultaneously to test the real-time matching, countdown, and chat functionality.

---

## Design Decisions and Trade-offs 

---
