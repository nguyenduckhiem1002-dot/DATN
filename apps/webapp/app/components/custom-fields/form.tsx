import { useState } from "react";
import { CustomFieldType, type CustomField } from "@prisma/client";
import { useAtom } from "jotai";
import { Link, useActionData, useNavigation } from "react-router";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { updateDynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { useAutoFocus } from "~/hooks/use-auto-focus";
import { useOrganizationId } from "~/hooks/use-organization-id";
import type { action as editCustomFieldsAction } from "~/routes/_layout+/settings.custom-fields.$fieldId_.edit";
import type { action as newCustomFieldsAction } from "~/routes/_layout+/settings.custom-fields.new";
import { FIELD_TYPE_NAME } from "~/utils/custom-fields";
import { isFormProcessing } from "~/utils/form";
import { getValidationErrors } from "~/utils/http";
import { zodFieldIsRequired } from "~/utils/zod";
import { Form } from "../custom-form";
import CategoriesInput from "../forms/categories-input";
import FormRow from "../forms/form-row";
import Input from "../forms/input";
import OptionBuilder from "../forms/option-builder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../forms/select";
import { Switch } from "../forms/switch";
import { Button } from "../shared/button";
import { Card } from "../shared/card";
import { Spinner } from "../shared/spinner";

export const NewCustomFieldFormSchema = z.object({
  name: z.string().min(2, "Tên trường là bắt buộc"),
  helpText: z
    .string()
    .optional()
    .transform((val) => val || null), // Transforming undefined to fit prismas null constraint
  type: z.nativeEnum(CustomFieldType),
  required: z
    .string()
    .optional()
    .transform((val) => (val === "on" ? true : false)),
  active: z
    .string()
    .optional()
    .transform((val) => (val === "on" ? true : false)),
  organizationId: z.string(),
  options: z.array(z.string()).optional(),
  categories: z
    .array(z.string().min(1, "Vui lòng chọn danh mục"))
    .optional()
    .default([]),
});

/** Pass props of the values to be used as default for the form fields */
interface Props {
  name?: CustomField["name"];
  helpText?: CustomField["helpText"];
  required?: CustomField["required"];
  type?: CustomField["type"];
  active?: CustomField["active"];
  options?: CustomField["options"];
  isEdit?: boolean;
  categories?: string[];
}

/**
 * Stable empty array used as the default for the `categories` prop. Keeping
 * this at module scope (instead of inlining `categories = []` in the
 * destructure) avoids creating a new array reference on every render, which
 * would otherwise invalidate downstream memoization / reducer identity.
 */
const EMPTY_CATEGORIES: string[] = [];

const FIELD_TYPE_DESCRIPTION: { [key in CustomFieldType]: string } = {
  TEXT: "Lưu thông tin ngắn của tài sản, ví dụ: số sê-ri, ghi chú hoặc thông tin bổ sung. Chấp nhận mọi nội dung văn bản.",
  OPTION: "Danh sách lựa chọn được định nghĩa sẵn.",
  BOOLEAN: "Giá trị đúng/sai hoặc có/không.",
  DATE: "Trường chọn ngày.",
  MULTILINE_TEXT:
    "Lưu nội dung dài nhiều dòng, ví dụ: mô tả, bình luận hoặc ghi chú chi tiết.",
  AMOUNT:
    "Nhập giá trị số và hiển thị theo đơn vị tiền tệ của hệ thống. Hỗ trợ số thập phân.",
  NUMBER: "Nhập giá trị số. Hỗ trợ số thập phân.",
};

export const CustomFieldForm = ({
  options: opts,
  name,
  helpText,
  required,
  type,
  active,
  isEdit = false,
  categories = EMPTY_CATEGORIES,
}: Props) => {
  const navigation = useNavigation();
  const zo = useZorm("NewQuestionWizardScreen", NewCustomFieldFormSchema);
  const disabled = isFormProcessing(navigation.state);

  const [options, setOptions] = useState<Array<string>>(opts || []);
  const [selectedType, setSelectedType] = useState<CustomFieldType>(
    type || "TEXT"
  );
  const [useCategories, setUseCategories] = useState(categories.length > 0);

  const [, updateTitle] = useAtom(updateDynamicTitleAtom);

  // Focus the Name field on mount — the form is the entry point for both
  // create and edit pages, so initial focus belongs on the first field.
  const nameInputRef = useAutoFocus<HTMLInputElement>();

  // keeping text field type by default selected
  const organizationId = useOrganizationId();
  const actionData = useActionData<
    typeof newCustomFieldsAction | typeof editCustomFieldsAction
  >();
  const validationErrors = getValidationErrors<typeof NewCustomFieldFormSchema>(
    actionData?.error
  );

  return (
    <Card className="w-full md:w-min">
      <Form
        ref={zo.ref}
        method="post"
        className="flex w-full flex-col gap-2"
        encType="multipart/form-data"
      >
        <FormRow
          rowLabel={"Tên"}
          className="border-b-0 pb-[10px] pt-0"
          required={zodFieldIsRequired(NewCustomFieldFormSchema.shape.name)}
        >
          <Input
            ref={nameInputRef}
            label="Tên"
            hideLabel
            name={zo.fields.name()}
            disabled={disabled}
            error={validationErrors?.name?.message || zo.errors.name()?.message}
            onChange={updateTitle}
            className="w-full"
            defaultValue={name || ""}
            placeholder="Nhập tên trường"
            required={zodFieldIsRequired(NewCustomFieldFormSchema.shape.name)}
          />
        </FormRow>

        <div>
          <label className="lg:hidden" htmlFor="custom-field-type">
            Loại
          </label>
          <FormRow
            rowLabel={"Loại"}
            className="border-b-0 pb-[10px] pt-[6px]"
            required={zodFieldIsRequired(NewCustomFieldFormSchema.shape.type)}
          >
            <Select
              name="type"
              defaultValue={selectedType}
              disabled={disabled}
              onValueChange={(val: CustomFieldType) => setSelectedType(val)}
            >
              <SelectTrigger
                disabled={isEdit}
                className="px-3.5 py-3"
                id="custom-field-type"
              >
                <SelectValue placeholder="Chọn loại trường" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-full min-w-[300px]"
                align="start"
              >
                <div className=" max-h-[320px] overflow-auto">
                  {Object.keys(FIELD_TYPE_NAME).map((value) => (
                    <SelectItem value={value} key={value}>
                      <span className="mr-4 text-[14px] text-gray-700">
                        {FIELD_TYPE_NAME[value as CustomFieldType]}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
            <div className="mt-2 flex-1 grow rounded border px-6 py-4 text-[14px] text-gray-600 ">
              <p>{FIELD_TYPE_DESCRIPTION[selectedType]}</p>
            </div>
          </FormRow>
          {selectedType === "OPTION" ? (
            <>
              <FormRow rowLabel="" className="mt-0 border-b-0 pt-0">
                <OptionBuilder
                  onRemove={(i: number) => {
                    options.splice(i, 1);
                    setOptions([...options]);
                  }}
                  options={options}
                  onAdd={(o: string) => setOptions([...options, o])}
                />
                {options.map((op, i) => (
                  // Option values are the stable identity here — the
                  // OptionBuilder above disallows duplicates, so each
                  // option string is unique within this list.
                  <input
                    key={op}
                    type="hidden"
                    name={zo.fields.options(i)()}
                    value={op}
                  />
                ))}
              </FormRow>
            </>
          ) : null}
        </div>
        <FormRow rowLabel="" className="border-b-0 pt-2">
          <div className="flex items-center gap-3">
            <Switch
              id="custom-field-required"
              name={zo.fields.required()}
              disabled={disabled}
              defaultChecked={required}
            />
            <label
              htmlFor="custom-field-required"
              className="text-base font-medium text-gray-700"
            >
              Bắt buộc
            </label>
          </div>
        </FormRow>

        <FormRow rowLabel="" className="border-b-0 pt-2">
          <div className="flex items-center gap-3">
            <Switch
              id="custom-field-active"
              name={zo.fields.active()}
              disabled={disabled}
              defaultChecked={active === undefined || active}
            />
            <label htmlFor="custom-field-active">
              <div className="text-base font-medium text-gray-700">Đang hoạt động</div>
              <p className="text-[14px] text-gray-600">
                Khi tắt, trường này sẽ không còn hiển thị trên biểu mẫu và trang tài sản
              </p>
            </label>
          </div>
          {validationErrors?.active ? (
            <div className="text-sm text-error-500">
              {validationErrors?.active.message}
            </div>
          ) : null}
        </FormRow>

        <div>
          <FormRow
            rowLabel="Danh mục"
            subHeading={
              <p>
                Chọn các danh mục tài sản sẽ sử dụng trường tùy chỉnh này.{" "}
                <Link
                  to="https://www.shelf.nu/knowledge-base/linking-custom-fields-to-categories"
                  target="_blank"
                >
                  Tìm hiểu thêm
                </Link>
              </p>
            }
          >
            <div className="mb-3 flex gap-3">
              <Switch
                id="custom-field-use-categories"
                disabled={disabled}
                checked={useCategories}
                onCheckedChange={setUseCategories}
              />
              <label htmlFor="custom-field-use-categories">
                <div className="text-base font-medium text-gray-700">
                  Chỉ dùng cho danh mục đã chọn
                </div>
                <p className="text-[14px] text-gray-600">
                  Bật tùy chọn này nếu trường chỉ áp dụng cho tài sản thuộc một số danh mục nhất định.
                </p>
              </label>
            </div>

            {useCategories && (
              <CategoriesInput
                categories={categories}
                name={(i) => zo.fields.categories(i)()}
                error={(i) => zo.errors.categories(i)()?.message}
              />
            )}
          </FormRow>
        </div>

        <div>
          <FormRow
            rowLabel="Nội dung trợ giúp"
            subHeading={
              <p>
                Nội dung này sẽ hiển thị như hướng dẫn khi người dùng nhập dữ liệu cho trường
              </p>
            }
            required={zodFieldIsRequired(
              NewCustomFieldFormSchema.shape.helpText
            )}
          >
            <Input
              inputType="textarea"
              label="Nội dung trợ giúp"
              name={zo.fields.helpText()}
              defaultValue={helpText || ""}
              placeholder="Nhập nội dung hướng dẫn cho trường tùy chỉnh."
              disabled={disabled}
              data-test-id="fieldHelpText"
              className="w-full"
              hideLabel
              required={zodFieldIsRequired(
                NewCustomFieldFormSchema.shape.helpText
              )}
            />
          </FormRow>
        </div>

        {/* hidden field organization Id to get the organization Id on each form submission to link custom fields and its value is loaded using useOrganizationId hook */}
        <input
          type="hidden"
          name={zo.fields.organizationId()}
          value={organizationId}
        />

        <div className="text-right">
          <Button
            to={".."}
            variant="secondary"
            disabled={disabled}
            className={"mr-2"}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={disabled}>
            {disabled ? <Spinner /> : "Lưu"}
          </Button>
        </div>
      </Form>
    </Card>
  );
};
