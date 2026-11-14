const appRoot = document.querySelector("#app");
const currentPath = () => window.location.pathname.toLowerCase();
const authPaths = new Set(["/login", "/signup", "/reset"]);
let previewMode = false;

function showAuthError(message) {
  const form = document.querySelector("#auth-form");
  if (!form) return;
  let notice = form.querySelector(".auth-form-error");
  if (!notice) {
    notice = document.createElement("div");
    notice.className = "auth-form-error";
    notice.setAttribute("role", "alert");
    form.prepend(notice);
  }
  notice.textContent = message;
}

function showServiceError(message) {
  document.body.classList.remove("auth-checking");
  appRoot.innerHTML = `<main class="auth-service-error"><div class="brand-mark">!</div><h1>Sign-in is temporarily unavailable</h1><p>${message}</p><p>Check the MongoDB Atlas connection settings, database user, and network access, then try again.</p><a class="button button-primary" href="/login">Go to sign in</a></main>`;
}

async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not reach the authentication database.");
  const payload = await response.json();
  return payload.user;
}

function updateAccountUI(user) {
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  for (const avatar of document.querySelectorAll(".avatar")) avatar.textContent = initials || "U";
  const name = document.querySelector(".user-meta strong");
  const plan = document.querySelector(".user-meta small");
  if (name) name.textContent = user.name;
  if (plan) plan.textContent = `${user.plan[0].toUpperCase()}${user.plan.slice(1)} plan`;
  const credits = document.querySelector(".credits-pill");
  if (credits) credits.innerHTML = `<span class="credits-star">✦</span> ${Number(user.creditsBalance) || 0} <span class="credits-muted">credits</span>`;
}

async function bootstrapAuth() {
  try {
    const configResponse = await fetch("/api/config", { cache: "no-store" });
    const config = await configResponse.json();
    if (config.authPreview) {
      previewMode = true;
      document.body.classList.remove("auth-checking");
      const notice = document.querySelector(".auth-prototype-note");
      if (notice) notice.textContent = "UI preview only. Authentication is disabled; do not enter credentials.";
      const createLabel = document.querySelector(".composer-head .subtle-label");
      if (createLabel) createLabel.textContent = "Sample content · generation disabled";
      return;
    }
    const user = await getCurrentUser();
    const path = currentPath();
    if (!user && !authPaths.has(path)) {
      window.location.replace("/login");
      return;
    }
    if (user && authPaths.has(path)) {
      window.location.replace("/");
      return;
    }
    document.body.classList.remove("auth-checking");
    if (user) {
      updateAccountUI(user);
      const createLabel = document.querySelector(".composer-head .subtle-label");
      if (createLabel) createLabel.textContent = "Live generation · sources included";
    } else {
      const notice = document.querySelector(".auth-prototype-note");
      if (notice) notice.textContent = "Email and password sign-in use your private account. Google sign-in and reset emails are not enabled yet.";
    }
  } catch (error) {
    if (authPaths.has(currentPath())) {
      document.body.classList.remove("auth-checking");
      showAuthError("Sign-in cannot reach the database yet. Check Atlas setup, then try again.");
      return;
    }
    showServiceError(error instanceof Error ? error.message : "Could not reach the authentication database.");
  }
}

async function submitAuthForm(form) {
  if (previewMode) {
    showAuthError("Preview mode is active. No credentials were submitted or saved.");
    return;
  }
  const path = currentPath();
  if (path === "/reset") {
    showAuthError("Password reset email is not configured yet. Contact support to reset your password.");
    return;
  }

  const formData = new FormData(form);
  const payload = path === "/signup"
    ? { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") }
    : { email: formData.get("email"), password: formData.get("password") };
  const submit = form.querySelector('[type="submit"]');
  if (submit) {
    submit.disabled = true;
    submit.dataset.originalText = submit.textContent;
    submit.textContent = path === "/signup" ? "Creating account…" : "Signing in…";
  }

  try {
    const response = await fetch(path === "/signup" ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      showAuthError(result.error?.message || "Could not sign in. Please try again.");
      return;
    }
    window.location.replace("/");
  } catch {
    showAuthError("Authentication service is unavailable. Check your connection and try again.");
  } finally {
    if (submit?.isConnected) {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText || "Continue";
    }
  }
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "auth-form") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void submitAuthForm(event.target);
}, true);

document.addEventListener("click", (event) => {
  const control = event.target.closest("[data-auth-action]");
  if (!control) return;
  const action = control.dataset.authAction;
  if (!["login", "signup", "reset", "signout", "home", "google"].includes(action)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (action === "google") {
    showAuthError("Google OAuth is not configured for this app yet. Add the OAuth client settings before using Google sign-in.");
    return;
  }
  if (action === "signout") {
    if (previewMode) {
      window.location.replace("/login");
      return;
    }
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      .finally(() => window.location.replace("/login"));
    return;
  }
  const destination = action === "home" ? "/" : action === "reset" ? "/reset" : `/${action}`;
  window.location.assign(destination);
}, true);

void bootstrapAuth();
