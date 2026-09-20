/**
 * Type declarations for @shelf/labels (see index.js).
 * Hand-written to keep the package build-step-free.
 */
export declare const ASSET_STATUS_LABELS: {
  readonly AVAILABLE: "Sẵn sàng";
  readonly IN_CUSTODY: "Đang bàn giao";
  readonly CHECKED_OUT: "Đã xuất";
};

export declare const ASSET_QTY_STATUS_LABELS: {
  readonly AVAILABLE: "Sẵn sàng";
  readonly IN_CUSTODY: "Đang bàn giao";
  readonly PARTIAL_CUSTODY: "Bàn giao một phần";
  readonly CHECKED_OUT: "Đã xuất";
  readonly PARTIALLY_CHECKED_OUT: "Đã xuất một phần";
  readonly RESERVED: "Đã đặt trước";
  readonly PARTIALLY_RESERVED: "Đặt trước một phần";
};

export declare const ASSET_BOOKING_PSEUDO_STATUS_LABELS: {
  readonly ALREADY_CHECKED_IN: "Đã nhận lại";
  readonly PARTIALLY_CHECKED_IN: "Đã nhận lại một phần";
  readonly PARTIALLY_CHECKED_OUT: "Đã xuất một phần";
};

/**
 * How a kit's state is named, on the website and on the phone.
 *
 * `AVAILABLE`, `IN_CUSTODY` and `CHECKED_OUT` are the persisted `KitStatus`
 * enum; `PARTIALLY_CHECKED_IN` is derived by a booking for a kit whose every
 * member it holds has been checked back in while the booking still runs.
 *
 * The three enum entries carry the same wording as {@link ASSET_STATUS_LABELS}
 * without being spread from it — a booking shows a kit and the assets inside it
 * on one screen, so the strings must agree, while the key set must keep
 * tracking `KitStatus` alone.
 */
export declare const KIT_STATUS_LABELS: {
  readonly AVAILABLE: "Sẵn sàng";
  readonly IN_CUSTODY: "Đang bàn giao";
  readonly CHECKED_OUT: "Đã xuất";
  readonly PARTIALLY_CHECKED_IN: "Already checked in";
};

export declare const BOOKING_STATUS_LABELS: {
  readonly DRAFT: "Nháp";
  readonly RESERVED: "Đã đặt trước";
  readonly ONGOING: "Đang diễn ra";
  readonly OVERDUE: "Quá hạn";
  readonly COMPLETE: "Hoàn tất";
  readonly ARCHIVED: "Đã lưu trữ";
  readonly CANCELLED: "Đã hủy";
};

/** Audit session lifecycle (AuditStatus in the Prisma schema). */
export declare const AUDIT_STATUS_LABELS: {
  readonly PENDING: "Chờ thực hiện";
  readonly ACTIVE: "Đang thực hiện";
  readonly COMPLETED: "Hoàn tất";
  readonly CANCELLED: "Đã hủy";
  readonly ARCHIVED: "Đã lưu trữ";
};

/**
 * Who may act on an audit with no specific assignee, in the three registers the
 * two apps need: `SHORT` for a card's meta line, `A11Y` for the lowercase
 * fragment joined into a screen-reader announcement, `DETAIL` for the web's
 * explanatory tooltip. Kept together so they can never disagree.
 */
export declare const AUDIT_UNASSIGNED_LABELS: {
  readonly SHORT: "Chưa phân công · quản trị viên và chủ sở hữu có thể quét";
  readonly A11Y: "chưa phân công, quản trị viên và chủ sở hữu có thể quét";
  readonly DETAIL: "Quản trị viên và chủ sở hữu không gian làm việc có thể thực hiện đợt kiểm kê này vì chưa có người được phân công cụ thể.";
};

/**
 * Per-asset audit outcome (AuditAssetStatus in the Prisma schema).
 *
 * PENDING reads "Not scanned" rather than "Expected", which is the name of the
 * tile counting EVERY asset the audit covers. Prefer
 * {@link auditAssetStatusLabel} over indexing this map for PENDING, since only
 * that helper applies the completion rule.
 */
export declare const AUDIT_ASSET_STATUS_LABELS: {
  readonly PENDING: "Chưa quét";
  readonly FOUND: "Đã tìm thấy";
  readonly MISSING: "Thiếu";
  readonly UNEXPECTED: "Ngoài dự kiến";
};

/**
 * Wording for an audit scan whose asset no longer exists.
 *
 * Deleting an asset leaves the scan row behind with nothing to name it but the
 * title captured at scan time, so both apps must say it the same way. Prefer
 * {@link auditDeletedAssetLabel} over indexing this map — only that helper
 * applies the "keep the snapshotted title" rule.
 */
export declare const AUDIT_DELETED_ASSET_LABELS: {
  readonly UNTITLED: "Tài sản đã xóa";
};

/**
 * Names a scan whose asset has been deleted, keeping the title it had when it
 * was scanned and marking it as gone.
 *
 * @param title - the snapshotted title, if any
 * @returns the row's display name
 */
export declare function auditDeletedAssetLabel(
  title: string | null | undefined
): string;

/** Enum keys of {@link AUDIT_ASSET_STATUS_LABELS} — the Prisma status values. */
export type AuditAssetStatusKey = keyof typeof AUDIT_ASSET_STATUS_LABELS;

/** Enum keys of {@link AUDIT_STATUS_LABELS} — the Prisma AuditStatus values. */
export type AuditStatusKey = keyof typeof AUDIT_STATUS_LABELS;

/** The user-facing strings those keys resolve to. */
export type AuditAssetStatusLabel =
  (typeof AUDIT_ASSET_STATUS_LABELS)[AuditAssetStatusKey];

/**
 * The single derivation of the completion flag every audit label depends on.
 *
 * Reads `completedAt`, never `status`: archiving a completed audit rewrites the
 * status to ARCHIVED while keeping the timestamp and the finalised counts, so a
 * status check relabels genuinely missing assets as "Not scanned" on archive.
 * An archived-CANCELLED audit was never concluded and correctly stays open.
 *
 * Accepts a `Date` (Prisma/web) or an ISO string (the companion's JSON), so
 * both apps can pass their session object straight in.
 *
 * @param audit - anything carrying the audit's `completedAt`
 * @returns true once the audit has been concluded
 */
export declare function isAuditCompleted(
  audit: { completedAt?: Date | string | null } | null | undefined
): boolean;

/**
 * Label for a per-asset audit status. An expected asset that has not been
 * scanned only becomes "Missing" once the audit is completed.
 *
 * @param status - the stored AuditAssetStatus
 * @param isAuditCompleted - derive this with {@link isAuditCompleted}, never
 *   from the audit's status
 * @returns the words to show for that status
 */
export declare function auditAssetStatusLabel(
  status: AuditAssetStatusKey,
  isAuditCompleted: boolean
): AuditAssetStatusLabel;

/**
 * Why a booking cannot be reserved yet — the three rules web's Reserve button
 * disables on, in one register for every surface that states them (web
 * tooltip, mobile route 400, in-transaction guard, companion client note).
 *
 * These are the *reasons the button is blocked*. They are not the outcome of a
 * failed write: `reserveBooking`'s race-safe conflict check names the specific
 * offending assets and keeps its own richer message.
 */
export declare const BOOKING_RESERVE_BLOCKED_LABELS: {
  readonly NOTHING_TO_RESERVE: "Hãy thêm tài sản hoặc đặt trước ít nhất một mẫu tài sản trước khi xác nhận lịch đặt.";
  readonly UNAVAILABLE_ASSETS: "Lịch đặt này có tài sản đang không khả dụng. Hãy xóa chúng khỏi lịch hoặc chuyển về trạng thái sẵn sàng trước khi đặt.";
  readonly ALREADY_BOOKED: "Lịch đặt này có tài sản đã được đặt trong khoảng thời gian đó. Hãy xóa tài sản hoặc đổi thời gian trước khi đặt.";
};

/**
 * Refusal shown when emptying a RESERVED booking — the same zero-asset
 * invariant the Reserve guards defend, enforced on the removal side so it
 * cannot be reached from the other direction.
 *
 * RESERVED only: an empty DRAFT is normal work-in-progress, the terminal
 * statuses hold nothing, and ONGOING / OVERDUE bookings must stay emptiable so
 * a checked-out asset can still be pulled off a live booking.
 */
export declare const BOOKING_EMPTY_RESERVED_MESSAGE: "Lịch đã đặt phải có ít nhất một tài sản hoặc mẫu tài sản được giữ chỗ. Hãy hủy lịch hoặc thêm tài sản thay thế trước.";

/**
 * The semantic weight a status badge carries, independent of any palette. Each
 * app maps a tone onto its own colours (the webapp's fixed hex `BADGE_COLORS`,
 * the companion's light/dark theme), so the VALUES stay app-owned while the
 * DECISION is shared.
 *
 * neutral → grey · info → blue · success → green · warning → amber · danger → red
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Tone for each audit session status. */
export declare const AUDIT_STATUS_TONES: Readonly<
  Record<AuditStatusKey, StatusTone>
>;

/** Tone for each per-asset audit outcome, escalating neutral → danger. */
export declare const AUDIT_ASSET_STATUS_TONES: Readonly<
  Record<AuditAssetStatusKey, StatusTone>
>;
