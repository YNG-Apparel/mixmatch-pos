import { signIn, getProfile } from "../services/supabase.js";
import { showToast } from "./utils.js";
import { getRole, ROLE_ROUTES } from "../services/roleAuth.js";

async function handleLogin(event) {
  event.preventDefault();
  const loginButton = document.querySelector("#loginButton");
  const loginInput = document.querySelector("#login");
  const passwordInput = document.querySelector("#password");
  loginButton.disabled = true;
  const login = loginInput.value.trim();
  const password = passwordInput.value;

  if (!login || !password) {
    showToast("Username atau email dan kata sandi wajib diisi.", "danger");
    loginButton.disabled = false;
    return;
  }

  const { data, error } = await signIn(login, password);
  console.log("LOGIN DATA:", data);
  console.log("LOGIN ERROR:", error);
  if (error) {
    showToast(
      error.message || "Login gagal. Periksa kembali kredensial.",
      "danger",
    );
    loginButton.disabled = false;
    return;
  }

  if (data?.session) {
    const role = await getRole();
    const ROLE_ROUTES = {
      Owner: "../pages/dashboard.html",
      Manager: "../pages/dashboard.html",
      Cashier: "../pages/pos.html",
    };
    const redirectUrl = ROLE_ROUTES[role] || "../pages/dashboard.html";
    window.location.href = redirectUrl;
    return;
  }

  showToast("Login sedang diproses...", "info");
  loginButton.disabled = false;
}

async function initLogin() {
  const loginForm = document.querySelector("#loginForm");
  if (!loginForm) return;
  loginForm.addEventListener("submit", handleLogin);

  const passwordInput = document.querySelector("#password");
  const togglePassword = document.querySelector("#togglePassword");

  if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";

      passwordInput.type = isHidden ? "text" : "password";

      togglePassword.textContent = isHidden ? "🙈" : "👁";
    });
  }

  const profile = await getProfile();

  if (profile) {
    const role = await getRole();

    console.log("AUTO LOGIN ROLE:", role);

    const redirectUrl = ROLE_ROUTES[role] || "../pages/dashboard.html";

    window.location.href = redirectUrl;
  }
}

window.addEventListener("DOMContentLoaded", initLogin);
