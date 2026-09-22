/**
 * PreferredBarcodeFormRow
 *
 * The full `FormRow` + explanatory subheading + `PreferredBarcodeSelector`
 * group shown on the asset edit page below the Barcodes section. Extracted
 * from `form.tsx` to keep that file under the react-doctor giant-component
 * threshold, and to colocate the override UI with its selector component.
 *
 * State (the live barcode list mirror) stays in `AssetForm`; this wrapper
 * is purely presentational — it receives an already-filtered `barcodes`
 * list that reflects in-progress edits in `BarcodesInput`.
 *
 * @see {@link file://./form.tsx} — call site inside `AssetForm`
 * @see {@link file://./preferred-barcode-selector.tsx} — radio-list selector
 */

import type { Barcode, QrIdDisplayPreference } from "@prisma/client";
import { PreferredBarcodeSelector } from "./preferred-barcode-selector";
import FormRow from "../forms/form-row";

/** Props for {@link PreferredBarcodeFormRow}. */
type PreferredBarcodeFormRowProps = {
  /**
   * Persisted barcodes that may be selected as the override. Caller is
   * responsible for filtering to entries with a non-empty `id` — newly
   * added rows without an id cannot be referenced server-side until save.
   */
  barcodes: Pick<Barcode, "id" | "type" | "value">[];
  /** Current saved selection, or null for "workspace default". */
  defaultValue?: string | null;
  /** Workspace preference — labels the "Workspace default" radio row. */
  workspacePreference?: QrIdDisplayPreference;
};

/**
 * Renders the per-asset preferred-code override section of the asset form.
 *
 * @param props - {@link PreferredBarcodeFormRowProps}
 * @returns A `FormRow` wrapping `PreferredBarcodeSelector` with an
 *          explanatory subheading linking to workspace settings.
 */
export function PreferredBarcodeFormRow({
  barcodes,
  defaultValue,
  workspacePreference,
}: PreferredBarcodeFormRowProps) {
  return (
    <FormRow
      rowLabel={"Mã hiển thị ưu tiên của tài sản"}
      className="border-b-0"
      subHeading={
        <p>
          <strong>
            Chỉ cần thiết khi bạn muốn tài sản này sử dụng mã hiển thị khác với
            mặc định của không gian làm việc.
          </strong>{" "}
          Thông thường nên giữ theo mặc định của không gian làm việc để tự động sử dụng{" "}
          <a
            href="/settings/general"
            className="text-primary-700 underline"
            target="_blank"
            rel="noreferrer"
          >
            cấu hình mã hiển thị ưu tiên
          </a>
          . Bạn có thể chọn một mã vạch cụ thể bên dưới để ghi đè riêng cho tài sản này.
        </p>
      }
    >
      <PreferredBarcodeSelector
        name="preferredBarcodeId"
        barcodes={barcodes}
        defaultValue={defaultValue}
        workspacePreference={workspacePreference}
      />
    </FormRow>
  );
}
