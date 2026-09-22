/**
 * Route: Asset Models (parent layout)
 *
 * Parent layout for the asset models settings section.
 * Renders an Outlet for child routes (index, new, edit).
 * Handles the delete action for asset models.
 *
 * @see {@link file://./settings.asset-models.index.tsx} Index route
 * @see {@link file://./settings.asset-models.new.tsx} Create route
 * @see {@link file://./settings.asset-models.$assetModelId_.edit.tsx} Edit route
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, Link, Outlet } from "react-router";
import { z } from "zod";
import { BulkDeleteAssetModelSchema } from "~/components/asset-model/bulk-delete-dialog";
import { ErrorContent } from "~/components/errors";
import {
  bulkDeleteAssetModels,
  deleteAssetModel,
} from "~/modules/asset-model/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { payload, error, parseData } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export const meta = () => [
  { title: appendToMetaTitle("Cài đặt mẫu tài sản") },
];

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.assetModel,
      action: PermissionAction.read,
    });

    return payload(null);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw data(error(reason), { status: reason.status });
  }
}

export async function action({ context, request }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.assetModel,
      action: PermissionAction.delete,
    });

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "bulk-delete") {
      const { assetModelIds, currentSearchParams } = parseData(
        formData,
        BulkDeleteAssetModelSchema.extend({
          currentSearchParams: z.string().optional(),
        }),
        { additionalData: { userId } }
      );

      await bulkDeleteAssetModels({
        assetModelIds,
        organizationId,
        currentSearchParams,
        userId,
      });

      sendNotification({
        title: "Đã xóa mẫu tài sản",
        message: "Các mẫu tài sản đã chọn được xóa thành công",
        icon: { name: "trash", variant: "error" },
        senderId: userId,
      });

      return payload({ success: true });
    }

    /** Default: single asset model delete */
    const { id } = parseData(
      formData,
      z.object({
        id: z.string(),
      }),
      {
        additionalData: { userId },
      }
    );

    await deleteAssetModel({ id, organizationId, userId });

    sendNotification({
      title: "Đã xóa mẫu tài sản",
      message: "Mẫu tài sản đã được xóa thành công",
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
  breadcrumb: () => <Link to="/settings/asset-models">Mẫu tài sản</Link>,
};

export default function AssetModelsLayout() {
  return <Outlet />;
}

export const ErrorBoundary = () => <ErrorContent />;
