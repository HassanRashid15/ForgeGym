"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddressValue = {
  address: string;
  lat?: number | null;
  lon?: number | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

type Suggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

type AddressAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (next: AddressValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Show mini map when coords are known */
  showMap?: boolean;
};

export function AddressAutocomplete({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Search address or type your own",
  className,
  inputClassName,
  showMap = true,
}: AddressAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suppressSearchRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSuggestions((data.results || []) as Suggestion[]);
      setOpen(true);
    } catch {
      setSuggestions([]);
      setError("Could not load address suggestions");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (next: string) => {
    setQuery(next);
    onChange({
      address: next,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      city: null,
      region: null,
      country: null,
    });
    setError(null);

    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    // Typing a custom address clears map pin until they pick a suggestion / detect
    setCoords(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(next);
    }, 350);
  };

  const pickSuggestion = (s: Suggestion) => {
    suppressSearchRef.current = true;
    setQuery(s.label);
    setCoords({ lat: s.lat, lon: s.lon });
    setSuggestions([]);
    setOpen(false);
    onChange({
      address: s.label,
      lat: s.lat,
      lon: s.lon,
      city: s.city ?? null,
      region: s.region ?? null,
      country: s.country ?? null,
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(
            `/api/geo/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
          );
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Could not resolve your location");
            setCoords({ lat, lon });
            onChange({
              address: query || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              lat,
              lon,
              city: null,
              region: null,
            });
            return;
          }
          suppressSearchRef.current = true;
          setQuery(data.label);
          setCoords({ lat: data.lat, lon: data.lon });
          setSuggestions([]);
          setOpen(false);
          onChange({
            address: data.label,
            lat: data.lat,
            lon: data.lon,
            city: data.city ?? null,
            region: data.region ?? null,
            country: data.country ?? null,
          });
        } catch {
          setError("Could not resolve your location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied — type an address instead");
        } else {
          setError("Could not detect location — type an address instead");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const clearAddress = () => {
    setQuery("");
    setCoords(null);
    setSuggestions([]);
    setOpen(false);
    setError(null);
    onChange({ address: "", lat: null, lon: null, city: null, region: null, country: null });
  };

  const mapSrc =
    coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.012}%2C${coords.lat - 0.008}%2C${coords.lon + 0.012}%2C${coords.lat + 0.008}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`
      : null;

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="street-address"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          className={cn("pl-10 pr-20", inputClassName)}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {searching && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-zinc-400" />}
          {query && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={clearAddress}
              aria-label="Clear address"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={useMyLocation}
            disabled={disabled || locating}
            aria-label="Use my location"
            title="Use my location"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </Button>
        </div>

        {open && (suggestions.length > 0 || searching) && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
          >
            {suggestions.map((s) => (
              <li key={s.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="leading-snug">{s.label}</span>
                </button>
              </li>
            ))}
            {!searching && suggestions.length === 0 && query.trim().length >= 2 && (
              <li className="px-3 py-2 text-xs text-zinc-500">
                No matches — keep typing your custom address
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span>Type freely, pick a suggestion, or detect your location</span>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[11px] text-zinc-400 underline-offset-2 hover:text-zinc-200"
          onClick={useMyLocation}
          disabled={disabled || locating}
        >
          {locating ? "Detecting…" : "Use my location"}
        </Button>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

      {showMap && mapSrc && (
        <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
          <iframe
            title="Selected location map"
            src={mapSrc}
            className="h-40 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}
