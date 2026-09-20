import { Button } from "../shared/button";

export const CategorySelectNoCategories = () => (
  <div>
    Bạn chưa có danh mục nào.{" "}
    <Button to={"/categories/new"} variant="link" className="">
      Tạo danh mục đầu tiên
    </Button>
  </div>
);
