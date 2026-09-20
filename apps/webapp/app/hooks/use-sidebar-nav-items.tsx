import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AlarmClockIcon,
  BoxesIcon,
  CalendarRangeIcon,
  ChartLineIcon,
  ClipboardCheckIcon,
  FileBarChartIcon,
  HomeIcon,
  MapPinIcon,
  Package,
  PackageOpenIcon,
  ScanBarcodeIcon,
  SettingsIcon,
  TagsIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { useLoaderData } from "react-router";
import { UpgradeMessage } from "~/components/marketing/upgrade-message";
import When from "~/components/when/when";
import type { loader } from "~/routes/_layout+/_layout";
import { isPersonalOrg } from "~/utils/organization";
import { useCurrentOrganization } from "./use-current-organization";
import { useUserRoleHelper } from "./user-user-role-helper";

type BaseNavItem = {
  title: string;
  hidden?: boolean;
  Icon: LucideIcon;
  disabled?: boolean | { reason: ReactNode };
  badge?: {
    show: boolean;
    variant?: "unread";
  };
};

export type ChildNavItem = BaseNavItem & {
  type: "child";
  to: string;
  target?: string;
};

export type ParentNavItem = BaseNavItem & {
  type: "parent";
  children: Omit<ChildNavItem, "type" | "Icon">[];
};

type LabelNavItem = Omit<BaseNavItem, "Icon"> & {
  type: "label";
};

type ButtonNavItem = BaseNavItem & {
  type: "button";
  onClick: () => void;
};

export type NavItem =
  | ChildNavItem
  | ParentNavItem
  | LabelNavItem
  | ButtonNavItem;

export function useSidebarNavItems() {
  const { isAdmin, canUseBookings, subscription } =
    useLoaderData<typeof loader>();
  const { isBaseOrSelfService } = useUserRoleHelper();
  const currentOrganization = useCurrentOrganization();
  const isPersonalOrganization = isPersonalOrg(currentOrganization);

  const bookingDisabled = useMemo(() => {
    if (canUseBookings) {
      return false;
    }

    return {
      reason: (
        <div>
          <h5>Đang tắt</h5>
          <p>
            Tính năng đặt lịch chỉ khả dụng cho không gian làm việc Nhóm.
          </p>

          <When truthy={!!subscription} fallback={<UpgradeMessage />}>
            <p>Vui lòng chuyển sang không gian làm việc của nhóm để sử dụng tính năng này.</p>
          </When>
        </div>
      ),
    };
  }, [canUseBookings, subscription]);

  /**
   * Personal workspaces can't invite registered users. Rather than hide the
   * "Users" / "Pending invites" items, we show them disabled with an upgrade
   * reason, mirroring how bookings are surfaced on Personal workspaces.
   */
  const teamInviteDisabled = useMemo(() => {
    if (!isPersonalOrganization) {
      return false;
    }

    return { reason: "Mời người dùng chỉ khả dụng trong không gian làm việc Nhóm" };
  }, [isPersonalOrganization]);

  const topMenuItems: NavItem[] = [
    {
      type: "child",
      title: "Trang quản trị",
      to: "/admin-dashboard/users",
      Icon: ChartLineIcon,
      hidden: !isAdmin,
    },
    {
      type: "label",
      title: "Quản lý tài sản",
    },
    {
      type: "child",
      title: "Trang chủ",
      to: "/home",
      Icon: HomeIcon,
      hidden: isBaseOrSelfService,
    },
    {
      type: "child",
      title: "Tài sản",
      to: "/assets",
      Icon: PackageOpenIcon,
    },
    {
      type: "child",
      title: "Bộ tài sản",
      to: "/kits",
      Icon: Package,
    },
    {
      type: "child",
      title: "Danh mục",
      to: "/categories",
      Icon: BoxesIcon,
      hidden: isBaseOrSelfService,
    },
    {
      type: "child",
      title: "Thẻ",
      to: "/tags",
      Icon: TagsIcon,
      hidden: isBaseOrSelfService,
    },
    {
      type: "child",
      title: "Vị trí",
      to: "/locations",
      Icon: MapPinIcon,
      hidden: isBaseOrSelfService,
    },
    {
      type: "child",
      title: "Kiểm kê",
      to: "/audits",
      Icon: ClipboardCheckIcon,
    },
    {
      type: "parent",
      title: "Đặt lịch",
      Icon: CalendarRangeIcon,
      disabled: bookingDisabled,
      children: [
        {
          title: "Danh sách đặt lịch",
          to: "/bookings",
          disabled: bookingDisabled,
        },
        {
          title: "Lịch",
          to: "/calendar",
          disabled: bookingDisabled,
        },
      ],
    },
    {
      type: "child",
      title: "Nhắc việc",
      Icon: AlarmClockIcon,
      hidden: isBaseOrSelfService,
      to: "/reminders",
    },
    {
      type: "child",
      title: "Báo cáo",
      Icon: FileBarChartIcon,
      hidden: isBaseOrSelfService,
      to: "/reports",
    },
    {
      type: "label",
      title: "Tổ chức",
      hidden: isBaseOrSelfService,
    },
    {
      type: "parent",
      title: "Nhân sự",
      Icon: UsersRoundIcon,
      hidden: isBaseOrSelfService,
      children: [
        {
          title: "Người dùng",
          to: "/settings/team/users",
          disabled: teamInviteDisabled,
        },
        {
          title: "Lời mời đang chờ",
          to: "/settings/team/invites",
          disabled: teamInviteDisabled,
        },
        {
          title: "Thành viên chưa đăng ký",
          to: "/settings/team/nrm",
        },
      ],
    },
    {
      type: "parent",
      title: "Cài đặt không gian làm việc",
      Icon: SettingsIcon,
      hidden: isBaseOrSelfService,
      children: [
        {
          title: "Chung",
          to: "/settings/general",
        },
        {
          title: "Đặt lịch",
          to: "/settings/bookings",
          hidden: isPersonalOrganization,
        },
        {
          title: "Trường tùy chỉnh",
          to: "/settings/custom-fields",
        },
        {
          title: "Mẫu tài sản",
          to: "/settings/asset-models",
        },
      ],
    },
  ];

  // Casla Assets is an internal company app: keep the utility footer focused
  // on operational tasks and remove Shelf SaaS/store/update/feedback surfaces.
  const bottomMenuItems: NavItem[] = [
    {
      type: "child",
      title: "Quét mã QR",
      to: "/scanner",
      Icon: ScanBarcodeIcon,
    },
  ];

  return {
    topMenuItems: removeHiddenNavItems(topMenuItems),
    bottomMenuItems: removeHiddenNavItems(bottomMenuItems),
  };
}

function removeHiddenNavItems(navItems: NavItem[]) {
  return navItems
    .filter((item) => !item.hidden)
    .map((item) => {
      if (item.type === "parent") {
        return {
          ...item,
          children: item.children.filter((child) => !child.hidden),
        };
      }

      return item;
    });
}
