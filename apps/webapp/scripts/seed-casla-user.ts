/**
 * Creates/repairs the local Casla Assets test account and an internal TEAM workspace.
 *
 * Password is intentionally read from the environment so it never enters git history.
 * Run from the monorepo root:
 *   pnpm --filter @shelf/webapp seed:casla-user
 */
import { Currency, OrganizationRoles, OrganizationType } from "@prisma/client";

import { createEmailAuthAccount, confirmExistingAuthAccount } from "../app/modules/auth/service.server";
import { db } from "../app/database/db.server";
import { createOrganization } from "../app/modules/organization/service.server";
import { createUser } from "../app/modules/user/service.server";

const DEFAULT_EMAIL = "ducknguyen1010@gmail.com";
const DEFAULT_PASSWORD = "Casla@2026";

async function ensureAuthUser(email: string, password: string) {
  const created = await createEmailAuthAccount(email, password).catch(() => null);
  if (created) return created;

  const existing = await confirmExistingAuthAccount(email, password).catch(
    () => null
  );
  if (existing) return existing;

  throw new Error(
    "Không thể tạo/cập nhật tài khoản Supabase Auth. Kiểm tra SUPABASE_URL, SUPABASE_SERVICE_ROLE và kết nối DB."
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed:casla-user chỉ dành cho môi trường dev/test.");
  }

  const email = (process.env.CASLA_TEST_USER_EMAIL || DEFAULT_EMAIL)
    .trim()
    .toLowerCase();
  const password =
    process.env.CASLA_TEST_USER_PASSWORD?.trim() || DEFAULT_PASSWORD;

  const authUser = await ensureAuthUser(email, password);

  let appUser = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!appUser) {
    appUser = await createUser({
      email,
      userId: authUser.id,
      username: "ducknguyen1010",
      firstName: "Duck",
      lastName: "Nguyen",
      skipPersonalOrg: true,
    });
  } else if (appUser.id !== authUser.id) {
    throw new Error(
      `Email ${email} tồn tại nhưng ID Auth và DB không khớp. Không tự động sửa để tránh làm hỏng dữ liệu.`
    );
  }

  await db.user.update({
    where: { id: appUser.id },
    data: {
      firstName: "Duck",
      lastName: "Nguyen",
      displayName: "Duck Nguyen",
      onboarded: true,
      sso: false,
    },
  });

  let ownedTeam = await db.userOrganization.findFirst({
    where: {
      userId: appUser.id,
      roles: { has: OrganizationRoles.OWNER },
      organization: { type: OrganizationType.TEAM },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!ownedTeam) {
    const organization = await createOrganization({
      name: "Casla Assets",
      userId: appUser.id,
      image: null,
      currency: Currency.VND,
    });

    ownedTeam = await db.userOrganization.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: appUser.id,
          organizationId: organization.id,
        },
      },
      include: { organization: true },
    });
  }

  const organization = await db.organization.update({
    where: { id: ownedTeam.organization.id },
    data: {
      name: "Casla Assets",
      currency: Currency.VND,
      workspaceDisabled: false,
      hasSequentialIdsMigrated: true,
      showShelfBranding: false,
      barcodesEnabled: true,
      auditsEnabled: true,
    },
  });

  await db.user.update({
    where: { id: appUser.id },
    data: { lastSelectedOrganizationId: organization.id },
  });

  console.log("Casla test user đã sẵn sàng:");
  console.log(`  Email: ${email}`);
  console.log(`  Workspace: ${organization.name}`);
  console.log("  Password: đã cấu hình cho tài khoản test dev/local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
