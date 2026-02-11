import { NextResponse } from "next/server";

function weatherCodeToText(code: number) {
  // Tabla simplificada (Open-Meteo WMO codes)
  const map: Record<number, string> = {
    0: "despejado",
    1: "mayormente despejado",
    2: "parcialmente nublado",
    3: "nublado",
    45: "niebla",
    48: "niebla con escarcha",
    51: "llovizna leve",
    53: "llovizna",
    55: "llovizna intensa",
    61: "lluvia leve",
    63: "lluvia",
    65: "lluvia intensa",
    71: "nieve leve",
    73: "nieve",
    75: "nieve intensa",
    80: "chaparrones leves",
    81: "chaparrones",
    82: "chaparrones intensos",
    95: "tormenta",
    96: "tormenta con granizo",
    99: "tormenta fuerte con granizo",
  };
  return map[code] ?? "clima variable";
}

async function geocodeCity(city: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=es&format=json`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();

  const hit = j?.results?.[0];
  if (!hit) return null;

  return {
    name: String(hit.name),
    country: String(hit.country ?? ""),
    admin1: String(hit.admin1 ?? ""),
    latitude: Number(hit.latitude),
    longitude: Number(hit.longitude),
  };
}

async function forecast(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&timezone=auto`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  return await r.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const city = String(body?.city ?? "").trim();
    const lat = body?.lat != null ? Number(body.lat) : null;
    const lon = body?.lon != null ? Number(body.lon) : null;

    let placeLabel = "";
    let latitude = lat;
    let longitude = lon;

    if ((latitude == null || longitude == null) && city) {
      const geo = await geocodeCity(city);
      if (!geo) {
        return NextResponse.json(
          { ok: false, error: `No pude ubicar "${city}". Probá con ciudad + provincia/país.` },
          { status: 200 }
        );
      }
      latitude = geo.latitude;
      longitude = geo.longitude;
      placeLabel = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { ok: false, error: "Necesito ciudad o coordenadas (lat/lon)." },
        { status: 200 }
      );
    }

    const data = await forecast(latitude, longitude);
    if (!data) {
      return NextResponse.json({ ok: false, error: "No pude obtener el clima ahora." }, { status: 200 });
    }

    const cur = data.current ?? {};
    const daily = data.daily ?? {};

    const t = cur.temperature_2m;
    const feels = cur.apparent_temperature;
    const wind = cur.wind_speed_10m;
    const code = Number(cur.weather_code ?? -1);
    const desc = weatherCodeToText(code);

    const max = daily?.temperature_2m_max?.[0];
    const min = daily?.temperature_2m_min?.[0];
    const pop = daily?.precipitation_probability_max?.[0];
    const dcode = Number(daily?.weather_code?.[0] ?? code);
    const ddesc = weatherCodeToText(dcode);

    const label = placeLabel || (city ? city : "tu zona");

    const text =
      `📍 ${label}\n` +
      `Ahora: ${Math.round(t)}°C (sensación ${Math.round(feels)}°C), ${desc}. Viento ${Math.round(wind)} km/h.\n` +
      `Hoy: máx ${Math.round(max)}°C / mín ${Math.round(min)}°C, ${ddesc}` +
      (pop != null ? `, prob. lluvia ${Math.round(pop)}%.` : ".");

    return NextResponse.json({ ok: true, text }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Error interno en weather." }, { status: 200 });
  }
}
