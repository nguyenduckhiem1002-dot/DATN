import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { data, redirect, useActionData } from "react-router";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { Form } from "~/components/custom-form";
import Input from "~/components/forms/input";
import { ShelfOTP } from "~/components/forms/otp-input";
import PasswordInput from "~/components/forms/password-input";
import { Button } from "~/components/shared/button";
import { db } from "~/database/db.server";
import { useSearchParams } from "~/hooks/search-params";
import { useDisabled } from "~/hooks/use-disabled";
import { getSupabaseAdmin } from "~/integrations/supabase/client";

import {
  sendResetPasswordLink,
  updateAccountPassword,
} from "~/modules/auth/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError, ShelfError } from "~/utils/error";
import { getValidationErrors } from "~/utils/http";
import {
  payload,
  error,
  getCurrentSearchParams,
  parseData,
  readFormData,
} from "~/utils/http.server";
import { Logger } from "~/utils/logger";
import { validEmail } from "~/utils/misc";
import { passwordSchema } from "~/utils/zod";

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .transform((email) => email.toLowerCase())
    .refine(validEmail, () => ({
      message: "Vui lòng nhập email hợp lệ",
    })),
});

const OtpSchema = z
  .object({
    otp: z.string().min(6, "Vui lòng nhập mã OTP."),
    email: z.string().transform((email) => email.toLowerCase()),
    password: passwordSchema("Mật khẩu quá ngắn. Tối thiểu 8 ký tự."),
    confirmPassword: passwordSchema(
      "Mật khẩu quá ngắn. Tối thiểu 8 ký tự."
    ),
  })
  .superRefine(({ password, confirmPassword, otp, email }, ctx) => {
    if (password !== confirmPassword) {
      return ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mật khẩu xác nhận phải trùng với mật khẩu",
        path: ["confirmPassword"],
      });
    }

    return { password, confirmPassword, otp, email };
  });

export function loader({ context, request }: LoaderFunctionArgs) {
  const searchParams = getCurrentSearchParams(request);

  const title = "Quên mật khẩu?";
  const subHeading =
    searchParams.has("email") && searchParams.get("email") !== ""
      ? "Bước 2/2: Nhập mã OTP và mật khẩu mới"
      : "Bước 1/2: Nhập email";

  if (context.isAuthenticated) {
    return redirect("/assets");
  }

  return data(payload({ title, subHeading }));
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { intent } = parseData(
      await readFormData(request.clone()),
      z.object({ intent: z.enum(["request-otp", "confirm-otp"]) }),
      {
        message:
          "Yêu cầu không hợp lệ. Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, hãy liên hệ bộ phận hỗ trợ.",
        shouldBeCaptured: false,
      }
    );

    switch (intent) {
      case "request-otp": {
        const { email } = parseData(
          await readFormData(request),
          ForgotPasswordSchema,
          { shouldBeCaptured: false }
        );

        /**
         * Every outcome below MUST respond identically — same status, same
         * redirect target — whether or not the address belongs to an account.
         * Distinguishable responses let anyone enumerate which addresses are
         * registered, and which are federated, one request at a time.
         *
         * Eligibility to receive a link is decided by the PER-USER `sso` flag,
         * never by the domain's SSO configuration. `sso: true` is only set when
         * a user actually arrives through SSO, so a domain configured for SSO
         * can still hold password accounts created before it was federated;
         * gating on the domain locks those users out of recovery entirely.
         * `validateNonSSOUser` in `auth/service.server` gates the same way.
         *
         * A "use SSO instead" hint belongs in the page as static copy shown to
         * everyone — that helps without answering a question about any
         * particular address.
         */
        const user = await db.user.findFirst({
          where: { email },
          select: {
            id: true,
            sso: true,
          },
        });

        if (user && !user.sso) {
          /**
           * NOT awaited, and its failure never reaches the client.
           *
           * Response time must not depend on the answer. Awaiting this costs a
           * second DB read inside `validateNonSSOUser` plus a Supabase API call
           * (~50-300ms) that an unknown or SSO address never pays, and
           * averaging repeated requests reads accounts off that difference —
           * the uniform response above, undone by the clock.
           *
           * Requires a long-lived server process: this deploys under
           * `react-router-hono-server` in Docker on Fly, so the promise settles
           * after the response. On a runtime that suspends once the response is
           * sent, this must become a queued job or reset emails silently stop.
           *
           * The rejection is swallowed because a delivery failure is only
           * reachable for an address that exists, so surfacing it re-opens the
           * leak by another route.
           */
          void sendResetPasswordLink(email).catch((cause: unknown) => {
            Logger.error(
              new ShelfError({
                cause,
                message: "Failed to send the password reset link",
                // The USER ID, not the address. This endpoint is anonymous, so
                // logging the email would put account addresses into the log
                // stream and Sentry — a log-side version of the very leak this
                // route was changed to close, since anyone with log access
                // could then read off which addresses are registered. The id
                // identifies the account for debugging without storing PII.
                additionalData: { userId: user.id },
                label: "Auth",
              })
            );
          });
        }

        // Encoded: an address containing `&` or `#` would otherwise
        // truncate or corrupt the redirect target.
        return redirect("/forgot-password?email=" + encodeURIComponent(email));
      }
      case "confirm-otp": {
        const { email, otp, password } = parseData(
          await readFormData(request.clone()),
          OtpSchema,
          { shouldBeCaptured: false }
        );

        // Attempt to verify the OTP
        const { data: otpData, error: verifyError } =
          await getSupabaseAdmin().auth.verifyOtp({
            email,
            token: otp,
            type: "recovery",
          });

        if (verifyError || !otpData.user || !otpData.session) {
          throw new ShelfError({
            cause: verifyError,
            message: "Mã xác thực không hợp lệ hoặc đã hết hạn",
            // The OTP is deliberately NOT included. It is a live
            // account-takeover credential until it expires, and additionalData
            // is written straight to the log line.
            additionalData: { email },
            label: "Auth",
            shouldBeCaptured: false,
          });
        }

        /**
         * Revokes every session for the user so other logged-in browsers are
         * signed out on their next request. We pass the freshly-minted OTP
         * access token so the explicit `signOut(…, "others")` defense-in-depth
         * layer can run before the update (see `updateAccountPassword`).
         */
        await updateAccountPassword(
          otpData.user.id,
          password,
          otpData.session.access_token
        );

        context.destroySession();
        return redirect("/login?password_reset=true");
      }
    }
  } catch (cause) {
    const reason = makeShelfError(cause);
    return data(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.title) : "" },
];

export default function ForgotPassword() {
  const zo = useZorm("ForgotPasswordForm", ForgotPasswordSchema);
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const emailError =
    zo.errors.email()?.message || actionData?.error?.message || "";
  const disabled = useDisabled();

  /**
   * Field-level validation errors from the confirm-otp (password reset) step.
   * When present, keep the password form mounted so the errors render inline on
   * their fields — instead of bouncing back to the email step with a generic
   * message. Hard errors (e.g. an invalid OTP) still fall back to the email step.
   */
  const otpValidationErrors = getValidationErrors<typeof OtpSchema>(
    actionData?.error
  );

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full">
        {(actionData?.error && !otpValidationErrors) ||
        !email ||
        email === "" ? (
          <div>
            <p className="mb-4 text-center">
              Nhập địa chỉ email, hệ thống sẽ gửi mã dùng một lần để
              đặt lại mật khẩu.
            </p>
            <Form ref={zo.ref} method="post" className="space-y-2" replace>
              <input type="hidden" name="intent" value="request-otp" />
              <div>
                <Input
                  label="Địa chỉ email"
                  data-test-id="email"
                  name={zo.fields.email()}
                  type="email"
                  autoComplete="email"
                  inputClassName="w-full"
                  placeholder="zaans@huisje.com"
                  disabled={disabled}
                  error={emailError}
                />
              </div>

              <Button
                data-test-id="send-password-reset-link"
                width="full"
                type="submit"
                disabled={disabled}
              >
                {!disabled ? "Đặt lại mật khẩu" : "Đang gửi mã..."}
              </Button>
            </Form>
            <p className="mt-2 text-center text-gray-500">
              Mẹo: Hãy kiểm tra thư rác nếu bạn chưa thấy email sau vài phút.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2">
              Chúng tôi đã gửi mã gồm 6 chữ số tới{" "}
              <span className="font-semibold">{email}</span>.
            </p>
            <ol className="mb-4 list-inside list-decimal">
              <li>Nhập mã nhận được trong email</li>
              <li>Nhập mật khẩu mới</li>
              <li>Xác nhận mật khẩu mới</li>
            </ol>
            <PasswordResetForm email={email} />
          </>
        )}
        <div className="pt-4 text-center">
          {email ? (
            <Button variant="link" to={"/forgot-password"}>
              Yêu cầu mã mới
            </Button>
          ) : (
            <Button variant="link" to={"/login"}>
              Quay lại đăng nhập
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordResetForm({ email }: { email: string }) {
  const zoReset = useZorm("ResetPasswordForm", OtpSchema);
  const disabled = useDisabled();
  const actionData = useActionData<typeof action>();

  /**
   * Server-side validation errors for the reset fields, shown as a fallback
   * when client-side zorm validation is bypassed (disabled JS, modified
   * request, or client/server rule divergence). See CLAUDE.md form pattern.
   */
  const validationErrors = getValidationErrors<typeof OtpSchema>(
    actionData?.error
  );

  // Keep the form mounted for validation errors so field-level messages render;
  // only a hard error (e.g. invalid OTP) falls back to the generic message.
  return !email || email === "" || (actionData?.error && !validationErrors) ? (
    <div>Đã xảy ra lỗi. Vui lòng tải lại trang và thử lại.</div>
  ) : (
    <Form method="post" ref={zoReset.ref} className="space-y-2">
      <ShelfOTP error={zoReset.errors.otp()?.message} />

      <PasswordInput
        label="Mật khẩu mới"
        data-test-id="password"
        name={zoReset.fields.password()}
        type="password"
        autoComplete="new-password"
        disabled={disabled}
        error={
          validationErrors?.password?.message ||
          zoReset.errors.password()?.message
        }
        placeholder="********"
        required
      />
      <PasswordInput
        label="Xác nhận mật khẩu mới"
        data-test-id="confirmPassword"
        name={zoReset.fields.confirmPassword()}
        type="password"
        autoComplete="new-password"
        disabled={disabled}
        error={
          validationErrors?.confirmPassword?.message ||
          zoReset.errors.confirmPassword()?.message
        }
        placeholder="********"
        required
      />

      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="intent" value="confirm-otp" />

      <Button
        data-test-id="create-account"
        type="submit"
        className="w-full "
        disabled={disabled}
      >
        Xác nhận đặt lại mật khẩu
      </Button>
    </Form>
  );
}
