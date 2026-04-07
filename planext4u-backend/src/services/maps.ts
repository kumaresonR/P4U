import { env } from '../config/env';
import { logger } from '../utils/logger';

const MAPS_API = 'https://maps.googleapis.com/maps/api';

export const geocode = async (address: string): Promise<{ lat: number; lng: number; formatted_address: string } | null> => {
  if (!env.GOOGLE_MAPS_API_KEY) { logger.warn('Google Maps API key not configured'); return null; }
  const url = `${MAPS_API}/geocode/json?address=${encodeURIComponent(address)}&key=${env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (data.status !== 'OK' || !data.results?.length) return null;
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng, formatted_address: data.results[0].formatted_address };
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  const url = `${MAPS_API}/geocode/json?latlng=${lat},${lng}&key=${env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (data.status !== 'OK' || !data.results?.length) return null;
  return data.results[0].formatted_address;
};

export const getDistanceMatrix = async (origins: string[], destinations: string[]): Promise<any> => {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  const url = `${MAPS_API}/distancematrix/json?origins=${origins.map(encodeURIComponent).join('|')}&destinations=${destinations.map(encodeURIComponent).join('|')}&key=${env.GOOGLE_MAPS_API_KEY}&units=metric`;
  const res = await fetch(url);
  return res.json();
};

export const getPlaceAutocomplete = async (input: string, sessionToken?: string): Promise<any[]> => {
  if (!env.GOOGLE_MAPS_API_KEY) return [];
  let url = `${MAPS_API}/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${env.GOOGLE_MAPS_API_KEY}`;
  if (sessionToken) url += `&sessiontoken=${sessionToken}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  return data.predictions || [];
};
