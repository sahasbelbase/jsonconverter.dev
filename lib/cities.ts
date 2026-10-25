/**
 * City lookup for the time zone converter.
 *
 * `code` is the city's IATA airport code where one is well known (KTM, NYC,
 * LON), because that is what people actually type. Offsets are deliberately
 * NOT stored here — they come from the browser's IANA database at the instant
 * being converted, so DST stays correct and this table never goes stale.
 */

import { canonicalZone } from '../utils/timezoneUtils';

export interface City {
  code: string;
  name: string;
  country: string;
  zone: string;
}

export const CITIES: City[] = [
  // --- South Asia ---
  { code: 'KTM', name: 'Kathmandu', country: 'Nepal', zone: 'Asia/Kathmandu' },
  { code: 'DEL', name: 'Delhi', country: 'India', zone: 'Asia/Kolkata' },
  { code: 'BOM', name: 'Mumbai', country: 'India', zone: 'Asia/Kolkata' },
  { code: 'BLR', name: 'Bengaluru', country: 'India', zone: 'Asia/Kolkata' },
  { code: 'CCU', name: 'Kolkata', country: 'India', zone: 'Asia/Kolkata' },
  { code: 'DAC', name: 'Dhaka', country: 'Bangladesh', zone: 'Asia/Dhaka' },
  { code: 'KHI', name: 'Karachi', country: 'Pakistan', zone: 'Asia/Karachi' },
  { code: 'ISB', name: 'Islamabad', country: 'Pakistan', zone: 'Asia/Karachi' },
  { code: 'CMB', name: 'Colombo', country: 'Sri Lanka', zone: 'Asia/Colombo' },
  { code: 'KBL', name: 'Kabul', country: 'Afghanistan', zone: 'Asia/Kabul' },

  // --- East & Southeast Asia ---
  { code: 'TYO', name: 'Tokyo', country: 'Japan', zone: 'Asia/Tokyo' },
  { code: 'OSA', name: 'Osaka', country: 'Japan', zone: 'Asia/Tokyo' },
  { code: 'SEL', name: 'Seoul', country: 'South Korea', zone: 'Asia/Seoul' },
  { code: 'PEK', name: 'Beijing', country: 'China', zone: 'Asia/Shanghai' },
  { code: 'SHA', name: 'Shanghai', country: 'China', zone: 'Asia/Shanghai' },
  { code: 'HKG', name: 'Hong Kong', country: 'Hong Kong', zone: 'Asia/Hong_Kong' },
  { code: 'TPE', name: 'Taipei', country: 'Taiwan', zone: 'Asia/Taipei' },
  { code: 'SIN', name: 'Singapore', country: 'Singapore', zone: 'Asia/Singapore' },
  { code: 'KUL', name: 'Kuala Lumpur', country: 'Malaysia', zone: 'Asia/Kuala_Lumpur' },
  { code: 'BKK', name: 'Bangkok', country: 'Thailand', zone: 'Asia/Bangkok' },
  { code: 'SGN', name: 'Ho Chi Minh City', country: 'Vietnam', zone: 'Asia/Ho_Chi_Minh' },
  { code: 'HAN', name: 'Hanoi', country: 'Vietnam', zone: 'Asia/Ho_Chi_Minh' },
  { code: 'CGK', name: 'Jakarta', country: 'Indonesia', zone: 'Asia/Jakarta' },
  { code: 'MNL', name: 'Manila', country: 'Philippines', zone: 'Asia/Manila' },
  { code: 'RGN', name: 'Yangon', country: 'Myanmar', zone: 'Asia/Yangon' },

  // --- Middle East & Central Asia ---
  { code: 'DXB', name: 'Dubai', country: 'UAE', zone: 'Asia/Dubai' },
  { code: 'AUH', name: 'Abu Dhabi', country: 'UAE', zone: 'Asia/Dubai' },
  { code: 'DOH', name: 'Doha', country: 'Qatar', zone: 'Asia/Qatar' },
  { code: 'RUH', name: 'Riyadh', country: 'Saudi Arabia', zone: 'Asia/Riyadh' },
  { code: 'JED', name: 'Jeddah', country: 'Saudi Arabia', zone: 'Asia/Riyadh' },
  { code: 'KWI', name: 'Kuwait City', country: 'Kuwait', zone: 'Asia/Kuwait' },
  { code: 'TLV', name: 'Tel Aviv', country: 'Israel', zone: 'Asia/Jerusalem' },
  { code: 'IST', name: 'Istanbul', country: 'Turkey', zone: 'Europe/Istanbul' },
  { code: 'THR', name: 'Tehran', country: 'Iran', zone: 'Asia/Tehran' },
  { code: 'TAS', name: 'Tashkent', country: 'Uzbekistan', zone: 'Asia/Tashkent' },
  { code: 'ALA', name: 'Almaty', country: 'Kazakhstan', zone: 'Asia/Almaty' },

  // --- Europe ---
  { code: 'LON', name: 'London', country: 'United Kingdom', zone: 'Europe/London' },
  { code: 'DUB', name: 'Dublin', country: 'Ireland', zone: 'Europe/Dublin' },
  { code: 'LIS', name: 'Lisbon', country: 'Portugal', zone: 'Europe/Lisbon' },
  { code: 'MAD', name: 'Madrid', country: 'Spain', zone: 'Europe/Madrid' },
  { code: 'BCN', name: 'Barcelona', country: 'Spain', zone: 'Europe/Madrid' },
  { code: 'PAR', name: 'Paris', country: 'France', zone: 'Europe/Paris' },
  { code: 'AMS', name: 'Amsterdam', country: 'Netherlands', zone: 'Europe/Amsterdam' },
  { code: 'BRU', name: 'Brussels', country: 'Belgium', zone: 'Europe/Brussels' },
  { code: 'BER', name: 'Berlin', country: 'Germany', zone: 'Europe/Berlin' },
  { code: 'FRA', name: 'Frankfurt', country: 'Germany', zone: 'Europe/Berlin' },
  { code: 'MUC', name: 'Munich', country: 'Germany', zone: 'Europe/Berlin' },
  { code: 'ZRH', name: 'Zurich', country: 'Switzerland', zone: 'Europe/Zurich' },
  { code: 'VIE', name: 'Vienna', country: 'Austria', zone: 'Europe/Vienna' },
  { code: 'PRG', name: 'Prague', country: 'Czechia', zone: 'Europe/Prague' },
  { code: 'WAW', name: 'Warsaw', country: 'Poland', zone: 'Europe/Warsaw' },
  { code: 'ROM', name: 'Rome', country: 'Italy', zone: 'Europe/Rome' },
  { code: 'MIL', name: 'Milan', country: 'Italy', zone: 'Europe/Rome' },
  { code: 'ATH', name: 'Athens', country: 'Greece', zone: 'Europe/Athens' },
  { code: 'CPH', name: 'Copenhagen', country: 'Denmark', zone: 'Europe/Copenhagen' },
  { code: 'OSL', name: 'Oslo', country: 'Norway', zone: 'Europe/Oslo' },
  { code: 'STO', name: 'Stockholm', country: 'Sweden', zone: 'Europe/Stockholm' },
  { code: 'HEL', name: 'Helsinki', country: 'Finland', zone: 'Europe/Helsinki' },
  { code: 'MOW', name: 'Moscow', country: 'Russia', zone: 'Europe/Moscow' },
  { code: 'KBP', name: 'Kyiv', country: 'Ukraine', zone: 'Europe/Kyiv' },

  // --- Africa ---
  { code: 'CAI', name: 'Cairo', country: 'Egypt', zone: 'Africa/Cairo' },
  { code: 'LOS', name: 'Lagos', country: 'Nigeria', zone: 'Africa/Lagos' },
  { code: 'NBO', name: 'Nairobi', country: 'Kenya', zone: 'Africa/Nairobi' },
  { code: 'JNB', name: 'Johannesburg', country: 'South Africa', zone: 'Africa/Johannesburg' },
  { code: 'CPT', name: 'Cape Town', country: 'South Africa', zone: 'Africa/Johannesburg' },
  { code: 'CMN', name: 'Casablanca', country: 'Morocco', zone: 'Africa/Casablanca' },
  { code: 'ADD', name: 'Addis Ababa', country: 'Ethiopia', zone: 'Africa/Addis_Ababa' },
  { code: 'ACC', name: 'Accra', country: 'Ghana', zone: 'Africa/Accra' },

  // --- North America ---
  { code: 'NYC', name: 'New York', country: 'United States', zone: 'America/New_York' },
  { code: 'BOS', name: 'Boston', country: 'United States', zone: 'America/New_York' },
  { code: 'WAS', name: 'Washington DC', country: 'United States', zone: 'America/New_York' },
  { code: 'MIA', name: 'Miami', country: 'United States', zone: 'America/New_York' },
  { code: 'ATL', name: 'Atlanta', country: 'United States', zone: 'America/New_York' },
  { code: 'ORD', name: 'Chicago', country: 'United States', zone: 'America/Chicago' },
  { code: 'DFW', name: 'Dallas', country: 'United States', zone: 'America/Chicago' },
  { code: 'IAH', name: 'Houston', country: 'United States', zone: 'America/Chicago' },
  { code: 'DEN', name: 'Denver', country: 'United States', zone: 'America/Denver' },
  { code: 'PHX', name: 'Phoenix', country: 'United States', zone: 'America/Phoenix' },
  { code: 'LAX', name: 'Los Angeles', country: 'United States', zone: 'America/Los_Angeles' },
  { code: 'SFO', name: 'San Francisco', country: 'United States', zone: 'America/Los_Angeles' },
  { code: 'SEA', name: 'Seattle', country: 'United States', zone: 'America/Los_Angeles' },
  { code: 'ANC', name: 'Anchorage', country: 'United States', zone: 'America/Anchorage' },
  { code: 'HNL', name: 'Honolulu', country: 'United States', zone: 'Pacific/Honolulu' },
  { code: 'YTO', name: 'Toronto', country: 'Canada', zone: 'America/Toronto' },
  { code: 'YMQ', name: 'Montreal', country: 'Canada', zone: 'America/Toronto' },
  { code: 'YVR', name: 'Vancouver', country: 'Canada', zone: 'America/Vancouver' },
  { code: 'MEX', name: 'Mexico City', country: 'Mexico', zone: 'America/Mexico_City' },

  // --- South America ---
  { code: 'SAO', name: 'São Paulo', country: 'Brazil', zone: 'America/Sao_Paulo' },
  { code: 'RIO', name: 'Rio de Janeiro', country: 'Brazil', zone: 'America/Sao_Paulo' },
  { code: 'BUE', name: 'Buenos Aires', country: 'Argentina', zone: 'America/Argentina/Buenos_Aires' },
  { code: 'SCL', name: 'Santiago', country: 'Chile', zone: 'America/Santiago' },
  { code: 'LIM', name: 'Lima', country: 'Peru', zone: 'America/Lima' },
  { code: 'BOG', name: 'Bogotá', country: 'Colombia', zone: 'America/Bogota' },

  // --- Oceania ---
  { code: 'SYD', name: 'Sydney', country: 'Australia', zone: 'Australia/Sydney' },
  { code: 'MEL', name: 'Melbourne', country: 'Australia', zone: 'Australia/Melbourne' },
  { code: 'BNE', name: 'Brisbane', country: 'Australia', zone: 'Australia/Brisbane' },
  { code: 'PER', name: 'Perth', country: 'Australia', zone: 'Australia/Perth' },
  { code: 'ADL', name: 'Adelaide', country: 'Australia', zone: 'Australia/Adelaide' },
  { code: 'AKL', name: 'Auckland', country: 'New Zealand', zone: 'Pacific/Auckland' },
  { code: 'SUV', name: 'Suva', country: 'Fiji', zone: 'Pacific/Fiji' },

  // --- Reference ---
  { code: 'UTC', name: 'UTC', country: 'Coordinated Universal Time', zone: 'UTC' },
];

/** Zone -> the city we show for it, first match winning. */
export const CITY_BY_ZONE = new Map<string, City>();
for (const city of CITIES) {
  if (!CITY_BY_ZONE.has(city.zone)) CITY_BY_ZONE.set(city.zone, city);
}

/**
 * Looks a city up through the alias map, so a browser reporting a legacy name
 * such as `Asia/Katmandu` still finds Kathmandu.
 */
export const cityForZone = (zone: string): City | undefined =>
  CITY_BY_ZONE.get(zone) ?? CITY_BY_ZONE.get(canonicalZone(zone));

/** A sensible starting set of world clocks. */
export const DEFAULT_CLOCK_CODES = ['KTM', 'UTC', 'LON', 'NYC', 'SFO', 'TYO', 'SYD', 'DXB'];
