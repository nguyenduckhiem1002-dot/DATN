/**
 * Custom Fields settings — the workspace's list of custom field definitions.
 *
 * Lists every definition with its type, categories and active state, and offers
 * creation until the workspace reaches its plan's active-field limit.
 *
 * @see {@link file://./settings.custom-fields.new.tsx} creating a definition
 * @see {@link file://../../modules/custom-field/service.server.ts}
 */
import type { Prisma } from "@prisma/client";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link } from "react-router";
import { CategoryBadge } from "~/components/assets/category-badge";
import { ActionsDropdown } from "~/components/custom-fields/actions-dropdown";
import BulkActionsDropdown from "~/components/custom-fields/bulk-actions-dropdown";
import type { HeaderData } from "~/components/layout/header/types";
import { List } from "~/components/list";
import ItemsWithViewMore from "~/components/list/items-with-view-more";
import { Badge } from "~/components/shared/badge";
import { Button } from "~/components/shared/button";
import { GrayBadge } from "~/components/shared/gray-badge";
import { Td, Th } from "~/components/table";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";
import { getFilteredAndPaginatedCustomFields } from "~/modules/custom-field/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import {
  setCookie,
  updateCookieWithPerPage,
  userPrefs,
} from "~/utils/cookies.server";
import { FIELD_TYPE_NAME } from "~/utils/custom-fields";
import { makeShelfError } from "~/utils/error";
import { payload, error, getCurrentSearchParams } from "~/utils/http.server";
import { getParamsValues } from "~/utils/list";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

/** Browser tab title for the list. */
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

/**
 * Loads one page of custom field definitions for the current search, and
 * whether the plan allows another active field.
 *
 * @returns The page of definitions, pagination, and `canCreateMoreCustomFields`
 * @throws {ShelfError} 403 when the caller lacks `customField: read`
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.customField,
      action: PermissionAction.read,
    });

    const searchParams = getCurrentSearchParams(request);
    const { page, perPageParam, search } = getParamsValues(searchParams);
    const cookie = await updateCookieWithPerPage(request, perPageParam);
    const { perPage } = cookie;

    const { customFields, totalCustomFields } =
      await getFilteredAndPaginatedCustomFields({
        organizationId,
        page,
        perPage,
        search,
      });

    // Divide by the resolved page size. The raw `per_page` param is 0 whenever
    // the URL carries none.
    const totalPages = Math.ceil(totalCustomFields / perPage);

    const header: HeaderData = {
      title: "Trường tùy chỉnh",
    };
    const modelName = {
      singular: "trường tùy chỉnh",
      plural: "trường tùy chỉnh",
    };

    return data(
      payload({
        header,
        items: customFields,
        search,
        page,
        totalItems: totalCustomFields,
        totalPages,
        perPage,
        modelName,
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

/** The custom fields list, with its create button and bulk actions. */
export default function CustomFieldsIndexPage() {
  const { isBaseOrSelfService } = useUserRoleHelper();

  return (
    <>
      <div className="mb-2.5 flex items-center justify-between bg-white md:rounded md:border md:border-gray-200 md:px-6 md:py-5">
        <h2 className=" text-lg text-gray-900">Trường tùy chỉnh</h2>
        <Button
          to="new"
          role="link"
          aria-label="Tạo trường tùy chỉnh mới"
          data-test-id="createNewCustomField"
          variant="primary"
        >
          Trường tùy chỉnh mới
        </Button>
      </div>
      <List
        bulkActions={isBaseOrSelfService ? undefined : <BulkActionsDropdown />}
        ItemComponent={CustomFieldRow}
        headerChildren={
          <>
            <Th>Danh mục</Th>
            <Th>Bắt buộc</Th>
            <Th>Trạng thái</Th>
            <Th>Đang dùng cho</Th>
            <Th>Thao tác</Th>
          </>
        }
      />
    </>
  );
}
function CustomFieldRow({
  item,
}: {
  item: Prisma.CustomFieldGetPayload<{ include: { categories: true } }> & {
    usageCount: number;
  };
}) {
  return (
    <>
      <Td className="w-full">
        <Link
          to={`${item.id}/edit`}
          className="block text-text-sm font-medium text-gray-900"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <span className="block">{item.name}</span>
              <span className="text-gray-600">
                {FIELD_TYPE_NAME[item.type]}
              </span>
            </div>
          </div>
        </Link>
      </Td>
      <Td>
        <ItemsWithViewMore
          items={item.categories}
          emptyMessage={<GrayBadge>Tất cả</GrayBadge>}
          renderItem={(category) => (
            <CategoryBadge
              category={category}
              className="mb-2 mr-2"
              key={category.id}
            />
          )}
        />
      </Td>
      <Td>
        <span className="text-text-sm font-medium capitalize text-gray-600">
          {item.required ? "Có" : "Không"}
        </span>
      </Td>
      <Td>
        {!item.active ? (
          <Badge color="#dc2626" withDot={false}>
            Không hoạt động
          </Badge>
        ) : (
          <Badge color="#059669" withDot={false}>
            Đang hoạt động
          </Badge>
        )}
      </Td>
      <Td>
        <span className="text-text-sm font-medium text-gray-600">
          {`${item.usageCount} tài sản`}
        </span>
      </Td>
      <Td>
        <ActionsDropdown customField={item} />
      </Td>
    </>
  );
}
