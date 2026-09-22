import { SearchIcon } from "../icons/library";

export const EmptyState = ({
  modelName,
  searchQuery,
}: {
  modelName: string;
  searchQuery: string;
}) => (
  <div className="my-16 flex flex-col items-center px-3 text-center">
    <div className="mb-4 rounded-full bg-primary-50  p-2">
      <div className=" rounded-full bg-primary-100 p-2 text-primary">
        <SearchIcon className="h-auto" />
      </div>
    </div>

    <div>
      <div className="text-base font-semibold text-gray-900">
        Không tìm thấy kết quả phù hợp
      </div>
      <p className="text-sm text-gray-600">
        Tìm kiếm “{searchQuery}” không khớp với {modelName}.
      </p>
    </div>
  </div>
);
