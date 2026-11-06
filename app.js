
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// ======================================
// FIREBASE CONFIGURATION
// ======================================

const firebaseConfig = {
  apiKey: "AIzaSyChXiA8otw90zk4rk-pv-4uo2jMaanKXpI",
  authDomain: "football-d6b07.firebaseapp.com",
  projectId: "football-d6b07",
  storageBucket: "football-d6b07.firebasestorage.app",
  messagingSenderId: "101049949537",
  appId: "1:101049949537:web:8bdff34999e81d4129f920",
  measurementId: "G-6M9Q9GJ04X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const content = document.getElementById("page-content");

let currentPage = "home";
let registerMode = false;

// ======================================
// CREATE OR CHECK USER PROFILE
// ======================================

async function ensureUserProfile(user, fullName = "") {
  const userRef = doc(db, "users", user.uid);
  const profile = await getDoc(userRef);

  if (!profile.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: fullName || "Football Fan",
      email: user.email || "",
      createdAt: serverTimestamp()
    });
  }

  return userRef;
}

// ======================================
// PAGE NAVIGATION
// ======================================

function showPage(page) {
  currentPage = page;

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
        Loading account...
      </div>
    `
  };

  content.innerHTML = pages[page] || pages.home;

  if (page === "profile") {
    renderAccount();
  }

  window.scrollTo(0, 0);
}

window.showPage = showPage;

// ======================================
// ACCOUNT DISPLAY
// ======================================

function renderAccount() {
  const area = document.getElementById("account-area");

  if (!area) return;

  const user = auth.currentUser;

  // SIGNED-IN USER
  if (user) {
    area.innerHTML = `
      <h3>Welcome to Cabangile Football!</h3>
      <p id="account-name">Loading profile...</p>
      <p id="account-email"></p>
      <p id="profile-message"></p>
      <button id="logout-button">Sign Out</button>
    `;

    area.querySelector("#account-email").textContent =
      user.email || "";

    loadProfileName(user.uid);

    document.getElementById("logout-button").onclick =
      async () => {
        try {
          await signOut(auth);
          alert("You have signed out.");
        } catch (error) {
          alert(friendlyAuthError(error));
        }
      };

    return;
  }

  // SIGNED-OUT USER
  area.innerHTML = `
    <h3 id="form-heading">Create your account</h3>

    <form id="account-form">

      <input
        type="text"
        id="full-name"
        placeholder="Your full name"
        autocomplete="name"
        required
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
        autocomplete="current-password"
        required
      >

      <button type="submit" id="submit-button">
        Create Account
      </button>

    </form>

    <button
      id="forgot-password"
      type="button"
      style="display:none"
    >
      Forgot Password?
    </button>

    <p id="auth-message" role="status"></p>

    <button id="switch-mode" type="button">
      Already registered? Sign in
    </button>
  `;

  updateFormMode();

  // SWITCH LOGIN / REGISTRATION
  document.getElementById("switch-mode").onclick = () => {
    registerMode = !registerMode;
    updateFormMode();
  };

  // REGISTER OR SIGN IN
  document.getElementById("account-form").onsubmit =
    async (event) => {
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

          await ensureUserProfile(
            credential.user,
            fullName
          );

          message.textContent =
            "Your account and profile were created successfully!";

        } else {

          const credential =
            await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

          // CREATE PROFILE IF AN EXISTING USER HAS NONE
          await ensureUserProfile(
            credential.user
          );

          message.textContent = "Welcome back!";
        }

      } catch (error) {
        console.error("Account error:", error);
        message.textContent = friendlyAuthError(error);

      } finally {
        submit.disabled = false;
      }
    };

  // FORGOT PASSWORD
  document.getElementById("forgot-password").onclick =
    async () => {

      const email =
        document.getElementById("email").value.trim();

      const message =
        document.getElementById("auth-message");

      if (!email) {
        message.textContent =
          "Please enter your email address first.";
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);

        message.textContent =
          "If an account exists for this email, a reset link will be sent. Check your inbox and spam folder.";

      } catch (error) {
        message.textContent = friendlyAuthError(error);
      }
    };
}

// ======================================
// LOAD PROFILE FROM FIRESTORE
// ======================================

async function loadProfileName(uid) {
  const nameElement =
    document.getElementById("account-name");

  const profileMessage =
    document.getElementById("profile-message");

  if (!nameElement) return;

  try {
    const profileRef = doc(db, "users", uid);
    const profile = await getDoc(profileRef);

    if (profile.exists()) {
      const data = profile.data();

      nameElement.textContent =
        "Name: " + (data.displayName || "Football Fan");

    } else {
      // REPAIR A MISSING PROFILE
      const user = auth.currentUser;

      if (user && user.uid === uid) {
        await ensureUserProfile(user);

        nameElement.textContent =
          "Name: Football Fan";
      }
    }

  } catch (error) {
    console.error("Profile loading error:", error);

    nameElement.textContent =
      "Unable to load profile.";

    if (profileMessage) {
      profileMessage.textContent =
        friendlyAuthError(error);
    }
  }
}

// ======================================
// LOGIN / REGISTRATION FORM MODE
// ======================================

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
  ) return;

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

// ======================================
// FRIENDLY ERROR MESSAGES
// ======================================

function friendlyAuthError(error) {
  const errors = {
    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/email-already-in-use":
      "This email is already registered. Please sign in.",

    "auth/weak-password":
      "Choose a password with at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "Account not found. Please check your email.",

    "auth/wrong-password":
      "Incorrect password. Try again or reset it.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Check your internet connection.",

    "permission-denied":
      "Database permission denied. Check your Firestore rules."
  };

  return errors[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}

// ======================================
// MONITOR LOGIN STATUS
// ======================================

onAuthStateChanged(auth, (user) => {
  console.log(
    user
      ? "Cabangile user signed in."
      : "No user signed in."
  );

  if (currentPage === "profile") {
    renderAccount();
  }
});

// ======================================
// START WEBSITE
// ======================================

showP
