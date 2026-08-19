console.log("Weather JS Loaded");

const API_KEY = "f807f8e4da415c3094ba3d2a9e39d200";
const LAT = 7.1876;
const LON = 125.4532;
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // re-fetch weather every 10 minutes

async function getWeather() {
  try {
 const response = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`
);
    const data = await response.json();

    // Guard against API errors (bad key, rate limit, city not found, etc.)
    // so we don't crash trying to read fields off an error object.
    if (!response.ok || !data.main || !data.weather) {
      console.error("Weather API error:", data.message || `HTTP ${response.status}`);
      return;
    }

    console.log(data);

    // LOCATION
   document.getElementById("city").innerHTML =
  "📍 Calinan Poblacion, Davao City";

    // TEMPERATURE
    document.getElementById("temperature").innerHTML = Math.round(data.main.temp);

    // CONDITION
    document.getElementById("condition").innerHTML = data.weather[0].description.toUpperCase();

    // ICON
    document.getElementById("weather-icon").src =
      `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    // HUMIDITY
    const humidity = `${data.main.humidity}%`;
    document.getElementById("humidity").innerHTML = humidity;
    document.getElementById("humidity-condition").innerHTML = humidity;

    // WIND
    const windSpeed = `${Math.round(data.wind.speed * 3.6)} km/h`;
    document.getElementById("wind").innerHTML = windSpeed;
    document.getElementById("wind-condition").innerHTML = windSpeed;

    // PRESSURE
    const pressure = `${data.main.pressure} hPa`;
    document.getElementById("pressure").innerHTML = pressure;
    document.getElementById("pressure-condition").innerHTML = pressure;

    // VISIBILITY (not always present in the API response)
    document.getElementById("visibility").innerHTML =
      data.visibility != null ? `${(data.visibility / 1000).toFixed(1)} km` : "--";

    // CLOUDS (not always present in the API response)
    document.getElementById("clouds").innerHTML =
      data.clouds ? `${data.clouds.all}%` : "--";

    // FEELS LIKE
    document.getElementById("feels").innerHTML = `${Math.round(data.main.feels_like)}°C`;

  } catch (error) {
    console.error("Weather Error:", error);
  }
}

getWeather();
setInterval(getWeather, REFRESH_INTERVAL_MS); // keep the data from going stale

// REAL TIME CLOCK
function updateTime() {
  const now = new Date();

  document.getElementById("date-time").innerHTML =
    `🗓 ${now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}<br>🕒 ${now.toLocaleTimeString()}`;
}

updateTime();
setInterval(updateTime, 1000);