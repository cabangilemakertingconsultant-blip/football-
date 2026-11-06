
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// CABANGILE FOOTBALL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyChXiA8otw90zk4rk-pv-4uo2jMaanKXpI",
  authDomain: "football-d6b07.firebaseapp.com",
  projectId: "football-d6b07",
  storageBucket: "football-d6b07.firebasestorage.app",
  messagingSenderId: "101049949537",
  appId: "1:101049949537:web:8bdff34999e81d4129f920",
  measurementId: "G-6M9Q9GJ04X"
};

// CONNECT FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const content = document.getElementById("page-content");

let currentPage = "home";
let registerMode = false;

// PAGE NAVIGATION
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
        <p>Your football matches section is ready.</p>
      </div>
    `,

    predictions: `
      <h2>📊 Predictions</h2>
      <div class="football-card">
        <h3>Make Your Prediction</h3>
        <p>Football predictions will be added next.</p>
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
        <p>Checking account...</p>
      </div>
    `
  };

  content.innerHTML = pages[page] || pages.home;

  if (page === "profile") {
    renderAccount();
  }

  window.scrollTo(0, 0);
}

// MAKE NAVIGATION AVAILABLE TO HTML BUTTONS
window.showPage = showPage;

// ACCOUNT DISPLAY
function renderAccount() {
  const area = document.getElementById("account-area");
  if (!area) return;

  if (auth.currentUser) {
    area.innerHTML = `
      <h3>Welcome!</h3>
      <p id="account-email"></p>
      <button id="logout-button">Sign out</button>
    `;

    area.querySelector("#account-email").textContent =
      auth.currentUser.email || "";

    document.getElementById("logout-button").onclick = async () => {
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

  area.innerHTML = `
    <h3 id="form-heading">Create your account</h3>

    <form id="account-form">
      <input
        type="email"
        id="email"
        placeholder="Email address"
        required
      >

      <input
        type="password"
        id="password"
        placeholder="Password (at least 6 characters)"
        minlength="6"
        required
      >

      <button type="submit" id="submit-button">
        Create account
      </button>
    </form>

    <p id="auth-message"></p>

    <button id="switch-mode" type="button">
      Already registered? Sign in
    </button>
  `;

  updateFormMode();

  document.getElementById("switch-mode").onclick = () => {
    registerMode = !registerMode;
    updateFormMode();
  };

  document.getElementById("account-form").onsubmit =
    async (event) => {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const message = document.getElementById("auth-message");
      const submit = document.getElementById("submit-button");

      submit.disabled = true;
      message.textContent = "Please wait...";

      try {
        if (registerMode) {
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          message.textContent = "Account created successfully!";
        } else {
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          message.textContent = "Welcome back!";
        }
      } catch (error) {
        message.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    };
}

function updateFormMode() {
  const heading = document.getElementById("form-heading");
  const submit = document.getElementById("submit-button");
  const switchButton = document.getElementById("switch-mode");

  if (!heading || !submit || !switchButton) return;

  heading.textContent = registerMode
    ? "Create your account"
    : "Sign in to Cabangile Football";

  submit.textContent = registerMode
    ? "Create account"
    : "Sign in";

  switchButton.textContent = registerMode
    ? "Already registered? Sign in"
    : "New here? Create an account";
}

// MONITOR LOGIN STATUS
onAuthStateChanged(auth, (user) => {
  if (currentPage === "profile") {
    renderAccount();
  }
});

// START WEBSITE
showPage("home");

// Firebase connection objects are available for future features.
console.log("Cabangile Football connected to Firebase!");

