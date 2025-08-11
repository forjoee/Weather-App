const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const needle = require('needle');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

app.get('/api/weather', async (req, res) => {
    try {
        const params = new URLSearchParams({
            q: req.query.q,
            appid: process.env.API_KEY,
            units: 'metric',
            lang: 'en',
        });

        const apiUrlWithParams = `${WEATHER_API_URL}?${params}`;
        console.log('Fetching weather from:', apiUrlWithParams);

        const apiResponse = await needle('get', apiUrlWithParams);
        const data = apiResponse.body;

        res.status(200).json(data);
    } catch (ex) {
        console.error('Error fetching weather:', ex);
        res.status(500).json({ error: 'Something went wrong', details: ex.message });
    }
});

app.get('/api/city-image', async (req, res) => {
    try {
        const city = req.query.q;
        if (!city) {
            return res.status(400).json({ error: 'City query parameter required' });
        }

        const keywords = ['city', 'landmark', 'cityscape', 'city-view'];
        const searchQuery = `${city} ${keywords.join(' ')}`;

        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CLOUD_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&searchType=image&safe=active&num=5`;

        const googleResp = await needle('get', googleUrl);

        if (
            googleResp.statusCode !== 200 ||
            !googleResp.body.items ||
            googleResp.body.items.length === 0
        ) {
            return res.status(404).json({ error: 'No image found for this city' });
        }

        const imageUrl = googleResp.body.items[0].link;
        res.json({ imageUrl });
    } catch (err) {
        console.error('Error fetching city image:', err);
        res.status(500).json({ error: 'Failed to fetch city image', details: err.message });
    }
});

app.get('/api/cities', (req, res) => {
    const citiesFilePath = path.join(__dirname, 'cities.json');

    fs.readFile(citiesFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading cities.json:', err);
            return res.status(500).json({ error: 'Failed to load cities data' });
        }

        try {
            const cities = JSON.parse(data);
            const cityNames = cities.map(city => city.name);
            res.json(cityNames);
        } catch (parseErr) {
            console.error('Error parsing cities.json:', parseErr);
            res.status(500).json({ error: 'Failed to parse cities data' });
        }
    });
});

app.get('/api/check-city', async (req, res) => {
    const city = req.query.name;
    if (!city) {
        return res.status(400).json({ valid: false, error: "City name required" });
    }

    try {
        const params = new URLSearchParams({
            q: city,
            appid: process.env.API_KEY,
            units: 'metric'
        });

        const apiUrl = `${WEATHER_API_URL}?${params}`;
        const apiResponse = await needle('get', apiUrl);

        if (!apiResponse.body || apiResponse.body.cod !== 200) {
            return res.json({ valid: false });
        }

        res.json({ valid: true });
    } catch (error) {
        res.json({ valid: false });
    }
});

app.listen(PORT, () => console.log(`Weatherly server listening on port ${PORT}`));
