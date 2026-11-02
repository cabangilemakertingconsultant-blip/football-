
// CABANGILE FOOTBALL - IMAGE LIBRARY

const CABANGILE_IMAGES = {
  logo: "images/logo/logo.png",

  icons: {
    home: "images/icons/home.png",
    matches: "images/icons/matches.png",
    predictions: "images/icons/predictions.png",
    wallet: "images/icons/wallet.png",
    profile: "images/icons/profile.png",
    trophy: "images/icons/trophy.png",
    news: "images/icons/news.png",
    settings: "images/icons/settings.png",
    alerts: "images/icons/alerts.png",
    logout: "images/icons/logout.png"
  },

  teams: {
    premierLeague: "images/teams/premier_league.png",
    laLiga: "images/teams/laliga.png",
    serieA: "images/teams/serie_a.png",
    bundesliga: "images/teams/bundesliga.png",
    championsLeague: "images/teams/champions_league.png",
    caf: "images/teams/caf.png",
    worldCup: "images/teams/world_cup.png"
  },

  players: {}
};

// Helper to get an image path
function getCabangileImage(category, name) {
  if (category === "logo") {
    return CABANGILE_IMAGES.logo;
  }

  return CABANGILE_IMAGES[category]?.[name] || "";
}
