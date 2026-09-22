import type { Prisma } from "@prisma/client";
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router";
import { data, redirect, useLoaderData } from "react-router";
import { z } from "zod";
import ContextualModal from "~/components/layout/contextual-modal";

import type { HeaderData } from "~/components/layout/header/types";
import { List } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import BulkActionsDropdown from "~/components/nrm/bulk-actions-dropdown";
import { ExportNrmButton } from "~/components/nrm/export-nrm-button";
import { Button } from "~/components/shared/button";
import { Td, Th } from "~/components/table";
import { ImportNrmButton } from "~/components/workspace/import-nrm-button";
import { TeamMembersActionsDropdown } from "~/components/workspace/nrm-actions-dropdown";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";
import { getPaginatedAndFilterableSettingTeamMembers } from "~/modules/settings/service.server";
import { getHeldCustodyCount } from "~/modules/team-member/custody-count";
import { deleteNRM } from "~/modules/team-member/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError, ShelfError } from "~/utils/error";
import { error, parseData, payload } from "~/utils/http.server";
import { isPersonalOrg as checkIsPersonalOrg } from "~/utils/organization";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, currentOrganization } = await requirePermission({
        userId,
        request,
        entity: PermissionEntity.teamMember,
        action: PermissionAction.read,
      });

    const { page, perPage, search, totalPages, teamMembers, totalTeamMembers } =
      await getPaginatedAndFilterableSettingTeamMembers({
        organizationId,
        request,
      });

    const header: HeaderData = {
      title: "Cài đặt - Quản lý thành viên",
    };

    const modelName = {
      singular: "thành viên chưa đăng ký",
      plural: "thành viên chưa đăng ký",
    };

    return payload({
      header,
      modelName,
      page,
      perPage,
      search,
      totalPages,
      items: teamMembers,
      totalItems: totalTeamMembers,
      canImportNRM: true,
      isPersonalOrg: checkIsPersonalOrg(currentOrganization),
    });
  } catch (cause) {
    const reason = makeShelfError(cause);
    throw data(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export async function action({ context, request }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.teamMember,
      action: PermissionAction.update,
    });

    const formData = await request.formData();

    const { intent } = parseData(
      formData,
      z.object({
        intent: z.enum(["delete"]),
      }),
      {
        additionalData: {
          organizationId,
        },
      }
    );

    switch (intent) {
      case "delete": {
        const { teamMemberId } = parseData(
          formData,
          z.object({
            teamMemberId: z.string(),
          }),
          {
            additionalData: {
              organizationId,
              intent,
            },
          }
        );

        await deleteNRM({ nrmId: teamMemberId, organizationId });

        return redirect(`/settings/team/nrm`);
      }
      default: {
        throw new ShelfError({
          cause: null,
          message: "Thao tác không hợp lệ",
          additionalData: { intent },
          label: "Team",
        });
      }
    }
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return data(error(reason), { status: reason.status });
  }
}

export default function NrmSettings() {
  const { canImportNRM } = useLoaderData<typeof loader>();
  const { isBaseOrSelfService } = useUserRoleHelper();

  return (
    <div>
      <p className="mb-6 text-xs text-gray-600">
        Thành viên chưa đăng ký vẫn có thể được bàn giao tài sản. Nếu cần họ
        đăng nhập hoặc nhận thông báo, hãy mời họ bằng email.
      </p>

      <ListContentWrapper>
        <Filters>
          <div className="flex items-center justify-end gap-2">
            <ExportNrmButton />
            <ImportNrmButton canImportNRM={canImportNRM} />

            <Button
              variant="primary"
              to="add-member"
              className="mt-2 w-full md:mt-0 md:w-max"
            >
              <span className=" whitespace-nowrap">Thêm thành viên</span>
            </Button>
          </div>
        </Filters>

        <List
          bulkActions={
            isBaseOrSelfService ? undefined : <BulkActionsDropdown />
          }
          className="overflow-x-visible md:overflow-x-auto"
          ItemComponent={TeamMemberRow}
          customEmptyStateContent={{
            title: "Chưa có thành viên chưa đăng ký",
            text: "Thành viên chưa đăng ký là bản ghi dùng để bàn giao tài sản và không thể đăng nhập hệ thống.",
            newButtonRoute: "add-member",
            newButtonContent: "Thêm thành viên",
          }}
          hideFirstHeaderColumn
          headerChildren={
            <>
              <Th>Mã</Th>
              <Th>Tên</Th>
              <Th>Tài sản bàn giao</Th>
              <Th>Thao tác</Th>
            </>
          }
        />
      </ListContentWrapper>

      <ContextualModal />
    </div>
  );
}

function TeamMemberRow({
  item,
}: {
  item: Prisma.TeamMemberGetPayload<{
    include: {
      _count: {
        select: {
          custodies: true;
          kitCustodies: true;
        };
      };
    };
  }>;
}) {
  return (
    <>
      <Td>
        <div>
          <div className="pl-4 md:pl-6">{item.id}</div>
        </div>
      </Td>
      <Td className="w-full whitespace-normal">{item.name}</Td>
      <Td className="text-right">{getHeldCustodyCount(item._count)}</Td>
      <Td className="text-right">
        <TeamMembersActionsDropdown teamMember={item} />
      </Td>
    </>
  );
}
