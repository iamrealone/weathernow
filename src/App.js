import React, { useEffect, useState, useRef } from "react";

// WeatherNow - Single-file React + Tailwind prototype
// Uses Open-Meteo Geocoding + Forecast APIs (no API key)

export default function WeatherNow() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState({
    name: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    country: "US",
  });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([
    { name: "Denver", lat: 39.7392, lon: -104.9903 },
    { name: "Bali", lat: -8.4095, lon: 115.1889 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  ]);

  const searchTimeout = useRef(null);

  // --- Helpers ---
  async function geocode(q) {
    if (!q) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=6&language=en&format=json`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.error("geocode error", e);
      return [];
    }
  }

  async function fetchWeather(lat, lon) {
    setLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation,weathercode,windspeed_10m,winddirection_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode&timezone=auto`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data);
    } catch (e) {
      console.error("fetchWeather error", e);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch + whenever location changes
  useEffect(() => {
    fetchWeather(location.lat, location.lon);
  }, [location.lat, location.lon]);

  // Autocomplete with debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const res = await geocode(query);
      setSuggestions(
        res.map((r) => ({
          name:
            r.name +
            (r.admin1 ? ", " + r.admin1 : "") +
            (r.country ? ", " + r.country : ""),
          lat: r.latitude,
          lon: r.longitude,
        }))
      );
    }, 300);
  }, [query]);

  // --- Handlers ---
  function handleSelectSuggestion(s) {
    setLocation({ name: s.name, lat: s.lat, lon: s.lon });
    setSuggestions([]);
    setQuery("");
  }

  function handleFavoriteClick(f) {
    setLocation({ name: f.name, lat: f.lat, lon: f.lon });
  }

  function handleAddFavorite() {
    if (!favorites.find((f) => f.name === location.name)) {
      setFavorites([...favorites, location]);
    }
  }

  // --- Helpers ---
  const weatherCodeMap = {
    0: { label: "Clear", icon: "☀️" },
    1: { label: "Mainly clear", icon: "🌤" },
    2: { label: "Partly cloudy", icon: "⛅" },
    3: { label: "Overcast", icon: "☁️" },
    45: { label: "Fog", icon: "🌫" },
    48: { label: "Rime fog", icon: "🌫" },
    51: { label: "Drizzle", icon: "🌦" },
    61: { label: "Rain", icon: "🌧" },
    80: { label: "Showers", icon: "🌦" },
    95: { label: "Thunderstorm", icon: "⛈" },
  };

  function backgroundForCurrent() {
    if (!weather?.current_weather)
      return "bg-gradient-to-b from-sky-200 to-indigo-400";
    const code = weather.current_weather.weathercode;
    const hour = new Date(weather.current_weather.time).getHours();
    const isNight = hour < 6 || hour >= 19;
    if (isNight)
      return "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900";
    if (code === 0 || code === 1)
      return "bg-gradient-to-b from-yellow-200 via-amber-300 to-sky-400";
    if (code === 2 || code === 3)
      return "bg-gradient-to-b from-slate-300 via-slate-400 to-sky-500";
    if ([51, 61, 80, 95].includes(code))
      return "bg-gradient-to-b from-blue-400 via-sky-500 to-indigo-700";
    return "bg-gradient-to-b from-sky-200 to-indigo-400";
  }

  function Sparkline({ data = [] }) {
  if (!data.length) return null;

  const width = 260;
  const height = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);

  const scaleX = (i) => (i / (data.length - 1)) * width;
  const scaleY = (d) =>
    height - ((d - min) / (max - min || 1)) * (height - 30) - 15;

  const pathData = data
    .map((d, i) => {
      const x = scaleX(i);
      const y = scaleY(d);
      if (i === 0) return `M ${x},${y}`;
      const prevX = scaleX(i - 1);
      const prevY = scaleY(data[i - 1]);
      const midX = (prevX + x) / 2;
      return `C ${midX},${prevY} ${midX},${y} ${x},${y}`;
    })
    .join(" ");

  // Helper: slope angle
  const getAngle = (i) => {
    if (i === 0) return 0;
    const dx = scaleX(i) - scaleX(i - 1);
    const dy = scaleY(data[i]) - scaleY(data[i - 1]);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto text-white"
    >
      <defs>
        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Shaded fill */}
      <path
        d={`${pathData} L ${width},${height} L 0,${height} Z`}
        fill="url(#tempGradient)"
      />

      {/* Smooth curve */}
      <path
        d={pathData}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots + Tilted Labels */}
      {data.map((d, i) => {
        const x = scaleX(i);
        const y = scaleY(d);
        const rounded = Math.round(d);
        const angle = getAngle(i);

        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="white" />
            {i % 4 === 0 && (
              <text
                x={x}
                y={y - 12}
                fontSize="11"
                textAnchor="middle"
                transform={`rotate(${angle}, ${x}, ${y - 12})`}
                className="fill-white drop-shadow"
              >
                {rounded}°
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
  // --- Render ---
  const current = weather?.current_weather;
  const hourly = weather?.hourly;
  const daily = weather?.daily;

  return (
    <div
      className={`min-h-screen p-6 ${backgroundForCurrent()} transition-colors duration-700`}
    >
      <div className="max-w-xl mx-auto relative">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 shadow-2xl">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city..."
                className="w-full rounded-xl px-4 py-3 pl-12 text-lg placeholder-slate-200 bg-white/8 border border-white/10"
              />
              <svg
                className="w-6 h-6 absolute left-3 top-3 text-white/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 3.5a7.5 7.5 0 0013.15 13.15z"
                />
              </svg>
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2 bg-white/6 rounded-xl p-2 border border-white/10">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-white/6"
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* Favorites */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {favorites.map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFavoriteClick(f)}
                  className="px-3 py-2 rounded-full bg-white/6 border border-white/10 text-sm"
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current Weather */}
          <div className="rounded-xl p-5 bg-white/6 border border-white/10 flex gap-4 items-center">
            <div className="flex-1">
              <div className="text-sm text-white/80">{location.name}</div>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-6xl font-extrabold text-white drop-shadow-lg">
                  {current ? Math.round(current.temperature) + "°C" : "--°C"}
                </div>
                <div>
                  <div className="text-white/90 text-xl">
                    {current
                      ? weatherCodeMap[current.weathercode]?.icon || "🌥"
                      : "—"}
                    <span className="ml-2 text-white/90">
                      {current
                        ? weatherCodeMap[current.weathercode]?.label || ""
                        : "Loading"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white/80 flex gap-3">
                    <div>
                      Feels{" "}
                      <strong>
                        {hourly?.temperature_2m
                          ? Math.round(hourly.temperature_2m[0]) + "°C"
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      Wind{" "}
                      <strong>
                        {current
                          ? Math.round(current.windspeed) + " km/h"
                          : "—"}
                      </strong>
                    </div>
                    <div>Humidity <strong>—</strong></div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs text-white/80">Next 24h</div>
                <div className="mt-2">
                  <Sparkline data={(hourly?.temperature_2m || []).slice(0, 24)} />
                </div>
              </div>
            </div>
            <div className="w-28 h-28 flex items-center justify-center rounded-xl bg-white/6 border border-white/10">
              <div className="text-4xl">
                {current
                  ? weatherCodeMap[current.weathercode]?.icon || "🌥"
                  : "☀️"}
              </div>
            </div>
          </div>

          {/* Hourly Forecast */}
          <div className="mt-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 w-max">
              {(hourly?.time || []).slice(0, 12).map((t, i) => {
                const date = new Date(t);
                const hourLabel =
                  date.getHours() === 0
                    ? "12 AM"
                    : date.getHours() < 12
                    ? `${date.getHours()} AM`
                    : `${
                        date.getHours() === 12
                          ? 12
                          : date.getHours() - 12
                      } PM`;
                const temp = Math.round(hourly.temperature_2m[i]);
                const p = Math.round((hourly.precipitation || [])[i] || 0);
                const wcode = (hourly.weathercode || [])[i] || 0;
                return (
                  <div
                    key={i}
                    className="min-w-[88px] bg-white/5 border border-white/8 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-white/80">{hourLabel}</div>
                    <div className="text-2xl mt-2">
                      {weatherCodeMap[wcode]?.icon || "🌥"}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{temp}°</div>
                    <div className="text-xs mt-1 text-white/70">{p}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-day Forecast */}
          <div className="mt-4 p-3 bg-white/5 border border-white/8 rounded-lg">
            <div className="grid grid-cols-1 gap-2">
              {(daily?.time || []).slice(0, 7).map((d, idx) => {
                const date = new Date(d);
                const weekday = date.toLocaleDateString(undefined, {
                  weekday: "short",
                });
                const hi = Math.round((daily.temperature_2m_max || [])[idx]);
                const lo = Math.round((daily.temperature_2m_min || [])[idx]);
                const wcode = (daily.weathercode || [])[idx] || 0;
                const sunrise = (daily.sunrise || [])[idx];
                const sunset = (daily.sunset || [])[idx];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-sm text-white/80">
                        {weekday}
                      </div>
                      <div className="text-2xl">
                        {weatherCodeMap[wcode]?.icon || "⛅"}
                      </div>
                      <div className="text-sm text-white/80 ml-2">
                        {new Date(sunrise).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ·{" "}
                        {new Date(sunset).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-sm text-white/90">
                      {hi}° / {lo}°
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between text-sm text-white/80">
            <div>
              Updated:{" "}
              {current ? new Date(current.time).toLocaleTimeString() : "—"}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-3 py-2 rounded-full bg-white/6 border border-white/10"
                onClick={handleAddFavorite}
              >
                Add Favorite
              </button>
              <button
                className="px-3 py-2 rounded-full bg-white/6 border border-white/10"
                onClick={() => fetchWeather(location.lat, location.lon)}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/30 backdrop-blur rounded-full px-4 py-2 text-white">
                Loading…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
