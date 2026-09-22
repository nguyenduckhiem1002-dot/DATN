/**
 * Centralised copy for add-on descriptions and feature lists.
 * Every UI surface (banners, modals, onboarding, emails) should
 * import from here so the wording stays consistent.
 */

export const BARCODE_ADDON = {
  label: "Mã vạch thay thế",

  /** One-liner used in cards, banners, and onboarding toggles */
  description:
    "Tạo mã vạch mới hoặc sử dụng mã hiện có. Hỗ trợ Code128, Code39, EAN-13, DataMatrix và QR.",

  /** Shorter subtitle for modal headers */
  subtitle:
    "Bổ sung hỗ trợ các định dạng mã vạch tiêu chuẩn cho không gian làm việc.",

  /** Non-owner banner — tells the user to contact the owner */
  nonOwnerDescription:
    "Tạo mã vạch mới hoặc sử dụng mã hiện có. Hỗ trợ Code128, Code39, EAN-13, DataMatrix và QR. Liên hệ chủ không gian làm việc để bật tính năng này.",

  /** Bullet-point features for modals and emails */
  features: [
    "Hỗ trợ Code128, Code39, EAN-13, DataMatrix và QR",
    "Tạo nhãn mã vạch mới hoặc sử dụng mã hiện có",
    "In nhãn mã vạch cho tài sản",
    "Quét mã vạch để tra cứu tài sản nhanh",
  ],
} as const;

export const AUDIT_ADDON = {
  label: "Audits",

  /** One-liner used in cards, banners, and onboarding toggles */
  description:
    "Create audits, assign auditors, scan QR codes, and track asset verification in real-time.",

  /** Shorter subtitle for modal/page headers */
  subtitle: "Add powerful audit capabilities to your workspace.",

  /** Non-owner message on the unlock page */
  nonOwnerDescription:
    "Contact your workspace owner to enable the Audits add-on for your organization.",

  /** Bullet-point features for modals, unlock page, and emails */
  features: [
    "Create audits and assign auditors to verify your assets",
    "Set due dates and track progress in real-time",
    "Use QR code scanning for quick asset verification",
    "Generate detailed audit reports",
  ],
} as const;
