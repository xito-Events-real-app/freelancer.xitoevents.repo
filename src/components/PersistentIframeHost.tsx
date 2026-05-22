import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Eye, Sparkles } from "lucide-react";
import { useViewMode } from "@/contexts/ViewModeContext";

const XITO_PATH = "/xito-events";
const XITO_URL = "https://xitoevents.com/photography";

/**
 * Mounts a single iframe for xitoevents.com that persists across route changes.
 * Lazy-mounted on first visit, then kept in DOM (just hidden) so subsequent
 * visits are instant and preserve scroll/session state.
 */
export default function PersistentIframeHost() {
  const location = useLocation();
  const { effectiveMode } = useViewMode();
  const isActive = location.pathname === XITO_PATH;
  const [hasMounted, setHasMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isDesktop = effectiveMode === "desktop";

  useEffect(() => {
    if (isActive && !hasMounted) setHasMounted(true);
  }, [isActive, hasMounted]);

  if (!hasMounted) return null;

  return (
    <div
      aria-hidden={!isActive}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: isDesktop ? 0 : "4rem",
        left: isDesktop ? 260 : 0,
        zIndex: isActive ? 30 : -1,
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {!loaded && <XitoSkeleton />}
      <iframe
        src={XITO_URL}
        title="Xito Events Photography"
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          opacity: loaded ? 1 : 0,
          transition: "opacity 300ms ease-out",
        }}
      />
    </div>
  );
}

/** Themed loading skeleton matching xitoevents.com/photography aesthetic. */
function XitoSkeleton() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          background: "#ffffff",
          borderBottom: "1px solid #f1ecec",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#1a1a1a",
            letterSpacing: "-0.01em",
          }}
        >
          Xito<span style={{ color: "#c8102e" }}>.</span>Events
        </span>
        <div
          style={{
            flex: 1,
            height: 36,
            background: "#faf7f6",
            border: "1px solid #f1ecec",
            borderRadius: 999,
          }}
        />
      </div>

      {/* Hero — dark maroon */}
      <div
        style={{
          background:
            "radial-gradient(ellipse at top left, #4a0a14 0%, #2a0509 60%, #1a0306 100%)",
          padding: "32px 20px 28px",
          color: "#fff",
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          MOST LOVED SHOTS
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 400,
              color: "#f4c4c8",
            }}
          >
            Photography
          </span>{" "}
          Studios in Nepal
        </h1>
        <p
          style={{
            margin: "8px 0 20px",
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Tap any photo to visit the studio
        </p>

        {/* Carousel skeleton */}
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: "0 0 38%",
                aspectRatio: "3 / 4",
                borderRadius: 14,
                background:
                  "linear-gradient(110deg, rgba(255,255,255,0.05) 8%, rgba(255,255,255,0.12) 18%, rgba(255,255,255,0.05) 33%)",
                backgroundSize: "200% 100%",
                animation: "xito-shimmer 1.4s linear infinite",
              }}
            />
          ))}
        </div>
      </div>

      {/* Info banner — "this is how clients see you" */}
      <div
        style={{
          margin: "16px 16px 0",
          padding: "14px 14px",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, #fff5f6 0%, #fdebed 100%)",
          border: "1px solid #fbd5d9",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#c8102e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Eye size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              Client View
            </p>
            <Sparkles size={12} color="#c8102e" />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.45,
              color: "#5a4a4c",
            }}
          >
            This is exactly how your clients discover and view your studio on
            xitoevents.com — make sure your profile shines.
          </p>
        </div>
      </div>

      {/* All Studios heading skeleton */}
      <div style={{ padding: "20px 16px 8px" }}>
        <div
          style={{
            height: 22,
            width: 110,
            borderRadius: 6,
            background: "#f1ecec",
          }}
        />
      </div>

      {/* Studio cards grid skeleton */}
      <div
        style={{
          flex: 1,
          padding: "0 16px 16px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          overflow: "hidden",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              borderRadius: 16,
              border: "1px solid #f1ecec",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div
              style={{
                aspectRatio: "16 / 9",
                background:
                  "linear-gradient(110deg, #f5efef 8%, #faf5f5 18%, #f5efef 33%)",
                backgroundSize: "200% 100%",
                animation: "xito-shimmer 1.4s linear infinite",
              }}
            />
            <div style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#f1ecec",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 12,
                    width: "55%",
                    background: "#f1ecec",
                    borderRadius: 4,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: "35%",
                    background: "#f5efef",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes xito-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
