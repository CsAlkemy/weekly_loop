const AUTH_HINT = "authed";
const AUTH_HINT_TTL_DAYS = 7;

export function setAuthHint(authed: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = authed
    ? `${AUTH_HINT}=1; path=/; max-age=${60 * 60 * 24 * AUTH_HINT_TTL_DAYS}; samesite=lax`
    : `${AUTH_HINT}=; path=/; max-age=0; samesite=lax`;
}
