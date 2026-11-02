
const SUPABASE_URL = "https://rtvicrxzjurxhtckhmfle.supabase.co";

// Supabase connection will be completed with your public publishable key.

const content = document.getElementById("page-content");

function showPage(page) {
  const pages = {
    home: `
      <h2>🏆 Featured Football</h2>
      <div class="football-card">
        <h3>Welcome to Cabangile Football</h3>
        <p>Your football world starts here.</p>
      </div>
      <div class="football-card">
        <h3>Today's Matches</h3>
        <p>Upcoming fixtures and results will appear here.</p>
      </div>
    `,

    matches: `
      <h2>⚽ Football Matches</h2>
      <div class="football-card">
        <h3>Fixtures and Results</h3>
        <p>Matches will appear here when the database is connected.</p>
      </div>
    `,

    predictions: `
      <h2>📊 Football Predictions</h2>
      <div class="football-card">
        <h3>Make Your Prediction</h3>
        <p>Choose your favourite teams and predict match results.</p>
        <p>Prediction features coming soon.</p>
      </div>
    `,

    wallet: `
      <h2>💰 My Wallet</h2>
      <div class="football-card">
        <h3>Account Balance</h3>
        <p>R0.00</p>
        <p>Your wallet will be connected securely later.</p>
      </div>
    `,

    profile: `
      <h2>👤 My Profile</h2>
      <div class="football-card">
        <h3>Welcome, Football Fan!</h3>
        <p>Sign-in and account details will be added next.</p>
      </div>
    `
  };

  content.innerHTML = pages[page] || pages.home;
  window.scrollTo(0, 0);
}

// Initial home page
showPage("home");
