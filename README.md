# Weather Intelligence – Atlas / Forecast

A sophisticated, highly polished meteorological intelligence dashboard featuring server-side cognitive weather forecasting, apparel advisories, activity suitability ratings, and a personalized AI planner.

## ✨ Features

- **Sophisticated Dark Theme**: A meticulously crafted high-contrast dark aesthetic using an ultra-low luminance color palette, elegant typography pairings featuring **Playfair Display** display headings, and custom minimalist layout lines.
- **Meteorological Data Retrieval**: Live, accurate regional weather forecasts sourced directly from Open-Meteo, featuring comprehensive ambient metrics (humidity, wind velocity, barometric pressure, UV risk, rain likelihoods, and daylight timelines).
- **Cognitive Weather Intelligence**: Powered by server-side Gemini 3.5 Flash models to generate intelligent daily briefs, structured clothing advisors (Morning, Afternoon, and Evening), activity match ratings, and optimal exploration windows.
- **Interactive AI Planner**: A customized conversational query module allowing you to ask natural questions (e.g., *"Is Saturday good for a backyard BBQ?"*) and receive real-time, context-driven recommendations.
- **Validation & Safe Recovery**: Graceful handling of invalid city queries with explicit warnings instructing users to input correct geographical names, preventing random or corrupted search queries.
- **Dynamic Recent History**: Fast quick-toggle recent query caches to easily cycle back to previous meteorological coordinates.

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Install the app dependencies:
   ```bash
   npm install
   ```

2. Add your server-side Gemini API key to your environment variables file (`.env`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Running the Application

To launch the local development environment:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to interact with the dashboard.

## 🗂️ Project Structure

- `src/App.tsx`: The primary interactive React module, housing the dashboard view, the reactive geocoding state, and unit switch logic.
- `src/utils.tsx`: Key utility functions for Celsius/Fahrenheit conversion, wind direction calculations, and weather status formatting.
- `src/index.css`: Tailwind CSS theme overrides establishing the "Sophisticated Dark" font families and minimalist styling declarations.
- `server.ts`: Full-stack backend entry point handling asset middleware and secure proxy operations for client-side API calls.
