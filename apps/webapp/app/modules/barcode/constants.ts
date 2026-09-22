import { BarcodeType } from "@prisma/client";

export const BARCODE_TYPE_OPTIONS = [
  {
    value: BarcodeType.Code128,
    label: "Code 128",
    description:
      "4-40 ký tự, hỗ trợ chữ cái, chữ số và ký hiệu (ví dụ: ABC-123)",
  },
  {
    value: BarcodeType.Code39,
    label: "Code 39",
    description: "4-43 ký tự, chỉ gồm chữ cái và chữ số (ví dụ: ABC123)",
  },
  {
    value: BarcodeType.DataMatrix,
    label: "DataMatrix",
    description:
      "4-100 ký tự, hỗ trợ chữ cái, chữ số và ký hiệu (ví dụ: ABC-123)",
  },
  {
    value: BarcodeType.ExternalQR,
    label: "QR ngoài hệ thống",
    description:
      "1-2048 ký tự, hỗ trợ URL, văn bản hoặc nội dung QR bên ngoài (ví dụ: https://example.com)",
  },
  {
    value: BarcodeType.EAN13,
    label: "EAN-13",
    description:
      "Đúng 13 chữ số. Dùng cho mã vạch bán lẻ và mã nhận diện sản phẩm 13 chữ số.",
  },
];
