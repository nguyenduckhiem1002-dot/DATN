import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { parseFormData } from "@remix-run/form-data-parser";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, useFetcher } from "react-router";
import Input from "~/components/forms/input";
import { UserIcon } from "~/components/icons/library";
import { Button } from "~/components/shared/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/shared/modal";
import { WarningBox } from "~/components/shared/warning-box";
import type { CreateAssetFromContentImportPayload } from "~/modules/asset/types";
import { createTeamMemberIfNotExists } from "~/modules/team-member/service.server";
import styles from "~/styles/layout/custom-modal.css?url";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { isFormProcessing } from "~/utils/form";
import { payload, error } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export const meta = () => [{ title: appendToMetaTitle("Nhập danh sách thành viên") }];

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.teamMember,
      action: PermissionAction.create,
    });
    return payload({
      showModal: true,
    });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw data(error(reason), { status: reason.status });
  }
}

export async function action({ context, request }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, organizations } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.teamMember,
      action: PermissionAction.create,
    });

    const formData = await parseFormData(request);

    const csvFile = formData.get("file") as File;
    const text = await csvFile.text();
    const memberNames = text.split(",").map((name) => name.trim());

    // Transform member names into format expected by createTeamMemberIfNotExists
    const importData: CreateAssetFromContentImportPayload[] = memberNames.map(
      (name) => ({
        key: "", // Required by type but unused
        title: "", // Required by type but unused
        tags: [], // Required by type but unused
        custodian: name,
      })
    );

    await createTeamMemberIfNotExists({
      data: importData,
      organizationId,
    });

    return payload({ success: true });
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return data(error(reason), { status: reason.status });
  }
}

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export default function ImportNRMs() {
  return (
    <>
      <div className="modal-content-wrapper">
        <div className="mb-4 inline-flex size-8 items-center justify-center  rounded-full bg-primary-100 p-2 text-primary-600">
          <UserIcon />
        </div>
        <div className="mb-5">
          <h4>Nhập danh sách thành viên</h4>
          <p>
            Mỗi thành viên chỉ cần tên. Hãy tải lên tệp TXT chứa danh sách tên
            thành viên, phân tách bằng dấu phẩy.
            <br />
            <ul className="list-inside list-disc pl-4">
              <li>Tên đã tồn tại trong hệ thống sẽ được bỏ qua.</li>
              <li>Các tên trùng lặp sẽ được bỏ qua.</li>
            </ul>
            <WarningBox className="my-2">
              Sau khi nhập, dữ liệu không thể hoàn tác hàng loạt. Bạn vẫn có thể
              chỉnh sửa từng thành viên trong phần cài đặt Nhân sự.
            </WarningBox>
          </p>
        </div>
        <ImportForm />
      </div>
    </>
  );
}

function ImportForm() {
  const [agreed, setAgreed] = useState<"XÁC NHẬN" | "">("");
  const formRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher<typeof action>();

  const { data, state } = fetcher;
  const disabled = isFormProcessing(state) || agreed !== "XÁC NHẬN";
  const isSuccessful = data && !data.error && data.success;

  /** We use a controlled field for the file, because of the confirmation dialog we have.
   * That way we can disabled the confirmation dialog button until a file is selected
   */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event?.target?.files?.[0];
    if (selectedFile) {
      setSelectedFile(selectedFile);
    }
  };
  return (
    <fetcher.Form
      className="mt-4"
      method="post"
      ref={formRef}
      encType="multipart/form-data"
    >
      <Input
        type="file"
        name="file"
        label="Chọn tệp TXT"
        required
        onChange={handleFileSelect}
        accept=".txt"
      />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            title={"Xác nhận nhập thành viên"}
            disabled={!selectedFile}
            className="mt-4 w-full"
          >
            Xác nhận nhập thành viên chưa đăng ký
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Non-registered members import
            </AlertDialogTitle>
            {!isSuccessful ? (
              <>
                <AlertDialogDescription>
                  Hãy nhập <b>"XÁC NHẬN"</b> vào ô bên dưới để tiếp tục.
                  Thao tác này xác nhận rằng bạn đã kiểm tra tệp và hiểu việc nhập dữ liệu.
                </AlertDialogDescription>
                <Input
                  type="text"
                  label={"Xác nhận"}
                  name="agree"
                  value={agreed}
                  onChange={(e) => setAgreed(e.target.value as any)}
                  placeholder="XÁC NHẬN"
                  pattern="^XÁC NHẬN$" // We use a regex to make sure the user types the exact string
                  required
                />
              </>
            ) : null}
          </AlertDialogHeader>
          {data?.error ? (
            <div>
              <b className="text-red-500">{data.error.message}</b>
              <p>
                Vui lòng kiểm tra lại tệp TXT và thử lại.
              </p>
            </div>
          ) : null}

          {isSuccessful ? (
            <div>
              <b className="text-green-500">Thành công!</b>
              <p>Danh sách thành viên chưa đăng ký đã được nhập.</p>
            </div>
          ) : null}

          <AlertDialogFooter>
            {isSuccessful ? (
              <Button to="/settings/team/nrm" variant="secondary">
                Đóng
              </Button>
            ) : (
              <>
                <AlertDialogCancel asChild>
                  <Button type="button" variant="secondary">
                    Hủy
                  </Button>
                </AlertDialogCancel>
                <Button
                  type="submit"
                  onClick={() => {
                    // Because we use a Dialog the submit buttons is outside of the form so we submit using the fetcher directly
                    void fetcher.submit(formRef.current);
                  }}
                  disabled={disabled}
                >
                  {isFormProcessing(fetcher.state) ? "Đang nhập..." : "Nhập dữ liệu"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </fetcher.Form>
  );
}
