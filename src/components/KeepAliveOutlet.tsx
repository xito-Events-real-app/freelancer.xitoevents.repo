import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, matchPath } from "react-router-dom";

export interface KeepAliveRoute {
  /** Route path pattern, e.g. "/", "/discover", "/market" */
  path: string;
  /** Element to render & keep mounted */
  element: ReactNode;
}

interface Props {
  routes: KeepAliveRoute[];
  /** Rendered for any path not in `routes` (normal route tree). */
  fallback: ReactNode;
}

/**
 * Renders all visited `routes` simultaneously, hiding the inactive ones with
 * display:none so their React state, scroll position, and React-Query data
 * are preserved across navigation. Pages are lazy-mounted on first visit.
 */
export default function KeepAliveOutlet({ routes, fallback }: Props) {
  const location = useLocation();
  const mountedRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);

  useEffect(() => {
    const handler = () => {
      mountedRef.current.clear();
      force((n) => n + 1);
    };
    window.addEventListener("keepalive:reset", handler);
    return () => window.removeEventListener("keepalive:reset", handler);
  }, []);

  const activeRoute = routes.find((r) =>
    matchPath({ path: r.path, end: true }, location.pathname)
  );

  if (activeRoute) mountedRef.current.add(activeRoute.path);

  return (
    <>
      {routes.map((r) => {
        if (!mountedRef.current.has(r.path)) return null;
        const isActive = activeRoute?.path === r.path;
        return (
          <div
            key={r.path}
            style={{ display: isActive ? "block" : "none" }}
            aria-hidden={!isActive}
          >
            {r.element}
          </div>
        );
      })}
      {!activeRoute && fallback}
    </>
  );
}

/**
 * Imperative cache reset (e.g. on logout). Since the cache lives in a ref
 * inside <KeepAliveOutlet>, we expose a global event the component listens to.
 */
export function resetKeepAliveCache() {
  window.dispatchEvent(new Event("keepalive:reset"));
}
