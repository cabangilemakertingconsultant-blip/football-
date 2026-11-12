
/* =====================================
   CABANGILE FOOTBALL
   Main application
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
  apiKey: "AIzaSyChXiA8otw90zk4rk-pv-4uo2jMaanKXpI",
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

// =====================================
// PAGE NAVIGATION
// =====================================

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
        <h3>Today's Matches</h3>
        <p>Football fixtures and results will appear here.</p>
      </div>
    `,

    matches: `
      <h2>⚽ Football Matches</h2>
      <div class="football-card">
        <h3>Fixtures and Results</h3>
        <p>Your football matches will appear here.</p>
      </div>
    `,

    predictions: `
      <h2>📊 Football Predictions</h2>
      <div class="football-card">
        <h3>Make Your Prediction</h3>
        <p>Predict your favourite teams.</p>
      </div>
    `,

    wallet: `
      <h2>💰 My Wallet</h2>
      <div class="football-card">
        <h3>Demo Balance</h3>
        <p>R0.00</p>
        <p>No real-money transactions are enabled.</p>
      </div>
    `,

    profile: `
      <h2>👤 My Account</h2>
      <div class="football-card" id="account-area">
        Checking account...
      </div>
    `
  };

  currentPage = pages[page] ? page : "home";
  content.innerHTML = pages[currentPage];

  window.scrollTo(0, 0);

  if (currentPage === "profile") {
    renderAccount();
  }
}

// Make navigation available to HTML
window.showPage = showPage;

// Connect all navigation buttons
document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// =====================================
// FIREBASE INITIALIZATION
// =====================================

async function initializeFirebase() {
  try {
    console.log("Loading Firebase...");

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

    firebaseReady = true;

    console.log("Firebase connected successfully.");

    onAuthStateChanged(auth, () => {
      if (currentPage === "profile") {
        renderAccount();
      }
    });

    if (currentPage === "profile") {
      renderAccount();
    }

  } catch (error) {
    firebaseError = error;

    console.error("Firebase loading error:", error);

    if (currentPage === "profile") {
      renderAccount();
    }
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
      createdAt: serverTimestamp()
    });
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
      ? `<p>Firebase could not load. Please check your internet connection and try again.</p>
         <p id="firebase-error"></p>
         <button type="button" id="retry-firebase">Try Again</button>`
      : `<p>Connecting to your account...</p>`;

    if (firebaseError) {
      const errorBox = document.getElementById("firebase-error");

      if (errorBox) {
        errorBox.textContent = firebaseError.message;
      }

      document.getElementById("retry-firebase").onclick = () => {
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

      <button type="button" id="logout-button">
        Sign Out
      </button>
    `;

    document.getElementById("account-email").textContent =
      "Email: " + (user.email || "");

    const nameInput = document.getElementById("profile-name");
    const phoneInput = document.getElementById("profile-phone");
    const message = document.getElementById("profile-message");

    try {
      await ensureUserProfile(user);

      const profile = await getDoc(doc(db, "users", user.uid));

      if (!document.getElementById("profile-form")) return;

      if (profile.exists()) {
        const data = profile.data();

        nameInput.value =
          data.displayName || user.displayName || "";

        phoneInput.value = data.phoneNumber || "";
      }

    } catch (error) {
      console.error(error);

      message.textContent =
        "Could not load profile: " + error.message;
    }

    const profileForm = document.getElementById("profile-form");

    if (profileForm) {
      profileForm.onsubmit = async (event) => {
        event.preventDefault();

        const fullName = nameInput.value.trim();
        const phoneNumber = phoneInput.value.trim();

        const saveButton =
          document.getElementById("save-profile");

        if (!fullName) {
          message.textContent = "Enter your full name.";
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
              phoneNumber: phoneNumber,
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

    document.getElementById("logout-button").onclick =
      async () => {
        try {
          await signOut(auth);
        } catch (error) {
          alert(error.message);
        }
      };

    return;
  }

  // SIGN IN / REGISTER FORM
  area.innerHTML = `
    <h3 id="form-heading">Sign in to Cabangile Football</h3>

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

  // SIGN IN OR CREATE ACCOUNT
  document.getElementB
