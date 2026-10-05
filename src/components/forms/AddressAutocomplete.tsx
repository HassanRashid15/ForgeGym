"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { placeFromAddressLabel } from "@/lib/geo/place";
import {
  geocodeAddressClient,
  reverseGeocodeClient,
} from "@/lib/geo/geocode-client";

/** Default map center (Lahore) when user places pin manually */
const FALLBACK_PIN = { lat: 31.5204, lon: 74.3587 };

const LeafletGymPinMap = dynamic(
  () =>
    import("@/components/gyms/LeafletGymPinMap").then((m) => m.LeafletGymPinMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-44 w-full items-center justify-center bg-zinc-900 text-xs text-zinc-500">
        Loading map…
      </div>
    ),
  },
);

export type AddressValue = {
  address: string;
  lat?: number | null;
  lon?: number | null;
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
  /** Show map preview when coords are known */
  showMap?: boolean;
  /** Existing pin (editing saved gym location) */
  lat?: number | null;
  lon?: number | null;
};

type Suggestion = {
  mapboxId: string;
  label: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

function sessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function contextName(
  context: Record<string, { name?: string } | undefined> | undefined,
  key: string,
): string | null {
  const v = context?.[key]?.name;
  return v ? String(v).trim() : null;
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Search address or type your own",
  className,
  inputClassName,
  showMap = true,
  lat: initialLat,
  lon: initialLon,
}: AddressAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(sessionToken());
  const suppressSearchRef = useRef(false);
  const queryRef = useRef(value);

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [showManualMap, setShowManualMap] = useState(false);
  const pinnedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    setQuery(value);
    queryRef.current = value;
  }, [value]);

  useEffect(() => {
    if (
      typeof initialLat === "number" &&
      typeof initialLon === "number" &&
      Number.isFinite(initialLat) &&
      Number.isFinite(initialLon)
    ) {
      setCoords({ lat: initialLat, lon: initialLon });
      if (value.trim()) pinnedAddressRef.current = value.trim();
    }
  }, [initialLat, initialLon, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const emit = useCallback(
    (
      address: string,
      nextCoords: { lat: number; lon: number } | null,
      place?: {
        city?: string | null;
        region?: string | null;
        country?: string | null;
      },
    ) => {
      onChange({
        address,
        lat: nextCoords?.lat ?? null,
        lon: nextCoords?.lon ?? null,
        city: place?.city ?? null,
        region: place?.region ?? null,
        country: place?.country ?? null,
      });
    },
    [onChange],
  );

  const runSearch = useCallback(async (q: string) => {
    if (!MAPBOX_TOKEN || q.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
      url.searchParams.set("q", q.trim());
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      url.searchParams.set("session_token", sessionRef.current);
      url.searchParams.set("language", "en");
      url.searchParams.set("country", "pk");
      url.searchParams.set("limit", "8");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("suggest failed");
      const data = (await res.json()) as {
        suggestions?: Array<{
          mapbox_id?: string;
          name?: string;
          full_address?: string;
          place_formatted?: string;
          context?: Record<string, { name?: string }>;
        }>;
      };

      const next: Suggestion[] = (data.suggestions || [])
        .filter((s) => s.mapbox_id)
        .map((s) => {
          const label =
            s.full_address ||
            [s.name, s.place_formatted].filter(Boolean).join(", ") ||
            s.name ||
            "";
          return {
            mapboxId: s.mapbox_id!,
            label,
            city:
              contextName(s.context, "place") ||
              contextName(s.context, "locality"),
            region: contextName(s.context, "region"),
            country: contextName(s.context, "country"),
          };
        });

      setSuggestions(next);
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
    queryRef.current = next;
    setError(null);
    // Keep previous pin until blur geocode / new pick — avoid wiping coords on every keystroke
    emit(next, coords);

    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(next);
      // Typed address (no suggestion pick) → lat/lng for Leaflet after pause
      const trimmed = next.trim();
      if (trimmed.length >= 8 && pinnedAddressRef.current !== trimmed) {
        void (async () => {
          const place = await geocodeAddressClient(trimmed);
          if (!place) return;
          // Ignore stale responses if user kept typing
          if (queryRef.current.trim() !== trimmed) return;
          const nextCoords = { lat: place.lat, lon: place.lon };
          pinnedAddressRef.current = trimmed;
          setCoords(nextCoords);
          emit(trimmed, nextCoords, {
            city: place.city,
            region: place.region,
            country: place.country,
          });
        })();
      }
    }, 700);
  };

  /** Resolve typed address → lat/lng (blur / save path when no Mapbox pick) */
  const resolveTypedAddress = async () => {
    const q = query.trim();
    if (q.length < 4) return;
    // Already pinned for this exact text
    if (
      coords &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lon) &&
      pinnedAddressRef.current === q
    ) {
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const place = await geocodeAddressClient(q);
      if (!place) {
        setError(
          "Couldn’t find that address automatically — use my location, or place the pin on the map",
        );
        setShowManualMap(true);
        return;
      }
      const nextCoords = { lat: place.lat, lon: place.lon };
      pinnedAddressRef.current = q;
      setCoords(nextCoords);
      setShowManualMap(false);
      emit(q, nextCoords, {
        city: place.city,
        region: place.region,
        country: place.country,
      });
    } finally {
      setSearching(false);
    }
  };

  const pickSuggestion = async (s: Suggestion) => {
    if (!MAPBOX_TOKEN) return;
    setSearching(true);
    setError(null);
    try {
      const url = new URL(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(s.mapboxId)}`,
      );
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      url.searchParams.set("session_token", sessionRef.current);
      url.searchParams.set("language", "en");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("retrieve failed");
      const data = (await res.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: {
            full_address?: string;
            name?: string;
            place_formatted?: string;
            context?: Record<string, { name?: string }>;
          };
        }>;
      };

      const feature = data.features?.[0];
      const coordinates = feature?.geometry?.coordinates;
      if (!coordinates) throw new Error("no coordinates");

      const [lng, lat] = coordinates;
      const props = feature?.properties;
      const address =
        props?.full_address ||
        [props?.name, props?.place_formatted].filter(Boolean).join(", ") ||
        s.label;

      const city =
        contextName(props?.context, "place") ||
        contextName(props?.context, "locality") ||
        s.city ||
        placeFromAddressLabel(address).city;
      const region =
        contextName(props?.context, "region") ||
        s.region ||
        placeFromAddressLabel(address).region;
      const country =
        contextName(props?.context, "country") || s.country || null;

      suppressSearchRef.current = true;
      sessionRef.current = sessionToken();
      setQuery(address);
      setCoords({ lat, lon: lng });
      pinnedAddressRef.current = address.trim();
      setSuggestions([]);
      setOpen(false);
      emit(address, { lat, lon: lng }, { city, region, country });
    } catch {
      setError("Could not resolve that place — try another suggestion");
    } finally {
      setSearching(false);
    }
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
          let address = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          let city: string | null = null;
          let region: string | null = null;
          let country: string | null = null;

          if (MAPBOX_TOKEN) {
            try {
              const url = new URL(
                "https://api.mapbox.com/search/searchbox/v1/reverse",
              );
              url.searchParams.set("longitude", String(lon));
              url.searchParams.set("latitude", String(lat));
              url.searchParams.set("access_token", MAPBOX_TOKEN);
              url.searchParams.set("language", "en");
              url.searchParams.set("limit", "1");
              const res = await fetch(url.toString());
              if (res.ok) {
                const data = (await res.json()) as {
                  features?: Array<{
                    properties?: {
                      full_address?: string;
                      name?: string;
                      place_formatted?: string;
                      context?: Record<string, { name?: string }>;
                    };
                  }>;
                };
                const props = data.features?.[0]?.properties;
                address =
                  props?.full_address ||
                  [props?.name, props?.place_formatted]
                    .filter(Boolean)
                    .join(", ") ||
                  address;
                city =
                  contextName(props?.context, "place") ||
                  contextName(props?.context, "locality");
                region = contextName(props?.context, "region");
                country = contextName(props?.context, "country");
              }
            } catch {
              /* Nominatim below */
            }
          }

          if (address.includes(",") === false || /^\d/.test(address)) {
            const rev = await reverseGeocodeClient(lat, lon);
            if (rev?.label) {
              address = rev.label;
              city = rev.city ?? city;
              region = rev.region ?? region;
              country = rev.country ?? country;
            }
          }

          const parsed = placeFromAddressLabel(address);
          suppressSearchRef.current = true;
          setQuery(address);
          queryRef.current = address;
          setCoords({ lat, lon });
          pinnedAddressRef.current = address.trim();
          setShowManualMap(false);
          setSuggestions([]);
          setOpen(false);
          emit(address, { lat, lon }, {
            city: city || parsed.city,
            region: region || parsed.region,
            country,
          });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            "Location permission denied — place the pin on the map instead",
          );
          setShowManualMap(true);
        } else {
          setError("Could not detect location — place the pin on the map instead");
          setShowManualMap(true);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const placePinManually = () => {
    setError(null);
    setShowManualMap(true);
    if (!coords) {
      const next = { ...FALLBACK_PIN };
      setCoords(next);
      const label = query.trim() || "Dropped pin";
      pinnedAddressRef.current = label;
      emit(label, next, placeFromAddressLabel(label));
    }
  };

  const handlePinMove = (lat: number, lon: number) => {
    const next = { lat, lon };
    setCoords(next);
    setError(null);
    const label = query.trim() || "Dropped pin";
    pinnedAddressRef.current = label;
    emit(label, next, placeFromAddressLabel(label));
  };

  const clearAddress = () => {
    setQuery("");
    queryRef.current = "";
    setCoords(null);
    pinnedAddressRef.current = null;
    setShowManualMap(false);
    setSuggestions([]);
    setOpen(false);
    setError(null);
    emit("", null);
  };

  const hasPin =
    !!coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon);

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
          onBlur={() => {
            window.setTimeout(() => {
              if (open) return;
              void resolveTypedAddress();
            }, 180);
          }}
          className={cn("pl-10 pr-20", inputClassName)}
        />
        <div className="absolute right-1.5 top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5">
          {searching && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-zinc-400" />
          )}
          {query && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onMouseDown={(e) => e.preventDefault()}
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
            onMouseDown={(e) => e.preventDefault()}
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
              <li key={s.mapboxId} role="option">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pickSuggestion(s)}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="leading-snug">{s.label}</span>
                </button>
              </li>
            ))}
            {!searching &&
              suggestions.length === 0 &&
              query.trim().length >= 2 && (
                <li className="px-3 py-2 text-xs text-zinc-500">
                  No matches — keep typing your custom address
                </li>
              )}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span>
          Auto-pin from address, or place it yourself if lookup misses
        </span>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[11px] text-zinc-400 underline-offset-2 hover:text-zinc-200"
          onClick={useMyLocation}
          disabled={disabled || locating}
        >
          {locating ? "Detecting…" : "Use my location"}
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[11px] text-zinc-400 underline-offset-2 hover:text-zinc-200"
          onClick={placePinManually}
          disabled={disabled}
        >
          Place pin on map
        </Button>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

      {showMap && (hasPin || showManualMap) && coords ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
          <LeafletGymPinMap
            gymName="Gym pin"
            addressLabel={query.trim() || null}
            latitude={coords.lat}
            longitude={coords.lon}
            compact
            interactivePin
            onPinChange={handlePinMove}
          />
          <p className="border-t border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">
            Pin at {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}. Click or
            drag the pin to fine-tune, then Save Changes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
