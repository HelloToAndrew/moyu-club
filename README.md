# Moyu (摸魚)
#### Video Demo: <URL HERE>

## Description
- **Core Motivation**
    - Moyu (摸魚) is a Chinese term meaning 'to sneak a break from work or study.' This app is built around the fundamental idea of finding a brief, restorative escape during a busy day. Moyu is designed as a lightweight, semi-anonymous chat matching web app that offers a quality, contained space where users can safely and casually share and exchange ideas, and then return to their main tasks without lingering distraction.
- **Quality Control & Domain Perks**
    - To ensure a high-quality community and to deter casual, low-commitment sign-ups, the app utilizes a crucial design decision based on email domain verification. Users registering with a Company or School Email are treated as **'verified users'** and are granted a tangible benefit: more slots for their saved connection list compared to generic email users (e.g., 3 slots vs. 1 basic slot). This policy is the cornerstone of the quality environment, encouraging participation from individuals with verifiable organizational backgrounds.
- **Semi-Anonymous Identity & Timer**
    - Identity is deliberately semi-anonymous but contextually relevant. When a chat is successfully established, users can see the partner's Company or School label (derived from their email domain, leveraging the logic in `signup.js`), which helps foster relevant and professional conversation topics. Furthermore, to guide the conversation and respect the 'brief break' concept, upon successful random matching, a **countdown timer** immediately starts for the real-time chat session, ensuring interactions are focused and time-limited.
- **Technical Scope**
    - This project demonstrates the use of **Firebase Authentication** for user login, **Firestore** for persistent data storage (user profiles, saved connections), **Node.js** and **Socket.io** for real-time bi-directional communication (matching and chat), and a structured client-server design utilizing modern JavaScript. The entire application is packaged to run locally to clearly showcase the complete, integrated architecture.

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

### Real-Time Matching and Chat via Socket.io
- The core functionality uses **Node.js** and **Socket.io** for low-latency, bi-directional communication, essential for instantaneous user matching and message transfer.
- The server maintains a simple, in-memory matching pool (`matchingPool`) and handles the logic for pairing up waiting users.

### Domain-Based User Tiering
- The **`signup.js`** module implements a function (`classifyDomainFromEmail`) to categorize users by their email domain (e.g., `'company'`, `'school'`, or `'free'`).
- This categorization determines the user's allowance for **saved connections** (**Verified Users get 3 slots**, **Free Users get 1**), acting as a key mechanism for quality control.
- The user's domain status is visually represented on the home screen by an identity frame around their nickname (managed by **`home.js`**).

### Authentication and Persistent Data
- **Firebase Authentication** manages user sign-up, sign-in, and password reset across pages (e.g., **`login.js`**, **`signup.js`**, **`reset.js`**).
- **Firestore** serves as the persistent database for storing user profiles, including nickname, `domainType`, language preference, and the list of saved connections.

### Time-Limited Chat Sessions
- Upon successful matching, the server immediately initiates and enforces a **countdown timer** for the chat session, reinforcing the "brief break" concept.

### Internationalization (i18n)
- The entire application supports **language switching** between Traditional Chinese and English, managed by the dedicated **`i18n.js`** module.

---

## Installation and How to Run

### Prerequisites
* **Node.js** (Recommended version 18 or higher)
* **npm** (Installed with Node.js)
* **Firebase Project:** You must configure your own Firebase credentials within `public/js/firebase.js` to run the application's authentication and database features.

### Step-by-Step Guide
1.  **Clone the Repository**
    Open your terminal and clone the project:
    ```bash
    git clone [https://github.com/HelloToAndrew/moyu-club.git](https://github.com/HelloToAndrew/moyu-club.git)
    cd Moyu-Project-Folder
    ```

2.  **Install Dependencies**
    Install Node.js dependencies (primarily `express` and `socket.io`):
    ```bash
    npm install
    ```

3.  **Start the Server**
    Start your backend server using Node.js:
    ```bash
    node server.js
    ```

4.  **Access the App**
    Open in your browser: `http://localhost:3000/login.html`

5.  **Test the Matching Feature**
    * It is recommended to use **two** different browsers or incognito windows to register/log in to two separate accounts.
    * Click the "Start Matching" button in both windows simultaneously to test the real-time matching, countdown, and chat functionality.

---

## Design Decisions and Trade-offs

### 1. Quality Control via Email Domain
* **Decision:** The system classifies users by their email domain and grants verified users (Company/School) a higher capacity for **saved connections** (3 slots vs. 1).
* **Justification:** This mechanism is central to the project's goal of creating a **quality break space** by incentivizing the use of verifiable organizational accounts.
* **Trade-off:** This introduces slight **friction** during registration for users who only wish to use a free email account.

### 2. In-Memory Matching Pool
* **Decision:** The list of users waiting to match (`matchingPool`) and the active chat sessions are maintained **in-memory** on the Node.js server.
* **Justification:** This simplifies the server architecture and allows for maximum focus on the core matching algorithms for a proof-of-concept project.
* **Limitation:** This is a major trade-off. Any server restart will result in the loss of all current sessions and the waiting pool.

### 3. Semi-Anonymous Identity Design
* **Decision:** Upon matching, only the partner's domain type is shown (e.g., "Company User") rather than their full email or nickname.
* **Justification:** This design fosters relevant professional or academic conversations based on shared context, while maintaining user privacy and preventing the issues often seen with completely anonymous chat apps.

---

## Future Work

The following are the main functional and architectural optimizations planned to successfully transition Moyu from its current offline demo version to a scalable online service and a convenient Chrome Side Panel Extension.

### 1. Core Features & Matching Optimization
* **Optimizing the Matching Algorithm**:
    * **Incorporate User Data**: Matching will prioritize **user activity** (frequent logins) and **verification status** (Company/School email verification) to increase pairing opportunities for high-quality users.
    * **Location-Based Filtering**: Introduce location data, allowing users to opt to match with people in **nearby regions** or the **same time zone**, enhancing conversational relevance and immediacy.
* **Ongoing Security Hardening**:
    * Implement **server-side input validation** for all Socket.io messages to ensure all incoming chat messages and requests are valid.
    * Strengthen **Firebase Security Rules** to protect user data and chat logs from unauthorized access.
* **Production Deployment**:
    * Deploy the service to a production-ready online server (real server) and use the **HTTPS** protocol to ensure the stability and security of real-time connections (Socket.io).

### 2. Chrome Extension & User Experience
* **Deploy as a Chrome Side Panel Extension**:
    * This will allow users to launch Moyu via the browser sidebar at any time, aligning with the core "sneak a break" philosophy.
    * Requires adapting the interface logic to the Chrome Service Worker and extension lifecycle.
* **UX/UI Interface Optimization**:
    * Adjust the interface design to adapt to the narrower format of the Chrome Side Panel, ensuring all functions operate smoothly in the sidebar.
    * Optimize the experience for mobile devices (**Mobile Responsiveness**) and integrate richer, customizable user profiles.