export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country_code?: string;
  timezone: string;
  country?: string;
  admin1?: string;
  admin2?: string;
}

export interface CurrentWeather {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current: CurrentWeather;
  daily: DailyWeather;
}

export interface ActivityRecommendation {
  name: string;
  score: number; // 0 to 100
  explanation: string;
}

export interface ClothingRecommendation {
  morning: string;
  afternoon: string;
  evening: string;
  general: string;
}

export interface WeatherIntelligence {
  summary: string;
  clothing: ClothingRecommendation;
  activities: ActivityRecommendation[];
  safetyAlerts: string[];
  bestTime: string;
}

export interface CustomPlanningResponse {
  answer: string;
  isSuitable: boolean;
  score: number;
}
