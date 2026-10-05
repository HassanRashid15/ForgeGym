"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LeafletGymPinMapProps = {
  gymName: string;
  addressLabel?: string | null;
  latitude: number;
  longitude: number;
  /** Compact preview (profile address field) vs full gym page map */
  compact?: boolean;
  className?: string;
  /** Allow click / drag to move pin (address editor) */
  interactivePin?: boolean;
  onPinChange?: (lat: number, lon: number) => void;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPinIcon(gymName: string, compact: boolean) {
  const label = gymName.trim() || "Gym";
  if (compact) {
    return L.divIcon({
      className: "gym-leaflet-pin",
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -32],
      html: `
        <svg width="28" height="36" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M18 0C9.163 0 2 7.163 2 16c0 11.25 16 28 16 28s16-16.75 16-28C34 7.163 26.837 0 18 0z" fill="#EF1111"/>
          <circle cx="18" cy="16" r="6.5" fill="#fff"/>
        </svg>
      `,
    });
  }
  return L.divIcon({
    className: "gym-leaflet-pin",
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -48],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;width:max-content;max-width:220px;transform:translateX(-50%);margin-left:20px;">
        <span style="margin-bottom:4px;padding:3px 8px;border-radius:6px;background:#fff;color:#111;font:600 12px/1.2 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
          ${escapeHtml(label)}
        </span>
        <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M18 0C9.163 0 2 7.163 2 16c0 11.25 16 28 16 28s16-16.75 16-28C34 7.163 26.837 0 18 0z" fill="#EF1111"/>
          <circle cx="18" cy="16" r="6.5" fill="#fff"/>
        </svg>
      </div>
    `,
  });
}

/**
 * Imperative Leaflet map — click/drag pin when interactivePin is on.
 * @see https://github.com/Leaflet/Leaflet
 */
export function LeafletGymPinMap({
  gymName,
  addressLabel,
  latitude,
  longitude,
  compact = false,
  className,
  interactivePin = false,
  onPinChange,
}: LeafletGymPinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;

  const zoom = compact ? 15 : 16;
  const heightClass = compact
    ? "h-44 w-full"
    : "h-[min(70vh,560px)] w-full";

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom,
      scrollWheelZoom: interactivePin || !compact,
      zoomControl: interactivePin || !compact,
      dragging: interactivePin || !compact,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://leafletjs.com">Leaflet</a>',
    }).addTo(map);

    if (interactivePin || !compact) {
      map.zoomControl.setPosition("bottomright");
    }

    const marker = L.marker([latitude, longitude], {
      icon: buildPinIcon(gymName, compact),
      draggable: interactivePin,
    }).addTo(map);

    const popupBits = [`<strong>${escapeHtml(gymName.trim() || "Gym")}</strong>`];
    if (addressLabel?.trim()) {
      popupBits.push(
        `<span style="font-size:12px;opacity:.8">${escapeHtml(addressLabel.trim())}</span>`,
      );
    }
    marker.bindPopup(popupBits.join("<br/>"));

    if (interactivePin) {
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onPinChangeRef.current?.(ll.lat, ll.lng);
      });
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onPinChangeRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      const node = el as HTMLDivElement & { _leaflet_id?: number };
      if (node._leaflet_id) delete node._leaflet_id;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.setView([latitude, longitude], zoom);
    marker.setLatLng([latitude, longitude]);
    marker.setIcon(buildPinIcon(gymName, compact));
    marker.dragging?.[interactivePin ? "enable" : "disable"]();

    const popupBits = [`<strong>${escapeHtml(gymName.trim() || "Gym")}</strong>`];
    if (addressLabel?.trim()) {
      popupBits.push(
        `<span style="font-size:12px;opacity:.8">${escapeHtml(addressLabel.trim())}</span>`,
      );
    }
    marker.bindPopup(popupBits.join("<br/>"));
  }, [latitude, longitude, zoom, gymName, addressLabel, compact, interactivePin]);

  return (
    <div
      ref={containerRef}
      className={`z-0 bg-[#e8e8e8] [&_.leaflet-control-attribution]:text-[10px] ${heightClass} ${className ?? ""}`}
    />
  );
}
