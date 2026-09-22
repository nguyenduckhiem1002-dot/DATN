import { OrganizationRoles } from "@prisma/client";
import type { LoaderFunctionArgs } from "react-router";
import { data, Outlet, useLoaderData, useParams } from "react-router";
import { ErrorContent } from "~/components/errors";
import HorizontalTabs from "~/components/layout/horizontal-tabs";
import type { Item } from "~/components/layout/horizontal-tabs/types";
import When from "~/components/when/when";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { payload, error } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export type UserFriendlyRoles =
  | "Administrator"
  | "Owner"
  | "Base"
  | "Self service";
export const meta = () => [{ title: appendToMetaTitle("Cài đặt nhân sự") }];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const authSession = context.getSession();
  const { userId } = authSession;
  try {
    const { currentOrganization } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.teamMember,
      action: PermissionAction.read,
    });

    const isPersonalOrg = currentOrganization.type === "PERSONAL";

    return payload({
      isPersonalOrg,
      orgName: currentOrganization.name,
    });
  } catch (cause) {
    const reason = makeShelfError(cause);
    throw data(error(reason), { status: reason.status });
  }
};

export const organizationRolesMap: Record<string, UserFriendlyRoles> = {
  [OrganizationRoles.ADMIN]: "Administrator",
  [OrganizationRoles.OWNER]: "Owner",
  [OrganizationRoles.BASE]: "Base",
  [OrganizationRoles.SELF_SERVICE]: "Self service",
};

export default function TeamSettings() {
  const { isPersonalOrg, orgName } = useLoaderData<typeof loader>();

  const TABS: Item[] = [
    ...(!isPersonalOrg
      ? [
          { to: "users", content: "Người dùng" },
          { to: "invites", content: "Lời mời" },
        ]
      : []),
    { to: "nrm", content: "Thành viên chưa đăng ký" },
  ];

  const params = useParams();

  return (
    <>
      <When truthy={!params.userId}>
        <div className="rounded border bg-white p-4 md:px-10 md:py-8">
          <h1 className="text-[18px] font-semibold">
            {isPersonalOrg ? "Nhân sự" : `Nhân sự - ${orgName}`}
          </h1>
          {/*
            A Personal workspace has no team to manage, so the standard line
            promises something the banner below it immediately withdraws. It
            still has custody, which is what the page is good for there.
          */}
          <p className="mb-6 text-sm text-gray-600">
            {isPersonalOrg
              ? "Theo dõi người đang được bàn giao tài sản."
              : "Quản lý thành viên và phân công tài sản cho từng người."}
          </p>
          <HorizontalTabs items={TABS} />
          <Outlet />
        </div>
      </When>
      <When truthy={!!params?.userId?.length}>
        <Outlet />
      </When>
    </>
  );
}
export const ErrorBoundary = () => <ErrorContent />;
