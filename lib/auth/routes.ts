export const dashboardPath = "/dashboard";
export const loginPath = "/login";

const protectedRoutePrefixes = [
  dashboardPath,
  "/workouts",
  "/cardio",
  "/history",
  "/exercises",
  "/progress",
  "/settings",
];

export function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return dashboardPath;
  }

  try {
    const url = new URL(value, "http://app.local");

    if (url.origin !== "http://app.local") {
      return dashboardPath;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return dashboardPath;
  }
}

export function getLoginRedirectUrl(requestUrl: URL) {
  const loginUrl = new URL(loginPath, requestUrl);
  const nextPath = `${requestUrl.pathname}${requestUrl.search}`;

  loginUrl.searchParams.set("next", nextPath);

  return loginUrl;
}
