import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  MapPin,
  Clock,
  Droplets,
  Wind,
  Compass,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  Info,
  Calendar,
  ChevronRight,
  Shirt,
  AlertTriangle,
  History,
  RotateCcw,
  CheckCircle,
  XCircle,
  HelpCircle,
  Gauge,
  Sliders,
  Umbrella,
  Eye,
  ArrowRight
} from "lucide-react";
import {
  GeocodingResult,
  WeatherData,
  WeatherIntelligence,
  CustomPlanningResponse
} from "./types";
import {
  getWeatherDetails,
  formatTemp,
  windDirection,
  parseMarkdown
} from "./utils";

// Rule-based fallback compiler for ultimate resilience
function getRuleBasedIntelligence(city: GeocodingResult, current: any, daily: any): WeatherIntelligence {
  const isRainy = (current.precipitation ?? 0) > 0 || (daily.precipitation_probability_max?.[0] ?? 0) > 40;
  const isCold = (current.temperature_2m ?? 0) < 11;
  const isHot = (current.temperature_2m ?? 0) > 27;
  const isWindy = (current.wind_speed_10m ?? 0) > 18;

  return {
    summary: `Currently experiencing ${isRainy ? "wet" : "dry"} and ${isCold ? "chilly" : isHot ? "warm" : "moderate"} conditions in ${city.name}. The upcoming 7 days show stable high temperatures averaging around ${Math.round((daily.temperature_2m_max?.reduce((a: number, b: number) => a + b, 0) ?? 140) / 7)}°C.`,
    clothing: {
      morning: isCold ? "Heavy jacket, fleece layer, and warm pants." : isHot ? "Breathable t-shirt, shorts, and activewear." : "Comfortable long sleeve shirt or light sweater.",
      afternoon: isCold ? "Medium coat or protective windbreaker." : isHot ? "Light apparel, sunglasses, and high-quality sun hat." : "Casual shirts or light cardigan.",
      evening: isCold ? "Puffer coat, insulated gloves, and wool layers." : isHot ? "Lightweight pullover or casual summer shirt." : "Comfortable jacket or lightweight fleece.",
      general: isRainy ? "Essential to carry an umbrella and wear waterproof boots." : "Polarized sunglasses and UV-blocking lotions are highly recommended."
    },
    activities: [
      {
        name: "Outdoor Running",
        score: isRainy ? 25 : isHot ? 55 : isCold ? 65 : 95,
        explanation: isRainy ? "Slick surfaces and rain make outdoor runs hazardous today." : isHot ? "High midday heat suggests pacing yourself or scheduling early morning slots." : "Prisinte dry temperatures, absolutely ideal for outdoor jogs."
      },
      {
        name: "Cycling",
        score: isWindy || isRainy ? 35 : 90,
        explanation: isWindy ? "High gusts create heavy drag. Consider indoor alternatives or sheltered tracks." : isRainy ? "Slippery roads lower traction. Drive cautiously if you ride." : "Clear horizons and friendly wind make a wonderful day to ride."
      },
      {
        name: "Gardening",
        score: isRainy ? 15 : 85,
        explanation: isRainy ? "Waterlogged soils should be left to drain. Great day for indoor plant care." : "Optimal dampness and wind variables. Perfect for weeding or transplanting."
      },
      {
        name: "Stargazing/Astronomy",
        score: current.cloud_cover > 35 ? 20 : 95,
        explanation: current.cloud_cover > 35 ? "High cloud cover will obscure stars and celestial views." : "Extremely clear night sky offers pristine conditions for telescope stargazing."
      },
      {
        name: "Road Trips/Travel",
        score: isRainy ? 65 : 95,
        explanation: isRainy ? "Reduced visibility and damp asphalt will require extra stopping distances." : "High visibility, friendly conditions, and robust tire traction for a long scenic tour."
      },
      {
        name: "Clothes Drying/Laundry",
        score: isRainy ? 10 : isHot ? 100 : 75,
        explanation: isRainy ? "Outdoor drying is completely unfeasible due to precipitation risks." : "Sizzling sun and low relative humidity will dry your wash in no time."
      }
    ],
    safetyAlerts: [
      ...(isWindy ? ["High wind velocities noticed. Secure lightweight patio materials."] : []),
      ...(isRainy ? ["Moisture detected. Pay close attention to hydroplaning risks."] : []),
      ...((daily.uv_index_max?.[0] ?? 0) > 5 ? ["Elevated solar radiation index. Apply strong SPF screen and wear sunglasses."] : [])
    ],
    bestTime: "Late afternoon during the clearest dry day forecasted."
  };
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<GeocodingResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [intelligence, setIntelligence] = useState<WeatherIntelligence | null>(null);
  const [isCelsius, setIsCelsius] = useState(true);
  
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<GeocodingResult[]>([]);
  
  // Custom Planning Query states
  const [customActivityQuery, setCustomActivityQuery] = useState("");
  const [customPlanningResponse, setCustomPlanningResponse] = useState<CustomPlanningResponse | null>(null);
  const [loadingCustomQuery, setLoadingCustomQuery] = useState(false);
  const [customQueryError, setCustomQueryError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Read search history on mount and load default city
  useEffect(() => {
    const saved = localStorage.getItem("weather_recent_searches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed);
        if (parsed.length > 0) {
          const firstCity = parsed[0];
          setSelectedCity(firstCity);
          fetchWeather(firstCity);
          return;
        }
      } catch (e) {
        console.error("Error parsing recent searches", e);
      }
    }
    // Default fallback: London
    const defaultCity: GeocodingResult = {
      id: 2643743,
      name: "London",
      latitude: 51.50853,
      longitude: -0.12574,
      country: "United Kingdom",
      timezone: "Europe/London",
      country_code: "GB"
    };
    setSelectedCity(defaultCity);
    fetchWeather(defaultCity);
  }, []);

  // Debounced geocoding search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearchError(null);
    const handler = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Click outside to close geocoding suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (queryText: string): Promise<GeocodingResult[]> => {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryText)}&count=5&language=en&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setSuggestions(results);
        return results;
      }
    } catch (err) {
      console.error("Suggestions geocoding error:", err);
    }
    return [];
  };

  const updateRecentSearches = (city: GeocodingResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.id !== city.id);
      const updated = [city, ...filtered].slice(0, 5); // Keep top 5
      localStorage.setItem("weather_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("weather_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const fetchWeather = async (city: GeocodingResult) => {
    try {
      setLoadingWeather(true);
      setLoadingIntelligence(true);
      setIntelligenceError(null);
      setCustomPlanningResponse(null);
      setCustomQueryError(null);
      setCustomActivityQuery("");

      const lat = city.latitude;
      const lon = city.longitude;

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

      const weatherRes = await fetch(forecastUrl);
      if (!weatherRes.ok) {
        throw new Error(`Failed to download meteorological data: ${weatherRes.statusText}`);
      }
      const data: WeatherData = await weatherRes.json();
      setWeatherData(data);
      setLoadingWeather(false);

      // Save to local history
      updateRecentSearches(city);

      // Call our cognitive AI server middleware
      try {
        const locationName = `${city.name}, ${city.country || city.country_code || ""}`;
        const intelRes = await fetch("/api/weather/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName,
            current: data.current,
            daily: data.daily
          })
        });

        if (!intelRes.ok) {
          const errData = await intelRes.json();
          throw new Error(errData.error || "Failed to parse AI output");
        }

        const intelData: WeatherIntelligence = await intelRes.json();
        setIntelligence(intelData);
      } catch (apiErr: any) {
        console.warn("AI intelligence API failed, using rule-based compiling:", apiErr);
        setIntelligenceError(apiErr.message || "Failed to fetch from Gemini server.");
        // Resilient fallback triggers
        const fallbackIntel = getRuleBasedIntelligence(city, data.current, data.daily);
        setIntelligence(fallbackIntel);
      } finally {
        setLoadingIntelligence(false);
      }

    } catch (err: any) {
      console.error("Critical forecast fetch failure:", err);
      setLoadingWeather(false);
      setLoadingIntelligence(false);
    }
  };

  const handleCustomQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActivityQuery.trim() || !weatherData || !selectedCity) return;

    try {
      setLoadingCustomQuery(true);
      setCustomQueryError(null);
      setCustomPlanningResponse(null);

      const locationName = `${selectedCity.name}, ${selectedCity.country || selectedCity.country_code || ""}`;
      const res = await fetch("/api/weather/custom-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName,
          current: weatherData.current,
          daily: weatherData.daily,
          query: customActivityQuery
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Cognitive query processing failed");
      }

      const responseData: CustomPlanningResponse = await res.json();
      setCustomPlanningResponse(responseData);
    } catch (err: any) {
      console.warn("Custom planning failed. Invoking safe rule-based assessment:", err);
      setCustomQueryError(err.message || "An issue occurred. Direct fallback enabled.");
      // Fallback response block
      setCustomPlanningResponse({
        answer: `### Rule-Based Assessment for: "${customActivityQuery}"\n\nI was unable to establish a secure connection to the Gemini cognitive engine. However, based on our local rules: \n- **Current temperature** is ${weatherData.current.temperature_2m}°C.\n- **Rain chance** peaks at ${weatherData.daily.precipitation_probability_max[0]}%.\n- **Wind speed** is currently ${weatherData.current.wind_speed_10m} km/h.\n\nPlease evaluate these metrics directly when making your final decisions!`,
        isSuitable: weatherData.current.precipitation === 0 && weatherData.daily.precipitation_probability_max[0] < 45,
        score: weatherData.current.precipitation > 0 ? 15 : 75
      });
    } finally {
      setLoadingCustomQuery(false);
    }
  };

  const handleSuggestionClick = (city: GeocodingResult) => {
    setSelectedCity(city);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    fetchWeather(city);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    if (suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    } else if (searchQuery.trim().length >= 2) {
      const results = await fetchSuggestions(searchQuery);
      if (results && results.length > 0) {
        handleSuggestionClick(results[0]);
      } else {
        setSearchError("No results found. Please enter a correct city name.");
      }
    } else {
      setSearchError("Please enter a valid city name (at least 2 characters).");
    }
  };

  const currentWeatherDetails = weatherData 
    ? getWeatherDetails(weatherData.current.weather_code, weatherData.current.is_day === 1)
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#333] selection:text-white">
      
      {/* App Header */}
      <header className="border-b border-[#222] bg-[#050505] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#666] mb-1 font-semibold">Meteorological Intelligence</span>
            <h1 className="text-3xl font-serif italic text-white">Atlas / Forecast</h1>
          </div>

          {/* Unit Toggle Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCelsius(!isCelsius)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111] border border-[#222] hover:border-[#333] transition duration-150 text-xs text-[#888] hover:text-white font-medium font-mono"
            >
              <Sliders className="w-3.5 h-3.5 text-[#666]" />
              <span>Unit: {isCelsius ? "°C" : "°F"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Search controls & history row */}
        <section className="mb-8" ref={containerRef}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Search Input Box */}
            <form onSubmit={handleFormSubmit} className="relative lg:col-span-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                <input
                  type="text"
                  placeholder="Search city (e.g. Reykjavik, Iceland)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-[#111] border border-[#333] focus:border-[#555] rounded-full py-3 pl-11 pr-4 text-sm text-[#e0e0e0] placeholder-[#444] focus:outline-none transition duration-200"
                />
              </div>

              {/* Suggestions Popup Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 mt-2 bg-[#0c0c0c] border border-[#222] rounded-2xl overflow-hidden shadow-2xl z-40 divide-y divide-[#1a1a1a]/40"
                  >
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full text-left px-4 py-3 hover:bg-[#111] transition duration-150 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-white group-hover:scale-110 transition duration-150 shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-white">{item.name}</span>
                            {item.admin1 && (
                              <span className="text-xs text-[#666] ml-1.5">
                                {item.admin1}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.country && (
                            <span className="text-xs font-medium text-[#888] bg-[#050505] px-2 py-0.5 rounded border border-[#1a1a1a]">
                              {item.country}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-[#444] group-hover:translate-x-0.5 transition duration-150" />
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incorrect City Error Notice */}
              <AnimatePresence>
                {searchError && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 right-0 mt-2 bg-red-950/20 border border-red-900/40 text-red-300 text-xs px-5 py-3 rounded-2xl flex items-center gap-2.5 z-40"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{searchError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Quick-switch recent searches list */}
            <div className="lg:col-span-4 flex items-center overflow-x-auto gap-2 py-1 scrollbar-none">
              {recentSearches.length > 0 ? (
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#666] flex items-center gap-1 shrink-0 select-none font-semibold">
                    <History className="w-3 h-3" /> Recent:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {recentSearches.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setSelectedCity(city);
                          fetchWeather(city);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition shrink-0 duration-150 ${
                          selectedCity?.id === city.id
                            ? "bg-[#111] border-[#555] text-white font-medium"
                            : "bg-[#0c0c0c] border-[#1a1a1a] text-[#888] hover:text-white hover:border-[#333]"
                        }`}
                      >
                        <span className="truncate max-w-[80px]">{city.name}</span>
                        <XCircle
                          onClick={(e) => removeRecentSearch(e, city.id)}
                          className="w-3 h-3 text-[#444] hover:text-white shrink-0 transition"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#555] flex items-center gap-1.5 font-mono select-none">
                  <Info className="w-3.5 h-3.5 text-[#444]" /> Search a city to initialize recommendations
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Primary Dash Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT METEOROLOGICAL MODULE: 7 columns */}
          <section className="lg:col-span-7 space-y-6">
            
            {loadingWeather ? (
              // Loading Skeleton - Weather Card
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-64 animate-pulse flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-32 bg-slate-800 rounded" />
                  <div className="h-14 w-28 bg-slate-800 rounded" />
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-24 bg-slate-800 rounded" />
                  <div className="h-10 w-24 bg-slate-800 rounded" />
                  <div className="h-10 w-24 bg-slate-800 rounded" />
                </div>
              </div>
            ) : weatherData && selectedCity && currentWeatherDetails ? (
              <div className="space-y-8">
                {/* Current Weather Hero */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 py-4">
                  <div>
                    <h2 className="text-7xl font-light text-white tracking-tight">{selectedCity.name}</h2>
                    <p className="text-xl text-[#888] mt-2">
                      {currentWeatherDetails.label} &middot; {Math.abs(selectedCity.latitude).toFixed(4)}° {selectedCity.latitude >= 0 ? "N" : "S"}, {Math.abs(selectedCity.longitude).toFixed(4)}° {selectedCity.longitude >= 0 ? "E" : "W"}
                    </p>
                  </div>
                  <div className="text-right self-start md:self-auto">
                    <span className="text-9xl font-thin text-white tracking-tighter leading-none">
                      {Math.round(isCelsius ? weatherData.current.temperature_2m : (weatherData.current.temperature_2m * 9) / 5 + 32)}°
                    </span>
                    <p className="text-sm uppercase tracking-widest text-[#666] mt-4">
                      Feels like {Math.round(isCelsius ? weatherData.current.apparent_temperature : (weatherData.current.apparent_temperature * 9) / 5 + 32)}°
                    </p>
                  </div>
                </div>

                {/* Detailed Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#222] border border-[#222] rounded-xl overflow-hidden">
                  <div className="bg-[#0a0a0a] p-5">
                    <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Humidity</p>
                    <p className="text-2xl font-light text-white">{weatherData.current.relative_humidity_2m}%</p>
                  </div>
                  <div className="bg-[#0a0a0a] p-5">
                    <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Wind Speed</p>
                    <p className="text-2xl font-light text-white">{weatherData.current.wind_speed_10m} km/h</p>
                  </div>
                  <div className="bg-[#0a0a0a] p-5">
                    <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Wind Direction</p>
                    <p className="text-2xl font-light text-white">{windDirection(weatherData.current.wind_direction_10m)}</p>
                  </div>
                  <div className="bg-[#0a0a0a] p-5">
                    <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Pressure</p>
                    <p className="text-2xl font-light text-white">{weatherData.current.pressure_msl} hPa</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Smart Secondary Metrics Grid */}
            {weatherData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Max UV Index widget */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4 flex flex-col justify-between h-28 hover:border-[#333] transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] flex items-center gap-1.5 font-bold">
                      <Sun className="w-3.5 h-3.5 text-white" /> UV Index
                    </span>
                    <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-[#111] border border-[#222]">
                      MAX
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white mt-1">
                      {weatherData.daily.uv_index_max[0]}
                    </p>
                    <p className="text-[10px] text-[#555] mt-0.5 truncate font-medium">
                      {weatherData.daily.uv_index_max[0] >= 6 ? "SPF 30+ recommended" : "Low risk of burn"}
                    </p>
                  </div>
                </div>

                {/* Rain Probability Card */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4 flex flex-col justify-between h-28 hover:border-[#333] transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] flex items-center gap-1.5 font-bold">
                      <Umbrella className="w-3.5 h-3.5 text-white" /> Rain Prob.
                    </span>
                    <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-[#111] border border-[#222]">
                      MAX
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white mt-1">
                      {weatherData.daily.precipitation_probability_max[0]}%
                    </p>
                    <p className="text-[10px] text-[#555] mt-0.5 truncate font-medium">
                      {weatherData.daily.precipitation_sum[0]} mm accumulated
                    </p>
                  </div>
                </div>

                {/* Wind Peak Card */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4 flex flex-col justify-between h-28 hover:border-[#333] transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] flex items-center gap-1.5 font-bold">
                      <Wind className="w-3.5 h-3.5 text-white" /> Max Gusts
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white mt-1">
                      {Math.round(weatherData.daily.wind_speed_10m_max[0])} <span className="text-xs text-[#555]">km/h</span>
                    </p>
                    <p className="text-[10px] text-[#555] mt-0.5 truncate font-medium">
                      Strongest winds at midday
                    </p>
                  </div>
                </div>

                {/* Sunrise / Sunset Card */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4 flex flex-col justify-between h-28 hover:border-[#333] transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-white" /> Daylight
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-center">
                      <p className="text-[10px] font-mono uppercase text-[#444] flex items-center justify-center gap-0.5">
                        Rise
                      </p>
                      <p className="text-xs font-semibold text-white font-mono mt-0.5">
                        {new Date(weatherData.daily.sunrise[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="h-6 w-px bg-[#222]" />
                    <div className="text-center">
                      <p className="text-[10px] font-mono uppercase text-[#444] flex items-center justify-center gap-0.5">
                        Set
                      </p>
                      <p className="text-xs font-semibold text-white font-mono mt-0.5">
                        {new Date(weatherData.daily.sunset[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 7-DAY FORECAST PANEL */}
            {weatherData && (
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-3xl p-6 flex flex-col">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#555] mb-6 font-bold">Extended Forecast</h3>
                <div className="space-y-1 flex-1">
                  {weatherData.daily.time.map((time, idx) => {
                    const dayName = new Date(time).toLocaleDateString([], { weekday: "long" });
                    const isToday = idx === 0;
                    const code = weatherData.daily.weather_code[idx];
                    const details = getWeatherDetails(code, idx === 0);
                    const high = weatherData.daily.temperature_2m_max[idx];
                    const low = weatherData.daily.temperature_2m_min[idx];

                    return (
                      <div key={time} className="flex justify-between items-center py-4 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-sm font-medium text-white w-16">{isToday ? "Today" : dayName.slice(0, 3)}</span>
                        <span className="text-xs text-[#555] italic">{details.label}</span>
                        <div className="flex gap-4 text-sm font-mono">
                          <span className="text-white">{formatTemp(high, isCelsius)}</span>
                          <span className="text-[#444]">{formatTemp(low, isCelsius)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </section>

          {/* RIGHT INTELLIGENCE MODULE: 5 columns */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Main AI Intelligence Card */}
            <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-3xl overflow-hidden relative">
              
              {/* Card Header */}
              <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  <h2 className="text-xs uppercase tracking-[0.2em] text-[#555] font-bold">
                    Cognitive Weather Intelligence
                  </h2>
                </div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#555] px-2.5 py-0.5 rounded bg-[#111] border border-[#222] shrink-0">
                  Engine Connected
                </div>
              </div>
 
              {/* Body Content */}
              <div className="p-6 space-y-6">
                {loadingIntelligence ? (
                  // Loading indicator
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border border-t-white border-[#222] rounded-full animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-white">Generating AI Recommendations...</p>
                      <p className="text-xs text-[#555] font-mono">Evaluating humidity, UV indices, and precipitation trends</p>
                    </div>
                  </div>
                ) : intelligence ? (
                  
                  <div className="space-y-6">
                    
                    {/* Visual notice if falling back to rule-based */}
                    {intelligenceError && (
                      <div className="p-3.5 bg-[#111] border border-amber-900/40 rounded-xl text-amber-300 text-xs flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <div>
                          <p className="font-semibold">Local Backup Engine Active</p>
                          <p className="text-[#888] mt-0.5 text-[11px]">Gemini client is temporarily using local meteorological heuristics.</p>
                        </div>
                      </div>
                    )}
 
                    {/* AI Summary paragraph */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-4">
                      <p className="text-sm text-[#888] leading-relaxed font-sans italic">
                        "{intelligence.summary}"
                      </p>
                    </div>
 
                    {/* Clothing recommendations timeline */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 font-sans">
                        <Shirt className="w-4 h-4 text-white" /> Recommended Wear Guide
                      </h3>
 
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-[#050505] p-3.5 rounded-lg border border-[#1a1a1a]">
                          <p className="text-[9px] font-mono text-[#555] uppercase tracking-wider">Morning</p>
                          <p className="text-xs text-[#888] mt-1 font-sans">{intelligence.clothing.morning}</p>
                        </div>
                        <div className="bg-[#050505] p-3.5 rounded-lg border border-[#1a1a1a]">
                          <p className="text-[9px] font-mono text-[#555] uppercase tracking-wider">Afternoon</p>
                          <p className="text-xs text-[#888] mt-1 font-sans">{intelligence.clothing.afternoon}</p>
                        </div>
                        <div className="bg-[#050505] p-3.5 rounded-lg border border-[#1a1a1a]">
                          <p className="text-[9px] font-mono text-[#555] uppercase tracking-wider">Evening</p>
                          <p className="text-xs text-[#888] mt-1 font-sans">{intelligence.clothing.evening}</p>
                        </div>
                      </div>
 
                      <div className="bg-[#050505] p-3.5 rounded-lg border border-[#1a1a1a] text-xs text-[#666]">
                        <span className="font-bold text-white">Accessory Advice:</span> {intelligence.clothing.general}
                      </div>
                    </div>
 
                    {/* Suitability of Activities list */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 font-sans">
                        <Sliders className="w-4 h-4 text-white" /> Activity Suitability Ratings
                      </h3>
 
                      <div className="grid grid-cols-1 gap-3">
                        {intelligence.activities.map((act) => {
                          const barColor = act.score >= 80 
                            ? "bg-emerald-500/80" 
                            : act.score >= 50 
                            ? "bg-amber-500/80" 
                            : "bg-rose-500/80";
                          
                          const textClass = act.score >= 80 
                            ? "text-emerald-400 bg-emerald-950/20" 
                            : act.score >= 50 
                            ? "text-amber-400 bg-amber-950/20" 
                            : "text-rose-400 bg-rose-950/20";
 
                          return (
                            <div key={act.name} className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">{act.name}</span>
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-[#222] ${textClass}`}>
                                  {act.score}% Match
                                </span>
                              </div>
                              
                              {/* Custom progress bar */}
                              <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${act.score}%` }} />
                              </div>
 
                              <p className="text-xs text-[#666] leading-relaxed font-sans">{act.explanation}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
 
                    {/* Alerts and Highlights */}
                    {intelligence.safetyAlerts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-mono tracking-wider uppercase text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Severe Advisories
                        </h4>
                        <div className="space-y-1.5">
                          {intelligence.safetyAlerts.map((alert, i) => (
                            <div key={i} className="text-xs p-3 bg-rose-950/20 border border-rose-900/20 rounded-lg text-rose-300 font-medium">
                              {alert}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Best exploration window */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4.5 h-4.5 text-[#888] shrink-0" />
                        <div>
                          <p className="text-[10px] font-mono uppercase text-[#555] tracking-widest">Optimal Window</p>
                          <p className="text-xs font-semibold text-[#888] mt-0.5">{intelligence.bestTime}</p>
                        </div>
                      </div>
                    </div>
 
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#555] text-xs">
                    No intelligence loaded. Initiate search.
                  </div>
                )}
              </div>
            </div>
 
            {/* INTERACTIVE AI CUSTOM PLANNER QUERY MODULE */}
            {weatherData && selectedCity && (
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-white" />
                    <h3 className="text-xs uppercase tracking-[0.2em] text-[#555] font-bold">
                      Ask AI Planner
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#555] bg-[#050505] px-2 py-0.5 rounded border border-[#222]">
                    Custom Query
                  </span>
                </div>
 
                <p className="text-xs text-[#555] leading-relaxed font-sans">
                  Type any custom activity (e.g. "Is Saturday good for a backyard BBQ?", "Can I wash my car tomorrow?", "Best day to paint my fence?") to get a tailored intelligence briefing.
                </p>
 
                <form onSubmit={handleCustomQuerySubmit} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ask about Saturday BBQ, hiking, etc..."
                    value={customActivityQuery}
                    onChange={(e) => setCustomActivityQuery(e.target.value)}
                    disabled={loadingCustomQuery}
                    className="flex-1 bg-[#050505] border border-[#1a1a1a] focus:border-[#333] rounded-xl px-4 py-3 text-xs text-white placeholder-[#444] focus:outline-none focus:ring-0 transition"
                  />
                  <button
                    type="submit"
                    disabled={loadingCustomQuery || !customActivityQuery.trim()}
                    className="bg-white hover:bg-slate-200 disabled:bg-[#111] disabled:text-[#444] font-semibold px-4 py-3 rounded-xl text-black text-xs flex items-center gap-1.5 transition shrink-0"
                  >
                    {loadingCustomQuery ? (
                      <div className="w-3.5 h-3.5 border border-t-black border-[#222] rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Submit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
 
                {/* AI Planner Analysis Panel Response */}
                <AnimatePresence>
                  {loadingCustomQuery && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl text-center space-y-2"
                    >
                      <div className="flex items-center justify-center gap-2 text-xs text-[#555]">
                        <div className="w-3 h-3 border border-t-[#888] border-[#222] rounded-full animate-spin" />
                        <span className="font-mono">Analyzing precipitation vectors & UV metrics...</span>
                      </div>
                    </motion.div>
                  )}
 
                  {!loadingCustomQuery && customPlanningResponse && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl space-y-4"
                    >
                      {/* Dial Suitability bar */}
                      <div className="flex items-center justify-between border-b border-[#111] pb-3">
                        <div className="flex items-center gap-2">
                          {customPlanningResponse.isSuitable ? (
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4.5 h-4.5 text-rose-400" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-white">
                              {customPlanningResponse.isSuitable ? "Recommended Conditions" : "Unfavorable Conditions"}
                            </span>
                          </div>
                        </div>
 
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          customPlanningResponse.isSuitable 
                            ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40" 
                            : "text-rose-400 bg-rose-950/20 border-rose-900/40"
                        }`}>
                          {customPlanningResponse.score}% Match Score
                        </span>
                      </div>
 
                      {/* Display Markdown Answers */}
                      <div className="space-y-1 text-[#888] text-xs leading-relaxed">
                        {parseMarkdown(customPlanningResponse.answer)}
                      </div>
 
                    </motion.div>
                  )}
                </AnimatePresence>
 
              </div>
            )}
 
          </section>
 
        </div>
 
      </main>
 
      {/* Atmospheric Footer credit */}
      <footer className="border-t border-[#111] mt-24 py-8 text-center">
        <p className="text-[10px] text-[#444] font-mono tracking-wider uppercase">
          Weather data curated from Open-Meteo &bull; AI cognitive processing managed server-side with Gemini 3.5 Flash
        </p>
      </footer>
 
    </div>
  );
}
