import type { ReactNode } from "react";
import type { Location } from "@prisma/client";
import { useNavigation } from "react-router";
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
import { isFormProcessing } from "~/utils/form";
import { Form } from "../custom-form";
import { TrashIcon } from "../icons/library";

type DeleteLocationProps = {
  location: {
    name: Location["name"];
    id: Location["id"];
    childCount?: number;
  };
  trigger?: ReactNode;
};

export const DeleteLocation = ({ location, trigger }: DeleteLocationProps) => {
  const navigation = useNavigation();
  const disabled = isFormProcessing(navigation.state);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="link"
            data-test-id="deleteAssetButton"
            icon="trash"
            className="justify-start rounded-sm px-2 py-1.5 text-sm font-medium text-gray-700 outline-none hover:bg-slate-100 hover:text-gray-700"
            width="full"
          >
            Xóa
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto md:m-0">
            <span className="flex size-12 items-center justify-center rounded-full bg-error-50 p-2 text-error-600">
              <TrashIcon />
            </span>
          </div>
          <AlertDialogTitle>Xóa {location.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa vị trí này? Thao tác không thể hoàn tác.
          </AlertDialogDescription>
          {location.childCount && location.childCount > 0 ? (
            <div className="rounded border border-warning-200 bg-warning-50 p-3 text-sm text-warning-900">
              Vị trí này có <strong>{location.childCount}</strong> vị trí con.
              Các vị trí con sẽ được chuyển lên cấp gốc sau khi xóa.
            </div>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex justify-center gap-2">
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary">
                Hủy
              </Button>
            </AlertDialogCancel>

            <Form method="delete" action={`/locations/${location.id}`}>
              <Button
                className="border-error-600 bg-error-600 hover:border-error-800 hover:bg-error-800"
                type="submit"
                data-test-id="confirmdeleteLocationButton"
                disabled={disabled}
              >
                Xóa
              </Button>
            </Form>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
