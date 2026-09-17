import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/** Shared social card rendered by opengraph-image / twitter-image routes. */
export function createOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0D0D0D 0%, #1a0a0a 55%, #0D0D0D 100%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#EF1111",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#EF1111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            F
          </div>
          Forge Gym
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            Partner gyms. Real coaches. Honest growth.
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 820, lineHeight: 1.35 }}>
            Discover gyms, train with professionals, and manage memberships on one platform.
          </div>
        </div>

        <div style={{ display: "flex", color: "#71717a", fontSize: 22 }}>
          forgegym.app · Soft launch
        </div>
      </div>
    ),
    { ...size },
  );
}
