/**
 * Pick the most specific nav path that matches the current location.
 * Prevents parent routes (e.g. /purchase-requests) from staying active on child routes.
 */
export function resolveActiveNavPath(pathname, navPaths) {
  const matches = navPaths.filter(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!matches.length) return null;
  return matches.sort((a, b) => b.length - a.length)[0];
}

export function isNavItemActive(pathname, itemPath, navPaths) {
  return resolveActiveNavPath(pathname, navPaths) === itemPath;
}
