import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://hylyzujzakgmmivhhrkt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_D0IjdxRWf0OJxxBiMLe86A_Ay11lQrJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile() {
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      phone,
      address,
      role_id,
      username,
      roles (
        id,
        name
      )
    `,
    )
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTanggal(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleDateString("id-ID");
}

export function getRoleName(profile) {
  return profile?.roles?.name || "Cashier";
}

export async function signIn(login, password) {
  let email = login;

  // If user did NOT enter an email,
  // treat it as a username
  if (!login.includes("@")) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", login)
      .single();

    console.log("PROFILE:", profile);
    console.log("PROFILE ERROR:", profileError);

    if (profileError || !profile) {
      return {
        data: null,
        error: {
          message: "Username atau email tidak ditemukan",
        },
      };
    }

    email = profile.email;
  }
  console.log("Login Input:", login);
  console.log("Email Yang Dipakai:", email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function allowRole(role) {
  return async function () {
    const profile = await getProfile();
    if (!profile) {
      window.location.href = "../pages/login.html";
      return null;
    }
    if (!role.includes(getRoleName(profile))) {
      window.location.href = "../pages/dashboard.html";
      return null;
    }
    return profile;
  };
}
