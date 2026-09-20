import { Link, Outlet } from "react-router";
import { ErrorContent } from "~/components/errors";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";

export const meta = () => [{ title: appendToMetaTitle("Bộ tài sản") }];

export function loader() {
  return null;
}

export const handle = {
  breadcrumb: () => <Link to="/kits">Bộ tài sản</Link>,
};

export default function Kits() {
  return <Outlet />;
}

export const ErrorBoundary = () => <ErrorContent />;
