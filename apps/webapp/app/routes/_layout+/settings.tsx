import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link, Outlet, useLoaderData, useMatches } from "react-router";
import { ErrorContent } from "~/components/errors";
import Header from "~/components/layout/header";
import HorizontalTabs from "~/components/layout/horizontal-tabs";
import When from "~/components/when/when";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";
import type { RouteHandleWithName } from "~/modules/types";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { payload, error } from "~/utils/http.server";
import { isPersonalOrg } from "~/utils/organization";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export const handle = {
  breadcrumb: () => <Link to="/settings">Cài đặt</Link>,
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { currentOrganization } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.generalSettings,
      action: PermissionAction.read,
    });

    const title = "Cài đặt";
    const subHeading = "Quản lý cấu hình và tùy chọn của hệ thống.";
    const header = {
      title,
      subHeading,
    };

    return payload({
      header,
      _isPersonalOrg: isPersonalOrg(currentOrganization),
    });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw data(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const shouldRevalidate = () => false;

export default function SettingsPage() {
  const { _isPersonalOrg } = useLoaderData<typeof loader>();
  let items = [
    { to: "general", content: "Chung" },
    ...(!_isPersonalOrg ? [{ to: "bookings", content: "Đặt lịch" }] : []),
    ...(!_isPersonalOrg ? [{ to: "emails", content: "Email" }] : []),
    { to: "custom-fields", content: "Trường tùy chỉnh" },
    { to: "asset-models", content: "Mẫu tài sản" },
    { to: "team", content: "Nhân sự" },
  ];

  const { isBaseOrSelfService } = useUserRoleHelper();
  /** If user is self service, remove the extra items */
  if (isBaseOrSelfService) {
    items = items.filter(
      (item) =>
        ![
          "custom-fields",
          "team",
          "general",
          "bookings",
          "emails",
          "asset-models",
        ].includes(item.to)
    );
  }

  const matches = useMatches();
  const currentRoute: RouteHandleWithName = matches[matches.length - 1];
  return (
    <>
      <Header hidePageDescription />
      <When
        truthy={
          !["$userId.assets", "$userId.bookings", "$userId.notes"].includes(
            currentRoute?.handle?.name
          )
        }
      >
        <HorizontalTabs items={items} />
      </When>
      <Outlet />
    </>
  );
}

export const ErrorBoundary = () => <ErrorContent />;
