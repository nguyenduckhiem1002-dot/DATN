import type { Category } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { data, Link, Outlet } from "react-router";
import { z } from "zod";
import BulkActionsDropdown from "~/components/category/bulk-actions-dropdown";
import CategoryQuickActions from "~/components/category/category-quick-actions";
import { ErrorContent } from "~/components/errors";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import LineBreakText from "~/components/layout/line-break-text";
import { List } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import { Badge } from "~/components/shared/badge";
import { Button } from "~/components/shared/button";
import { Th, Td } from "~/components/table";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";
import {
  deleteCategory,
  getCategories,
} from "~/modules/category/service.server";
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
  payload,
  error,
  getCurrentSearchParams,
  parseData,
} from "~/utils/http.server";
import { getParamsValues } from "~/utils/list";
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
      entity: PermissionEntity.category,
      action: PermissionAction.read,
    });

    const searchParams = getCurrentSearchParams(request);
    const { page, perPageParam, search } = getParamsValues(searchParams);
    const hasActiveFilters = computeHasActiveFilters(searchParams);
    const cookie = await updateCookieWithPerPage(request, perPageParam);
    const { perPage } = cookie;

    const { categories, totalCategories } = await getCategories({
      organizationId,
      page,
      perPage,
      search,
    });
    const totalPages = Math.ceil(totalCategories / perPage);

    const header: HeaderData = {
      title: "Danh mục",
    };
    const modelName = {
      singular: "danh mục",
      plural: "danh mục",
    };

    return data(
      payload({
        header,
        items: categories,
        search,
        page,
        totalItems: totalCategories,
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
    const { organizationId } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.category,
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

    await deleteCategory({ id, organizationId });

    sendNotification({
      title: "Đã xóa danh mục",
      message: "Danh mục đã được xóa thành công",
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
  breadcrumb: () => <Link to="/categories">Danh mục</Link>,
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
          aria-label={`tạo danh mục mới`}
          data-test-id="createNewCategory"
        >
          Danh mục mới
        </Button>
      </Header>
      <ListContentWrapper>
        <Filters />
        <Outlet />
        <List
          bulkActions={
            isBaseOrSelfService ? undefined : <BulkActionsDropdown />
          }
          customEmptyStateContent={{
            title: "Chưa có danh mục",
            text: "Danh mục giúp sắp xếp tài sản theo loại, hỗ trợ nhóm và lọc kho tài sản dễ dàng hơn.",
            newButtonRoute: "/categories/new",
            newButtonContent: "Tạo danh mục đầu tiên",
          }}
          ItemComponent={CategoryItem}
          headerChildren={
            <>
              <Th>Mô tả</Th>
              <Th>Tài sản</Th>
              <Th>Thao tác</Th>
            </>
          }
        />
      </ListContentWrapper>
    </>
  );
}

const CategoryItem = ({
  item,
}: {
  item: Pick<Category, "id" | "description" | "name" | "color"> & {
    _count: {
      assets: number;
    };
  };
}) => (
  <>
    <Td title={`Danh mục: ${item.name}`} className="w-1/4">
      <Badge color={item.color} withDot={false}>
        {item.name}
      </Badge>
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
    <Td>{item._count.assets}</Td>
    <Td>
      <CategoryQuickActions category={item} />
    </Td>
  </>
);
