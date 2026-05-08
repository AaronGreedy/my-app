import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const revalidate = 600; // 10 min cache

const BOLZANO_LAT = 46.4983;
const BOLZANO_LON = 11.3548;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = url.searchParams.get('lat') ?? String(BOLZANO_LAT);
  const lon = url.searchParams.get('lon') ?? String(BOLZANO_LON);

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Europe%2FRome&forecast_days=3`;

  const res = await fetch(apiUrl, { next: { revalidate: 600 } });
  if (!res.ok) {
    return Response.json({ error: `Open-Meteo ${res.status}` }, { status: res.status });
  }
  const data = await res.json();
  return Response.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
  });
}
