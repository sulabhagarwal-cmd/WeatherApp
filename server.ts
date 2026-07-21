import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Route 1: Weather Intelligence Summary
app.post("/api/weather/intelligence", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it to Settings > Secrets.",
      });
    }

    const { locationName, current, daily } = req.body;
    if (!locationName || !current || !daily) {
      return res.status(400).json({ error: "Missing required parameters: locationName, current, or daily weather data." });
    }

    const prompt = `
Analyze the weather data for ${locationName}:

Current Weather:
- Temperature: ${current.temperature_2m}°C (Apparent: ${current.apparent_temperature}°C)
- Relative Humidity: ${current.relative_humidity_2m}%
- Weather Code: ${current.weather_code}
- Cloud Cover: ${current.cloud_cover}%
- Wind Speed: ${current.wind_speed_10m} km/h

7-Day Forecast Highlights:
- Max Temps: ${daily.temperature_2m_max.join(", ")} °C
- Min Temps: ${daily.temperature_2m_min.join(", ")} °C
- Max Apparent Temps: ${daily.apparent_temperature_max.join(", ")} °C
- Min Apparent Temps: ${daily.apparent_temperature_min.join(", ")} °C
- Max UV Indices: ${daily.uv_index_max.join(", ")}
- Precipitation Probability Max: ${daily.precipitation_probability_max.join(", ")}%
- Precipitation Sum: ${daily.precipitation_sum.join(", ")} mm
- Max Wind Speeds: ${daily.wind_speed_10m_max.join(", ")} km/h

Evaluate the data to output the weather intelligence analysis. Keep summaries friendly, concise, and professional.
`;

    const weatherIntelligenceSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "A friendly, cohesive weather overview and general vibe of the week ahead (2 sentences max)."
        },
        clothing: {
          type: Type.OBJECT,
          properties: {
            morning: { type: Type.STRING, description: "Clothing recommendation for the morning hours." },
            afternoon: { type: Type.STRING, description: "Clothing recommendation for the warmest part of the day." },
            evening: { type: Type.STRING, description: "Clothing recommendation for nighttime/evening." },
            general: { type: Type.STRING, description: "Overall advice regarding accessories (umbrellas, sunglasses, sunscreen) or fabric choice." }
          },
          required: ["morning", "afternoon", "evening", "general"]
        },
        activities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the activity." },
              score: { type: Type.INTEGER, description: "A score from 0 to 100 on how suitable the 7-day weather is for this activity." },
              explanation: { type: Type.STRING, description: "Weather-based justification explaining why it is suitable or not." }
            },
            required: ["name", "score", "explanation"]
          },
          description: "Provide recommendations for: 'Outdoor Running', 'Cycling', 'Gardening', 'Stargazing/Astronomy', 'Road Trips/Travel', and 'Clothes Drying/Laundry'."
        },
        safetyAlerts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Any warning related to high UV, high winds, heavy rain, freezing, heatwave, or empty if none."
        },
        bestTime: {
          type: Type.STRING,
          description: "The absolute best day and time window for outdoor exploration this week."
        }
      },
      required: ["summary", "clothing", "activities", "safetyAlerts", "bestTime"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an advanced Weather Intelligence Planner. Your job is to analyze current and forecasted meteorological variables to deliver ultra-precise, human-centric planning recommendations and activity ratings. You must be truthful to the numbers.",
        responseMimeType: "application/json",
        responseSchema: weatherIntelligenceSchema,
      }
    });

    if (!response.text) {
      throw new Error("No response text returned from Gemini API");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);

  } catch (error: any) {
    console.error("Error generating weather intelligence:", error);
    return res.status(500).json({ error: error?.message || "Internal server error." });
  }
});

// Route 2: Custom activity planning query
app.post("/api/weather/custom-query", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it to Settings > Secrets.",
      });
    }

    const { locationName, current, daily, query } = req.body;
    if (!locationName || !current || !daily || !query) {
      return res.status(400).json({ error: "Missing required parameters: locationName, current, daily, or query." });
    }

    const prompt = `
Analyze the weather data for ${locationName}:

Current Weather:
- Temp: ${current.temperature_2m}°C, Apparent: ${current.apparent_temperature}°C
- Code: ${current.weather_code}, Wind: ${current.wind_speed_10m} km/h

7-Day Forecast Highlights:
- Max Temps: ${daily.temperature_2m_max.join(", ")} °C
- Min Temps: ${daily.temperature_2m_min.join(", ")} °C
- Max Apparent Temps: ${daily.apparent_temperature_max.join(", ")} °C
- Max UV Indices: ${daily.uv_index_max.join(", ")}
- Precipitation Probability Max: ${daily.precipitation_probability_max.join(", ")}%
- Precipitation Sum: ${daily.precipitation_sum.join(", ")} mm
- Max Wind Speeds: ${daily.wind_speed_10m_max.join(", ")} km/h

The user is asking: "${query}"

Provide a direct answer evaluating whether the weather is suitable for their requested custom activity, along with a score and a suitability boolean.
`;

    const customQuerySchema = {
      type: Type.OBJECT,
      properties: {
        answer: {
          type: Type.STRING,
          description: "An elegant, personalized response in markdown format (max 3 short paragraphs). Walk through the specific days and details of the weather."
        },
        isSuitable: {
          type: Type.BOOLEAN,
          description: "True if the weather is generally suitable/favorable for this custom activity, false if unsuitable or high risk."
        },
        score: {
          type: Type.INTEGER,
          description: "A suitability score from 0 to 100 for this activity based on the weather conditions."
        }
      },
      required: ["answer", "isSuitable", "score"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert weather activity coordinator. Evaluate custom user activity queries strictly against the provided meteorological numbers. Use formatting to highlight critical metrics (temperature, UV index, wind speed, rain chance). Make the markdown professional, encouraging, and informative.",
        responseMimeType: "application/json",
        responseSchema: customQuerySchema,
      }
    });

    if (!response.text) {
      throw new Error("No response text returned from Gemini API");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);

  } catch (error: any) {
    console.error("Error generating custom planning intelligence:", error);
    return res.status(500).json({ error: error?.message || "Internal server error." });
  }
});

// Serve frontend SPA or start Vite in dev mode
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
