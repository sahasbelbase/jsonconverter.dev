import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Clock, Plus, RotateCcw, Sun, X } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import ZonePicker from '../components/ZonePicker';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';
import { CITIES, cityForZone, DEFAULT_CLOCK_CODES } from '../lib/cities';
import {
  formatDifference,
  formatInZone,
  formatOffset,
  getOffsetMinutes,
  getZoneAbbreviation,
  isDaylightSaving,
  isValidZone,
  localZone,
  parseDateTimeLocalValue,
  resolveZonedTime,
  toDateTimeLocalValue,
} from '../utils/timezoneUtils';

const tool = TOOL_BY_PATH.get('/timezone-converter')!;

const zoneForCode = (code: string) => CITIES.find((city) => city.code === code)?.zone;

const defaultClocks = () =>
  DEFAULT_CLOCK_CODES.map(zoneForCode).filter((zone): zone is string => Boolean(zone));

const TimezonePage: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  const browserZone = isValidZone(localZone()) ? localZone() : 'UTC';
  const [fromZone, setFromZone] = useLocalStorageState('tzFrom', browserZone);
  const [toZone, setToZone] = useLocalStorageState('tzTo', 'UTC');

  // The wall-clock time being converted, as it reads in the source zone.
  const [wallClock, setWallClock] = useState(() => toDateTimeLocalValue(new Date(), fromZone));
  const [pinnedRaw, setPinnedRaw] = useLocalStorageState('tzClocks', JSON.stringify(defaultClocks()));

  const pinned = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(pinnedRaw);
      return Array.isArray(parsed) ? parsed.filter(isValidZone) : defaultClocks();
    } catch {
      return defaultClocks();
    }
  }, [pinnedRaw]);

  const setPinned = (zones: string[]) => setPinnedRaw(JSON.stringify(zones));

  // One ticking clock drives every "time now" on the page.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const resolved = useMemo(() => {
    const fields = parseDateTimeLocalValue(wallClock);
    if (!fields) return null;
    return resolveZonedTime(fields, fromZone);
  }, [wallClock, fromZone]);

  const instant = resolved?.instant ?? now;

  const fromOffset = getOffsetMinutes(instant, fromZone);
  const toOffset = getOffsetMinutes(instant, toZone);
  const difference = toOffset - fromOffset;

  const swap = () => {
    // Keep the moment in time, re-expressed as the other zone's wall clock.
    const next = toDateTimeLocalValue(instant, toZone);
    setFromZone(toZone);
    setToZone(fromZone);
    setWallClock(next);
  };

  const useNow = () => setWallClock(toDateTimeLocalValue(new Date(), fromZone));

  const addClock = (zone: string) => {
    if (pinned.includes(zone)) return;
    setPinned([...pinned, zone]);
  };

  const removeClock = (zone: string) => setPinned(pinned.filter((z) => z !== zone));

  const describe = (zone: string) => {
    const city = cityForZone(zone);
    return city ? `${city.name}${city.code !== 'UTC' ? ` (${city.code})` : ''}` : zone.replace(/_/g, ' ');
  };

  const shareText = resolved
    ? `${formatInZone(instant, fromZone, { dateStyle: 'medium', timeStyle: 'short' })} ${describe(fromZone)} = ${formatInZone(instant, toZone, { dateStyle: 'medium', timeStyle: 'short' })} ${describe(toZone)}`
    : '';

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Converting a time between two places</h2>
          <p>
            Pick where the time is now and where you want it, by city name or by
            airport code — <code>KTM</code>, <code>NYC</code>, <code>LON</code>,{' '}
            <code>TYO</code> — then type the wall-clock time. Every offset comes from the IANA
            time zone database your browser already ships, so daylight saving is handled for the
            actual date you pick rather than today's rules.
          </p>
          <h3>Why offsets are not fixed</h3>
          <p>
            A zone is not a number. New York is UTC−5 in January and UTC−4 in July; Sydney moves
            the other way, because its summer is our winter. Converting with a remembered offset
            is how meetings end up an hour out twice a year. Pick the real date and the conversion
            follows the rules in force on that date.
          </p>
          <h3>The two hours that break calendars</h3>
          <p>
            When clocks spring forward, an hour never happens — 02:30 does not exist in New York
            on the changeover morning. When they fall back, an hour happens twice, so 01:30 is two
            different instants. This tool tells you when the time you entered is one of those,
            instead of silently picking one.
          </p>
          <h3>Nepal's 45 minutes</h3>
          <p>
            Not every zone is a whole hour from UTC. Nepal is UTC+5:45, India UTC+5:30, the
            Chatham Islands UTC+12:45. Tools that store offsets as whole hours get these wrong,
            which is why the offsets here are always computed, never assumed.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4 p-2">
        {/* --- Converter --- */}
        <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-2">
              <ZonePicker label="From" value={fromZone} onChange={setFromZone} instant={instant} />
              <input
                type="datetime-local"
                value={wallClock}
                onChange={(e) => setWallClock(e.target.value)}
                aria-label="Time in the source zone"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex lg:flex-col items-center justify-center gap-2 pb-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={swap}
                title="Swap the two zones"
                aria-label="Swap zones"
              >
                <ArrowRightLeft size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={useNow} title="Use the current time">
                <RotateCcw size={14} />
              </Button>
            </div>

            <div className="space-y-2">
              <ZonePicker label="To" value={toZone} onChange={setToZone} instant={instant} />
              <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm font-mono">
                {resolved
                  ? formatInZone(instant, toZone, { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
              </div>
            </div>
          </div>

          {resolved && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                <strong className="text-gray-700 dark:text-gray-200">{describe(toZone)}</strong> is{' '}
                <strong className="text-primary">{formatDifference(difference)}</strong>{' '}
                {difference === 0 ? '' : `relative to ${describe(fromZone)}`}
              </span>
              <span className="font-mono">
                {formatOffset(fromOffset)} → {formatOffset(toOffset)}
              </span>
              <span className="font-mono">{instant.toISOString()}</span>
              <CopyButton value={shareText} label="Copy" />
            </div>
          )}

          {resolved?.status === 'skipped' && (
            <p className="mt-3 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                That time never happens in {describe(fromZone)} — the clocks jump forward over it.
                It has been shifted to{' '}
                <strong>{formatInZone(instant, fromZone, { timeStyle: 'short' })}</strong>.
              </span>
            </p>
          )}

          {resolved?.status === 'ambiguous' && resolved.alternative && (
            <p className="mt-3 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                That time happens twice in {describe(fromZone)} — the clocks go back. Showing the
                first one; the second would be{' '}
                <strong>
                  {formatInZone(resolved.alternative, toZone, { timeStyle: 'short' })}
                </strong>{' '}
                in {describe(toZone)}.
              </span>
            </p>
          )}
        </div>

        {/* --- World clocks --- */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex-none h-10 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Clock size={13} /> Time now
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addClock(fromZone)}
                disabled={pinned.includes(fromZone)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded text-gray-500 hover:text-primary disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
              >
                <Plus size={12} /> Add {describe(fromZone)}
              </button>
              <button
                onClick={() => setPinned(defaultClocks())}
                className="text-[11px] px-2 py-1 rounded text-gray-500 hover:text-primary transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {pinned.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-400">
                No clocks. Add one with the button above.
              </li>
            )}
            {pinned.map((zone) => {
              const city = cityForZone(zone);
              const offset = getOffsetMinutes(now, zone);
              const relative = offset - getOffsetMinutes(now, fromZone);
              const dst = isDaylightSaving(now, zone);

              return (
                <li key={zone} className="flex items-center gap-3 px-3 py-2 group">
                  <span className="w-11 shrink-0 text-[11px] font-mono font-bold text-primary">
                    {city?.code ?? ''}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {city?.name ?? zone.split('/').pop()!.replace(/_/g, ' ')}
                      {dst && (
                        <Sun
                          size={11}
                          className="inline ml-1.5 -mt-0.5 text-amber-500"
                          aria-label="on daylight saving"
                        />
                      )}
                    </span>
                    <span className="block text-[11px] text-gray-400 truncate">
                      {zone} · {getZoneAbbreviation(now, zone)} {formatOffset(offset)}
                      {relative !== 0 && ` · ${formatDifference(relative)}`}
                    </span>
                  </span>

                  <span className="text-right shrink-0">
                    <span className="block text-base font-mono tabular-nums">
                      {formatInZone(now, zone, { timeStyle: 'medium' })}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {formatInZone(now, zone, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </span>

                  <button
                    onClick={() => removeClock(zone)}
                    aria-label={`Remove ${describe(zone)}`}
                    className="shrink-0 p-1 text-gray-300 dark:text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </ToolShell>
  );
};

export default TimezonePage;
