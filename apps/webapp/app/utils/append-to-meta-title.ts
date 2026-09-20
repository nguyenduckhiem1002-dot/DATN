/** Thêm thương hiệu Casla Assets vào tiêu đề trang. */
export const appendToMetaTitle = (title: string | null | undefined) =>
  `${title ? title : "Không tìm thấy"} | Casla Assets`;
