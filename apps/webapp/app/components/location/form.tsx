import { useEffect } from "react";
import type { Location } from "@prisma/client";
import { useAtom, useAtomValue } from "jotai";
import { useActionData } from "react-router";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { updateDynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { fileErrorAtom, defaultValidateFileAtom } from "~/atoms/file";
import { useAutoFocus } from "~/hooks/use-auto-focus";
import { useDisabled } from "~/hooks/use-disabled";
import useFetcherWithReset from "~/hooks/use-fetcher-with-reset";
import type { action as editLocationAction } from "~/routes/_layout+/locations.$locationId_.edit";
import type { action as newLocationAction } from "~/routes/_layout+/locations.new";
import { ACCEPT_SUPPORTED_IMAGES } from "~/utils/constants";
import { tw } from "~/utils/tw";
import { zodFieldIsRequired } from "~/utils/zod";
import { LocationSelect } from "./location-select";
import { Form } from "../custom-form";
import FormRow from "../forms/form-row";
import Input from "../forms/input";
import { RefererRedirectInput } from "../forms/referer-redirect-input";
import { AbsolutePositionedHeaderActions } from "../layout/header/absolute-positioned-header-actions";
import { Button } from "../shared/button";
import { ButtonGroup } from "../shared/button-group";
import { Card } from "../shared/card";
import { Spinner } from "../shared/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared/tooltip";
import When from "../when/when";

export const NewLocationFormSchema = z.object({
  name: z.string().min(2, "Tên vị trí là bắt buộc"),
  description: z.string(),
  address: z.string(),
  parentId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null)),
  addAnother: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  preventRedirect: z.string().optional(),
  redirectTo: z.string().optional(),
});

type NewLocationPayload = Pick<Location, "id" | "name"> & {
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  parentId?: Location["parentId"];
};

interface Props {
  className?: string;
  name?: Location["name"];
  address?: Location["address"];
  description?: Location["description"];
  apiUrl?: string;
  /** Callback function to handle cancel action when form is used inline (e.g., in a dialog). When provided, Cancel button will call this instead of navigating. */
  onCancel?: () => void;
  /** Callback function triggered on successful location creation/update */
  onSuccess?: (data?: { location?: NewLocationPayload }) => void;
  parentId?: Location["parentId"];
  referer?: string | null;
  excludeLocationId?: Location["id"];
}

// react-doctor:no-giant-component — deferred for follow-up refactor
export const LocationForm = ({
  className,
  name,
  address,
  description,
  apiUrl,
  onSuccess,
  parentId,
  referer,
  excludeLocationId,
  onCancel,
}: Props) => {
  const zo = useZorm("NewQuestionWizardScreen", NewLocationFormSchema);
  const fetcher = useFetcherWithReset<{
    success?: boolean;
    location?: NewLocationPayload;
    error?: { message?: string; additionalData?: { field?: string } };
    errors?: Record<string, { message?: string }>;
  }>();
  const fetcherData = fetcher.data;
  const hasOnSuccessFunc = typeof onSuccess === "function";
  const disabled = useDisabled(hasOnSuccessFunc ? fetcher : undefined);

  const actionData = useActionData<
    typeof newLocationAction | typeof editLocationAction
  >();
  const fileError = useAtomValue(fileErrorAtom);
  const [, validateFile] = useAtom(defaultValidateFileAtom);
  const [, updateName] = useAtom(updateDynamicTitleAtom);

  // Focus the name input on mount. Replaces `autoFocus` to satisfy
  // jsx-a11y/no-autofocus. When the form is rendered inside a dialog,
  // the dialog's `data-dialog-initial-focus` handler typically wins;
  // otherwise this provides the intentional initial focus.
  const nameInputRef = useAutoFocus<HTMLInputElement>();

  useEffect(() => {
    if (!hasOnSuccessFunc) return;

    if (fetcherData?.success) {
      onSuccess(fetcherData);
      fetcher.reset();
    }
  }, [fetcher, fetcherData, hasOnSuccessFunc, onSuccess]);

  const imageError =
    (hasOnSuccessFunc
      ? fetcherData?.errors?.image?.message ??
        (fetcherData?.error?.additionalData?.field === "image"
          ? fetcherData?.error?.message
          : undefined)
      : undefined) ??
    (actionData as any)?.errors?.image?.message ??
    ((actionData as any)?.error?.additionalData?.field === "image"
      ? (actionData as any)?.error?.message
      : undefined) ??
    fileError;

  const nameError =
    (hasOnSuccessFunc
      ? fetcherData?.error?.message || fetcherData?.errors?.name?.message
      : (actionData as any)?.error?.message ||
        (actionData as any)?.errors?.name?.message) ||
    zo.errors.name()?.message;

  const FormComponent = hasOnSuccessFunc ? fetcher.Form : Form;

  return (
    <Card
      className={tw(
        "w-full max-w-full md:w-min",
        hasOnSuccessFunc ? "border-none  shadow-none" : "",
        className
      )}
    >
      <FormComponent
        ref={zo.ref}
        method="post"
        className="flex w-full max-w-full flex-col gap-2"
        encType="multipart/form-data"
        action={apiUrl}
      >
        <RefererRedirectInput
          fieldName={zo.fields.redirectTo()}
          referer={referer}
        />

        {hasOnSuccessFunc ? null : (
          <AbsolutePositionedHeaderActions className="hidden md:flex">
            <Actions
              disabled={disabled}
              referer={referer}
              onCancel={onCancel}
            />
          </AbsolutePositionedHeaderActions>
        )}

        <When
          truthy={hasOnSuccessFunc}
          fallback={
            <FormRow
              rowLabel={"Tên"}
              className="border-b-0 pb-[10px] pt-0"
              required={zodFieldIsRequired(NewLocationFormSchema.shape.name)}
            >
              <Input
                ref={nameInputRef}
                label="Tên"
                hideLabel
                name={zo.fields.name()}
                disabled={disabled}
                error={nameError}
                data-dialog-initial-focus
                onChange={hasOnSuccessFunc ? undefined : updateName}
                className="w-full"
                defaultValue={name || undefined}
                placeholder="Ví dụ: Kho tầng 1"
                required={zodFieldIsRequired(NewLocationFormSchema.shape.name)}
              />
            </FormRow>
          }
        >
          <Input
            ref={nameInputRef}
            label="Tên"
            hideLabel
            name={zo.fields.name()}
            disabled={disabled}
            error={nameError}
            data-dialog-initial-focus
            onChange={hasOnSuccessFunc ? undefined : updateName}
            className="w-full"
            defaultValue={name || undefined}
            placeholder="Ví dụ: Kho tầng 1"
            required={zodFieldIsRequired(NewLocationFormSchema.shape.name)}
          />
        </When>

        <FormRow
          rowLabel={"Vị trí cha"}
          subHeading={
            <p>
              Không bắt buộc. Chọn vị trí cha để tổ chức vị trí theo dạng cây.
            </p>
          }
        >
          <div className="mb-2 block lg:hidden">
            <div className="text-sm font-medium text-gray-700">
              Vị trí cha
            </div>
            <p className="text-xs text-gray-600">
              Không bắt buộc. Chọn vị trí cha để tổ chức vị trí theo dạng cây.
            </p>
          </div>
          <LocationSelect
            isBulk={false}
            className="w-full max-w-full"
            popoverZIndexClassName={hasOnSuccessFunc ? "z-[10000]" : undefined}
            hideExtraContent={hasOnSuccessFunc}
            fieldName={zo.fields.parentId()}
            placeholder="Không có vị trí cha"
            defaultValue={parentId ?? undefined}
            hideCurrentLocationInput
            excludeIds={excludeLocationId ? [excludeLocationId] : undefined}
          />
        </FormRow>

        <When
          truthy={hasOnSuccessFunc}
          fallback={
            <FormRow rowLabel={"Ảnh chính"}>
              <div>
                <p className="hidden lg:block">
                  Chấp nhận PNG, JPG, JPEG hoặc WebP (tối đa 4 MB)
                </p>
                <Input
                  disabled={disabled}
                  accept={ACCEPT_SUPPORTED_IMAGES}
                  name="image"
                  type="file"
                  onChange={validateFile}
                  label={"Ảnh chính"}
                  hideLabel
                  error={imageError}
                  className="mt-2"
                  inputClassName="border-0 shadow-none p-0 rounded-none"
                />
                <p className="mt-2 lg:hidden">
                  Chấp nhận PNG, JPG, JPEG hoặc WebP (tối đa 4 MB)
                </p>
              </div>
            </FormRow>
          }
        >
          <Input
            disabled={disabled}
            accept={ACCEPT_SUPPORTED_IMAGES}
            name="image"
            type="file"
            onChange={validateFile}
            label={"Ảnh chính"}
            error={imageError}
            className="mt-2"
            inputClassName="border-0 shadow-none p-0 rounded-none"
          />
          <p className="hidden lg:block">
            Chấp nhận PNG, JPG, JPEG hoặc WebP (tối đa 4 MB)
          </p>
        </When>

        <When
          truthy={hasOnSuccessFunc}
          fallback={
            <FormRow
              rowLabel={"Địa chỉ"}
              subHeading={
                <p>
                  Địa chỉ được dùng để xác định vị trí trên bản đồ. Hãy nhập địa chỉ chính xác để kết quả định vị tốt hơn.
                </p>
              }
              className="pt-[10px]"
              required={zodFieldIsRequired(NewLocationFormSchema.shape.address)}
            >
              <Input
                label="Địa chỉ"
                hideLabel
                name={zo.fields.address()}
                disabled={disabled}
                error={zo.errors.address()?.message}
                className="w-full"
                defaultValue={address || undefined}
                required={zodFieldIsRequired(
                  NewLocationFormSchema.shape.address
                )}
              />
            </FormRow>
          }
        >
          <Input
            label="Địa chỉ"
            name={zo.fields.address()}
            disabled={disabled}
            error={zo.errors.address()?.message}
            className="w-full"
            defaultValue={address || undefined}
            required={zodFieldIsRequired(NewLocationFormSchema.shape.address)}
          />
        </When>

        <When
          truthy={hasOnSuccessFunc}
          fallback={
            <FormRow
              rowLabel="Mô tả"
              subHeading={
                <p>
                  Mô tả sẽ hiển thị trên trang vị trí và có thể chỉnh sửa bất cứ lúc nào.
                </p>
              }
              required={zodFieldIsRequired(
                NewLocationFormSchema.shape.description
              )}
            >
              <Input
                inputType="textarea"
                label="Mô tả"
                hideLabel
                name={zo.fields.description()}
                defaultValue={description || ""}
                placeholder="Nhập mô tả cho vị trí."
                disabled={disabled}
                data-test-id="locationDescription"
                className="w-full"
                required={zodFieldIsRequired(
                  NewLocationFormSchema.shape.description
                )}
              />
            </FormRow>
          }
        >
          <Input
            inputType="textarea"
            label="Mô tả"
            name={zo.fields.description()}
            defaultValue={description || ""}
            placeholder="Nhập mô tả cho vị trí."
            disabled={disabled}
            data-test-id="locationDescription"
            className="w-full"
            required={zodFieldIsRequired(
              NewLocationFormSchema.shape.description
            )}
          />
        </When>

        {hasOnSuccessFunc ? (
          <input type="hidden" name="preventRedirect" value="true" />
        ) : null}

        <FormRow className="border-y-0 py-2" rowLabel="">
          <div className="ml-auto">
            <Button type="submit" disabled={disabled}>
              {disabled ? <Spinner /> : "Lưu"}
            </Button>
          </div>
        </FormRow>
      </FormComponent>
    </Card>
  );
};

const Actions = ({
  disabled,
  referer,
  onCancel,
}: {
  disabled: boolean;
  referer?: string | null;
  onCancel?: () => void;
}) => (
  <>
    <ButtonGroup>
      {/* When onCancel is provided (inline mode), use onClick instead of navigation */}
      {onCancel ? (
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          disabled={disabled}
        >
          Hủy
        </Button>
      ) : (
        <Button to={referer ?? ".."} variant="secondary" disabled={disabled}>
          Hủy
        </Button>
      )}
      <AddAnother disabled={disabled} />
    </ButtonGroup>

    <Button type="submit" disabled={disabled}>
      Save
    </Button>
  </>
);

const AddAnother = ({ disabled }: { disabled: boolean }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="submit"
          variant="secondary"
          disabled={disabled}
          name="addAnother"
          value="true"
        >
          Thêm vị trí khác
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-sm">Lưu vị trí và thêm vị trí mới</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
