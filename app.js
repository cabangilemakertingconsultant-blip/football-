/* =====================================
   CABANGILE FOOTBALL
   Main application
   Direct API-Football connection
   ===================================== */

// APP STATE
let currentPage = "home";
let registerMode = false;
let auth = null;
let db = null;
let firebaseReady = false;
let firebaseError = null;

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyChXiA8otw90zk4rk-pv4-uo2jMaanKXpI",
  authDomain: "football-d6b07.firebaseapp.com",
  projectId: "football-d6b07",
  storageBucket: "football-d6b07.firebasestorage.app",
  messagingSenderId: "101049949537",
  appId: "1:101049949537:web:8bdff34999e81d4129f920",
  measurementId: "G-6M9Q9GJ04X"
};

// FIREBASE FUNCTIONS
let createUserWithEmailAndPassword;
let signInWithEmailAndPassword;
let sendPasswordResetEmail;
let signOut;
let onAuthStateChanged;
let updateProfile;
let doc;
let getDoc;
let setDoc;
let serverTimestamp;
let collection;
let getDocs;
let runTransaction;

// ADMIN SETTINGS
const ADMIN_EMAIL = "cabangilemakertingconsultant@gmail.com";
let adminSelectedUser = null;
let adminUsers = [];

// API-FOOTBALL DIRECT CONNECTION
// Replace only the text between the quotation marks with your API-Football key.
// Do not send your key to anyone. This direct connection makes the key visible
// in the website's public JavaScript.
const FOOTBALL_API_KEY = "96384b438028c1429f9850925843f490";
const FOOTBALL_API_URL = "https://v3.football.api-sports.io/fixtures";

const FOOTBALL_COMPETITIONS = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "LaLiga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 2, name: "UEFA Champions League" }
];

let matchesCache = null;
let matchesCacheTime = 0;
let matchesLoading = false;
const MATCHES_CACHE_DURATION = 10 * 60 * 1000;

// HELPERS
function escapeMatchText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function isCabangileAdmin() {
  return !!auth?.currentUser &&
    auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function safeFootballImage(url) {
  if (typeof url !== "string" || !url.startsWith("https://")) return "";
  return escapeMatchText(url);
}

function formatMatchTime(dateValue) {
  if (!dateValue) return "Time unavailable";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function getSouthAfricanDate(offsetDays = 0) {
  const now = new Date();
  const saNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  saNow.setDate(saNow.getDate() + offsetDays);
  const year = saNow.getFullYear();
  const month = String(saNow.getMonth() + 1).padStart(2, "0");
  const day = String(saNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function apiErrorsToText(errors) {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.map(String).join(", ");
  if (typeof errors === "object") {
    return Object.entries(errors)
      .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
      .join("; ");
  }
  return String(errors);
}

function isFinishedFixture(item) {
  const code = String(item?.fixture?.status?.short || "").toUpperCase();
  return ["FT", "AET", "PEN"].includes(code);
}

function isUpcomingFixture(item) {
  const code = String(item?.fixture?.status?.short || "").toUpperCase();
  const kickoff = new Date(item?.fixture?.date || 0).getTime();
  return kickoff > Date.now() &&
    !["FT", "AET", "PEN", "LIVE", "1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "PST", "CANC", "ABD", "AWD", "WO"].includes(code);
}

function isCabangileCompetition(item) {
  const league = item?.league || {};
  const knownIds = FOOTBALL_COMPETITIONS.map(item => item.id);
  if (knownIds.includes(Number(league.id))) return true;

  // Include the South African top division if API-Football identifies it
  // by its league name/country. Its ID is deliberately not guessed.
  const country = String(league.country || "").toLowerCase();
  const name = String(league.name || "").toLowerCase();
  return country.includes("south africa") &&
    (name.includes("premier soccer league") ||
     name.includes("betway premiership") ||
     name.includes("premier league"));
}

// PAGE NAVIGATION
function showPage(page) {
  const content = document.getElementById("page-content");
  if (!content) {
    console.error("Page content element not found.");
    return;
  }

  const pages = {
    home: `
      <h2>🏆 Featured Football</h2>
      <div class="football-card">
        <h3>Welcome to Cabangile Football</h3>
        <p>Your football world starts here.</p>
      </div>
      <div class="football-card">
        <h3>Upcoming Games and Recent Results</h3>
        <p>See scheduled matches and completed results from the last 3 days.</p>
        <button type="button" id="home-open-matches">⚽ Open Matches</button>
      </div>
    `,
    matches: `
      <h2>⚽ Football Matches</h2>
      <div class="football-card">
        <p>Upcoming games and completed results from the last 3 days. Live scores are not shown.</p>
        <button type="button" id="refresh-matches">🔄 Refresh Matches</button>
        <p id="matches-message" role="status">Loading fixtures...</p>
      </div>
      <h3>📅 Upcoming Games</h3>
      <div id="upcoming-matches-list"></div>
      <h3>🏁 Previous Results — Last 3 Days</h3>
      <div id="previous-results-list"></div>
    `,
    predictions: `
      <h2>📊 Football Predictions</h2>
      <div class="football-card">
        <h3>Make Your Prediction</h3>
        <p>Choose Home Win, Draw or Away Win for an upcoming game.</p>
        <p>Virtual-credit predictions are the next feature to implement.</p>
      </div>
    `,
    wallet: `
      <h2>💰 My Wallet</h2>
      <div class="football-card">
        <h3>Virtual Credit Balance</h3>
        <p id="wallet-balance">Sign in to view your balance.</p>
        <p>These are virtual credits, not cash and not withdrawable.</p>
      </div>
    `,
    profile: `
      <h2>👤 My Account</h2>
      <div class="football-card" id="account-area">Checking account...</div>
    `,
    admin: `
      <h2>🛡️ Admin Wallet Management</h2>
      <div class="football-card">
        <p>Manage users' virtual credits. These credits are not cash.</p>
        <input type="search" id="admin-user-search" placeholder="Search users by name or email">
        <div id="admin-user-list">Loading users...</div>
      </div>
      <div id="admin-selected-user"></div>
      <div id="admin-history"></div>
    `
  };

  currentPage = pages[page] ? page : "home";
  content.innerHTML = pages[currentPage];
  window.scrollTo(0, 0);

  if (currentPage === "profile") renderAccount();
  if (currentPage === "matches") loadFootballMatches();
  if (currentPage === "wallet") renderWallet();
  if (currentPage === "admin") renderAdmin();
}
window.showPage = showPage;

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.addEventListener("click", event => {
  if (event.target.closest("#refresh-matches")) loadFootballMatches(true);
  if (event.target.closest("#home-open-matches")) showPage("matches");
});

// API-FOOTBALL FIXTURES
function renderFixtureCard(item, isResult = false) {
  const fixture = item.fixture || {};
  const league = item.league || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const home = teams.home || {};
  const away = teams.away || {};
  const leagueLogo = safeFootballImage(league.logo);
  const homeLogo = safeFootballImage(home.logo);
  const awayLogo = safeFootballImage(away.logo);

  const score = isResult
    ? `${goals.home ?? "-"} - ${goals.away ?? "-"}`
    : "VS";

  const status = isResult
    ? (fixture.status?.long || "Finished")
    : "Kick-off";

  return `
    <div class="football-card match-card">
      <div class="match-league">
        ${leagueLogo ? `<img src="${leagueLogo}" alt="" width="22" height="22">` : ""}
        <strong>${escapeMatchText(league.name || "Football")}</strong>
      </div>
      <div class="match-teams">
        <div class="match-team">
          ${homeLogo ? `<img src="${homeLogo}" alt="" width="32" height="32">` : ""}
          <span>${escapeMatchText(home.name || "Home team")}</span>
        </div>
        <strong class="match-score">${escapeMatchText(score)}</strong>
        <div class="match-team">
          ${awayLogo ? `<img src="${awayLogo}" alt="" width="32" height="32">` : ""}
          <span>${escapeMatchText(away.name || "Away team")}</span>
        </div>
      </div>
      <p class="match-status">${escapeMatchText(status)}</p>
      <p class="match-time">${escapeMatchText(formatMatchTime(fixture.date))} · South African time</p>
    </div>
  `;
}

function renderFootballMatches(fixtures) {
  const upcomingList = document.getElementById("upcoming-matches-list");
  const resultsList = document.getElementById("previous-results-list");
  const message = document.getElementById("matches-message");
  if (!upcomingList || !resultsList || !message) return;

  const selected = fixtures.filter(isCabangileCompetition);
  const upcoming = selected.filter(isUpcomingFixture)
    .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
  const results = selected.filter(isFinishedFixture)
    .filter(item => Date.now() - new Date(item.fixture.date).getTime() <= 72 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));

  upcomingList.innerHTML = upcoming.length
    ? upcoming.map(item => renderFixtureCard(item, false)).join("")
    : `<div class="football-card"><p>No upcoming games found for the selected competitions.</p></div>`;

  resultsList.innerHTML = results.length
    ? results.map(item => renderFixtureCard(item, true)).join("")
    : `<div class="football-card"><p>No completed results from the selected competitions in the last 3 days.</p></div>`;

  message.textContent =
    `${upcoming.length} upcoming game(s) · ${results.length} completed result(s) in the last 3 days.`;
}

async function loadFootballMatches(forceRefresh = false) {
  const upcomingList = document.getElementById("upcoming-matches-list");
  const resultsList = document.getElementById("previous-results-list");
  const message = document.getElementById("matches-message");
  const refreshButton = document.getElementById("refresh-matches");
  if (!upcomingList || !resultsList || !message || matchesLoading) return;

  if (!FOOTBALL_API_KEY || FOOTBALL_API_KEY === "PASTE_YOUR_API_FOOTBALL_KEY_HERE") {
    message.textContent = "Add your API-Football key near the top of app.js first.";
    return;
  }

  if (!forceRefresh && matchesCache &&
      Date.now() - matchesCacheTime < MATCHES_CACHE_DURATION) {
    renderFootballMatches(matchesCache);
    return;
  }

  matchesLoading = true;
  if (refreshButton) refreshButton.disabled = true;
  message.textContent = "Loading upcoming games and recent results...";
  upcomingList.innerHTML = "";
  resultsList.innerHTML = "";

  try {
    // One date-range request supplies both future fixtures and the last 72 hours.
    // The API key is sent directly from this browser to API-Football.
    const from = getSouthAfricanDate(-3);
    const to = getSouthAfricanDate(14);
    const url = `${FOOTBALL_API_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&timezone=Africa%2FJohannesburg`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": FOOTBALL_API_KEY },
      cache: "no-store"
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("API-Football returned an unreadable response.");
    }

    const apiError = apiErrorsToText(data.errors);
    if (!response.ok || apiError) {
      throw new Error(apiError || `API-Football request failed (HTTP ${response.status}).`);
    }

    if (!Array.isArray(data.response)) {
      throw new Error("API-Football did not return a fixtures list.");
    }

    matchesCache = data.response;
    matchesCacheTime = Date.now();
    renderFootballMatches(matchesCache);
  } catch (error) {
    console.error("Football fixtures error:", error);
    message.textContent = "Could not load football fixtures.";
    upcomingList.innerHTML = `
      <div class="football-card">
        <p>${escapeMatchText(error.message)}</p>
        <p>If the message mentions CORS or a network request was blocked, direct browser access is not allowed by the API service. A secure server connection would then be required.</p>
      </div>
    `;
    resultsList.innerHTML = "";
  } finally {
    matchesLoading = false;
    const currentButton = document.getElementById("refresh-matches");
    if (currentButton) currentButton.disabled = false;
  }
}

// FIREBASE INITIALIZATION
async function initializeFirebase() {
  try {
    const [appSDK, authSDK, firestoreSDK] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js")
    ]);

    const app = appSDK.initializeApp(firebaseConfig);
    auth = authSDK.getAuth(app);
    db = firestoreSDK.getFirestore(app);

    createUserWithEmailAndPassword = authSDK.createUserWithEmailAndPassword;
    signInWithEmailAndPassword = authSDK.signInWithEmailAndPassword;
    sendPasswordResetEmail = authSDK.sendPasswordResetEmail;
    signOut = authSDK.signOut;
    onAuthStateChanged = authSDK.onAuthStateChanged;
    updateProfile = authSDK.updateProfile;

    doc = firestoreSDK.doc;
    getDoc = firestoreSDK.getDoc;
    setDoc = firestoreSDK.setDoc;
    serverTimestamp = firestoreSDK.serverTimestamp;
    collection = firestoreSDK.collection;
    getDocs = firestoreSDK.getDocs;
    runTransaction = firestoreSDK.runTransaction;

    firebaseReady = true;

    onAuthStateChanged(auth, async () => {
      if (currentPage === "profile") await renderAccount();
      if (currentPage === "wallet") await renderWallet();
      if (currentPage === "admin") await renderAdmin();
    });

    if (currentPage === "profile") renderAccount();
    if (currentPage === "wallet") renderWallet();
    if (currentPage === "admin") renderAdmin();
  } catch (error) {
    firebaseError = error;
    console.error("Firebase loading error:", error);
    if (currentPage === "profile") renderAccount();
    if (currentPage === "wallet") renderWallet();
    if (currentPage === "admin") renderAdmin();
  }
}

// CREATE USER PROFILE
async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const profile = await getDoc(userRef);

  if (!profile.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || "Football Fan",
      email: user.email || "",
      phoneNumber: "",
      virtualBalance: 0,
      createdAt: serverTimestamp()
    });
  } else if (typeof profile.data().virtualBalance !== "number") {
    await setDoc(userRef, { virtualBalance: 0 }, { merge: true });
  }
}
// ACCOUNT DISPLAY
async function renderAccount() {
  const area = document.getElementById("account-area");
  if (!area) return;

  if (!firebaseReady) {
    area.innerHTML = firebaseError
      ? `<p>Firebase could not load. Check your internet connection.</p>
         <p>${escapeMatchText(firebaseError.message)}</p>
         <button type="button" id="retry-firebase">Try Again</button>`
      : `<p>Connecting to your account...</p>`;

    const retry = document.getElementById("retry-firebase");
    if (retry) retry.onclick = () => {
      firebaseError = null;
      area.innerHTML = "Connecting to your account...";
      initializeFirebase();
    };
    return;
  }

  const user = auth.currentUser;

  if (user) {
    area.innerHTML = `
      <h3>⚽ My Football Profile</h3>
      <p id="account-email"></p>
      <form id="profile-form">
        <label for="profile-name">Full Name</label>
        <input type="text" id="profile-name" placeholder="Enter your full name" required>
        <label for="profile-phone">Phone Number</label>
        <input type="tel" id="profile-phone" placeholder="e.g. 0712345678">
        <button type="submit" id="save-profile">Save Profile</button>
      </form>
      <p id="profile-message" role="status"></p>
      ${isCabangileAdmin() ? `<button type="button" id="open-admin-wallet">🛡️ Admin Wallet Management</button>` : ""}
      <button type="button" id="logout-button">Sign Out</button>
    `;

    document.getElementById("account-email").textContent = "Email: " + (user.email || "");
    const nameInput = document.getElementById("profile-name");
    const phoneInput = document.getElementById("profile-phone");
    const message = document.getElementById("profile-message");

    try {
      await ensureUserProfile(user);
      const profile = await getDoc(doc(db, "users", user.uid));
      if (!document.getElementById("profile-form")) return;
      if (profile.exists()) {
        const data = profile.data();
        nameInput.value = data.displayName || user.displayName || "";
        phoneInput.value = data.phoneNumber || "";
      }
    } catch (error) {
      console.error(error);
      message.textContent = "Could not load profile: " + error.message;
    }

    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.onsubmit = async event => {
        event.preventDefault();
        const fullName = nameInput.value.trim();
        const phoneNumber = phoneInput.value.trim();
        const saveButton = document.getElementById("save-profile");
        if (!fullName) {
          message.textContent = "Enter your full name.";
          return;
        }
        saveButton.disabled = true;
        message.textContent = "Saving profile...";
        try {
          await updateProfile(user, { displayName: fullName });
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: fullName,
            email: user.email || "",
            phoneNumber,
            updatedAt: serverTimestamp()
          }, { merge: true });
          message.textContent = "Your profile has been saved successfully!";
        } catch (error) {
          console.error(error);
          message.textContent = "Unable to save profile: " + error.message;
        } finally {
          saveButton.disabled = false;
        }
      };
    }

    const adminButton = document.getElementById("open-admin-wallet");
    if (adminButton) adminButton.onclick = () => showPage("admin");
    document.getElementById("logout-button").onclick = async () => {
      try { await signOut(auth); } catch (error) { alert(error.message); }
    };
    return;
  }

  area.innerHTML = `
    <h3 id="form-heading">Sign in to Cabangile Football</h3>
    <form id="account-form">
      <input type="text" id="full-name" placeholder="Your full name" autocomplete="name">
      <input type="email" id="email" placeholder="Email address" autocomplete="email" required>
      <input type="password" id="password" placeholder="Password (minimum 6 characters)" minlength="6" required>
      <button type="submit" id="submit-button">Sign In</button>
    </form>
    <button type="button" id="forgot-password">Forgot Password?</button>
    <p id="auth-message" role="status"></p>
    <button type="button" id="switch-mode">New here? Create an account</button>
  `;

  updateFormMode();
  document.getElementById("switch-mode").onclick = () => {
    registerMode = !registerMode;
    updateFormMode();
  };

  document.getElementById("account-form").onsubmit = async event => {
    event.preventDefault();
    const fullName = document.getElementById("full-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("auth-message");
    const submit = document.getElementById("submit-button");

    if (registerMode && !fullName) {
      message.textContent = "Enter your full name.";
      return;
    }
    submit.disabled = true;
    message.textContent = "Please wait...";
    try {
      if (registerMode) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: fullName });
        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          displayName: fullName,
          email,
          phoneNumber: "",
          virtualBalance: 0,
          createdAt: serverTimestamp()
        });
        message.textContent = "Account created successfully!";
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(credential.user);
        message.textContent = "Welcome back!";
      }
    } catch (error) {
      console.error(error);
      message.textContent = friendlyAuthError(error);
    } finally {
      submit.disabled = false;
    }
  };

  document.getElementById("forgot-password").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("auth-message");
    const button = document.getElementById("forgot-password");
    if (!email) {
      message.textContent = "Enter your email address first.";
      return;
    }
    button.disabled = true;
    message.textContent = "Sending password reset request...";
    try {
      await sendPasswordResetEmail(auth, email);
      message.textContent = "Firebase accepted the reset request. Check Inbox, Spam and All Mail. Email delivery is not yet confirmed.";
    } catch (error) {
      console.error("PASSWORD RESET ERROR:", error);
      message.textContent = "Password reset failed. " + (error.code || "unknown") + ": " + (error.message || "");
    } finally {
      button.disabled = false;
    }
  };
}

// LOGIN / REGISTER MODE
function updateFormMode() {
  const heading = document.getElementById("form-heading");
  const submit = document.getElementById("submit-button");
  const switchButton = document.getElementById("switch-mode");
  const forgotButton = document.getElementById("forgot-password");
  const nameInput = document.getElementById("full-name");
  if (!heading || !submit || !switchButton || !forgotButton || !nameInput) return;

  if (registerMode) {
    heading.textContent = "Create your account";
    submit.textContent = "Create Account";
    switchButton.textContent = "Already registered? Sign in";
    forgotButton.style.display = "none";
    nameInput.style.display = "block";
    nameInput.required = true;
  } else {
    heading.textContent = "Sign in to Cabangile Football";
    submit.textContent = "Sign In";
    switchButton.textContent = "New here? Create an account";
    forgotButton.style.display = "block";
    nameInput.style.display = "none";
    nameInput.required = false;
  }
}

// FRIENDLY ERROR MESSAGES
function friendlyAuthError(error) {
  const errors = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Use at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network problem. Check your internet connection.",
    "permission-denied": "Database permission denied. Check Firestore rules."
  };
  return errors[error.code] || error.message || "Something went wrong. Please try again.";
}

// WALLET DISPLAY
async function renderWallet() {
  const balanceArea = document.getElementById("wallet-balance");
  if (!balanceArea) return;
  if (!firebaseReady || !auth.currentUser) {
    balanceArea.textContent = "Sign in to view your virtual credit balance.";
    return;
  }
  try {
    await ensureUserProfile(auth.currentUser);
    const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (!snapshot.exists()) {
      balanceArea.textContent = "Wallet profile not found.";
      return;
    }
    const balance = Number(snapshot.data().virtualBalance || 0);
    balanceArea.textContent = balance.toFixed(2) + " virtual credits";
  } catch (error) {
    console.error("Wallet load error:", error);
    balanceArea.textContent = "Unable to load balance: " + error.message;
  }
}

// ADMIN VIRTUAL WALLET MANAGEMENT
async function renderAdmin() {
  const content = document.getElementById("page-content");
  if (!content) return;
  if (!firebaseReady || !auth?.currentUser) {
    content.innerHTML = `<h2>Admin Wallet</h2><p>Please sign in first.</p><button type="button" onclick="showPage('profile')">My Account</button>`;
    return;
  }
  if (!isCabangileAdmin()) {
    content.innerHTML = `<h2>Access denied</h2><p>Administrator permission is required.</p><button type="button" onclick="showPage('home')">Go Home</button>`;
    return;
  }

  content.innerHTML = `
    <h2>🛡️ Admin Wallet Management</h2>
    <div class="football-card">
      <p><strong>Virtual credits only — not cash.</strong></p>
      <input type="search" id="admin-user-search" placeholder="Search users by name or email">
      <div id="admin-user-list">Loading registered users...</div>
    </div>
    <div id="admin-selected-user"></div>
    <div id="admin-history"></div>
  `;

  const userList = document.getElementById("admin-user-list");
  try {
    const snapshot = await getDocs(collection(db, "users"));
    adminUsers = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
    renderAdminUserList(adminUsers);
  } catch (error) {
    console.error("Admin user loading error:", error);
    userList.textContent = "Could not load users. Check Firestore Security Rules. " + error.message;
  }

  const search = document.getElementById("admin-user-search");
  if (search) search.addEventListener("input", () => {
    const term = search.value.toLowerCase().trim();
    renderAdminUserList(adminUsers.filter(user =>
      String(user.displayName || "").toLowerCase().includes(term) ||
      String(user.email || "").toLowerCase().includes(term)
    ));
  });
}

function renderAdminUserList(users) {
  const list = document.getElementById("admin-user-list");
  if (!list) return;
  if (!users.length) {
    list.textContent = "No users found.";
    return;
  }
  list.innerHTML = users.map(user => `
    <div class="football-card">
      <strong>${escapeMatchText(user.displayName || "Football Fan")}</strong>
      <p>${escapeMatchText(user.email || "")}</p>
      <p>Balance: ${Number(user.virtualBalance || 0).toFixed(2)} virtual credits</p>
      <button type="button" data-admin-user="${escapeMatchText(user.uid)}">Manage Balance</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-admin-user]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = adminUsers.find(user => user.uid === button.dataset.adminUser);
      if (selected) {
        adminSelectedUser = selected;
        renderAdminSelectedUser();
      }
    });
  });
}

function renderAdminSelectedUser() {
  const area = document.getElementById("admin-selected-user");
  if (!area || !adminSelectedUser) return;
  const user = adminSelectedUser;
  area.innerHTML = `
    <div class="football-card">
      <h3>Manage Virtual Balance</h3>
      <p><strong>${escapeMatchText(user.displayName || "Football Fan")}</strong></p>
      <p>${escapeMatchText(user.email || "")}</p>
      <p>Current balance: <strong>${Number(user.virtualBalance || 0).toFixed(2)} credits</strong></p>
      <label for="admin-amount">Amount of credits</label>
      <input type="number" id="admin-amount" min="0.01" max="1000000" step="0.01" placeholder="Enter amount">
      <label for="admin-reason">Reason for adjustment</label>
      <input type="text" id="admin-reason" maxlength="200" placeholder="Enter reason">
      <button type="button" id="admin-increase">➕ Increase Balance</button>
      <button type="button" id="admin-decrease">➖ Decrease Balance</button>
      <p id="admin-adjustment-message" role="status"></p>
    </div>
  `;
  document.getElementById("admin-increase").onclick = () => adjustVirtualBalance("increase");
  document.getElementById("admin-decrease").onclick = () => adjustVirtualBalance("decrease");
  loadAdminWalletHistory(user.uid);
}

async function adjustVirtualBalance(action) {
  if (!isCabangileAdmin()) {
    alert("Administrator access required.");
    return;
  }
  if (!adminSelectedUser) return;
  const amountInput = document.getElementById("admin-amount");
  const reasonInput = document.getElementById("admin-reason");
  const message = document.getElementById("admin-adjustment-message");
  const amount = Number(amountInput.value);
  const reason = reasonInput.value.trim();

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    message.textContent = "Enter an amount between 0.01 and 1,000,000.";
    return;
  }
  if (!reason) {
    message.textContent = "Please enter a reason for this adjustment.";
    return;
  }

  const selectedUser = adminSelectedUser;
  const admin = auth.currentUser;
  message.textContent = "Saving adjustment...";
  try {
    const userRef = doc(db, "users", selectedUser.uid);
    const historyRef = doc(collection(db, "walletTransactions"));
    await runTransaction(db, async transaction => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists()) throw new Error("User account was not found.");
      const currentBalance = Number(userSnapshot.data().virtualBalance || 0);
      const newBalance = action === "increase" ? currentBalance + amount : currentBalance - amount;
      if (newBalance < 0) throw new Error("This user does not have enough virtual credits.");
      transaction.update(userRef, { virtualBalance: newBalance, walletUpdatedAt: serverTimestamp() });
      transaction.set(historyRef, {
        userId: selectedUser.uid,
        userEmail: selectedUser.email || "",
        action,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        reason,
        adminUid: admin.uid,
        adminEmail: admin.email || "",
        createdAt: serverTimestamp()
      });
    });

    adminSelectedUser.virtualBalance =
      Number(adminSelectedUser.virtualBalance || 0) + (action === "increase" ? amount : -amount);
    const cachedUser = adminUsers.find(user => user.uid === selectedUser.uid);
    if (cachedUser) cachedUser.virtualBalance = adminSelectedUser.virtualBalance;
    message.textContent = "Balance successfully " + (action === "increase" ? "increased." : "decreased.");
    renderAdminSelectedUser();

    const search = document.getElementById("admin-user-search");
    const term = search ? search.value.toLowerCase().trim() : "";
    renderAdminUserList(adminUsers.filter(user =>
      String(user.displayName || "").toLowerCase().includes(term) ||
      String(user.email || "").toLowerCase().includes(term)
    ));
  } catch (error) {
    console.error("Wallet adjustment error:", error);
    message.textContent = "Adjustment failed: " + error.message +
      ". Firestore Security Rules may not yet allow this admin action.";
  }
}

async function loadAdminWalletHistory(userId) {
  const area = document.getElementById("admin-history");
  if (!area) return;
  area.innerHTML = `<div class="football-card"><h3>Wallet Adjustment History</h3><p>Loading history...</p></div>`;
  try {
    const snapshot = await getDocs(collection(db, "walletTransactions"));
    const records = snapshot.docs.map(item => item.data())
      .filter(item => item.userId === userId)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 30);

    if (!records.length) {
      area.innerHTML = `<div class="football-card"><h3>Wallet Adjustment History</h3><p>No manual adjustments recorded yet.</p></div>`;
      return;
    }
    area.innerHTML = `
      <div class="football-card">
        <h3>Wallet Adjustment History</h3>
        ${records.map(record => {
          const date = record.createdAt?.toDate?.();
          return `
            <div class="wallet-history-item">
              <strong>${record.action === "increase" ? "➕ Increased" : "➖ Decreased"}</strong>
              <p>Amount: ${Number(record.amount).toFixed(2)} credits</p>
              <p>Balance after: ${Number(record.balanceAfter).toFixed(2)} credits</p>
              <p>Reason: ${escapeMatchText(record.reason || "")}</p>
              <p>Admin: ${escapeMatchText(record.adminEmail || "")}</p>
              <small>${date ? escapeMatchText(date.toLocaleString("en-ZA")) : "Date unavailable"}</small>
            </div>
          `;
        }).join("<hr>")}
      </div>
    `;
  } catch (error) {
    console.error("Wallet history error:", error);
    area.innerHTML = `<div class="football-card"><p>Could not load wallet history: ${escapeMatchText(error.message)}</p></div>`;
  }
}

// START APPLICATION
showPage("home");
initializeFirebase();
console.log("Cabangile Football is ready.");
