import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TypeOff — Ranked Competitive Typing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIERS = [
  { label: "Bronze",      color: "#cd7f32" },
  { label: "Silver",      color: "#9ca3af" },
  { label: "Gold",        color: "#f59e0b" },
  { label: "Platinum",    color: "#22d3ee" },
  { label: "Diamond",     color: "#818cf8" },
  { label: "Master",      color: "#c084fc" },
  { label: "Grandmaster", color: "#fb923c" },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0c0c12",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* Accent glow blob */}
        <div
          style={{
            position: "absolute",
            left: -120,
            top: -120,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(77,158,255,0.07) 0%, transparent 65%)",
          }}
        />

        {/* Bottom-right glow */}
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(77,158,255,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Left accent stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 4,
            height: 630,
            background:
              "linear-gradient(180deg, #4d9eff 0%, rgba(77,158,255,0.15) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "72px 96px 64px 96px",
            flex: 1,
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.2em",
              color: "#4d9eff",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            Ranked Competitive Typing
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 116,
              fontWeight: 800,
              color: "#e8e8f0",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              marginBottom: 28,
            }}
          >
            TypeOff
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 26,
              color: "#6b7280",
              lineHeight: 1.5,
              marginBottom: 0,
              flex: 1,
            }}
          >
            Race real players in ELO-matched typing battles.{"\n"}
            Climb the ladder. Prove your speed.
          </div>

          {/* Rank tiers */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 36,
              flexWrap: "nowrap",
            }}
          >
            {TIERS.map(({ label, color }) => {
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: `rgba(${r},${g},${b},0.08)`,
                    border: `1px solid rgba(${r},${g},${b},0.25)`,
                    borderRadius: 6,
                    padding: "7px 13px",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Domain */}
          <div
            style={{
              fontSize: 16,
              color: "rgba(107,114,128,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            typeoff.gg
          </div>
        </div>

        {/* Right panel: WPM card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingRight: 88,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#16162a",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "36px 48px",
              width: 256,
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                height: 2,
                width: "100%",
                background: "#4d9eff",
                borderRadius: 999,
                marginBottom: 32,
                opacity: 0.7,
              }}
            />

            {/* WPM */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 3,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 80,
                  fontWeight: 800,
                  color: "#4d9eff",
                  lineHeight: 1,
                }}
              >
                142
              </span>
              <span
                style={{
                  fontSize: 30,
                  color: "rgba(77,158,255,0.45)",
                  fontWeight: 400,
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                .37
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              wpm
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                marginBottom: 24,
              }}
            />

            {/* Accuracy */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 2,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  color: "#e8e8f0",
                  lineHeight: 1,
                }}
              >
                98
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: "rgba(232,232,240,0.35)",
                  fontWeight: 400,
                }}
              >
                .2%
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              accuracy
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
