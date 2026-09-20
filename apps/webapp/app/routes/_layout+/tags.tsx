import type { Tag } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { data, Link, Outlet } from "react-router";
import { z } from "zod";
import { ErrorContent } from "~/components/errors";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import LineBreakText from "~/components/layout/line-break-text";
import { List } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import { Button } from "~/components/shared/button";
import { GrayBadge } from "~/components/shared/gray-badge";
import { Tag as TagBadge } from "~/components/shared/tag";
import { Th, Td } from "~/components/table";
import BulkActionsDropdown from "~/components/tag/bulk-actions-dropdown";
import TagQuickActions from "~/components/tag/tag-quick-actions";
import TagUseForFilter from "~/components/tag/tag-use-for-filter";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";

import { deleteTag, getTags } from "~/modules/tag/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import {
  setCookie,
  updateCookieWithPerPage,
  userPrefs,
} from "~/utils/cookies.server";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { computeHasActiveFilters } from "~/utils/filter-params";
import {
  assertIsDelete,
  payload,
  error,
  getCurrentSearchParams,
  parseData,
} from "~/utils/http.server";
import { getParamsValues } from "~/utils/list";
import { formatEnum } from "~/utils/misc";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.tag,
      action: PermissionAction.read,
    });

    const searchParams = getCurrentSearchParams(request);
    const { page, perPageParam, search } = getParamsValues(searchParams);
    const hasActiveFilters = computeHasActiveFilters(searchParams);
    const cookie = await updateCookieWithPerPage(request, perPageParam);
    const { perPage } = cookie;
    const { tags, totalTags } = await getTags({
      organizationId,
      page,
      perPage,
      search,
      request,
    });
    const totalPages = Math.ceil(totalTags / perPage);

    const header: HeaderData = {
      title: "Thẻ",
    };
    const modelName = {
      singular: "thẻ",
      plural: "thẻ",
    };

    return data(
      payload({
        header,
        items: tags,
        search,
        page,
        totalItems: totalTags,
        totalPages,
        perPage,
        modelName,
        hasActiveFilters,
      }),
      {
        headers: [setCookie(await userPrefs.serialize(cookie))],
      }
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
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
    assertIsDelete(request);

    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.tag,
      action: PermissionAction.delete,
    });

    const { id } = parseData(
      await request.formData(),
      z.object({
        id: z.string(),
      }),
      {
        additionalData: { userId },
      }
    );

    await deleteTag({ id, organizationId });

    sendNotification({
      title: "Đã xóa thẻ",
      message: "Thẻ đã được xóa thành công",
      icon: { name: "trash", variant: "error" },
      senderId: userId,
    });

    return payload({ success: true });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return data(error(reason), { status: reason.status });
  }
}

export const handle = {
  breadcrumb: () => <Link to="/tags">Thẻ</Link>,
};
export const ErrorBoundary = () => <ErrorContent />;

export default function CategoriesPage() {
  const { isBaseOrSelfService } = useUserRoleHelper();

  return (
    <>
      <Header>
        <Button
          to="new"
          role="link"
          aria-label={`tạo thẻ mới`}
          data-test-id="createNewTag"
        >
          Thẻ mới
        </Button>
      </Header>
      <ListContentWrapper>
        <Filters
          slots={{
            "right-of-search": <TagUseForFilter />,
          }}
        />
        <Outlet />
        <List
          bulkActions={
            isBaseOrSelfService ? undefined : <BulkActionsDropdown />
          }
          customEmptyStateContent={{
            title: "Chưa có thẻ",
            text: "Thẻ giúp gắn từ khóa linh hoạt cho tài sản và bổ sung thông tin phân loại tùy chỉnh.",
            newButtonRoute: "/tags/new",
            newButtonContent: "Tạo thẻ đầu tiên",
          }}
          ItemComponent={TagItem}
          headerChildren={
            <>
              <Th>Mô tả</Th>
              <Th>Áp dụng cho</Th>
              <Th>Thao tác</Th>
            </>
          }
        />
      </ListContentWrapper>
    </>
  );
}

const TagItem = ({
  item,
}: {
  item: Pick<Tag, "id" | "description" | "name" | "useFor" | "color">;
}) => (
  <>
    <Td className="w-1/4 text-left" title={`Thẻ: ${item.name}`}>
      <TagBadge color={item.color ?? undefined} withDot={false}>
        {item.name}
      </TagBadge>
    </Td>
    <Td className="max-w-62 md:w-3/4">
      {item.description ? (
        <LineBreakText
          className="md:w-3/4"
          text={item.description}
          numberOfLines={3}
          charactersPerLine={60}
        />
      ) : null}
    </Td>
    <Td>
      <div className="flex min-w-32 items-center gap-2">
        {item.useFor && item.useFor.length > 0 ? (
          item.useFor.map((useFor) => (
            <GrayBadge key={useFor}>{formatEnum(useFor)}</GrayBadge>
          ))
        ) : (
          <GrayBadge>Tất cả</GrayBadge>
        )}
      </div>
    </Td>
    <Td className="text-left">
      <TagQuickActions tag={item} />
    </Td>
  </>
);
