import type { FC } from "react";
import SubHeading from "~/components/shared/sub-heading";

export type OtpVerifyMode = "login" | "signup" | "confirm_signup";

export type OtpPageData = Record<
  OtpVerifyMode,
  {
    title: string;
    SubHeading: FC<{ email: string }>;
    buttonTitle: string;
  }
>;

export const OTP_PAGE_MAP: OtpPageData = {
  login: {
    title: "Nhập mã xác thực",
    SubHeading: ({ email }) => (
      <SubHeading className="-mt-4 text-center">
        Chúng tôi đã gửi mã tới{" "}
        <span className="font-bold text-gray-900">{email}</span>. Nhập mã
        bên dưới để đăng nhập.
      </SubHeading>
    ),
    buttonTitle: "Đăng nhập",
  },
  signup: {
    title: "Tạo tài khoản",
    SubHeading: () => (
      <SubHeading className="-mt-4 text-center">
        Bắt đầu sử dụng Casla Assets.
      </SubHeading>
    ),
    buttonTitle: "Tạo tài khoản",
  },
  confirm_signup: {
    title: "Xác nhận email",
    SubHeading: ({ email }) => (
      <SubHeading className="-mt-4 text-center">
        Chúng tôi đã gửi mã tới{" "}
        <span className="font-bold text-gray-900">{email}</span>. Nhập mã
        bên dưới để xác nhận email.
      </SubHeading>
    ),
    buttonTitle: "Xác nhận",
  },
};

export const DEFAULT_PAGE_DATA: OtpPageData["login"] = {
  title: "Mã OTP",
  buttonTitle: "Tiếp tục",
  SubHeading: () => (
    <SubHeading className="-mt-4 text-center">
      Vui lòng xác nhận mã OTP để tiếp tục
    </SubHeading>
  ),
};

export function getOtpPageData(mode: OtpVerifyMode) {
  return OTP_PAGE_MAP[mode] ?? DEFAULT_PAGE_DATA;
}
