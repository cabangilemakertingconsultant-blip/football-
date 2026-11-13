
/* =====================================
   CABANGILE FOOTBALL
   COMPLETE APPLICATION
   NEW PART 1 OF 4
   ===================================== */

// APP STATE
let currentPage = "home";
let registerMode = false;
let auth = null;
let db = null;
let firebaseReady = false;
let firebaseError = null;

let matchesCache = null;
let matchesCacheTime = 0;
let matchesLoading = false;

const MATCHES_CACHE_DURATION = 10 * 60 * 1000;
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChXiA8otw90zk4rk-pv-4uo2jMaanKXpI",
  authDomain: "football-d6b07.firebaseapp.com",
  databaseURL: "https://football-d6b07-default-rtdb.firebaseio.com",
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

// ADMIN
const ADMIN_EMAIL = "cabangilemakertingconsultant@gmail.com";
let adminSelectedUser = null;
let adminUsers = [];

// API-FOOTBALL DIRECT CONNECTION
const FOOTBALL_API_KEY = "9067199e08658c8af7e75c7b8c43ae95";

const FOOTBALL_API_URL =
  "https://v3.football.api-sports.io/fixtures";

// COMPETITIONS
const FOOTBALL_COMPETITIONS = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "LaLiga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 2, name: "UEFA Champions League" }
];

// HELPERS
function escapeMatchText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function isCabangileAdmin() {
  return !!auth?.currentUser &&
    auth.currentUser.email?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();
}

function safeFootballImage(url) {
  if (typeof url !== "string" ||
      !url.startsWith("https://")) return "";
  return escapeMatchText(url);
}

function formatMatchTime(dateValue) {
  if (!dateValue) return "Time unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

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

// GET DATE IN SOUTH AFRICA
function getSouthAfricanDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = {};

  parts.forEach(part => {
    values[part.type] = part.value;
  });

  // Use UTC arithmetic to avoid device timezone differences.
  const date = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + offsetDays
  ));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function apiErrorsToText(errors) {
  if (!errors) return "";

  if (Array.isArray(errors)) {
    return errors.map(String).join(", ");
  }

  if (typeof errors === "object") {
    return Object.entries(errors)
      .map(([key, value]) => {
        const message = typeof value === "string"
          ? value
          : JSON.stringify(value);

        return `${key}: ${message}`;
      })
      .join("; ");
  }

  return String(errors);
}

function isFinishedFixture(item) {
  const code = String(
    item?.fixture?.status?.short || ""
  ).toUpperCase();

  return ["FT", "AET", "PEN"].includes(code);
}

function isUpcomingFixture(item) {
  const code = String(
    item?.fixture?.status?.short || ""
  ).toUpperCase();

  const kickoff = new Date(
    item?.fixture?.date || 0
  ).getTime();

  const excluded = [
    "FT", "AET", "PEN",
    "LIVE", "1H", "HT", "2H",
    "ET", "BT", "P", "SUSP",
    "INT", "PST", "CANC",
    "ABD", "AWD", "WO"
  ];

  return kickoff > Date.now() &&
    !excluded.includes(code);
}

function isCabangileCompetition(item) {
  const league = item?.league || {};

  const knownIds = FOOTBALL_COMPETITIONS.map(
    competition => competition.id
  );

  if (knownIds.includes(Number(league.id))) {
    return true;
  }

  const country = String(
    league.country || ""
  ).toLowerCase();

  const name = String(
    league.name || ""
  ).toLowerCase();

  return country.includes("south africa") &&
    (
      name.includes("premier soccer league") ||
      name.includes("betway premiership") ||
      name.includes("premier league")
    );
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
        <p>Fixtures and completed results from the last 3 days.</p>
        <button type="button" id="home-open-matches">
          ⚽ Open Matches
        </button>
      </div>
    `,

    matches: `
      <h2>⚽ Football Matches</h2>

      <div class="football-card">
        <p>Upcoming games and completed results from the last 3 days.</p>
        <p>Live scores are not displayed.</p>

        <button type="button" id="refresh-matches">
          🔄 Refresh Matches
        </button>

        <p id="matches-message" role="status">
          Loading fixtures...
        </p>
      </div>

      <h3>📅 Upcoming Games</h3>
      <div id="upcoming-matches-list"></div>

      <h3>🏁 Previous Results — Last 3 Days</h3>
      <div id="previous-results-list"></div>
    `,

    predictions: `
      <h2>📊 Football Predictions</h2>
      <div id="predictions-area">
        <div class="football-card">
          <p>Loading predictions...</p>
        </div>
      </div>
    `,

    wallet: `
      <h2>💰 My Wallet</h2>

      <div class="football-card">
        <h3>Virtual Credit Balance</h3>
        <p id="wallet-balance">
          Sign in to view your balance.
        </p>
        <p>Virtual credits are not cash and cannot be withdrawn.</p>
      </div>

      <div id="wallet-history"></div>
    `,

    profile: `
      <h2>👤 My Account</h2>
      <div class="football-card" id="account-area">
        Checking account...
      </div>
    `,

    admin: `
      <h2>🛡️ Admin Wallet Management</h2>
      <div class="football-card">
        <p>Manage users' virtual credits.</p>
        <input
          type="search"
          id="admin-user-search"
          placeholder="Search users by name or email"
        >
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
  if (currentPage === "predictions") renderPredictions();
}

window.showPage = showPage;

// NAVIGATION BUTTONS
document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.addEventListener("click", event => {
  if (event.target.closest("#refresh-matches")) {
    loadFootballMatches(true);
  }

  if (event.target.closest("#home-open-matches")) {
    showPage("matches");
  }
});

// RENDER MATCH CARD
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
        ${leagueLogo
          ? `<img src="${leagueLogo}" alt="" width="22" height="22">`
          : ""}
        <strong>${escapeMatchText(league.name || "Football")}</strong>
      </div>

      <div class="match-teams">
        <div class="match-team">
          ${homeLogo
            ? `<img src="${homeLogo}" alt="" width="32" height="32">`
            : ""}
          <span>${escapeMatchText(home.name || "Home team")}</span>
        </div>

        <strong class="match-score">
          ${escapeMatchText(score)}
        </strong>

        <div class="match-team">
          ${awayLogo
            ? `<img src="${awayLogo}" alt="" width="32" height="32">`
            : ""}
          <span>${escapeMatchText(away.name || "Away team")}</span>
        </div>
      </div>

      <p class="match-status">
        ${escapeMatchText(status)}
      </p>

      <p class="match-time">
        ${escapeMatchText(formatMatchTime(fixture.date))}
        · South African time
      </p>
    </div>
  `;
}

// DISPLAY MATCHES
function renderFootballMatches(fixtures) {
  const upcomingList =
    document.getElementById("upcoming-matches-list");

  const resultsList =
    document.getElementById("previous-results-list");

  const message =
    document.getElementById("matches-message");

  if (!upcomingList || !resultsList || !message) return;

  const selected = fixtures.filter(isCabangileCompetition);

  const upcoming = selected
    .filter(isUpcomingFixture)
    .sort((a, b) =>
      new Date(a.fixture.date) - new Date(b.fixture.date)
    );

  const results = selected
    .filter(isFinishedFixture)
    .filter(item => {
      const matchTime = new Date(item.fixture.date).getTime();
      const age = Date.now() - matchTime;

      return age >= 0 && age <= 72 * 60 * 60 * 1000;
    })
    .sort((a, b) =>
      new Date(b.fixture.date) - new Date(a.fixture.date)
    );

  upcomingList.innerHTML = upcoming.length
    ? upcoming.map(item => renderFixtureCard(item)).join("")
    : `<div class="football-card">
         <p>No upcoming games found.</p>
       </div>`;

  resultsList.innerHTML = results.length
    ? results.map(item => renderFixtureCard(item, true)).join("")
    : `<div class="football-card">
         <p>No completed results from the last 3 days.</p>
       </div>`;

  message.textContent =
    `${upcoming.length} upcoming game(s) · ` +
    `${results.length} completed result(s) in the last 3 days.`;
}

// LOAD FOOTBALL FIXTURES
async function loadFootballMatches(forceRefresh = false) {
  const upcomingList =
    document.getElementById("upcoming-matches-list");

  const resultsList =
    document.getElementById("previous-results-list");

  const message =
    document.getElementById("matches-message");

  if (!upcomingList || !resultsList || !message ||
      matchesLoading) return;

  if (!FOOTBALL_API_KEY ||
      FOOTBALL_API_KEY === "PASTE_YOUR_API_FOOTBALL_KEY_HERE") {
    message.textContent =
      "Add your API-Football key in app.js first.";
    return;
  }

  if (!forceRefresh && matchesCache &&
      Date.now() - matchesCacheTime < MATCHES_CACHE_DURATION) {
    renderFootballMatches(matchesCache);
    return;
  }

  matchesLoading = true;

  const refreshButton =
    document.getElementById("refresh-matches");

  if (refreshButton) refreshButton.disabled = true;

  message.textContent =
    "Loading upcoming games and recent results...";

  upcomingList.innerHTML = "";
  resultsList.innerHTML = "";

  try {
    const fromDate = getSouthAfricanDate(-3);
    const toDate = getSouthAfricanDate(14);
    const timezone = "Africa/Johannesburg";

    const requestUrl = new URL(FOOTBALL_API_URL);

    requestUrl.searchParams.set("from", fromDate);
    requestUrl.searchParams.set("to", toDate);
    requestUrl.searchParams.set("timezone", timezone);

    console.log("Cabangile fixture request:", requestUrl.toString());

    const response = await fetch(requestUrl.toString(), {
      method: "GET",
      headers: {
        "x-apisports-key": FOOTBALL_API_KEY
      },
      cache: "no-store"
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "The API returned an unreadable response. Check the API service."
      );
    }

    if (!response.ok) {
      throw new Error(
        `API request failed (HTTP ${response.status}): ` +
        apiErrorsToText(data.errors || data.message || response.statusText)
      );
    }

    const apiError = apiErrorsToText(data.errors);

    if (apiError) {
      throw new Error(apiError);
    }

    if (!Array.isArray(data.response)) {
      throw new Error(
        "The API did not return a valid fixtures list."
      );
    }

    matchesCache = data.response;
    matchesCacheTime = Date.now();

    renderFootballMatches(matchesCache);

  } catch (error) {
    console.error("Cabangile football fixtures error:", error);

    message.textContent = "Could not load football fixtures.";

    upcomingList.innerHTML = `
      <div class="football-card">
        <p>${escapeMatchText(error.message || "Unknown error")}</p>
        <p>
          If the browser reports a CORS error, direct browser
          access is being blocked by the API service.
        </p>
      </div>
    `;

    resultsList.innerHTML = "";

  } finally {
    matchesLoading = false;

    const button =
      document.getElementById("refresh-matches");

    if (button) button.disabled = false;
  }
}

// =====================================
// FIREBASE INITIALIZATION
// =====================================

async function initializeFirebase() {
  try {
    const [appSDK, authSDK, firestoreSDK] =
      await Promise.all([
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js")
      ]);

    const app = appSDK.initializeApp(firebaseConfig);

    auth = authSDK.getAuth(app);
    db = firestoreSDK.getFirestore(app);

    createUserWithEmailAndPassword =
      authSDK.createUserWithEmailAndPassword;

    signInWithEmailAndPassword =
      authSDK.signInWithEmailAndPassword;

    sendPasswordResetEmail =
      authSDK.sendPasswordResetEmail;

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
      if (currentPage === "profile") {
        await renderAccount();
      }

      if (currentPage === "wallet") {
        await renderWallet();
      }

      if (currentPage === "admin") {
        await renderAdmin();
      }

      if (currentPage === "predictions") {
        await renderPredictions();
      }
    });

    if (currentPage === "profile") renderAccount();
    if (currentPage === "wallet") renderWallet();
    if (currentPage === "admin") renderAdmin();
    if (currentPage === "predictions") renderPredictions();

  } catch (error) {
    firebaseError = error;
    console.error("Firebase loading error:", error);

    if (currentPage === "profile") renderAccount();
    if (currentPage === "wallet") renderWallet();
    if (currentPage === "admin") renderAdmin();
    if (currentPage === "predictions") renderPredictions();
  }
}

// =====================================
// CREATE USER PROFILE
// =====================================

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

  } else if (
    typeof profile.data().virtualBalance !== "number"
  ) {
    await setDoc(
      userRef,
      { virtualBalance: 0 },
      { merge: true }
    );
  }
}

// =====================================
// ACCOUNT DISPLAY
// =====================================

async function renderAccount() {
  const area = document.getElementById("account-area");

  if (!area) return;

  if (!firebaseReady) {
    area.innerHTML = firebaseError
      ? `
        <p>Firebase could not load. Check your internet connection.</p>
        <p>${escapeMatchText(firebaseError.message)}</p>
        <button type="button" id="retry-firebase">
          Try Again
        </button>
      `
      : `<p>Connecting to your account...</p>`;

    const retry = document.getElementById("retry-firebase");

    if (retry) {
      retry.onclick = () => {
        firebaseError = null;
        area.innerHTML = "Connecting to your account...";
        initializeFirebase();
      };
    }

    return;
  }

  const user = auth.currentUser;

  // SIGNED-IN ACCOUNT
  if (user) {
    area.innerHTML = `
      <h3>⚽ My Football Profile</h3>

      <p id="account-email"></p>

      <form id="profile-form">
        <label for="profile-name">Full Name</label>
        <input
          type="text"
          id="profile-name"
          placeholder="Enter your full name"
          required
        >

        <label for="profile-phone">Phone Number</label>
        <input
          type="tel"
          id="profile-phone"
          placeholder="e.g. 0712345678"
        >

        <button type="submit" id="save-profile">
          Save Profile
        </button>
      </form>

      <p id="profile-message" role="status"></p>

      ${
        isCabangileAdmin()
          ? `
            <button
              type="button"
              id="open-admin-wallet"
            >
              🛡️ Admin Wallet Management
            </button>
          `
          : ""
      }

      <button type="button" id="logout-button">
        Sign Out
      </button>
    `;

    document.getElementById("account-email").textContent =
      "Email: " + (user.email || "");

    const nameInput =
      document.getElementById("profile-name");

    const phoneInput =
      document.getElementById("profile-phone");

    const message =
      document.getElementById("profile-message");

    try {
      await ensureUserProfile(user);

      const profile = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!document.getElementById("profile-form")) {
        return;
      }

      if (profile.exists()) {
        const data = profile.data();

        nameInput.value =
          data.displayName || user.displayName || "";

        phoneInput.value =
          data.phoneNumber || "";
      }

    } catch (error) {
      console.error(error);

      message.textContent =
        "Could not load profile: " + error.message;
    }

    const profileForm =
      document.getElementById("profile-form");

    if (profileForm) {
      profileForm.onsubmit = async event => {
        event.preventDefault();

        const fullName = nameInput.value.trim();
        const phoneNumber = phoneInput.value.trim();

        const saveButton =
          document.getElementById("save-profile");

        if (!fullName) {
          message.textContent =
            "Enter your full name.";
          return;
        }

        saveButton.disabled = true;
        message.textContent = "Saving profile...";

        try {
          await updateProfile(user, {
            displayName: fullName
          });

          await setDoc(
            doc(db, "users", user.uid),
            {
              uid: user.uid,
              displayName: fullName,
              email: user.email || "",
              phoneNumber,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );

          message.textContent =
            "Your profile has been saved successfully!";

        } catch (error) {
          console.error(error);

          message.textContent =
            "Unable to save profile: " + error.message;

        } finally {
          saveButton.disabled = false;
        }
      };
    }

    const adminButton =
      document.getElementById("open-admin-wallet");

    if (adminButton) {
      adminButton.onclick = () => showPage("admin");
    }

    const logoutButton =
      document.getElementById("logout-button");

    logoutButton.onclick = async () => {
      try {
        await signOut(auth);
        showPage("home");
      } catch (error) {
        alert(error.message);
      }
    };

    return;
  }

  // SIGN-IN / REGISTRATION FORM
  area.innerHTML = `
    <h3 id="form-heading">
      Sign in to Cabangile Football
    </h3>

    <form id="account-form">

      <input
        type="text"
        id="full-name"
        placeholder="Your full name"
        autocomplete="name"
      >

      <input
        type="email"
        id="email"
        placeholder="Email address"
        autocomplete="email"
        required
      >

      <input
        type="password"
        id="password"
        placeholder="Password (minimum 6 characters)"
        minlength="6"
        required
      >

      <button type="submit" id="submit-button">
        Sign In
      </button>

    </form>

    <button type="button" id="forgot-password">
      Forgot Password?
    </button>

    <p id="auth-message" role="status"></p>

    <button type="button" id="switch-mode">
      New here? Create an account
    </button>
  `;

  updateFormMode();

  document.getElementById("switch-mode").onclick = () => {
    registerMode = !registerMode;
    updateFormMode();
  };

  document.getElementById("account-form").onsubmit =
    async event => {
      event.preventDefault();

      const fullName =
        document.getElementById("full-name").value.trim();

      const email =
        document.getElementById("email").value.trim();

      const password =
        document.getElementById("password").value;

      const message =
        document.getElementById("auth-message");

      const submit =
        document.getElementById("submit-button");

      if (registerMode && !fullName) {
        message.textContent = "Enter your full name.";
        return;
      }

      submit.disabled = true;
      message.textContent = "Please wait...";

      try {
        if (registerMode) {
          const credential =
            await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

          await updateProfile(credential.user, {
            displayName: fullName
          });

          await setDoc(
            doc(db, "users", credential.user.uid),
            {
              uid: credential.user.uid,
              displayName: fullName,
              email,
              phoneNumber: "",
              virtualBalance: 0,
              createdAt: serverTimestamp()
            }
          );

          message.textContent =
            "Account created successfully!";

        } else {
          const credential =
            await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

          await ensureUserProfile(credential.user);

          message.textContent = "Welcome back!";
        }

      } catch (error) {
        console.error(error);

        message.textContent =
          friendlyAuthError(error);

      } finally {
        submit.disabled = false;
      }
    };

  // PASSWORD RESET
  document.getElementById("forgot-password").onclick =
    async () => {
      const email =
        document.getElementById("email").value.trim();

      const message =
        document.getElementById("auth-message");

      const button =
        document.getElementById("forgot-password");

      if (!email) {
        message.textContent =
          "Enter your email address first.";
        return;
      }

      button.disabled = true;
      message.textContent =
        "Sending password reset request...";

      try {
        await sendPasswordResetEmail(auth, email);

        message.textContent =
          "Firebase accepted the reset request. " +
          "Check Inbox, Spam and All Mail.";

      } catch (error) {
        console.error("PASSWORD RESET ERROR:", error);

        message.textContent =
          "Password reset failed. " +
          (error.code || "unknown") +
          ": " +
          (error.message || "");

      } finally {
        button.disabled = false;
      }
    };
}

// =====================================
// LOGIN / REGISTER MODE
// =====================================

function updateFormMode() {
  const heading =
    document.getElementById("form-heading");

  const submit =
    document.getElementById("submit-button");

  const switchButton =
    document.getElementById("switch-mode");

  const forgotButton =
    document.getElementById("forgot-password");

  const nameInput =
    document.getElementById("full-name");

  if (
    !heading ||
    !submit ||
    !switchButton ||
    !forgotButton ||
    !nameInput
  ) {
    return;
  }

  if (registerMode) {
    heading.textContent = "Create your account";
    submit.textContent = "Create Account";

    switchButton.textContent =
      "Already registered? Sign in";

    forgotButton.style.display = "none";
    nameInput.style.display = "block";
    nameInput.required = true;

  } else {
    heading.textContent =
      "Sign in to Cabangile Football";

    submit.textContent = "Sign In";

    switchButton.textContent =
      "New here? Create an account";

    forgotButton.style.display = "block";
    nameInput.style.display = "none";
    nameInput.required = false;
  }
}

// =====================================
// FRIENDLY ERROR MESSAGES
// =====================================

function friendlyAuthError(error) {
  const errors = {
    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/email-already-in-use":
      "This email is already registered.",

    "auth/weak-password":
      "Use at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/too-many-requests":
      "Too many attempts. Try again later.",

    "auth/network-request-failed":
      "Network problem. Check your internet connection.",

    "permission-denied":
      "Database permission denied. Check Firestore rules."
  };

  return errors[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}

/* =====================================
   PART 3 OF 4
   WALLET AND VIRTUAL PREDICTIONS
   ===================================== */

// WALLET PAGE
async function renderWallet() {
  const container = document.getElementById("page-content");
  if (!container) return;

  if (!auth || !auth.currentUser || !firebaseReady) {
    container.innerHTML = `
      <div class="section-card">
        <h2>My Wallet</h2>
        <p>Please sign in to view your virtual balance.</p>
        <button onclick="showPage('profile')">Sign In</button>
      </div>
    `;
    return;
  }

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    const balance = userSnap.exists()
      ? Number(userSnap.data().virtualBalance || 0)
      : 0;

    container.innerHTML = `
      <div class="section-card">
        <h2>My Virtual Wallet</h2>
        <p>Available virtual credits</p>
        <h1>R ${balance.toFixed(2)}</h1>
        <p>Only the administrator can increase or decrease your balance.</p>
      </div>

      <div class="section-card">
        <h3>Wallet History</h3>
        <div id="wallet-history">
          <p>Loading wallet history...</p>
        </div>
      </div>

      <div class="section-card">
        <h3>My Predictions</h3>
        <div id="wallet-predictions">
          <p>Loading predictions...</p>
        </div>
      </div>
    `;

    await loadWalletHistory();
    await loadMyPredictions();

  } catch (error) {
    console.error("Wallet error:", error);
    container.innerHTML = `
      <div class="section-card">
        <h2>My Wallet</h2>
        <p>Could not load wallet information.</p>
      </div>
    `;
  }
}


// LOAD WALLET TRANSACTION HISTORY
async function loadWalletHistory() {
  const target = document.getElementById("wallet-history");
  if (!target || !auth.currentUser) return;

  try {
    const snapshot = await getDocs(
      collection(db, "walletTransactions")
    );

    const transactions = [];

    snapshot.forEach((item) => {
      const data = item.data();

      if (data.userId === auth.currentUser.uid) {
        transactions.push(data);
      }
    });

    transactions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : 0;
      return timeB - timeA;
    });

    if (!transactions.length) {
      target.innerHTML = "<p>No wallet transactions yet.</p>";
      return;
    }

    target.innerHTML = transactions.slice(0, 20).map((item) => `
      <div class="history-item">
        <strong>${escapeMatchText(item.reason || "Wallet transaction")}</strong>
        <p>Amount: R ${Number(item.amount || 0).toFixed(2)}</p>
        <p>Balance after: R ${Number(item.balanceAfter || 0).toFixed(2)}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Wallet history error:", error);
    target.innerHTML = "<p>Could not load wallet history.</p>";
  }
}


// LOAD USER PREDICTIONS
async function loadMyPredictions() {
  const target = document.getElementById("wallet-predictions");
  if (!target || !auth.currentUser) return;

  try {
    const snapshot = await getDocs(
      collection(db, "predictions")
    );

    const predictions = [];

    snapshot.forEach((item) => {
      const data = item.data();

      if (data.userId === auth.currentUser.uid) {
        predictions.push(data);
      }
    });

    predictions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : 0;
      return timeB - timeA;
    });

    if (!predictions.length) {
      target.innerHTML = "<p>You have not made any predictions yet.</p>";
      return;
    }

    target.innerHTML = predictions.slice(0, 30).map((item) => `
      <div class="history-item">
        <strong>${escapeMatchText(item.homeTeam)} vs ${escapeMatchText(item.awayTeam)}</strong>
        <p>Selection: ${escapeMatchText(item.selectionLabel || item.selection)}</p>
        <p>Stake: R ${Number(item.stake || 0).toFixed(2)}</p>
        <p>Status: ${escapeMatchText(item.status || "Pending")}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Prediction history error:", error);
    target.innerHTML = "<p>Could not load prediction history.</p>";
  }
}


// PREDICTIONS PAGE
async function renderPredictions() {
  const container = document.getElementById("page-content");
  if (!container) return;

  if (!auth || !auth.currentUser || !firebaseReady) {
    container.innerHTML = `
      <div class="section-card">
        <h2>Football Predictions</h2>
        <p>Please sign in before making a prediction.</p>
        <button onclick="showPage('profile')">Sign In</button>
      </div>
    `;
    return;
  }

  if (!matchesCache || !matchesCache.length) {
    container.innerHTML = `
      <div class="section-card">
        <h2>Football Predictions</h2>
        <p>Load upcoming matches first.</p>
        <button onclick="showPage('matches')">View Matches</button>
      </div>
    `;
    return;
  }

  const upcoming = matchesCache.filter(isUpcomingFixture);

  if (!upcoming.length) {
    container.innerHTML = `
      <div class="section-card">
        <h2>Football Predictions</h2>
        <p>There are no upcoming matches available right now.</p>
        <button onclick="showPage('matches')">Refresh Matches</button>
      </div>
    `;
    return;
  }

  const userSnap = await getDoc(
    doc(db, "users", auth.currentUser.uid)
  );

  const balance = userSnap.exists()
    ? Number(userSnap.data().virtualBalance || 0)
    : 0;

  container.innerHTML = `
    <div class="section-card">
      <h2>Football Predictions</h2>
      <p>Choose the team you think will win, or select a draw.</p>
      <h3>Available credits: R ${balance.toFixed(2)}</h3>
      <p>Correct predictions return your stake plus 90% virtual profit.</p>
    </div>

    <div id="prediction-list"></div>
  `;

  const list = document.getElementById("prediction-list");

  list.innerHTML = upcoming.map((fixture) => {
    const fixtureId = String(fixture.fixture.id);
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    const league = fixture.league.name;
    const kickoff = formatMatchTime(fixture.fixture.date);

    return `
      <div class="section-card prediction-card">
        <p>${escapeMatchText(league)}</p>
        <h3>${escapeMatchText(home)} vs ${escapeMatchText(away)}</h3>
        <p>${escapeMatchText(kickoff)}</p>

        <label for="stake-${fixtureId}">Stake (virtual credits)</label>
        <input
          type="number"
          id="stake-${fixtureId}"
          min="1"
          step="1"
          placeholder="Enter stake"
        >

        <div class="prediction-options">
          <button onclick="placePrediction('${fixtureId}','HOME')">
            ${escapeMatchText(home)} Win
          </button>

          <button onclick="placePrediction('${fixtureId}','DRAW')">
            Draw
          </button>

          <button onclick="placePrediction('${fixtureId}','AWAY')">
            ${escapeMatchText(away)} Win
          </button>
        </div>

        <p id="prediction-message-${fixtureId}"></p>
      </div>
    `;
  }).join("");
}


// PLACE A PREDICTION
async function placePrediction(fixtureId, selection) {
  if (!firebaseReady || !auth || !auth.currentUser) {
    alert("Please sign in first.");
    return;
  }

  const fixture = matchesCache.find(
    (item) => String(item.fixture.id) === String(fixtureId)
  );

  if (!fixture || !isUpcomingFixture(fixture)) {
    alert("This match is no longer available for predictions.");
    return;
  }

  const stakeInput = document.getElementById(`stake-${fixtureId}`);
  const message = document.getElementById(`prediction-message-${fixtureId}`);

  const stake = Number(stakeInput?.value);

  if (!Number.isSafeInteger(stake) || stake <= 0) {
    if (message) message.textContent = "Enter a valid whole-number stake.";
    return;
  }

  const selectionLabels = {
    HOME: fixture.teams.home.name + " Win",
    DRAW: "Draw",
    AWAY: fixture.teams.away.name + " Win"
  };

  if (!selectionLabels[selection]) {
    if (message) message.textContent = "Invalid selection.";
    return;
  }

  if (message) message.textContent = "Checking your virtual balance...";

  /*
    IMPORTANT:
    This browser-only version does not safely deduct credits.
    A trusted Firebase backend is required before enabling
    real balance changes or automatic payouts.
  */

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    const balance = userSnap.exists()
      ? Number(userSnap.data().virtualBalance || 0)
      : 0;

    if (balance < stake) {
      if (message) {
        message.textContent = "Insufficient virtual credits. Please contact the administrator.";
      }
      return;
    }

    if (message) {
      message.textContent =
        "Your balance is sufficient. Prediction placement is waiting for secure backend activation.";
    }

  } catch (error) {
    console.error("Prediction check error:", error);
    if (message) message.textContent = "Could not check your balance. Please try again.";
  }
}

/* =====================================
   PART 4 OF 4
   ADMIN PAGE AND APP STARTUP
   ===================================== */

// ADMIN PAGE
async function renderAdmin() {
  const container = document.getElementById("page-content");
  if (!container) return;

  if (!auth || !auth.currentUser || !isCabangileAdmin()) {
    container.innerHTML = `
      <div class="section-card">
        <h2>Administrator</h2>
        <p>Administrator access only.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="section-card">
      <h2>Cabangile Admin</h2>
      <p>Manage and review registered users.</p>
      <button onclick="loadAdminUsers()">Refresh Users</button>
    </div>

    <div class="section-card">
      <h3>Registered Users</h3>
      <div id="admin-users">
        <p>Loading users...</p>
      </div>
    </div>

    <div class="section-card">
      <h3>Wallet Transactions</h3>
      <div id="admin-wallet-history">
        <p>Loading transactions...</p>
      </div>
    </div>

    <div class="section-card">
      <h3>Virtual Wallet Controls</h3>
      <p>
        Balance adjustments must be handled by a trusted backend.
        They are not enabled in this browser-only version.
      </p>
    </div>
  `;

  await loadAdminUsers();
  await loadAdminWalletHistory();
}


// LOAD REGISTERED USERS
async function loadAdminUsers() {
  const target = document.getElementById("admin-users");
  if (!target) return;

  if (!auth || !auth.currentUser || !isCabangileAdmin()) {
    target.innerHTML = "<p>Administrator access only.</p>";
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, "users"));

    if (snapshot.empty) {
      target.innerHTML = "<p>No registered users found.</p>";
      return;
    }

    const users = [];

    snapshot.forEach((item) => {
      users.push({
        id: item.id,
        ...item.data()
      });
    });

    users.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );

    target.innerHTML = users.map((user) => `
      <div class="history-item">
        <strong>${escapeMatchText(user.name || "Football Fan")}</strong>
        <p>Email: ${escapeMatchText(user.email || "Not available")}</p>
        <p>Phone: ${escapeMatchText(user.phone || "Not available")}</p>
        <p>Virtual balance: R ${Number(user.virtualBalance || 0).toFixed(2)}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Admin users error:", error);
    target.innerHTML = "<p>Could not load registered users.</p>";
  }
}


// LOAD ALL WALLET TRANSACTIONS FOR ADMIN REVIEW
async function loadAdminWalletHistory() {
  const target = document.getElementById("admin-wallet-history");
  if (!target) return;

  if (!auth || !auth.currentUser || !isCabangileAdmin()) {
    target.innerHTML = "<p>Administrator access only.</p>";
    return;
  }

  try {
    const snapshot = await getDocs(
      collection(db, "walletTransactions")
    );

    const transactions = [];

    snapshot.forEach((item) => {
      transactions.push(item.data());
    });

    transactions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : 0;
      return timeB - timeA;
    });

    if (!transactions.length) {
      target.innerHTML = "<p>No wallet transactions found.</p>";
      return;
    }

    target.innerHTML = transactions.slice(0, 50).map((item) => `
      <div class="history-item">
        <strong>${escapeMatchText(item.reason || "Wallet transaction")}</strong>
        <p>User: ${escapeMatchText(item.userEmail || item.userId || "Unknown")}</p>
        <p>Amount: R ${Number(item.amount || 0).toFixed(2)}</p>
        <p>Balance after: R ${Number(item.balanceAfter || 0).toFixed(2)}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Admin wallet history error:", error);
    target.innerHTML = "<p>Could not load wallet transactions.</p>";
  }
}


// MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
window.showPage = showPage;
window.loadFootballMatches = loadFootballMatches;
window.placePrediction = placePrediction;
window.loadAdminUsers = loadAdminUsers;
window.updateFormMode = updateFormMode;


// START THE APPLICATION
document.addEventListener("DOMContentLoaded", async () => {
  showPage("home");
  await initializeFirebase();
  console.log("Cabangile Football started.");
});


