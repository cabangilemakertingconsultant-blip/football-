// CABANGILE FOOTBALL - IMAGE LIBRARY

const CABANGILE_IMAGES = {
  logo: "logo.png",

  icons: {
    home: "home.png",
    matches: "matches.png",
    predictions: "predictions.png",
    wallet: "wallet(1).png",
    profile: "profile.png",
    trophy: "trophy.png",
    news: "news.png",
    settings: "settings.png",
    alerts: "alerts.png",
    logout: "logout.png"
  },

  teams: {
    premierLeague: "premier_league.png",
    laLiga: "laliga.png",
    serieA: "serie_a.png",
    bundesliga: "bundesliga.png",
    championsLeague: "champions_league.png",
    caf: "caf.png",
    worldCup: "world_cup.png"
  },

  players: {}
};

function getCabangileImage(category, name) {
  if (category === "logo") return CABANGILE_IMAGES.logo;
  return CABANGILE_IMAGES[category]?.[name] || "";
}
