export const LANG_KEY = "moyu_lang";
export const DEFAULT_LANG = "zh";

export const translations = {
  zh: {
    common: {
      appName: "Moyu",
      backHome: "回主畫面",
      logout: "登出帳號",
      settings: "帳戶設定",
    },

    home: {
      pageTitle: "Moyu",
      appTitle: "Moyu",
      appSubtitle: "在這裡開始一段安靜的對話",
      hiLabel: "你好",
      settingsLabel: "設定",

      statusSectionTitle: "目前狀態",
      statusLoading: "正在確認登入狀態",
      statusIdle: "你可以開始建立新的連線",

      matchSectionTitle: "開始連線",
      matchSectionDesc: "系統會為你尋找一位正在使用服務的使用者",

      startMatching: "開始連線",
      stopMatching: "停止連線",
      matching: "正在搜尋使用者",
      matchingBtn: "搜尋中",

      chatRoomLabel: "對話空間",
      chatNotMatched: "尚未建立連線",
      chatPlaceholder: "成功建立連線後，對話將會出現在這裡",
      chatPlaceholderInput: "輸入訊息",
      countdownPrefix: "剩餘時間",

      sendButton: "送出",
      forceEndButton: "結束對話",

      keepQuestion: "時間結束 是否要保留這段連線",
      keepButton: "保留連線",
      endButton: "結束並返回",

      keepHintPartner: "對方希望保留連線 若你同意 你們將會保留此對話",
      keepSuccess: "連線已保留 你們可以繼續對話",
      keepLimitReached: "已達到可保留的上限 無法新增",

      chatEnded: "對話已結束 你可以重新建立新的連線",
      timeUp: "時間已到 請選擇是否保留連線",

      keepCountdownText: (sec) => `若未選擇 系統將在 ${sec} 秒後結束連線`,

      chatTitleRandom: (name) => `與 ${name} 的對話`,
      chatTitleSaved: (name) => `已保留的連線：${name}`,
      reconnectedSaved: (name) => `已重新連線至 ${name}`,

      matchSuccessSystem: "已成功建立連線",
      matchSuccessStatus: "開始對話",

      savedSectionTitle: "已保留的連線",
      savedSectionDesc: "你曾保留的對話會出現在這裡",
      savedEmpty: "目前沒有保留的連線",
      savedLoading: "讀取中",
      savedAgain: "重新開啟",
      deleteButton: "刪除",
      savedUsageLabel: (used, max) => `${used} / ${max}`,

      deleteConfirm: "刪除後 對話將無法復原 是否確認",
      deleteHint: "連線已刪除",
    },

    login: {
      pageTitle: "Moyu",
      title: "Moyu",
      subtitle: "登入後開始使用服務",
      emailLabel: "Email",
      passwordLabel: "密碼",
      emailLoginBtn: "使用 Email 登入",
      forgot: "忘記密碼",
      signup: "建立帳號",
      orText: "或使用 Google 登入",
      googleBtn: "使用 Google 登入",
      loggingIn: "登入中",
      loginFailed: "登入失敗：",
      needVerify: "Email 尚未驗證 請前往信箱完成驗證",
      loadingUser: "載入使用者資料中",
      emptyEmailPw: "請輸入 Email 與密碼",
    },

    signup: {
      pageTitle: "Moyu",
      title: "建立帳號",
      subtitle: "請完成電子郵件驗證以啟用所有功能",
      emailLabel: "Email",
      passwordLabel: "密碼 至少六個字",
      passwordConfirmLabel: "再次輸入密碼",
      submitBtn: "建立帳號並寄出驗證信",
      backToLogin: "返回登入",
      fillAllFields: "請填寫所有欄位",
      passwordNotMatch: "兩次輸入的密碼不同",
      passwordTooShort: "密碼至少需六字",
      creating: "建立中",
      success: "帳號已建立 請前往信箱完成驗證",
      failedPrefix: "註冊失敗：",
    },

    reset: {
      pageTitle: "Moyu",
      title: "重設密碼",
      subtitle: "輸入你的 Email 系統會寄出重設連結",
      emailLabel: "登入 Email",
      emailPlaceholder: "請輸入 Email",
      submitBtn: "寄送重設連結",
      backToLogin: "返回登入",
      emptyEmail: "請先輸入 Email",
      sending: "寄送中",
      success: "已寄出重設連結 請至信箱查看",
      failedPrefix: "重設失敗：",
    },

    nickname: {
      pageTitle: "Moyu",
      title: "設定暱稱",
      subtitle: "這將是他人看到的名稱",
      label: "暱稱",
      hint: "建議使用簡潔易辨識的名稱",
      saveBtn: "儲存",
      placeholder: "輸入暱稱",
      empty: "暱稱不能為空",
      lengthInvalid: "暱稱需為兩到二十字",
      saving: "儲存中",
      saved: "已儲存",
      duplicateInDomain: "你的組織中已有相同暱稱 請更換",
      errorPrefix: "錯誤：",
    },

    settings: {
      pageTitle: "Moyu",
      title: "帳戶設定",
      subtitle: "管理你的帳戶資訊",

      emailSectionTitle: "登入 Email",
      emailLabel: "Email",
      emailVerifiedText: "已驗證",
      emailNotVerifiedText: "尚未驗證",
      emailCheckingText: "檢查中",
      resendBtn: "重寄驗證信",

      nicknameSectionTitle: "暱稱",
      nicknameLabel: "顯示的暱稱",

      // 語言設定區塊（新增）
      langSectionTitle: "語言設定",
      langLabel: "介面語言",

      backHomeBtn: "回主畫面",
      saveBtn: "儲存設定",
      logoutBtn: "登出帳號",

      loadingProfile: "載入中",
      profileLoaded: "已載入",
      loadFailedPrefix: "載入失敗：",

      resendSending: "寄送中",
      resendSuccess: "驗證信已寄出",
      resendFailedPrefix: "寄送失敗：",
      needLoginForResend: "請重新登入後再試",

      savingProfile: "儲存中",
      saveSuccess: "已儲存",
      saveFailedPrefix: "儲存失敗：",
      needLoginForSave: "請重新登入後再試",
      nicknameEmpty: "暱稱不可為空",
    },
  },

  en: {
    common: {
      appName: "Moyu",
      backHome: "Back",
      logout: "Log out",
      settings: "Account Settings",
    },

    home: {
      pageTitle: "Moyu",
      appTitle: "Moyu",
      appSubtitle: "Begin a quiet conversation",
      hiLabel: "Hello",
      settingsLabel: "Settings",

      statusSectionTitle: "Status",
      statusLoading: "Checking login state",
      statusIdle: "You can start a new connection",

      matchSectionTitle: "Start connection",
      matchSectionDesc: "The system will match you with an available user",

      startMatching: "Start",
      stopMatching: "Stop",
      matching: "Searching for a user",
      matchingBtn: "Searching",

      chatRoomLabel: "Conversation",
      chatNotMatched: "No connection",
      chatPlaceholder: "Your conversation will appear here",
      chatPlaceholderInput: "Type a message",
      countdownPrefix: "Time left",

      sendButton: "Send",
      forceEndButton: "End",

      keepQuestion: "Time is up Keep this connection",
      keepButton: "Keep connection",
      endButton: "End and return",

      keepHintPartner: "The other side wants to keep this connection",
      keepSuccess: "Connection saved You may continue talking",
      keepLimitReached: "You have reached the limit",

      chatEnded: "The conversation has ended",
      timeUp: "Time is up Choose whether to keep the connection",

      keepCountdownText: (sec) => `Closing in ${sec} seconds`,

      chatTitleRandom: (name) => `Chat with ${name}`,
      chatTitleSaved: (name) => `Saved connection: ${name}`,
      reconnectedSaved: (name) => `Reconnected with ${name}`,

      matchSuccessSystem: "Connection established",
      matchSuccessStatus: "Start chatting",

      savedSectionTitle: "Saved connections",
      savedSectionDesc: "Your saved conversations appear here",
      savedEmpty: "No saved connections",
      savedLoading: "Loading",
      savedAgain: "Open",
      deleteButton: "Delete",
      savedUsageLabel: (used, max) => `${used} / ${max}`,

      deleteConfirm: "This will remove the connection and messages",
      deleteHint: "Connection removed",
    },

    login: {
      pageTitle: "Moyu",
      title: "Moyu",
      subtitle: "Sign in to begin",
      emailLabel: "Email",
      passwordLabel: "Password",
      emailLoginBtn: "Sign in with Email",
      forgot: "Forgot password",
      signup: "Create account",
      orText: "or sign in with Google",
      googleBtn: "Sign in with Google",
      loggingIn: "Signing in",
      loginFailed: "Login failed: ",
      needVerify: "Email not verified Please check your inbox",
      loadingUser: "Loading profile",
      emptyEmailPw: "Please enter Email and password",
    },

    signup: {
      pageTitle: "Moyu",
      title: "Create your account",
      subtitle: "Please verify your email to enable all features",
      emailLabel: "Email",
      passwordLabel: "Password at least six characters",
      passwordConfirmLabel: "Confirm password",
      submitBtn: "Create account and send verification email",
      backToLogin: "Back to login",
      fillAllFields: "Please fill in all fields",
      passwordNotMatch: "Passwords do not match",
      passwordTooShort: "Password must be at least six characters",
      creating: "Creating",
      success: "Account created Please check your inbox",
      failedPrefix: "Sign up failed: ",
    },

    reset: {
      pageTitle: "Moyu",
      title: "Reset password",
      subtitle: "Enter your email and we will send a reset link",
      emailLabel: "Login Email",
      emailPlaceholder: "Enter email",
      submitBtn: "Send reset link",
      backToLogin: "Back to login",
      emptyEmail: "Please enter your email",
      sending: "Sending",
      success: "Reset link sent",
      failedPrefix: "Reset failed: ",
    },

    nickname: {
      pageTitle: "Moyu",
      title: "Set your nickname",
      subtitle: "Others will see this name",
      label: "Nickname",
      hint: "Use a simple and recognizable name",
      saveBtn: "Save",
      placeholder: "Enter nickname",
      empty: "Nickname cannot be empty",
      lengthInvalid: "Nickname must be between two and twenty characters",
      saving: "Saving",
      saved: "Saved",
      duplicateInDomain: "This nickname is used in your organization",
      errorPrefix: "Error: ",
    },

    settings: {
      pageTitle: "Moyu",
      title: "Account settings",
      subtitle: "Manage your account information",

      emailSectionTitle: "Login email",
      emailLabel: "Email",
      emailVerifiedText: "Verified",
      emailNotVerifiedText: "Not verified",
      emailCheckingText: "Checking",
      resendBtn: "Resend verification email",

      nicknameSectionTitle: "Nickname",
      nicknameLabel: "Displayed nickname",

      // language section (added)
      langSectionTitle: "Language",
      langLabel: "Interface language",

      backHomeBtn: "Back",
      saveBtn: "Save",
      logoutBtn: "Log out",

      loadingProfile: "Loading",
      profileLoaded: "Loaded",
      loadFailedPrefix: "Load failed: ",

      resendSending: "Sending",
      resendSuccess: "Verification email sent",
      resendFailedPrefix: "Failed to send: ",
      needLoginForResend: "Please log in again",

      savingProfile: "Saving",
      saveSuccess: "Saved",
      saveFailedPrefix: "Failed to save: ",
      needLoginForSave: "Please log in again",
      nicknameEmpty: "Nickname cannot be empty",
    },
  },
};

export function getCurrentLang() {
  return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
}

export function setCurrentLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

export function t(page, key, ...args) {
  const lang = getCurrentLang();
  const pack = translations[lang] || translations[DEFAULT_LANG];
  const pagePack = pack[page] || {};
  const commonPack = pack.common || {};
  const val = pagePack[key] ?? commonPack[key];
  if (typeof val === "function") return val(...args);
  return val ?? key;
}
