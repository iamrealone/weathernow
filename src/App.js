import React, { useEffect, useState, useRef } from "react";
import { Player } from "@lottiefiles/react-lottie-player";

// Import your Lottie JSON files
import sunnyAnim from "./assets/lotties/sunny.json";
import rainAnim from "./assets/lotties/rainy.json";
import cloudyAnim from "./assets/lotties/cloudy.json";
import snowAnim from "./assets/lotties/snowy.json";
import thunderAnim from "./assets/lotties/thunder.json";

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
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(q) +
      "&count=6&language=en&format=json";
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  async function fetchWeather(lat, lon) {
    setLoading(true);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&hourly=temperature_2m,precipitation,weathercode,windspeed_10m,relativehumidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode,precipitation_sum` +
      `&timezone=auto`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data);
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(location.lat, location.lon);
  }, [location.lat, location.lon]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const results = await geocode(query);
      setSuggestions(
        results.map((r) => ({
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
  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "WeatherNow",
        text: `Check out the weather in ${location.name}`,
        url: window.location.href,
      });
    } else {
      alert("Sharing not supported in this browser.");
    }
  }
  function handleRefresh() {
    fetchWeather(location.lat, location.lon);
  }

  // WeatherCode → Animations
  const weatherCodeMap = {
  0: { label: "Clear", anim: sunnyAnim },
  1: { label: "Mainly Clear", anim: sunnyAnim },
  2: { label: "Partly Cloudy", anim: cloudyAnim },
  3: { label: "Overcast", anim: cloudyAnim },
  45: { label: "Fog", anim: cloudyAnim },
  48: { label: "Depositing Rime Fog", anim: cloudyAnim },
  51: { label: "Light Drizzle", anim: rainyAnim },
  61: { label: "Rain", anim: rainyAnim },
  71: { label: "Snowfall", anim: snowyAnim },
  80: { label: "Rain Showers", anim: rainyAnim },
  95: { label: "Thunderstorm", anim: thunderAnim },   // 👈 add this
  96: { label: "Thunderstorm w/ Hail", anim: thunderAnim }, // 👈 add this
  99: { label: "Thunderstorm w/ Heavy Hail", anim: thunderAnim }, // 👈 add this
  };


  // Background themes
  function backgroundForCurrentKey() {
    if (!weather?.current_weather) return "sunny";
    const code = weather.current_weather.weathercode;
    const hour = new Date(weather.current_weather.time).getHours();
    const isNight = hour < 6 || hour >= 19;
    if ([71].includes(code)) return "snow";
    if ([61, 80, 95].includes(code)) return "rain";
    if ([2, 3, 45, 48].includes(code)) return "cloudy";
    if (code === 0 || code === 1) return "sunny";
    if (!isNight) return "good";
    return "night";
  }

  const themes = {
    sunny: {
      bgClass: "bg-gradient-to-b from-yellow-200 via-amber-300 to-sky-400",
      curveColor: "#ffffff",
      tooltipBg: "bg-black/80 text-white",
      favClass: "bg-amber-200 text-amber-900 hover:bg-amber-300",
    },
    rain: {
      bgClass: "bg-gradient-to-b from-gray-700 via-gray-800 to-black",
      curveColor: "#ffffff",
      tooltipBg: "bg-white/90 text-black",
      favClass: "bg-gray-800 text-white hover:bg-gray-700",
    },
    cloudy: {
      bgClass: "bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400",
      curveColor: "#111827",
      tooltipBg: "bg-gray-900 text-white",
      favClass: "bg-gray-300 text-gray-800 hover:bg-gray-400",
    },
    snow: {
      bgClass: "bg-gradient-to-b from-white via-slate-100 to-blue-100",
      curveColor: "#1E3A8A",
      tooltipBg: "bg-blue-900 text-white",
      favClass: "bg-blue-100 text-blue-900 hover:bg-blue-200",
    },
    good: {
      bgClass: "bg-gradient-to-b from-green-200 via-green-400 to-green-600",
      curveColor: "#ffffff",
      tooltipBg: "bg-black/80 text-white",
      favClass: "bg-green-200 text-green-900 hover:bg-green-300",
    },
    night: {
      bgClass: "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900",
      curveColor: "#ffffff",
      tooltipBg: "bg-white/90 text-black",
      favClass: "bg-gray-800 text-white hover:bg-gray-700",
    },
  };

  const bgKey = backgroundForCurrentKey();
  const theme = themes[bgKey] || themes.sunny;

  // Sparkline
  function Sparkline({ data = [] }) {
    const svgRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    if (!data.length) return null;

    const width = 420;
    const height = 110;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = (i) => {
      const x = (i / (data.length - 1)) * width;
      const y =
        height - ((data[i] - min) / (max - min || 1)) * (height - 40) - 20;
      return { x, y };
    };

    const pathData = data
      .map((d, i) => {
        const { x, y } = points(i);
        if (i === 0) return `M ${x},${y}`;
        const { x: px, y: py } = points(i - 1);
        const midX = (px + x) / 2;
        return `C ${midX},${py} ${midX},${y} ${x},${y}`;
      })
      .join(" ");

    function handleMove(e) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.round((x / width) * (data.length - 1));
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      const { x: px, y: py } = points(clamped);
      setTooltip({
        left: px,
        top: py - 30,
        value: Math.round(data[clamped]),
      });
    }
    function handleLeave() {
      setTooltip(null);
    }

    return (
      <div className="relative w-full">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="mx-auto"
        >
          <path
            d={pathData}
            fill="none"
            stroke={theme.curveColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.left,
              top: tooltip.top,
              transform: "translate(-50%,-100%)",
            }}
            className={`px-2 py-1 rounded text-xs shadow ${theme.tooltipBg}`}
          >
            {tooltip.value}°C
          </div>
        )}
      </div>
    );
  }

  const current = weather?.current_weather;
  const hourly = weather?.hourly;
  const daily = weather?.daily;

  return (
    <div
      className={`min-h-screen p-6 ${theme.bgClass} transition-colors duration-700`}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
        {/* Left side */}
        <div className="col-span-2 space-y-6">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 shadow-2xl">
            {/* search */}
            <div className="mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city..."
                className="w-full rounded-xl px-4 py-3 text-lg placeholder-slate-400 bg-white/6 border border-white/10"
              />
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

            {/* current */}
            <div className="rounded-xl p-5 bg-white/6 border border-white/10 flex gap-4 items-start">
              <div className="flex-1">
                <div className="text-sm text-white/80">{location.name}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-6xl font-extrabold text-white drop-shadow-lg">
                    {current ? Math.round(current.temperature) + "°C" : "--°C"}
                  </div>
                  <div className="flex-1">
                    <div className="text-white/90 text-xl flex items-center gap-3">
                      <div className="w-12 h-12">
                        {current && weatherCodeMap[current.weathercode]?.anim ? (
                          <Player
                            autoplay
                            loop
                            src={weatherCodeMap[current.weathercode].anim}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          "—"
                        )}
                      </div>

                      <div>
                        <div className="font-medium">
                          {current
                            ? weatherCodeMap[current.weathercode]?.label
                            : "Loading"}
                        </div>
                        <div className="mt-2 text-sm text-white/80 flex gap-6">
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
                          <div>
                            Humidity{" "}
                            <strong>
                              {hourly?.relativehumidity_2m
                                ? hourly.relativehumidity_2m[0] + "%"
                                : "—"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-white/80">Next 24h</div>
                    <Sparkline
                      data={(hourly?.temperature_2m || []).slice(0, 24)}
                    />
                    <div className="mt-4 flex gap-4">
                      <button
                        onClick={handleAddFavorite}
                        className={`px-4 py-2 rounded-xl shadow ${theme.favClass}`}
                      >
                        ⭐ Add Favorite
                      </button>
                      <button
                        onClick={handleShare}
                        className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow"
                      >
                        📤 Share
                      </button>
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow disabled:opacity-50"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT ANIMATION FIXED */}
              <div className="w-28 h-28 flex items-center justify-center rounded-xl bg-white/10 border border-white/20">
                {current && weatherCodeMap[current.weathercode]?.anim ? (
                  <Player
                    autoplay
                    loop
                    src={weatherCodeMap[current.weathercode].anim}
                    style={{ width: "120px", height: "120px" }}
                  />
                ) : (
                  "☀️"
                )}
              </div>
            </div>
          </div>

          {/* Hourly forecast */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 overflow-x-auto">
            <div className="flex space-x-3 min-w-max">
              {(hourly?.time || []).slice(0, 24).map((t, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 min-w-[70px]"
                >
                  <div className="text-xs text-white/70">
                    {new Date(t).getHours()}:00
                  </div>
                  <div className="text-2xl">
                    <Player
                      autoplay
                      loop
                      src={weatherCodeMap[hourly.weathercode[i]]?.anim}
                      style={{ width: "40px", height: "40px" }}
                    />
                  </div>

                  <div className="font-semibold text-white">
                    {Math.round(hourly.temperature_2m[i])}°
                  </div>
                  <div className="text-xs text-white/70">
                    {hourly.precipitation[i]}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily forecast */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {(daily?.time || []).map((t, i) => (
              <div
                key={i}
                className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="text-sm text-white/70">
                  {new Date(t).toDateString()}
                </div>
                <div className="text-3xl">
                  <Player
                    autoplay
                    loop
                    src={weatherCodeMap[daily.weathercode[i]]?.anim}
                    style={{ width: "50px", height: "50px" }}
                  />
                </div>

                <div className="text-white font-semibold">
                  {Math.round(daily.temperature_2m_min[i])}° /{" "}
                  {Math.round(daily.temperature_2m_max[i])}°
                </div>
                <div className="text-xs text-white/70">
                  🌅{" "}
                  {new Date(daily.sunrise[i]).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs text-white/70">
                  🌇{" "}
                  {new Date(daily.sunset[i]).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side guide */}
        <div className="col-span-1">
          <div className="p-4 bg-white/10 border border-white/20 rounded-2xl text-sm text-white/90 backdrop-blur-md shadow-2xl">
            <h3 className="font-semibold mb-3">🌍 Weather Guide</h3>
            <ul className="space-y-2">
              <li>🌡 <b>Temperature</b>: Air temp in °C</li>
              <li>🤔 <b>Feels Like</b>: Perceived temp</li>
              <li>💨 <b>Wind</b>: Speed in km/h</li>
              <li>💧 <b>Humidity</b>: Air moisture %</li>
              <li>☔ <b>Precipitation</b>: Rain chance</li>
              <li>🌅 <b>Sunrise/Sunset</b>: Daily times</li>
              <li>📈 <b>24h Chart</b>: Hover to see °C</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
