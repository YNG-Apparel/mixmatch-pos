import { toRupiah, toTanggal, toNumber } from "../utils/format.js";
import { loadComponent } from "../utils/dom.js";
import { supabase, getProfile, signOut } from "../services/supabase.js";
import { ensureRoleAccess, getRole } from "../services/roleAuth.js";

export function showToast(message, type = "success") {
  const toastWrapper = document.querySelector("#toastWrapper");
  if (!toastWrapper) return;
  const toastId = `toast-${Date.now()}`;
  toastWrapper.insertAdjacentHTML(
    "beforeend",
    `
    <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `,
  );
  setTimeout(() => {
    const toast = document.getElementById(toastId);
    if (toast) toast.remove();
  }, 5000);
}

export async function ensureAuth(
  allowedRoles = ["Owner", "Manager", "Cashier"],
) {
  const profile = await getProfile();
  if (!profile) {
    window.location.href = "../pages/login.html";
    return null;
  }
  const userRole = await getRole();

  console.log("SIDEBAR ROLE:", userRole);
  if (!allowedRoles.includes(userRole)) {
    showToast("Anda tidak memiliki akses ke halaman ini.", "warning");
    const redirectUrl =
      userRole === "Cashier" ? "../pages/pos.html" : "../pages/dashboard.html";
    setTimeout(() => (window.location.href = redirectUrl), 1000);
    return null;
  }
  return profile;
}

export async function loadLayout(pageTitle) {
  const profile = await getProfile();
  if (!profile) {
    window.location.href = "../pages/login.html";
    return null;
  }
  const userRole = await getRole();

  console.log("LAYOUT ROLE:", userRole);
  const sidebarFile =
    userRole === "Owner"
      ? "../components/sidebar-owner.html"
      : userRole === "Manager"
        ? "../components/sidebar-manager.html"
        : "../components/sidebar-cashier.html";
  await loadComponent("#sidebarContainer", sidebarFile);
  await loadComponent("#topnavContainer", "../components/topnav.html");
  document.title = `${pageTitle} · Mix & Match`;
  const titleNode = document.querySelector("#pageTitle");
  if (titleNode) titleNode.textContent = pageTitle;
  const logoutButton = document.querySelector("#logoutButton");
  if (logoutButton)
    logoutButton.addEventListener("click", async () => {
      await signOut();
      window.location.href = "../pages/login.html";
    });
  const navUserName = document.querySelector("#navUserName");
  if (navUserName && profile) navUserName.textContent = profile.full_name;
  const sidebarToggle = document.querySelector("#sidebarToggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.querySelector(".sidebar")?.classList.toggle("active");
    });
  }
  return profile;
}

export { toRupiah, toTanggal, toNumber };
