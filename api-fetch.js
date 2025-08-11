const API_BASE_URL = "https://weatherly-9d2k.onrender.com";

let allCities = [];
let filteredCities = [];
let selectedIndex = -1;
let debounceTimeout;

const cityInput = document.getElementById("city-input");
const resultDiv = document.getElementById("weather-result");

const dropdown = document.createElement("ul");
dropdown.classList.add("autocomplete-dropdown");
dropdown.style.position = "absolute";
dropdown.style.display = "none";
document.body.appendChild(dropdown);

function positionDropdown() {
    const rect = cityInput.getBoundingClientRect();
    dropdown.style.left = rect.left + "px";
    dropdown.style.top = rect.bottom + "px";
    dropdown.style.width = rect.width + "px";
}
window.addEventListener("resize", positionDropdown);
cityInput.addEventListener("focus", positionDropdown);

fetch(`${API_BASE_URL}/api/cities`)
    .then(res => res.json())
    .then(data => {
        const seen = new Set();
        allCities = data.filter(city => {
            const lower = city.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
    })
    .catch(err => console.error("Failed to load cities:", err));

cityInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleAutocomplete, 300);
});

async function handleAutocomplete() {
    const query = cityInput.value.trim().toLowerCase();
    if (!query) {
        dropdown.style.display = "none";
        return;
    }

    let candidates = allCities.filter(city => city.toLowerCase().includes(query));

    candidates = candidates.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        if (aLower === query && bLower !== query) return -1;
        if (bLower === query && aLower !== query) return 1;
        if (aLower.startsWith(query) && !bLower.startsWith(query)) return -1;
        if (bLower.startsWith(query) && !aLower.startsWith(query)) return 1;
        return aLower.localeCompare(bLower);
    });

    candidates = candidates.slice(0, 20);

    const validCities = [];
    for (const city of candidates) {
        try {
            const resp = await fetch(`${API_BASE_URL}/api/check-city?name=${encodeURIComponent(city)}`);
            const data = await resp.json();
            if (data.valid) validCities.push(city);
            if (validCities.length >= 10) break;
        } catch {
            // no error check because idc about them
        }
    }

    filteredCities = validCities;

    dropdown.innerHTML = "";
    filteredCities.forEach(city => {
        const li = document.createElement("li");
        li.textContent = city;
        li.classList.add("autocomplete-item");
        li.addEventListener("mousedown", () => {
            cityInput.value = city;
            dropdown.style.display = "none";
            selectedIndex = -1;
        });
        dropdown.appendChild(li);
    });

    dropdown.style.display = filteredCities.length ? "block" : "none";
    selectedIndex = -1;
}

function highlightOption() {
    [...dropdown.children].forEach((li, idx) => {
        li.classList.toggle("highlighted", idx === selectedIndex);
    });
}

document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== cityInput) {
        dropdown.style.display = "none";
    }
});

async function fetchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        resultDiv.innerHTML = `<p class="error-msg">Please enter a city name.</p>`;
        return;
    }

    try {
        resultDiv.innerHTML = `<p>Loading...</p>`;

        const weatherResp = await fetch(`${API_BASE_URL}/api/weather?q=${encodeURIComponent(city)}`);
        const weatherData = await weatherResp.json();

        if (weatherData.cod === "404") {
            resultDiv.innerHTML = `<p class="error-msg">City not found. Please try again.</p>`;
            return;
        }

        const imageResp = await fetch(`${API_BASE_URL}/api/city-image?q=${encodeURIComponent(city)}`);
        let cityImageUrl = 'https://via.placeholder.com/600x400?text=Image+Not+Found';

        if (imageResp.ok) {
            const imageData = await imageResp.json();
            cityImageUrl = imageData.imageUrl || cityImageUrl;
        }

        resultDiv.innerHTML = `
        <div class="weather-info">
            <img src="${cityImageUrl}" alt="${weatherData.name}" class="city-image" />
            <h2>${weatherData.name}, ${weatherData.sys.country}</h2>
            <p class="weather-details">
                <span class="weather-item">🌡️ <strong>Temperature:</strong> ${weatherData.main.temp}°C</span>
                <span class="weather-item">☁️ <strong>Weather:</strong> ${weatherData.weather[0].description}</span>
                <span class="weather-item">💧 <strong>Humidity:</strong> ${weatherData.main.humidity}%</span>
                <span class="weather-item">💨 <strong>Wind Speed:</strong> ${weatherData.wind.speed} m/s</span>
            </p>
        </div>
    `;

    } catch (err) {
        resultDiv.innerHTML = `<p class="error-msg">Error fetching weather data.</p>`;
    }
}

document.getElementById("search-btn-get-started").addEventListener("click", fetchWeather);

cityInput.addEventListener("keydown", (e) => {
    if (dropdown.style.display !== "none" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        if (e.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % filteredCities.length;
        } else {
            selectedIndex = (selectedIndex - 1 + filteredCities.length) % filteredCities.length;
        }
        highlightOption();
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && filteredCities[selectedIndex]) {
            cityInput.value = filteredCities[selectedIndex];
        }
        dropdown.style.display = "none";
        selectedIndex = -1;
        fetchWeather();
    } else if (e.key === "Tab" && selectedIndex >= 0 && filteredCities[selectedIndex]) {
        cityInput.value = filteredCities[selectedIndex];
        dropdown.style.display = "none";
        selectedIndex = -1;
    }
});
