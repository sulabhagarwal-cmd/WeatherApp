import React from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  LucideIcon
} from "lucide-react";

export interface WeatherDetail {
  label: string;
  icon: LucideIcon;
  bgGradient: string;
  accentColor: string;
}

export function getWeatherDetails(code: number, isDay: boolean = true): WeatherDetail {
  // Map WMO codes to friendly text, Lucide icons, and visual gradients
  switch (code) {
    case 0:
      return {
        label: isDay ? "Sunny" : "Clear Sky",
        icon: Sun,
        bgGradient: isDay 
          ? "from-amber-500/20 via-orange-500/10 to-slate-950" 
          : "from-indigo-950 via-slate-900 to-slate-950",
        accentColor: "text-amber-400",
      };
    case 1:
    case 2:
      return {
        label: isDay ? "Mainly Clear" : "Partly Cloudy",
        icon: CloudSun,
        bgGradient: "from-sky-500/10 via-slate-900 to-slate-950",
        accentColor: "text-sky-300",
      };
    case 3:
      return {
        label: "Overcast",
        icon: Cloud,
        bgGradient: "from-slate-700/20 via-slate-900 to-slate-950",
        accentColor: "text-slate-400",
      };
    case 45:
    case 48:
      return {
        label: "Foggy",
        icon: Cloud,
        bgGradient: "from-slate-800/30 via-slate-900 to-slate-950",
        accentColor: "text-slate-500",
      };
    case 51:
    case 53:
    case 55:
      return {
        label: "Drizzle",
        icon: CloudDrizzle,
        bgGradient: "from-teal-600/15 via-slate-900 to-slate-950",
        accentColor: "text-teal-400",
      };
    case 56:
    case 57:
    case 66:
    case 67:
      return {
        label: "Freezing Rain",
        icon: CloudSnow,
        bgGradient: "from-cyan-700/20 via-slate-900 to-slate-950",
        accentColor: "text-cyan-300",
      };
    case 61:
    case 63:
    case 65:
      return {
        label: "Rainy",
        icon: CloudRain,
        bgGradient: "from-blue-600/20 via-slate-900 to-slate-950",
        accentColor: "text-blue-400",
      };
    case 71:
    case 73:
    case 75:
    case 77:
      return {
        label: "Snowy",
        icon: Snowflake,
        bgGradient: "from-sky-100/10 via-slate-900 to-slate-950",
        accentColor: "text-sky-100",
      };
    case 80:
    case 81:
    case 82:
      return {
        label: "Rain Showers",
        icon: CloudRain,
        bgGradient: "from-indigo-600/20 via-slate-900 to-slate-950",
        accentColor: "text-indigo-400",
      };
    case 85:
    case 86:
      return {
        label: "Snow Showers",
        icon: Snowflake,
        bgGradient: "from-cyan-100/10 via-slate-900 to-slate-950",
        accentColor: "text-cyan-100",
      };
    case 95:
    case 96:
    case 99:
      return {
        label: "Thunderstorm",
        icon: CloudLightning,
        bgGradient: "from-violet-700/20 via-slate-900 to-slate-950",
        accentColor: "text-violet-400",
      };
    default:
      return {
        label: "Moderate Weather",
        icon: Cloud,
        bgGradient: "from-slate-800/15 via-slate-900 to-slate-950",
        accentColor: "text-slate-300",
      };
  }
}

export function formatTemp(celsius: number, isCelsius: boolean): string {
  if (isCelsius) {
    return `${Math.round(celsius)}°C`;
  }
  const fahrenheit = (celsius * 9) / 5 + 32;
  return `${Math.round(fahrenheit)}°F`;
}

export function windDirection(degree: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(((degree % 360) / 22.5)) % 16;
  return directions[index];
}

export function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  
  return lines.map((line, i) => {
    // Process bold segments: **text**
    let content: React.ReactNode = line;
    const boldRegex = /\*\*(.*?)\*\*/g;
    if (line.match(boldRegex)) {
      const parts = line.split(boldRegex);
      content = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="text-cyan-300 font-semibold">{part}</strong>;
        }
        return part;
      });
    }

    if (line.startsWith("### ")) {
      return (
        <h4 key={i} className="text-sm font-bold text-slate-100 mt-3 mb-1 font-sans">
          {line.replace("### ", "")}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="text-base font-bold text-cyan-400 mt-4 mb-2 border-b border-slate-800/60 pb-1 font-sans">
          {line.replace("## ", "")}
        </h3>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      // Remove leader
      const cleanLine = line.replace(/^[-*]\s+/, "");
      // Re-bold checking on clean line
      let innerContent: React.ReactNode = cleanLine;
      if (cleanLine.match(boldRegex)) {
        const parts = cleanLine.split(boldRegex);
        innerContent = parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={index} className="text-cyan-300 font-semibold">{part}</strong>;
          }
          return part;
        });
      }
      return (
        <div key={i} className="flex items-start gap-2.5 my-1.5 pl-1.5">
          <span className="text-cyan-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0 shadow-sm shadow-cyan-500" />
          <span className="text-sm text-slate-300 leading-relaxed font-sans">{innerContent}</span>
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-1.5" />;
    }
    return (
      <p key={i} className="text-sm text-slate-300 leading-relaxed my-1.5 font-sans">
        {content}
      </p>
    );
  });
}
