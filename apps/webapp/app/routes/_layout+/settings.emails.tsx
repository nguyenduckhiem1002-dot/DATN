import { useState } from "react";
import { OrganizationType } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { data, Form, useActionData, useLoaderData } from "react-router";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { ViewButtonGroup } from "~/components/calendar/view-button-group";
import { ErrorContent } from "~/components/errors";
import type { HeaderData } from "~/components/layout/header/types";
import { Button } from "~/components/shared/button";
import { useDisabled } from "~/hooks/use-disabled";
import { EMAIL_FOOTER_MAX_LENGTH } from "~/modules/email-footer/constants";
import { processEmailFooter } from "~/modules/email-footer/email-footer-validator.server";
import { updateOrganization } from "~/modules/organization/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { ShelfError, makeShelfError } from "~/utils/error";
import { getValidationErrors } from "~/utils/http";
import { payload, error, parseData } from "~/utils/http.server";
import type { DataOrErrorResponse } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export const emailFooterSchema = z.object({
  customEmailFooter: z.string().max(500).optional().default(""),
});

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { currentOrganization } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.emailSettings,
      action: PermissionAction.read,
    });

    if (currentOrganization.type === OrganizationType.PERSONAL) {
      throw new ShelfError({
        cause: null,
        title: "Không có quyền",
        message: "Cài đặt email không khả dụng cho không gian làm việc cá nhân.",
        label: "Settings",
        shouldBeCaptured: false,
        status: 403,
      });
    }

    const header: HeaderData = {
      title: "Cài đặt email",
    };

    return payload({
      header,
      organization: currentOrganization,
    });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw data(error(reason), { status: reason.status });
  }
}

export const handle = {
  breadcrumb: () => "Email",
};

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const ErrorBoundary = () => <ErrorContent />;

export async function action({ context, request }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.emailSettings,
      action: PermissionAction.update,
    });

    const formData = await request.formData();

    const { customEmailFooter } = parseData(formData, emailFooterSchema, {
      additionalData: { organizationId },
    });

    const result = processEmailFooter(customEmailFooter);

    if (!result.success) {
      return data(
        error(
          new ShelfError({
            cause: null,
            message: result.error || "Nội dung chân trang email không hợp lệ",
            label: "Settings",
            shouldBeCaptured: false,
            additionalData: {
              validationErrors: {
                customEmailFooter: { message: result.error },
              },
            },
          })
        ),
        { status: 400 }
      );
    }

    await updateOrganization({
      id: organizationId,
      userId,
      customEmailFooter: result.message,
    });

    sendNotification({
      title: "Đã cập nhật cài đặt",
      message: "Chân trang email đã được cập nhật thành công",
      icon: { name: "success", variant: "success" },
      senderId: authSession.userId,
    });

    return data(payload({ success: true }), { status: 200 });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return data(error(reason), { status: reason.status });
  }
}

export default function EmailSettingsPage() {
  const { organization } = useLoaderData<typeof loader>();
  const zo = useZorm("emailFooter", emailFooterSchema);
  const disabled = useDisabled();

  const actionData = useActionData<DataOrErrorResponse>();
  const validationErrors = getValidationErrors<typeof emailFooterSchema>(
    actionData?.error
  );

  const currentFooter = organization.customEmailFooter || "";
  const [charCount, setCharCount] = useState(currentFooter.length);
  const [footerPreview, setFooterPreview] = useState(currentFooter);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      {/* Left column: Form */}
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h3 className="text-text-lg font-semibold">Chân trang email tùy chỉnh</h3>
          <p className="text-sm text-gray-600">
            Thêm nội dung tùy chỉnh hiển thị ở cuối các email hệ thống gửi tới thành viên.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Chân trang sẽ xuất hiện trong các loại email sau:
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>
              <span className="font-medium">Đặt lịch:</span> tạo lịch, nhắc bàn giao,
              nhắc nhận lại, quá hạn, hoàn thành, gia hạn, hủy và cập nhật
            </li>
            <li>
              <span className="font-medium">Nhắc việc tài sản:</span> thông báo nhắc việc
            </li>
            <li>
              <span className="font-medium">Lời mời:</span> email mời tham gia không gian làm việc
            </li>
            <li>
              <span className="font-medium">Quyền truy cập:</span> thông báo thu hồi quyền
            </li>
            <li>
              <span className="font-medium">Kiểm kê:</span> phân công, hủy, hoàn thành, nhắc việc và quá hạn
            </li>
            <li>
              <span className="font-medium">Thay đổi vai trò:</span> thông báo thay đổi quyền
            </li>
          </ul>
        </div>

        <Form method="POST" ref={zo.ref} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor={zo.fields.customEmailFooter()}
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Nội dung chân trang
            </label>
            <textarea
              id={zo.fields.customEmailFooter()}
              name={zo.fields.customEmailFooter()}
              defaultValue={currentFooter}
              disabled={disabled}
              maxLength={EMAIL_FOOTER_MAX_LENGTH}
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-25 disabled:opacity-50"
              placeholder="e.g., ACME Corp - support@acme.com - (555) 123-4567"
              onChange={(e) => {
                setCharCount(e.target.value.length);
                setFooterPreview(e.target.value);
              }}
            />
            {(validationErrors?.customEmailFooter?.message ||
              zo.errors.customEmailFooter()?.message) && (
              <p className="mt-1 text-sm text-error-500">
                {validationErrors?.customEmailFooter?.message ||
                  zo.errors.customEmailFooter()?.message}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Không cho phép chèn liên kết. Có thể nhập địa chỉ email và số điện thoại.
              </p>
              <span className="text-xs text-gray-500">
                {charCount} / {EMAIL_FOOTER_MAX_LENGTH} ký tự
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Lưu ý: Nội dung chân trang có thể ảnh hưởng tới khả năng email được gửi vào hộp thư chính.
          </p>

          <div>
            <Button type="submit" disabled={disabled}>
              {disabled ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </Form>
      </div>

      {/* Right column: Email preview */}
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Xem trước</p>
          <ViewButtonGroup
            views={[
              { label: "Máy tính", value: "desktop" },
              { label: "Điện thoại", value: "mobile" },
            ]}
            currentView={previewMode}
            onViewChange={(v) => setPreviewMode(v as "desktop" | "mobile")}
            size="xs"
          />
        </div>
        <EmailPreview
          footerText={footerPreview}
          organizationName={organization.name}
          previewMode={previewMode}
        />
      </div>
    </div>
  );
}

/**
 * Hoisted preview-button styles. Extracted from the JSX to avoid an
 * inline `style={{ ... }}` object that allocates on every render and
 * trips react-doctor's `no-inline-exhaustive-style` check.
 *
 * Kept as CSS-in-JS (not Tailwind) because the preview intentionally
 * mirrors the transactional email template, which uses raw hex colours.
 */
const EMAIL_PREVIEW_VIEW_BUTTON_STYLE = {
  display: "inline-block",
  backgroundColor: "#EF6820",
  color: "white",
  fontSize: "14px",
  fontWeight: "700",
  padding: "10px 18px",
  borderRadius: "4px",
  marginBottom: "32px",
} as const;

/** Static email preview mimicking the booking email template */
function EmailPreview({
  footerText,
  organizationName,
  previewMode,
}: {
  footerText: string;
  organizationName: string;
  previewMode: "desktop" | "mobile";
}) {
  const isMobile = previewMode === "mobile";

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-300 shadow-lg"
      style={isMobile ? { maxWidth: "375px", margin: "0 auto" } : undefined}
    >
      {/* Title bar — macOS-style window chrome */}
      <div className="flex items-center gap-2 bg-[#3B3B3B] px-4 py-3">
        <span className="size-3 rounded-full bg-[#FF5F57]" />
        <span className="size-3 rounded-full bg-[#FEBC2E]" />
        <span className="size-3 rounded-full bg-[#28C840]" />
      </div>

      {/* Email header — From / To / Subject */}
      <div className="border-b border-gray-200 bg-gray-100 px-5 py-3 text-[13px] leading-relaxed text-gray-600">
        <p>
          <span className="text-gray-400">Từ:</span>{" "}
          <span className="text-gray-700">
            Shelf &lt;notifications@shelf.nu&gt;
          </span>
        </p>
        <p>
          <span className="text-gray-400">Đến:</span>{" "}
          <span className="text-gray-700">jane@example.com</span>
        </p>
        <p>
          <span className="text-gray-400">Tiêu đề:</span>{" "}
          <span className="text-gray-700">
            ✅ Đã đặt lịch (Thiết bị văn phòng)
          </span>
        </p>
      </div>

      {/* Email body viewport — scrollable gray area with white card */}
      <div
        className="overflow-y-auto bg-gray-200 p-6"
        style={{ maxHeight: "600px" }}
      >
        <div
          className="mx-auto rounded-lg bg-white shadow-sm"
          style={{
            maxWidth: "600px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* Matches Container from bookings-updates-template.tsx */}
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "32px",
              }}
            >
              <img
                src="/static/images/logo-full-color(x2).png"
                alt="Logo hệ thống"
                style={{ height: "32px", width: "auto" }}
              />
            </div>

            {/* Email heading */}
            <div style={{ margin: "32px" }}>
              <h1
                style={{
                  fontSize: "20px",
                  color: "#101828",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Lịch đặt tài sản cho Nguyễn Văn A
              </h1>
              <h2
                style={{
                  fontSize: "16px",
                  color: "#101828",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Thiết bị văn phòng | 3 tài sản
              </h2>
              <p style={{ fontSize: "16px", color: "#344054" }}>
                <span style={{ color: "#101828", fontWeight: "600" }}>
                  Người giữ:
                </span>{" "}
                Jane Doe
              </p>
              <p style={{ fontSize: "16px", color: "#344054" }}>
                <span style={{ color: "#101828", fontWeight: "600" }}>
                  Từ:
                </span>{" "}
                01/15/26, 9:00 AM
              </p>
              <p style={{ fontSize: "16px", color: "#344054" }}>
                <span style={{ color: "#101828", fontWeight: "600" }}>Đến:</span>{" "}
                01/17/26, 5:00 PM
              </p>
            </div>

            {/* View button */}
            <div style={EMAIL_PREVIEW_VIEW_BUTTON_STYLE}>
              Xem lịch đặt trong ứng dụng
            </div>

            {/* Custom footer - live preview */}
            {footerText ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "#667085",
                  borderTop: "1px solid #EAECF0",
                  paddingTop: "16px",
                  marginTop: "16px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {footerText}
              </p>
            ) : null}

            {/* Standard email footer */}
            <p
              style={{
                marginTop: "32px",
                fontSize: "14px",
                color: "#344054",
              }}
            >
              This email was sent to jane@example.com because it is part of the
              workspace{" "}
              <span style={{ color: "#101828", fontWeight: "600" }}>
                &quot;{organizationName}&quot;
              </span>
              .
              <br /> If you think you weren&apos;t supposed to have received
              this email please contact the owner of the workspace.
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "#344054",
                marginBottom: "32px",
              }}
            >
              &copy; 2026 Shelf.nu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
