"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  condition: string;
  icon: string;
  forecast: { date: string; high: number; low: number; icon: string }[];
}

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            setWeather(data);
          }
        } catch {} finally {
          setLoading(false);
        }
      },
      () => {
        // If geolocation denied, try with Atlanta (30308) coords
        fetch(`/api/weather?lat=33.77&lon=-84.37`)
          .then((r) => r.json())
          .then((data) => setWeather(data))
          .catch(() => {})
          .finally(() => setLoading(false));
      },
      { timeout: 5000 }
    );
  }, []);

  if (loading) {
    return (
      <>
        <div className="weather-card weather-card-full">
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.5 }}>
            <span style={{ fontSize: 28 }}>🌡️</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Loading weather...</span>
          </div>
        </div>
        <div className="weather-pill" style={{ opacity: 0.5 }}>
          <span className="weather-pill-icon">🌡️</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Loading...</span>
        </div>
      </>
    );
  }

  if (!weather) {
    return (
      <>
        <div className="weather-card weather-card-full">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>🌡️</span>
            <div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Weather unavailable</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Could not fetch forecast</div>
            </div>
          </div>
        </div>
        <div className="weather-pill" style={{ opacity: 0.5 }}>
          <span className="weather-pill-icon">🌡️</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Unavailable</span>
        </div>
      </>
    );
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      {/* Full card — hidden on mobile */}
      <div className="weather-card weather-card-full">
        {/* Current */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4, fontWeight: 500 }}>
              {weather.city}
            </div>
            <div style={{ fontSize: 48, fontWeight: 300, color: "#fff", lineHeight: 1, letterSpacing: "-2px" }}>
              {weather.temp}°
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              {weather.condition}
            </div>
          </div>
          <div style={{ fontSize: 52, lineHeight: 1 }}>{weather.icon}</div>
        </div>

        {/* Details row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          <span>Feels {weather.feelsLike}°</span>
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.wind} mph</span>
        </div>

        {/* 5-day forecast */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>
          {weather.forecast.map((day, i) => {
            const d = new Date(day.date + "T12:00:00");
            return (
              <div key={day.date} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                  {i === 0 ? "Today" : dayNames[d.getDay()]}
                </div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{day.icon}</div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{day.high}°</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{day.low}°</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact pill — visible on mobile only */}
      <div className="weather-pill">
        <span className="weather-pill-icon">{weather.icon}</span>
        <span className="weather-pill-temp">{weather.temp}°</span>
        <span className="weather-pill-cond">{weather.condition}</span>
        <span className="weather-pill-sep">·</span>
        <span className="weather-pill-city">{weather.city}</span>
      </div>
    </>
  );
}
