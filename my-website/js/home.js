const API_KEY = '39e5d4874c102b0a9b61639c81b9bda1';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem, autoplayTimeout;

// Fetch trending
async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results;
}
async function fetchTrendingAnime() {
  let allResults = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    const filtered = data.results.filter(item =>
      item.original_language === 'ja' && item.genre_ids.includes(16)
    );
    allResults = allResults.concat(filtered);
  }
  return allResults;
}

// Display
function displayBanner(item) {
  document.getElementById('banner').style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById('banner-title').textContent = item.title || item.name;
}
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

// TV show seasons/episodes
async function fetchSeasons(tvId) {
  const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
  return await res.json();
}
async function fetchEpisodes(tvId, seasonNumber) {
  const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`);
  return await res.json();
}

// Modal logic
async function showDetails(item) {
  clearAutoplay();
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview;
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  document.getElementById('autoplay-timer').style.display = 'none';

  // TV Show: show selectors
  if (item.media_type === "tv" || item.first_air_date) {
    document.getElementById('season-episode-select').style.display = 'flex';
    await populateSeasonDropdown(item.id);
  } else {
    document.getElementById('season-episode-select').style.display = 'none';
  }
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}

// Populate selectors
async function populateSeasonDropdown(tvId) {
  const data = await fetchSeasons(tvId);
  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.innerHTML = '';
  data.seasons.forEach(season => {
    if (season.season_number > 0) {
      const opt = document.createElement('option');
      opt.value = season.season_number;
      opt.textContent = `Season ${season.season_number}`;
      seasonDropdown.appendChild(opt);
    }
  });
  await populateEpisodeDropdown(tvId, seasonDropdown.value);
  seasonDropdown.onchange = async () => {
    await populateEpisodeDropdown(tvId, seasonDropdown.value);
    changeServer();
  };
}
async function populateEpisodeDropdown(tvId, seasonNumber) {
  const data = await fetchEpisodes(tvId, seasonNumber);
  const episodeDropdown = document.getElementById('episode-dropdown');
  episodeDropdown.innerHTML = '';
  data.episodes.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep.episode_number;
    opt.textContent = `Episode ${ep.episode_number}`;
    episodeDropdown.appendChild(opt);
  });
  episodeDropdown.onchange = () => {
    changeServer();
  };
}

// Player & Server logic
function changeServer() {
  clearAutoplay();
  const server = document.getElementById('server').value;
  let type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";
  let id = currentItem.id;

  if (type === "tv" && document.getElementById('season-episode-select').style.display !== 'none') {
    const season = document.getElementById('season-dropdown').value;
    const episode = document.getElementById('episode-dropdown').value;
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/tv/${id}/${season}-${episode}`;
    }
    setupAutoplayNext(tvId = id, season, episode);
  } else {
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/movie/${id}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/movie/?tmdb=${id}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/movie/${id}`;
    }
  }
  document.getElementById('modal-video').src = embedURL;
}

// Autoplay Next Episode
function setupAutoplayNext(tvId, season, episode) {
  clearAutoplay();
  const episodeDropdown = document.getElementById('episode-dropdown');
  const nextIndex = Array.from(episodeDropdown.options).findIndex(opt => opt.value == episode) + 1;
  if (nextIndex < episodeDropdown.options.length) {
    let counter = 10;
    document.getElementById('autoplay-timer').style.display = 'block';
    document.getElementById('autoplay-counter').textContent = counter;
    autoplayTimeout = setInterval(() => {
      counter--;
      document.getElementById('autoplay-counter').textContent = counter;
      if (counter <= 0) {
        clearAutoplay();
        episodeDropdown.selectedIndex = nextIndex;
        changeServer();
      }
    }, 1000);
    document.getElementById('cancel-autoplay').onclick = clearAutoplay;
  } else {
    document.getElementById('autoplay-timer').style.display = 'none';
  }
}
function clearAutoplay() {
  if (autoplayTimeout) {
    clearInterval(autoplayTimeout);
    autoplayTimeout = null;
    document.getElementById('autoplay-timer').style.display = 'none';
  }
}

// Modal controls
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
  clearAutoplay();
};
window.onclick = function(event) {
  if (event.target === document.getElementById('modal')) {
    document.getElementById('close-modal').onclick();
  }
};

// Search Modal logic
document.getElementById('search-btn').onclick = openSearchModal;
document.getElementById('close-search-modal').onclick = closeSearchModal;
document.getElementById('search-modal-input').oninput = searchTMDB;
function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-modal-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-modal-input').focus();
}
function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}
async function searchTMDB() {
  const query = document.getElementById('search-modal-input').value;
  if (!query.trim()) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };
    container.appendChild(img);
  });
}

// Init
async function init() {
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();
  displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
}
// On load
init();
