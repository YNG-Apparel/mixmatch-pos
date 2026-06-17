import { getProfile } from "./supabase.js";

export const ROLE_ROUTES = {
  Owner: "../pages/dashboard.html",
  Manager: "../pages/dashboard.html",
  Cashier: "../pages/pos.html",
};

export const ROLE_PERMISSIONS = {
  Owner: [
    "dashboard",
    "products",
    "inventory",
    "cashier",
    "sales",
    "returns",
    "customers",
    "reports",
    "analytics",
    "staff",
    "settings",
    "pos",
    "sales-history",
    "categories",
  ],
  Manager: [
    "dashboard",
    "products",
    "inventory",
    "cashier",
    "sales",
    "returns",
    "customers",
    "reports",
    "analytics",
    "pos",
    "sales-history",
    "categories",
  ],
  Cashier: ["pos", "sales-history"],
};

export async function getRole() {
  const profile = await getProfile();

  console.log("FULL PROFILE:", profile);

  if (!profile) return "Cashier";

  switch (profile.role_id) {
    case 1:
      return "Owner";

    case 2:
      return "Manager";

    case 3:
      return "Cashier";

    default:
      return "Cashier";
  }
}

export async function redirectByRole() {
  const role = await getRole();

  const redirectUrl = ROLE_ROUTES[role];

  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
}

export async function ensureRoleAccess(pageType) {
  const profile = await getProfile();

  if (!profile) {
    window.location.href = "../pages/login.html";
    return null;
  }

  const role = await getRole();

  if (!ROLE_PERMISSIONS[role]?.includes(pageType)) {
    window.location.href = ROLE_ROUTES[role];
    return null;
  }

  return profile;
}

export function isOwner(profile) {
  return profile?.roles?.name === "Owner";
}

export function isManager(profile) {
  return profile?.roles?.name === "Manager";
}

export function isCashier(profile) {
  return profile?.roles?.name === "Cashier";
}
