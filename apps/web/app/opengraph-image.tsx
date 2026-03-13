import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "TypeOff: Ranked Competitive Typing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a10",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* Subtle radial glow behind center */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: "50%",
            top: "45%",
            transform: "translate(-50%, -50%)",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(77,158,255,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Thin accent line at very top */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent 10%, #4d9eff 50%, transparent 90%)",
            opacity: 0.5,
          }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 148,
            fontWeight: 800,
            color: "#4d9eff",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          TypeOff
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginTop: 32,
          }}
        >
          Ranked Competitive Typing
        </div>

        {/* Separator dot */}
        <div
          style={{
            display: "flex",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "rgba(77,158,255,0.3)",
            marginTop: 40,
            marginBottom: 40,
          }}
        />

        {/* Description */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.04em",
          }}
        >
          Race real players. Climb the ladder. Prove your speed.
        </div>

        {/* Domain — bottom */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 44,
            fontSize: 18,
            color: "rgba(77,158,255,0.2)",
            letterSpacing: "0.15em",
          }}
        >
          typeoff.gg
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
