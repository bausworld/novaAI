import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  try {
    // Use Open-Meteo (free, no API key)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=5`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("Open-Meteo error");
    const data = await res.json();

    // Reverse geocode for city name
    let city = "Your Location";
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
        {
          headers: { "User-Agent": "Nova/1.0" },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || "Your Location";
      }
    } catch {}

    const weatherCodeMap: Record<number, { label: string; icon: string }> = {
      0: { label: "Clear", icon: "☀️" },
      1: { label: "Mostly Clear", icon: "🌤️" },
      2: { label: "Partly Cloudy", icon: "⛅" },
      3: { label: "Overcast", icon: "☁️" },
      45: { label: "Foggy", icon: "🌫️" },
      48: { label: "Rime Fog", icon: "🌫️" },
      51: { label: "Light Drizzle", icon: "🌦️" },
      53: { label: "Drizzle", icon: "🌦️" },
      55: { label: "Heavy Drizzle", icon: "🌧️" },
      61: { label: "Light Rain", icon: "🌧️" },
      63: { label: "Rain", icon: "🌧️" },
      65: { label: "Heavy Rain", icon: "🌧️" },
      71: { label: "Light Snow", icon: "🌨️" },
      73: { label: "Snow", icon: "❄️" },
      75: { label: "Heavy Snow", icon: "❄️" },
      77: { label: "Snow Grains", icon: "🌨️" },
      80: { label: "Light Showers", icon: "🌦️" },
      81: { label: "Showers", icon: "🌧️" },
      82: { label: "Heavy Showers", icon: "🌧️" },
      85: { label: "Snow Showers", icon: "🌨️" },
      86: { label: "Heavy Snow Showers", icon: "❄️" },
      95: { label: "Thunderstorm", icon: "⛈️" },
      96: { label: "Thunderstorm + Hail", icon: "⛈️" },
      99: { label: "Severe Thunderstorm", icon: "⛈️" },
    };

    const code = data.current.weather_code;
    const weather = weatherCodeMap[code] || { label: "Unknown", icon: "🌡️" };

    return NextResponse.json({
      city,
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      wind: Math.round(data.current.wind_speed_10m),
      condition: weather.label,
      icon: weather.icon,
      forecast: data.daily.time.map((date: string, i: number) => ({
        date,
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        icon: (weatherCodeMap[data.daily.weather_code[i]] || { icon: "🌡️" }).icon,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
