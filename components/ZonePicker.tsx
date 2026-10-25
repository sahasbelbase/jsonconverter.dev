import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { CITIES, cityForZone, type City } from '../lib/cities';
import { foldForSearch, getAllZones, getOffsetMinutes, formatOffset } from '../utils/timezoneUtils';

interface ZonePickerProps {
  value: string;
  onChange: (zone: string) => void;
  label: string;
  instant: Date;
}

interface Option {
  zone: string;
  primary: string;
  secondary: string;
  code: string;
}

/** Cities first, then every other IANA zone the browser knows. */
const buildOptions = (): Option[] => {
  const options: Option[] = CITIES.map((city: City) => ({
    zone: city.zone,
    primary: city.name,
    secondary: city.country,
    code: city.code,
  }));

  const seen = new Set(CITIES.map((city) => city.zone));
  for (const zone of getAllZones()) {
    if (seen.has(zone)) continue;
    seen.add(zone);
    options.push({
      zone,
      primary: zone.split('/').pop()!.replace(/_/g, ' '),
      secondary: zone,
      code: '',
    });
  }
  return options;
};

/**
 * A searchable zone picker. You can type a city ("kathmandu"), an airport code
 * ("KTM"), or any part of an IANA zone name ("asia/kat").
 */
const ZonePicker: React.FC<ZonePickerProps> = ({ value, onChange, label, instant }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(buildOptions, []);

  const results = useMemo(() => {
    const q = foldForSearch(query.trim());
    if (!q) return options.slice(0, 200);
    return options
      .filter(
        (option) =>
          foldForSearch(option.code) === q ||
          foldForSearch(option.primary).includes(q) ||
          foldForSearch(option.secondary).includes(q) ||
          foldForSearch(option.zone).includes(q)
      )
      // An exact code match is almost certainly what was meant.
      .sort((a, b) => Number(foldForSearch(b.code) === q) - Number(foldForSearch(a.code) === q))
      .slice(0, 200);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  const city = cityForZone(value);
  const offset = formatOffset(getOffsetMinutes(instant, value));
  const displayName = city ? city.name : value.split('/').pop()!.replace(/_/g, ' ');

  const pick = (zone: string) => {
    onChange(zone);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault();
      pick(results[cursor].zone);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark text-left hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {city?.code && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold font-mono shrink-0">
            {city.code}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium truncate">{displayName}</span>
          <span className="block text-[11px] text-gray-400 truncate">{value}</span>
        </span>
        <span className="text-xs font-mono text-gray-500 shrink-0">{offset}</span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-secondary shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 border-b border-gray-100 dark:border-gray-800">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="City, code (KTM) or zone…"
              aria-label={`Search ${label}`}
              className="flex-1 py-2.5 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">
                Nothing matches “{query}”.
              </li>
            )}
            {results.map((option, idx) => (
              <li key={option.zone + option.code}>
                <button
                  type="button"
                  onClick={() => pick(option.zone)}
                  onMouseEnter={() => setCursor(idx)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                    idx === cursor ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <span className="w-10 shrink-0 text-[11px] font-mono font-bold text-primary">
                    {option.code}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{option.primary}</span>
                    <span className="block text-[11px] text-gray-400 truncate">
                      {option.secondary}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-gray-500 shrink-0">
                    {formatOffset(getOffsetMinutes(instant, option.zone))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ZonePicker;
