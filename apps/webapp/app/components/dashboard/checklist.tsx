import { Link, useFetcher, useLoaderData } from "react-router";
import type { loader } from "~/routes/_layout+/home";
import { tw } from "~/utils/tw";
import {
  AddUserIcon,
  AssetsIcon,
  CategoriesIcon,
  CheckmarkIcon,
  CustomFiedIcon,
  TagsIcon,
  UserIcon,
} from "../icons/library";
import { Button } from "../shared/button";
import Heading from "../shared/heading";
import SubHeading from "../shared/sub-heading";

export default function OnboardingChecklist() {
  const fetcher = useFetcher();
  const { checklistOptions } = useLoaderData<typeof loader>();

  return (
    <div className="mt-6 rounded border bg-white px-4 py-5 lg:px-20 lg:py-16">
      <div className="mb-8">
        <Heading
          as="h2"
          className="break-all text-display-xs font-semibold md:text-display-sm"
        >
          Chào mừng
        </Heading>
        <SubHeading>Hoàn thành các bước bên dưới để mở bảng điều khiển của bạn.</SubHeading>
      </div>
      <div className="mb-8">
        <div className="mb-4">
          <h4 className=" text-lg font-semibold">Sắp xếp khoa học</h4>
          <p className="text-[14px] text-gray-600">
            Sắp xếp tài sản khoa học giúp bạn dễ theo dõi tổng quan và tận dụng hiệu quả bộ lọc cùng thanh tìm kiếm.
          </p>
        </div>
        <ul className="onboarding-checklist -mx-1 xl:flex xl:flex-wrap">
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasAssets && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <AssetsIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">
                      Tạo tài sản đầu tiên
                    </h6>
                    <p className=" text-gray-600">
                      Mỗi tài sản được gắn một mã QR riêng để nhận diện.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="https://www.shelf.nu/knowledge-base/adding-new-assets"
                      target="_blank"
                      className=" font-semibold text-gray-600"
                    >
                      Tìm hiểu thêm
                    </Link>
                    <Button variant="link" to="/assets/new">
                      Tài sản mới
                    </Button>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasCategories && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <CategoriesIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">
                      Tạo danh mục tùy chỉnh
                    </h6>
                    <p className=" text-gray-600">
                      Xem, chỉnh sửa hoặc xóa các danh mục mặc định và tạo danh mục riêng của bạn.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="https://www.shelf.nu/knowledge-base/using-categories-to-organize-your-asset-inventory"
                      target="_blank"
                      className=" font-semibold text-gray-600"
                    >
                      Tìm hiểu thêm
                    </Link>
                    <Button variant="link" to="/categories/new">
                      Danh mục mới
                    </Button>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasTags && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <TagsIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">Tạo thẻ</h6>
                    <p className=" text-gray-600">
                      Thẻ giúp bổ sung thông tin ngắn gọn để phân loại và tìm kiếm tài sản nhanh hơn.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="link" to="/tags/new">
                      Thẻ mới
                    </Button>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
        </ul>
      </div>
      <div className="mb-8">
        <div className="mb-4">
          <h4 className=" text-lg font-semibold">Nhân sự, bàn giao và đặt lịch</h4>
          <p className="text-[14px] text-gray-600">
            Bàn giao tài sản cho thành viên để theo dõi người đang quản lý hoặc sử dụng tài sản.
          </p>
        </div>
        <ul className="onboarding-checklist -mx-1 xl:flex xl:flex-wrap">
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasTeamMembers && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <UserIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">
                      Thêm thành viên
                    </h6>
                    <p className=" text-gray-600">
                      Thêm thành viên để theo dõi rõ ai đang được bàn giao và chịu trách nhiệm với từng tài sản.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="https://www.shelf.nu/knowledge-base/onboarding-your-team-members"
                      target="_blank"
                      className=" font-semibold text-gray-600"
                    >
                      Tìm hiểu thêm
                    </Link>
                    <Button variant="link" to="/settings/team">
                      Thành viên mới
                    </Button>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasCustodies && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <AddUserIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">
                      Bàn giao tài sản
                    </h6>
                    <p className=" text-gray-600">
                      Theo dõi việc bàn giao để biết tài sản đang do ai quản lý và thuận tiện khi thu hồi hoặc điều chuyển.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="https://www.shelf.nu/knowledge-base/custody-feature-for-long-term-equipment-lend-outs"
                      target="_blank"
                      className=" font-semibold text-gray-600"
                    >
                      Tìm hiểu thêm
                    </Link>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
        </ul>
      </div>
      <div className="mb-8">
        <div className="mb-4">
          <h4 className=" text-lg font-semibold">Tùy chỉnh trải nghiệm</h4>
          <p className="text-[14px] text-gray-600">
            Tùy chỉnh quy trình để hệ thống phù hợp hơn với cách quản lý tài sản của công ty.
          </p>
        </div>
        <ul className="onboarding-checklist -mx-1 xl:flex xl:flex-wrap">
          <li
            className={tw(
              " mx-1 mb-2 xl:w-[49%]",
              checklistOptions.hasCustomFields && "completed"
            )}
          >
            <div className="flex h-full items-start justify-between gap-1 rounded border p-4">
              <div className="flex items-start">
                <div className="mr-3 inline-flex items-center justify-center rounded-full border-[5px] border-solid border-primary-50 bg-primary-100 p-1.5 text-primary">
                  <CustomFiedIcon />
                </div>
                <div className="text-[14px]">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700">
                      Tạo trường tùy chỉnh
                    </h6>
                    <p className=" text-gray-600">
                      Bổ sung các trường dữ liệu riêng phù hợp với tài sản của công ty.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="https://www.shelf.nu/knowledge-base/adding-additional-fields-to-assets"
                      target="_blank"
                      className=" font-semibold text-gray-600"
                    >
                      Tìm hiểu thêm
                    </Link>
                    <Button variant="link" to="/settings/custom-fields/new">
                      Trường tùy chỉnh mới
                    </Button>
                  </div>
                </div>
              </div>
              <i className="hidden text-primary">
                <CheckmarkIcon />
              </i>
            </div>
          </li>
        </ul>
      </div>
      <fetcher.Form
        method="post"
        action="/api/user/prefs/skip-onboarding-checklist"
      >
        <input type="hidden" name="skipOnboardingChecklist" value="skipped" />
        <Button variant="link" type="submit">
          Bỏ qua hướng dẫn, vào bảng điều khiển
        </Button>
      </fetcher.Form>
    </div>
  );
}
