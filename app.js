
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// ======================================
// CABANGILE FOOTBALL - FIREBASE CONFIG
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

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const content = document.getElementById("page-content");

let currentPage = "home";
let registerMode = false;

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
        <p>Predict the results of your favourite teams.</p>
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
        <p>Loading account...</p>
      </div>
    `
  };

  content.innerHTML = pages[page] || pages.home;

  if (page === "profile") {
    renderAccount();
  }

  window.scrollTo(0, 0);
}

// MAKE FUNCTION AVAILABLE TO HTML BUTTONS
window.showPage = showPage;

// ======================================
// ACCOUNT DISPLAY
// ======================================

function renderAccount() {
  const area = document.getElementById("account-area");

  if (!area) return;

  // USER IS SIGNED IN
  if (auth.currentUser) {
    area.innerHTML = `
      <h3>Welcome to Cabangile Football!</h3>

      <p id="account-email"></p>

      <button id="logout-button">
        Sign Out
      </button>
    `;

    area.querySelector("#account-email").textContent =
      auth.currentUser.email || "";

    document.getElementById("logout-button").onclick =
      async () => {
        try {
          await signOut(auth);
          alert("You have signed out.");
          renderAccount();
        } catch (error) {
          alert(error.message);
        }
      };

    return;
  }

  // USER IS NOT SIGNED IN
  area.innerHTML = `
    <h3 id="form-heading">
      Create your account
    </h3>

    <form id="account-form">

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

  // SWITCH BETWEEN REGISTER AND LOGIN
  document.getElementById("switch-mode").onclick = () => {
    registerMode = !registerMode;
    updateFormMode();
  };

  // REGISTER OR SIGN IN
  document.getElementById("account-form").onsubmit =
    async (event) => {
      event.preventDefault();

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
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

          message.textContent =
            "Account created successfully!";
        } else {
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

          message.textContent =
            "Welcome back!";
        }

      } catch (error) {
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
          "If an account exists for that email, a password reset email will be sent. Check your inbox and spam folder.";

      } catch (error) {
        message.textContent = friendlyAuthError(error);
      }
    };
}

// ======================================
// FORM MODE
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

  if (!heading || !submit || !switchButton) return;

  if (registerMode) {
    heading.textContent = "Create your account";
    submit.textContent = "Create Account";

    switchButton.textContent =
      "Already registered? Sign in";

    forgotButton.style.display = "none";

  } else {
    heading.textContent =
      "Sign in to Cabangile Football";

    submit.textContent = "Sign In";

    switchButton.textContent =
      "New here? Create an account";

    forgotButton.style.display = "block";
  }
}

// ======================================
// FRIENDLY AUTHENTICATION ERRORS
// ======================================

function friendlyAuthError(error) {
  const errors = {
    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/user-not-found":
      "Account not found. Check your email or create an account.",

    "auth/wrong-password":
      "Incorrect password. Try again or reset your password.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/email-already-in-use":
      "This email is already registered. Please sign in.",

    "auth/weak-password":
      "Please choose a stronger password with at least 6 characters.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Network problem. Check your internet connection."
  };

  return errors[error.code] ||
    "Something went wrong. Please try again.";
}

// ======================================
// LOGIN STATUS
// ======================================

onAuthStateChanged(auth, (user) => {
  if (currentPage === "profile") {
    renderAccount();
  }

  console.log(
    user
      ? "Cabangile user signed in."
      : "No user signed in."
  );
});

// ======================================
// START WEBSITE
// ======================================

showPage("home");

console.log("Cabangile Football Firebase is ready!");


