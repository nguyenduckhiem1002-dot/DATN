/**
 * Client-side list/overview view params.
 *
 * Some list/overview pages (e.g. the booking overview) filter, sort, and
 * paginate **entirely in the browser** from data already loaded once — so
 * changing these params must NOT trigger a server revalidation of the route or
 * any of its ancestor layout routes. This module defines that param set and the
 * shared `shouldRevalidate` predicate that ancestor routes use to opt out of
 * revalidation for such navigations.
 *
 * `per_page` is intentionally NOT included: changing the page size updates a
 * server-side cookie and cannot be satisfied purely client-side, so it must
 * still revalidate.
 *
 * @see {@link file://../modules/booking/booking-overview-client-cache.ts}
 * @see {@link file://../modules/booking/shape-booking-assets.ts}
 * @see docs/superpowers/specs/2026-06-01-booking-asset-search-in-memory-design.md
 */
import type { ShouldRevalidateFunction } from "react-router";

/** Search params handled purely client-side (no server refetch needed). */
export const CLIENT_VIEW_PARAM_KEYS = [
  "s",
  "orderBy",
  "orderDirection",
  "page",
] as const;

/**
 * True when navigating from `currentUrl` to `nextUrl` is a same-path navigation
 * whose only differing search params are client view params (search/sort/page).
 *
 * A navigation to the **identical** URL is deliberately NOT a client view
 * change: nothing about the view changed, so there is nothing for the page to
 * satisfy client-side. Those navigations are re-navigations, either a redirect
 * that lands back on the current URL or an explicit `router.revalidate()`, and
 * they exist precisely to refetch. Treating them as view changes silently
 * swallowed the refetch. A differing fragment does not count as identical:
 * fragments are client-only, so a hash change stays a view change.
 *
 * @param currentUrl - The URL being navigated away from
 * @param nextUrl - The URL being navigated to
 * @returns Whether the change is purely a client-handled view change
 */
export function isClientViewOnlyNavigation(
  currentUrl: URL,
  nextUrl: URL
): boolean {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return false;
  }
  if (
    currentUrl.search === nextUrl.search &&
    currentUrl.hash === nextUrl.hash
  ) {
    return false;
  }
  const withoutViewParams = (url: URL): string => {
    const params = new URLSearchParams(url.searchParams);
    for (const key of CLIENT_VIEW_PARAM_KEYS) {
      params.delete(key);
    }
    params.sort();
    return params.toString();
  };
  return withoutViewParams(currentUrl) === withoutViewParams(nextUrl);
}

/**
 * Shared `shouldRevalidate` for ancestor routes of a page that does its own
 * client-side filtering/sorting/pagination. Skips revalidation for same-path
 * client-view-only GET navigations; defers to the default (which revalidates)
 * for mutations and any real navigation, so data stays correct.
 */
export const skipRevalidationOnClientViewChange: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) => {
  // Submissions (mutations) must always revalidate to refresh data.
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  if (isClientViewOnlyNavigation(currentUrl, nextUrl)) {
    return false;
  }
  return defaultShouldRevalidate;
};


/**
 * App-shell revalidation policy.
 *
 * The authenticated shell loader resolves user, organization, subscription,
 * booking settings, working hours and sidebar preferences. None of those
 * values depend on ordinary child-route navigation, so rerunning that loader
 * for every click adds avoidable DB/service latency on top of the destination
 * route loader.
 *
 * Exceptions:
 * - mutations: shell state may have changed;
 * - identical-URL revalidation: preserves explicit revalidator/redirect refreshes;
 * - crossing the /account-details boundary: disabledTeamOrg intentionally
 *   depends on whether the URL is inside account details.
 */
export const skipAppShellRevalidationOnGetNavigation: ShouldRevalidateFunction =
  ({
    currentUrl,
    nextUrl,
    formMethod,
    defaultShouldRevalidate,
  }) => {
    if (formMethod && formMethod !== "GET") {
      return defaultShouldRevalidate;
    }

    const isIdenticalUrl =
      currentUrl.pathname === nextUrl.pathname &&
      currentUrl.search === nextUrl.search &&
      currentUrl.hash === nextUrl.hash;

    if (isIdenticalUrl) {
      return defaultShouldRevalidate;
    }

    const isAccountDetails = (url: URL) =>
      url.pathname === "/account-details" ||
      url.pathname.startsWith("/account-details/");

    if (isAccountDetails(currentUrl) !== isAccountDetails(nextUrl)) {
      return defaultShouldRevalidate;
    }

    return false;
  };
