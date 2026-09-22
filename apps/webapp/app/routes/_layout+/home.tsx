/**
 * Dashboard (`/` after auth).
 *
 * Server-side aggregates the workspace KPIs surfaced on the landing tile
 * grid: asset count, total inventory value (QT-aware: `value × quantity`
 * via raw SQL since Prisma's `aggregate({_sum})` can't multiply), assets
 * by category / status, locations, team members, recent activity, and
 * onboarding state. Renders the dashboard hero, KPI tiles, the asset-
 * by-status donut, and the onboarding checklist; tile clicks navigate
 * into the corresponding index page or report.
 */
import { lazy, Suspense } from "react";
import { Prisma } from "@prisma/client";
import type {
  MetaFunction,
  LoaderFunctionArgs,
  LinksFunction,
} from "react-router";
import { data, Link, useLoaderData } from "react-router";
import AnnouncementBar from "~/components/dashboard/announcement-bar";
import OnboardingChecklist from "~/components/dashboard/checklist";
import { ErrorContent } from "~/components/errors";
import ActiveBookings from "~/components/home/active-bookings";
import KpiCards from "~/components/home/kpi-cards";
import OverdueBookings from "~/components/home/overdue-bookings";
import UpcomingBookings from "~/components/home/upcoming-bookings";
import UpcomingReminders from "~/components/home/upcoming-reminders";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { db } from "~/database/db.server";
import { ASSET_MODEL_IMAGE_SELECT } from "~/modules/asset/image-select";
import { getUpcomingRemindersForHomePage } from "~/modules/asset-reminder/service.server";
import { getBookings } from "~/modules/booking/service.server";

import styles from "~/styles/layout/skeleton-loading.css?url";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { getLocale } from "~/utils/client-hints";
import { userPrefs } from "~/utils/cookies.server";
import {
  buildAssetsByStatusChart,
  buildMonthlyGrowthData,
  getDashboardSummaryCounts,
  getCustodiansOrderedByTotalCustodies,
} from "~/utils/dashboard.server";
import { ShelfError, makeShelfError } from "~/utils/error";
import { payload, error } from "~/utils/http.server";
import { parseMarkdownToReact } from "~/utils/md";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

const AssetsByStatusChart = lazy(
  () => import("~/components/dashboard/assets-by-status-chart")
);
const CustodiansList = lazy(
  () => import("~/components/dashboard/custodians")
);
const InventoryValueChart = lazy(
  () => import("~/components/dashboard/inventory-value-chart")
);
const NewestAssets = lazy(
  () => import("~/components/dashboard/newest-assets")
);
const AssetGrowthChart = lazy(
  () => import("~/components/home/asset-growth-chart")
);
const LocationDistribution = lazy(
  () => import("~/components/home/location-distribution")
);

function DashboardWidgetFallback() {
  return (
    <div
      className="h-72 animate-pulse rounded border border-gray-200 bg-white"
      aria-hidden="true"
    />
  );
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, currentOrganization } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.dashboard,
      action: PermissionAction.read,
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    // Fetch all data in parallel — targeted queries instead of loading all assets
    const [
      // 1a. Aggregated asset stats
      assetAggregation,
      dashboardSummary,
      // 1b. Assets by status
      statusGroups,
      // 1c. Monthly growth data
      monthlyRows,
      baselineCount,
      // 1d. Top custodians (direct custody)
      directCustodians,
      // 1d. Bookings for custodian merge (ongoing + overdue)
      { bookings: ongoingAndOverdueBookings },
      // Upcoming bookings
      { bookings: upcomingBookings },
      // 1e. Newest 5 assets
      newAssets,
      // Upcoming reminders
      upcomingReminders,
      // Announcement
      announcement,
      // Location distribution
      locationDistribution,
      // Cookie
      cookieResult,
    ] = await Promise.all([
      // 1a. Asset count + total valuation
      // QT-aware: multiplies valuation × quantity so qty-tracked assets are not silently underreported.
      // `aggregate({_sum: { valuation }})` would only sum the per-unit price; QT assets with
      // quantity > 1 would silently underreport. `$queryRaw` lets us express the multiplication.
      Promise.all([
        db.asset
          .aggregate({
            where: { organizationId },
            _count: { _all: true },
          })
          .catch((cause) => {
            throw new ShelfError({
              cause,
              message: "Không thể tải thống kê tài sản",
              additionalData: { userId, organizationId },
              label: "Dashboard",
            });
          }),
        db
          // `Asset.valuation` is mapped to the DB column `value` (@map),
          // so raw SQL must reference `value`. `COALESCE(quantity, 1)`
          // mirrors `getAssetTotalValue` (which treats nullable quantity
          // as 1, matching the INDIVIDUAL default). No `::bigint` cast —
          // it truncated fractional Float valuations. SUM on a Float ×
          // Int returns `double precision`, which arrives as a JS number.
          .$queryRaw<{ total: number | null }[]>(
            Prisma.sql`
            SELECT COALESCE(SUM(COALESCE(value, 0) * COALESCE(quantity, 1)), 0) AS total
            FROM "Asset"
            WHERE "organizationId" = ${organizationId}
          `
          )
          .catch((cause) => {
            throw new ShelfError({
              cause,
              message: "Không thể tải tổng giá trị tài sản",
              additionalData: { userId, organizationId },
              label: "Dashboard",
            });
          }),
      ]).then(([countResult, valuationRows]) => ({
        _count: countResult._count,
        totalValuation: Number(valuationRows[0]?.total ?? 0),
      })),

      // KPI + onboarding counts share one SQL round trip.
      getDashboardSummaryCounts({ organizationId }),

      // 1b. Assets grouped by status
      db.asset.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),

      // 1c. Monthly asset creation counts (last 12 months)
      db.$queryRaw<{ month_start: Date; assets_created: number }[]>`
        SELECT date_trunc('month', "createdAt") AS month_start,
               COUNT(*)::int AS assets_created
        FROM "Asset"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${twelveMonthsAgo}
        GROUP BY 1
        ORDER BY 1`,

      // 1c. Baseline count (assets before the 12-month window)
      db.asset.count({
        where: { organizationId, createdAt: { lt: twelveMonthsAgo } },
      }),

      // 1d. Team members with direct custody counts
      db.teamMember.findMany({
        where: { organizationId, custodies: { some: {} } },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
              profilePicture: true,
              email: true,
            },
          },
          _count: { select: { custodies: true } },
        },
        orderBy: { custodies: { _count: "desc" } },
        take: 20,
      }),

      // 1d. Ongoing + overdue bookings are loaded once and reused for
      // custodians plus the Active/Overdue dashboard widgets.
      getBookings({
        organizationId,
        userId,
        page: 1,
        // `perPage` is clamped to 20 for anything over 100, so the previous
        // `perPage: 1000` merged custodians from the first 20 active bookings
        // only. `takeCap` is the bounded escape hatch that sees them all.
        takeCap: 1000,
        statuses: ["ONGOING", "OVERDUE"],
        includeAssets: false,
        extraInclude: {
          custodianTeamMember: true,
          custodianUser: true,
          _count: { select: { bookingAssets: true } },
        },
      }),

      // Upcoming bookings (RESERVED, starting from now)
      // Both bookingFrom and bookingTo are required for date filtering
      getBookings({
        organizationId,
        userId,
        page: 1,
        perPage: 5,
        statuses: ["RESERVED"],
        bookingFrom: new Date(),
        bookingTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        includeAssets: false,
        extraInclude: {
          custodianTeamMember: true,
          custodianUser: true,
          _count: { select: { bookingAssets: true } },
        },
      }),

      // 1e. Newest 5 assets
      db.asset
        .findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            category: true,
            custody: { select: { quantity: true } },
            // Model cover image — `<AssetImage>` renders it for assets with
            // no image of their own.
            ...ASSET_MODEL_IMAGE_SELECT,
          },
        })
        .catch((cause) => {
          throw new ShelfError({
            cause,
            message: "Không thể tải danh sách tài sản mới nhất",
            additionalData: { userId, organizationId },
            label: "Dashboard",
          });
        }),

      // Upcoming reminders
      getUpcomingRemindersForHomePage({ organizationId }),

      // Announcement
      db.announcement
        .findFirst({
          where: { published: true },
          orderBy: { createdAt: "desc" },
        })
        .catch((cause) => {
          throw new ShelfError({
            cause,
            message: "Không thể tải thông báo",
            additionalData: { userId, organizationId },
            label: "Dashboard",
          });
        }),

      // Location distribution (top 5)
      // Counts pivot rows (one per asset placed at this location). Aggregating
      // the pivot once and then resolving five names beats a correlated count
      // per location, and `groupBy` only returns locations that have rows — the
      // `> 0` filter the previous shape needed is implicit.
      db.assetLocation
        .groupBy({
          by: ["locationId"],
          where: { organizationId },
          _count: { locationId: true },
          orderBy: { _count: { locationId: "desc" } },
          take: 5,
        })
        .then(async (groups) => {
          if (groups.length === 0) return [];

          const locations = await db.location.findMany({
            where: {
              id: { in: groups.map((g) => g.locationId) },
              organizationId,
            },
            select: { id: true, name: true },
          });
          const nameById = new Map(locations.map((l) => [l.id, l.name]));

          return groups.flatMap((g) => {
            const locationName = nameById.get(g.locationId);
            // Location deleted between the two queries — drop the row rather
            // than render a nameless bar. The single-query shape could not
            // produce this case, so it has no prior behaviour to preserve.
            if (!locationName) return [];

            return [
              {
                locationId: g.locationId,
                locationName,
                assetCount: g._count.locationId,
              },
            ];
          });
        }),

      // Cookie
      userPrefs.parse(request.headers.get("Cookie")).then((c: any) => c || {}),
    ]);

    const totalAssets = assetAggregation._count._all;
    const totalValuation = assetAggregation.totalValuation;
    const {
      teamMembersCount,
      locationsCount,
      categoriesCount,
      valueKnownAssets,
      checklistData,
    } = dashboardSummary;

    // Reuse the combined ONGOING/OVERDUE result instead of issuing two more
    // booking queries. Filtering preserves the server-side ordering within
    // each status because the source list is already ordered by getBookings.
    const overdueBookings = ongoingAndOverdueBookings
      .filter((booking) => booking.status === "OVERDUE")
      .slice(0, 5);
    const activeBookings = ongoingAndOverdueBookings
      .filter((booking) => booking.status === "ONGOING")
      .slice(0, 5);

    const header: HeaderData = {
      title: "Trang chủ",
    };

    return payload({
      header,
      // KPI data
      totalAssets,
      teamMembersCount,
      locationsCount,
      categoriesCount,
      // Widget data
      upcomingBookings,
      overdueBookings,
      activeBookings,
      upcomingReminders,
      locationDistribution,
      // Existing dashboard data
      locale: getLocale(request),
      currency: currentOrganization?.currency,
      totalValuation,
      valueKnownAssets,
      newAssets,
      skipOnboardingChecklist: cookieResult.skipOnboardingChecklist,
      custodiansData: getCustodiansOrderedByTotalCustodies({
        directCustodians,
        bookings: ongoingAndOverdueBookings as any,
      }),
      assetsByStatus: buildAssetsByStatusChart(statusGroups),
      assetGrowthData: buildMonthlyGrowthData(monthlyRows, baselineCount),
      announcement: announcement
        ? {
            ...announcement,
            content: parseMarkdownToReact(announcement.content),
          }
        : null,
      checklistOptions: {
        hasAssets: totalAssets > 0,
        // `directCustodians` is already the "team members holding custody"
        // query, with the same where clause the dropped `custodiesCount`
        // used — `take: 20` cannot change a `> 0` test — so counting them
        // again server-side was a redundant round trip.
        hasCustodies: directCustodians.length > 0,
        ...checklistData,
      },
    });
  } catch (cause) {
    const reason = makeShelfError(cause);
    throw data(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = () => [
  { title: appendToMetaTitle("Trang chủ") },
];

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const handle = {
  breadcrumb: () => <Link to="/home">Trang chủ</Link>,
};

export default function HomePage() {
  const { skipOnboardingChecklist, checklistOptions } =
    useLoaderData<typeof loader>();
  const completedAllChecks = Object.values(checklistOptions).every(Boolean);

  return (
    <div>
      <Header> </Header>
      {completedAllChecks || skipOnboardingChecklist ? (
        <div className="pb-8">
          <AnnouncementBar />

          {/* KPI Summary Cards */}
          <div className="mt-4">
            <KpiCards />
          </div>

          {/* Row 1: Trends & Value — wide chart + value card */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Suspense fallback={<DashboardWidgetFallback />}>
                <AssetGrowthChart />
              </Suspense>
            </div>
            <Suspense fallback={<DashboardWidgetFallback />}>
              <InventoryValueChart />
            </Suspense>
          </div>

          {/* Widget Grid — 3-column rows */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Row 2: Bookings pipeline */}
            <UpcomingBookings />
            <ActiveBookings />
            <OverdueBookings />

            {/* Row 3: Reminders, Status & Locations */}
            <UpcomingReminders />
            <Suspense fallback={<DashboardWidgetFallback />}>
              <AssetsByStatusChart />
            </Suspense>
            <Suspense fallback={<DashboardWidgetFallback />}>
              <LocationDistribution />
            </Suspense>
          </div>

          {/* Row 4: People & Assets — 2-column */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Suspense fallback={<DashboardWidgetFallback />}>
              <CustodiansList />
            </Suspense>
            <Suspense fallback={<DashboardWidgetFallback />}>
              <NewestAssets />
            </Suspense>
          </div>
        </div>
      ) : (
        <OnboardingChecklist />
      )}
    </div>
  );
}

export const ErrorBoundary = () => <ErrorContent />;
