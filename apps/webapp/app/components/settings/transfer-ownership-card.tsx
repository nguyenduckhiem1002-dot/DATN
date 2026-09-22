import { useState } from "react";
import { Form, Link, useActionData } from "react-router";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { useCanTransferOwnership } from "~/hooks/use-can-transfer-ownership";
import { useCurrentOrganization } from "~/hooks/use-current-organization";
import { useDisabled } from "~/hooks/use-disabled";
import { getValidationErrors } from "~/utils/http";
import type { DataOrErrorResponse } from "~/utils/http.server";
import type { OwnerSubscriptionInfo } from "~/utils/stripe.server";
import { tw } from "~/utils/tw";
import type { UserNameFields } from "~/utils/user";
import { resolveTeamMemberName } from "~/utils/user";
import { InnerLabel } from "../forms/inner-label";
import Input from "../forms/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../forms/select";
import Icon from "../icons/icon";
import { Button } from "../shared/button";
import { Card } from "../shared/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../shared/modal";
import { WarningBox } from "../shared/warning-box";
import When from "../when/when";

type Admin = UserNameFields & {
  id: string;
  email: string;
};

/** Knowledge-base walkthrough linked from every state of the transfer card */
export const TRANSFER_OWNERSHIP_KB_URL =
  "https://www.shelf.nu/knowledge-base/transfer-workspace-ownership";

type TransferOwnershipCardProps = {
  className?: string;
  /** Form action URL. Defaults to "/settings/general" */
  action?: string;
  /** Organization name for confirmation input. If not provided, uses currentOrganization from context */
  organizationName?: string;
  /** List of admins eligible to become the new owner */
  admins: Admin[];
  /** Subscription info for the current workspace owner */
  ownerSubscriptionInfo: OwnerSubscriptionInfo;
  /** Number of other team workspaces the owner has */
  ownerOtherTeamWorkspacesCount: number;
  /** Whether premium/subscription features are enabled */
  premiumIsEnabled: boolean;
  /**
   * Whether the workspace shown is a PERSONAL workspace. Personal workspaces
   * cannot be transferred, so the card explains the account-email alternative
   * instead of rendering the transfer flow. The admin-dashboard usage always
   * targets TEAM workspaces and omits this.
   */
  isPersonalWorkspace?: boolean;
};

function LearnMoreLink() {
  return (
    <Link
      to={TRANSFER_OWNERSHIP_KB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      Tìm hiểu thêm
    </Link>
  );
}

export const TransferOwnershipSchema = z.object({
  newOwner: z.string().min(1, "Vui lòng chọn chủ sở hữu mới"),
  agreeConditions: z
    .string({
      required_error: "Bạn phải xác nhận đồng ý chuyển chủ sở hữu không gian làm việc",
    })
    .transform((value) => value === "on")
    .pipe(
      z.boolean().refine((value) => value, {
        message: "Bạn phải xác nhận đồng ý chuyển chủ sở hữu không gian làm việc",
      })
    ),
  transferSubscription: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

// react-doctor:no-giant-component — deferred for follow-up refactor
export default function TransferOwnershipCard({
  className,
  action = "/settings/general",
  organizationName,
  admins,
  ownerSubscriptionInfo,
  ownerOtherTeamWorkspacesCount,
  premiumIsEnabled,
  isPersonalWorkspace = false,
}: TransferOwnershipCardProps) {
  const canTransferOwnership = useCanTransferOwnership();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Admin | null>(null);
  const [transferSubscription, setTransferSubscription] = useState(false);
  const disabled = useDisabled();
  const currentOrganization = useCurrentOrganization();

  // Use provided organizationName or fall back to currentOrganization
  const confirmationOrgName = organizationName ?? currentOrganization?.name;

  /**
   * Shown to non-owner members so they know who to ask. Safe to read from
   * context here: the non-owner branch only renders on the settings page,
   * where currentOrganization is the workspace being viewed.
   */
  const ownerEmail = currentOrganization?.owner?.email;

  const zo = useZorm("TransferOwnership", TransferOwnershipSchema);
  const actionData = useActionData<DataOrErrorResponse>();

  /** This handles server side errors in case client side validation fails */
  const validationErrors = getValidationErrors<typeof TransferOwnershipSchema>(
    actionData?.error
  );

  // Check if current owner has subscriptions that could be transferred
  const ownerHasSubscription =
    premiumIsEnabled && ownerSubscriptionInfo?.hasActiveSubscription;

  const subscriptionCount = ownerSubscriptionInfo?.subscriptions?.length ?? 0;

  // Get general server error (non-validation errors like "user already has subscription")
  const serverError =
    actionData?.error?.message && !validationErrors
      ? actionData.error.message
      : null;

  /** Personal workspaces cannot be transferred — the server rejects them too */
  if (isPersonalWorkspace) {
    return (
      <Card className={tw(className)} id="transfer-ownership">
        <h4 className="mb-1 text-text-lg font-semibold">
          Chuyển chủ sở hữu không gian làm việc
        </h4>
        <p className="mb-2 text-sm text-gray-600">
          Không gian làm việc cá nhân không thể chuyển chủ sở hữu. Nếu cần bàn giao
          tài khoản, hãy thay đổi địa chỉ email của tài khoản.{" "}
          <LearnMoreLink />
        </p>
        <Button to="/account-details/general" variant="secondary">
          Mở cài đặt tài khoản
        </Button>
      </Card>
    );
  }

  /** Non-owners cannot transfer, but must still be able to discover who can */
  if (!canTransferOwnership) {
    return (
      <Card className={tw(className)} id="transfer-ownership">
        <h4 className="mb-1 text-text-lg font-semibold">
          Chuyển chủ sở hữu không gian làm việc
        </h4>
        <p className="text-sm text-gray-600">
          Chỉ chủ sở hữu không gian làm việc
          {ownerEmail ? ` (${ownerEmail})` : ""} mới có thể chuyển quyền sở hữu.
          <LearnMoreLink />
        </p>
      </Card>
    );
  }

  return (
    <Card className={tw(className)} id="transfer-ownership">
      <h4 className="mb-1 text-text-lg font-semibold">
        Transfer workspace ownership
      </h4>
      <p className="mb-2 text-sm text-gray-600">
        Chuyển quyền sở hữu cho người dùng khác. Người nhận phải đang là
        quản trị viên của không gian làm việc.{" "}
        <LearnMoreLink />
      </p>

      <When
        truthy={admins.length > 0}
        fallback={
          <Button
            type="button"
            disabled={{
              reason:
                "Chưa có quản trị viên phù hợp. Hãy đổi vai trò của một thành viên thành Quản trị viên trước khi chuyển quyền sở hữu.",
            }}
          >
            Chuyển chủ sở hữu
          </Button>
        }
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="secondary">
              Chuyển chủ sở hữu
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent aria-describedby="Chuyển chủ sở hữu">
            <AlertDialogHeader>
              <AlertDialogTitle>Chuyển chủ sở hữu không gian làm việc</AlertDialogTitle>
              <AlertDialogDescription>
                Chuyển quyền sở hữu cho người dùng khác. Người nhận phải đang là
                quản trị viên của không gian làm việc.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Form
              method="POST"
              encType="multipart/form-data"
              ref={zo.ref}
              action={action}
            >
              <input type="hidden" name="intent" value="transfer-ownership" />

              {/* Server error display */}
              <When truthy={!!serverError}>
                <p className="mb-4 text-sm text-error-500">{serverError}</p>
              </When>

              <InnerLabel>Chủ sở hữu mới</InnerLabel>
              <Select
                name={zo.fields.newOwner()}
                onValueChange={(value) => {
                  const newOwner = admins.find((admin) => admin.id === value);
                  setSelectedOwner(newOwner ?? null);
                  // Reset subscription transfer checkbox when changing owner
                  setTransferSubscription(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chủ sở hữu mới" />
                </SelectTrigger>

                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {resolveTeamMemberName({ name: "", user: admin }, true)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <When
                truthy={
                  !!(
                    validationErrors?.newOwner?.message ||
                    zo.errors?.newOwner()?.message
                  )
                }
              >
                <p className="text-sm text-error-500">
                  {validationErrors?.newOwner?.message ||
                    zo.errors?.newOwner()?.message}
                </p>
              </When>

              <When truthy={!!selectedOwner}>
                {/* Subscription Info Section */}
                <When truthy={ownerHasSubscription}>
                  <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon icon="coins" />
                      <span>Thông tin gói dịch vụ</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      You have the following active{" "}
                      {subscriptionCount === 1
                        ? "subscription"
                        : "subscriptions"}
                      :
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                      {ownerSubscriptionInfo.subscriptions.map((sub) => (
                        <li key={`${sub.subscriptionId}-${sub.type}`}>
                          <span className="font-semibold">
                            {sub.subscriptionName}
                          </span>
                          {sub.type === "addon" ? " (add-on)" : ""}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3">
                      <div className="flex cursor-pointer select-none items-start gap-2 py-2 text-sm">
                        <input
                          id="transferSubscription"
                          name="transferSubscription"
                          type="checkbox"
                          checked={transferSubscription}
                          onChange={(e) =>
                            setTransferSubscription(e.target.checked)
                          }
                          aria-describedby="transferSubscription-description"
                          className="mt-0.5 rounded-sm checked:bg-primary focus-within:ring-primary checked:hover:bg-primary checked:focus:bg-primary"
                        />
                        <div>
                          <label
                            htmlFor="transferSubscription"
                            className="font-medium"
                          >
                            Transfer my{" "}
                            {subscriptionCount === 1
                              ? "subscription"
                              : "subscriptions"}{" "}
                            to the new owner
                          </label>
                          <p
                            id="transferSubscription-description"
                            className="mt-1 text-gray-500"
                          >
                            The new owner will continue with the current billing{" "}
                            {subscriptionCount === 1 ? "cycle" : "cycles"}. They
                            will need to add their own payment method before the
                            next billing date.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning for multiple workspaces */}
                  <When
                    truthy={
                      transferSubscription && ownerOtherTeamWorkspacesCount > 0
                    }
                  >
                    <WarningBox className="mt-3">
                      <span className="font-semibold">
                        Nhiều không gian làm việc bị ảnh hưởng
                      </span>
                      <p className="mt-1 text-sm">
                        You own {ownerOtherTeamWorkspacesCount} other team{" "}
                        {ownerOtherTeamWorkspacesCount === 1
                          ? "workspace"
                          : "workspaces"}
                        . If you transfer your subscription, those workspaces
                        will lose premium features until you subscribe again.
                      </p>
                    </WarningBox>
                  </When>
                </When>

                <p className="mb-2 mt-4">
                  Bạn sắp chuyển quyền sở hữu không gian làm việc này cho
                  <span className="ml-1 font-semibold">
                    {resolveTeamMemberName(
                      { name: "", user: selectedOwner },
                      true
                    )}
                  </span>
                  . Thao tác này không thể hoàn tác.
                </p>
                <p>Lưu ý - Sau khi chuyển, bạn sẽ:</p>
                <ul className="mb-2 list-inside list-disc">
                  <li>Mất quyền chủ sở hữu của không gian làm việc này</li>
                  <li>Không còn quyền quản lý thanh toán</li>
                  <li>Trở thành thành viên quản trị</li>
                  <When truthy={transferSubscription}>
                    <li>
                      Transfer your{" "}
                      {subscriptionCount === 1
                        ? "subscription"
                        : "subscriptions"}{" "}
                      to{" "}
                      {resolveTeamMemberName(
                        { name: "", user: selectedOwner },
                        true
                      )}
                    </li>
                  </When>
                </ul>

                <div className="mb-2">
                  <p>
                    Để xác nhận, hãy nhập chính xác tên không gian làm việc như hiển thị:
                  </p>
                  <Input
                    label=""
                    placeholder="Nhập tên không gian làm việc để xác nhận"
                    value={confirmationInput}
                    onChange={(event) => {
                      setConfirmationInput(event.target.value);
                    }}
                  />
                  <p className="text-sm text-gray-500">
                    Nội dung cần nhập: {confirmationOrgName}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={zo.fields.agreeConditions()}
                    className={tw(
                      "flex cursor-pointer select-none items-center gap-2 py-2 text-sm"
                    )}
                  >
                    <input
                      id={zo.fields.agreeConditions()}
                      name={zo.fields.agreeConditions()}
                      type="checkbox"
                      className="rounded-sm checked:bg-primary focus-within:ring-primary checked:hover:bg-primary checked:focus:bg-primary"
                    />

                    <span>Tôi hiểu rằng thao tác này không thể hoàn tác.</span>
                  </label>
                  <When
                    truthy={
                      !!(
                        validationErrors?.agreeConditions?.message ||
                        zo.errors?.agreeConditions()?.message
                      )
                    }
                  >
                    <p className="text-sm text-error-500">
                      {validationErrors?.agreeConditions?.message ||
                        zo.errors?.agreeConditions()?.message}
                    </p>
                  </When>
                </div>
              </When>

              <AlertDialogFooter className="mt-4 flex items-center gap-2">
                <AlertDialogCancel asChild>
                  <Button
                    disabled={disabled}
                    className="flex-1"
                    variant="secondary"
                    type="button"
                  >
                    Hủy
                  </Button>
                </AlertDialogCancel>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    !selectedOwner
                      ? { reason: "Vui lòng chọn chủ sở hữu mới." }
                      : confirmationInput !== confirmationOrgName
                      ? {
                          reason: "Vui lòng nhập đúng tên không gian làm việc để xác nhận.",
                        }
                      : disabled
                  }
                >
                  Chuyển chủ sở hữu
                </Button>
              </AlertDialogFooter>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </When>
    </Card>
  );
}
