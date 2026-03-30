import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("No se encontro el contenedor principal.");
}

app.innerHTML = `
  <main class="hero">
    <div class="grid-overlay"></div>
    <div class="floating floating-1">∫</div>
    <div class="floating floating-2">∂</div>
    <div class="floating floating-3">Σ</div>
    <div class="floating floating-4">λ</div>
    <div class="floating floating-5">∇</div>
    <div class="floating floating-6">π</div>
    <div class="floating floating-7">∞</div>
    <div class="floating floating-8">√</div>
    <div class="floating floating-9">Δ</div>

    <header class="topbar">
      <button class="brand brand-button" type="button" data-go-home>
        <span class="brand-logo">∫</span>
        <span>TesisAmazonia</span>
      </button>
      <nav class="topbar-actions topbar-actions--guest" id="topbar-guest">
        <button class="btn btn-ghost nav-btn" type="button" data-auth-tab="login">
          Iniciar sesion
        </button>
        <button class="btn btn-ghost nav-btn" type="button" data-auth-tab="register">
          Registrarse
        </button>
      </nav>
      <div class="topbar-user hidden" id="topbar-user">
        <div class="user-menu" id="user-menu">
          <button
            type="button"
            class="user-avatar"
            id="user-menu-trigger"
            aria-expanded="false"
            aria-haspopup="true"
            aria-label="Menu de usuario"
          >
            <span id="user-avatar-initial">?</span>
          </button>
          <div class="user-dropdown" id="user-dropdown" role="menu">
            <div class="user-dropdown-header">
              <p class="user-dropdown-name" id="user-dropdown-name"></p>
              <p class="user-dropdown-email" id="user-dropdown-email"></p>
            </div>
            <button type="button" class="user-dropdown-logout" id="user-logout-btn" role="menuitem">
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </header>

    <section id="home-view" class="hero-content home-view">
      <div id="home-session-toast" class="home-toast hidden" role="status" aria-live="polite"></div>
      <span class="badge">Resuelve integrales al instante</span>
      <h1>Integrales <span>Resueltas</span></h1>
      <p>
        Ingresa cualquier integral y obten la solucion paso a paso con
        visualizaciones interactivas y graficas claras.
      </p>
      <div class="actions">
        <button class="btn btn-primary" type="button" data-auth-tab="register">Comenzar ahora</button>
        <button class="btn btn-ghost" type="button" data-auth-tab="login">Ver ejemplos</button>
      </div>

      <article class="equation-card">
        <div class="traffic-lights">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="caption">Ejemplo de integral</p>
        <p class="equation">∫ x·e^x dx = e^x(x - 1) + C</p>
      </article>
    </section>

    <section id="auth-view" class="hero-content auth-wrapper hidden">
      <article class="auth-card" id="auth-card">
        <div id="login-panel">
          <span class="badge">Bienvenido</span>
          <h2 class="auth-title">Iniciar sesion</h2>
          <p class="auth-subtitle">Usa tu correo @udla.edu.co y tu contrasena</p>

          <form id="login-form" class="auth-form" novalidate>
            <p id="auth-message" class="auth-message hidden" role="alert"></p>

            <label class="auth-field">
              <span>Correo institucional</span>
              <input
                type="email"
                name="email"
                inputmode="email"
                autocomplete="email"
                placeholder="tu.correo@udla.edu.co"
                required
              />
            </label>

            <label class="auth-field">
              <span>Contrasena</span>
              <input
                type="password"
                name="password"
                autocomplete="current-password"
                placeholder="Ingresa tu contrasena"
                required
              />
            </label>

            <button class="btn btn-primary auth-submit" type="submit">Acceder</button>
          </form>
        </div>

        <div id="register-panel" class="hidden">
          <div id="register-step-data">
            <span class="badge">Crear cuenta</span>
            <h2 class="auth-title">Crear cuenta</h2>
            <p class="auth-subtitle">Completa tus datos; el correo debe ser @udla.edu.co</p>

            <form id="register-data-form" class="auth-form auth-form-register" novalidate>
              <p id="register-data-message" class="auth-message hidden" role="alert"></p>

              <label class="auth-field">
                <span>Correo institucional *</span>
                <input
                  type="email"
                  name="email"
                  inputmode="email"
                  autocomplete="email"
                  placeholder="tu.correo@udla.edu.co"
                  required
                />
              </label>

              <label class="auth-field">
                <span>Nombre completo</span>
                <input type="text" name="nombre" placeholder="Ingresa tu nombre" required />
              </label>

              <label class="auth-field">
                <span>Genero</span>
                <select name="genero" required>
                  <option value="" disabled selected hidden>Selecciona una opcion</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </label>

              <label class="auth-field">
                <span>Celular</span>
                <input type="tel" name="celular" inputmode="tel" placeholder="Ej. 3001234567" required />
              </label>

              <label class="auth-field">
                <span>Programa</span>
                <input type="text" name="programa" placeholder="Nombre del programa" required />
              </label>

              <label class="auth-field">
                <span>Semestre</span>
                <input type="number" name="semestre" min="1" max="20" step="1" placeholder="1 a 20" required />
              </label>

              <label class="auth-field auth-field-span-full">
                <span>Contrasena</span>
                <input
                  type="password"
                  name="password"
                  autocomplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  required
                />
              </label>

              <button type="submit" id="register-continue-btn" class="btn btn-primary auth-submit">
                Continuar
              </button>
            </form>
          </div>

          <div id="register-step-verify" class="hidden">
            <h2 class="auth-title verify-screen-title">Verifica tu correo electronico</h2>
            <p class="auth-subtitle verify-screen-sub">
              Ingresa el codigo que enviamos a tu correo
            </p>

            <button type="button" class="verify-back-edit" id="verify-back-edit">
              ← Volver a editar mis datos
            </button>

            <p id="verify-message" class="auth-message hidden" role="alert"></p>

            <div class="verify-email-box">
              <span class="verify-email-box-label">Correo institucional *</span>
              <div class="verify-email-box-inner" id="verify-email-display">
                <span class="verify-email-icon" aria-hidden="true">✉</span>
                <span id="verify-email-text"></span>
              </div>
            </div>

            <p class="code-digits-heading">Codigo de verificacion</p>
            <div class="code-digits" id="code-digits" role="group" aria-label="Codigo de 6 digitos">
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="0" aria-label="Digito 1" />
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="1" aria-label="Digito 2" />
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="2" aria-label="Digito 3" />
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="3" aria-label="Digito 4" />
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="4" aria-label="Digito 5" />
              <input class="code-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" data-index="5" aria-label="Digito 6" />
            </div>

            <button type="button" id="verify-submit-btn" class="btn btn-primary btn-block verify-submit-btn" disabled>
              Verificar codigo
            </button>

            <p class="verify-footer-line">
              ¿No recibiste el codigo?
              <button type="button" class="link-like" id="resend-code-btn">Reenviar codigo</button>
            </p>
            <button type="button" class="link-like link-like-center" id="verify-back-login">
              Volver al inicio de sesion
            </button>
          </div>
        </div>
      </article>
    </section>
  </main>
`;

const tabButtons = document.querySelectorAll<HTMLButtonElement>("[data-auth-tab]");
const goHomeButton = document.querySelector<HTMLButtonElement>("[data-go-home]");
const homeView = document.querySelector<HTMLElement>("#home-view");
const authView = document.querySelector<HTMLElement>("#auth-view");
const authCard = document.querySelector<HTMLElement>("#auth-card");
const loginPanel = document.querySelector<HTMLElement>("#login-panel");
const registerPanel = document.querySelector<HTMLElement>("#register-panel");
const registerStepData = document.querySelector<HTMLElement>("#register-step-data");
const registerStepVerify = document.querySelector<HTMLElement>("#register-step-verify");
const loginForm = document.querySelector<HTMLFormElement>("#login-form");
const registerDataForm = document.querySelector<HTMLFormElement>("#register-data-form");
const authMessage = document.querySelector<HTMLParagraphElement>("#auth-message");
const registerDataMessage = document.querySelector<HTMLParagraphElement>("#register-data-message");
const verifyMessage = document.querySelector<HTMLParagraphElement>("#verify-message");
const verifyEmailText = document.querySelector<HTMLElement>("#verify-email-text");
const codeDigitInputs = document.querySelectorAll<HTMLInputElement>("#code-digits .code-digit");
const verifySubmitBtn = document.querySelector<HTMLButtonElement>("#verify-submit-btn");
const resendCodeBtn = document.querySelector<HTMLButtonElement>("#resend-code-btn");
const verifyBackLoginBtn = document.querySelector<HTMLButtonElement>("#verify-back-login");
const verifyBackEditBtn = document.querySelector<HTMLButtonElement>("#verify-back-edit");
const registerContinueBtn = document.querySelector<HTMLButtonElement>("#register-continue-btn");
const topbarGuest = document.querySelector<HTMLElement>("#topbar-guest");
const topbarUser = document.querySelector<HTMLElement>("#topbar-user");
const userMenu = document.querySelector<HTMLElement>("#user-menu");
const userMenuTrigger = document.querySelector<HTMLButtonElement>("#user-menu-trigger");
const userAvatarInitial = document.querySelector<HTMLElement>("#user-avatar-initial");
const userDropdownName = document.querySelector<HTMLElement>("#user-dropdown-name");
const userDropdownEmail = document.querySelector<HTMLElement>("#user-dropdown-email");
const userLogoutBtn = document.querySelector<HTMLButtonElement>("#user-logout-btn");
const homeSessionToast = document.querySelector<HTMLElement>("#home-session-toast");

// Backend: VITE_API_URL en .env gana si existe. Si no, comenta una URL
// y descomenta la otra: local (npm run dev) vs producción (Vercel).
const API_BASE =
  (import.meta as any).env?.VITE_API_URL ??
  (
    // "http://localhost:3000" // local
    "https://backend-tesis-4m3e.onrender.com" // producción
  );

/** Mismo criterio que backend SKIP_EMAIL_VERIFICATION=true. "false" = flujo con correo y codigo. */
const SKIP_EMAIL_VERIFICATION =
  (import.meta as any).env?.VITE_SKIP_EMAIL_VERIFICATION !== "false";

const REGISTRATION_JWT_STORAGE_KEY = "todoak_registration_jwt";
const USER_SESSION_KEY = "tesisamazonia_user_session";

let authMode: "login" | "register" = "login";
let toastHideTimer: number | undefined;

type PendingRegistration = {
  email: string;
  nombre: string;
  genero: string;
  celular: string;
  programa: string;
  semestre: number;
  password: string;
};

let pendingRegistration: PendingRegistration | null = null;

type UserSession = {
  userId: number;
  email: string;
  nombre: string;
};

function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function clearRegistrationToken(): void {
  sessionStorage.removeItem(REGISTRATION_JWT_STORAGE_KEY);
}

function getUserSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as UserSession;
    if (
      typeof data.userId !== "number" ||
      typeof data.email !== "string" ||
      typeof data.nombre !== "string"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveUserSession(session: UserSession): void {
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
}

function clearUserSession(): void {
  sessionStorage.removeItem(USER_SESSION_KEY);
}

function userInitial(nombre: string, email: string): string {
  const n = nombre.trim();
  if (n.length > 0) {
    return n.charAt(0).toUpperCase();
  }
  const e = email.trim();
  if (e.length > 0) {
    return e.charAt(0).toUpperCase();
  }
  return "?";
}

function closeUserMenu(): void {
  userMenu?.classList.remove("is-open");
  userMenuTrigger?.setAttribute("aria-expanded", "false");
}

function applyHeaderAuthState(): void {
  const session = getUserSession();
  if (session) {
    topbarGuest?.classList.add("hidden");
    topbarUser?.classList.remove("hidden");
    if (userAvatarInitial) {
      userAvatarInitial.textContent = userInitial(session.nombre, session.email);
    }
    if (userDropdownName) {
      userDropdownName.textContent = session.nombre.trim() || "Usuario";
    }
    if (userDropdownEmail) {
      userDropdownEmail.textContent = session.email;
    }
  } else {
    topbarGuest?.classList.remove("hidden");
    topbarUser?.classList.add("hidden");
    closeUserMenu();
  }
}

function showHomeSessionToast(text: string): void {
  if (!homeSessionToast) {
    return;
  }
  homeSessionToast.textContent = text;
  homeSessionToast.classList.remove("hidden");
  if (toastHideTimer !== undefined) {
    window.clearTimeout(toastHideTimer);
  }
  toastHideTimer = window.setTimeout(() => {
    homeSessionToast.classList.add("hidden");
  }, 4500);
}

function resetCodeDigits(): void {
  codeDigitInputs.forEach((input) => {
    input.value = "";
  });
  updateVerifyButtonState();
  codeDigitInputs[0]?.focus();
}

function getCodeFromDigits(): string {
  return Array.from(codeDigitInputs)
    .map((el) => el.value.replace(/\D/g, ""))
    .join("");
}

function updateVerifyButtonState(): void {
  if (!verifySubmitBtn) {
    return;
  }
  const full = getCodeFromDigits().length === 6;
  verifySubmitBtn.disabled = !full;
}

function showInlineMessage(
  el: HTMLParagraphElement | null,
  text: string,
  kind: "error" | "success" | "",
): void {
  if (!el) {
    return;
  }
  el.textContent = text;
  el.classList.remove("auth-message--error", "auth-message--ok", "hidden");
  if (!text) {
    el.classList.add("hidden");
    return;
  }
  if (kind === "error") {
    el.classList.add("auth-message--error");
  } else if (kind === "success") {
    el.classList.add("auth-message--ok");
  }
}

function populateRegisterFormFromPending(): void {
  if (!pendingRegistration || !registerDataForm) {
    return;
  }
  const p = pendingRegistration;
  const form = registerDataForm;
  const set = (name: string, value: string) => {
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = value;
    }
  };
  set("email", p.email);
  set("nombre", p.nombre);
  set("genero", p.genero);
  set("celular", p.celular);
  set("programa", p.programa);
  set("semestre", String(p.semestre));
  set("password", p.password);
}

function showRegisterStep(which: "data" | "verify"): void {
  registerStepData?.classList.toggle("hidden", which !== "data");
  registerStepVerify?.classList.toggle("hidden", which !== "verify");
  authCard?.classList.toggle("auth-card--verify", which === "verify");
  if (which === "verify") {
    resetCodeDigits();
    showInlineMessage(verifyMessage, "", "");
  }
}

function showHomeView(): void {
  if (!homeView || !authView) {
    return;
  }

  clearRegistrationToken();
  pendingRegistration = null;
  showInlineMessage(authMessage, "", "");
  showInlineMessage(registerDataMessage, "", "");
  showInlineMessage(verifyMessage, "", "");
  showRegisterStep("data");
  homeView.classList.remove("hidden");
  authView.classList.add("hidden");

  tabButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
  applyHeaderAuthState();
}

function setAuthMode(mode: "login" | "register"): void {
  if (!homeView || !authView || !loginPanel || !registerPanel) {
    return;
  }

  authMode = mode;

  homeView.classList.add("hidden");
  authView.classList.remove("hidden");

  if (mode === "login") {
    clearRegistrationToken();
    pendingRegistration = null;
    showInlineMessage(authMessage, "", "");
    showInlineMessage(registerDataMessage, "", "");
    showInlineMessage(verifyMessage, "", "");
    loginPanel.classList.remove("hidden");
    registerPanel.classList.add("hidden");
    showRegisterStep("data");
    registerDataForm?.reset();
    authCard?.classList.remove("auth-card--verify");
  } else {
    loginPanel.classList.add("hidden");
    registerPanel.classList.remove("hidden");
    showRegisterStep("data");
    showInlineMessage(registerDataMessage, "", "");
    registerDataForm?.reset();
    authCard?.classList.remove("auth-card--verify");
  }

  tabButtons.forEach((button) => {
    const isActive = button.dataset.authTab === mode;
    button.classList.toggle("is-active", isActive);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.authTab === "register" ? "register" : "login";
    setAuthMode(mode);
  });
});

goHomeButton?.addEventListener("click", () => {
  showHomeView();
});

function isUdlaEmailClient(value: string): boolean {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at !== email.indexOf("@")) {
    return false;
  }
  return email.slice(at + 1) === "udla.edu.co";
}

async function sendRegistrationCodeRequest(email: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/register/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    message?: string;
    registrationToken?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, message: data.message ?? "No se pudo enviar el codigo." };
  }
  if (typeof data.registrationToken === "string" && data.registrationToken.length > 0) {
    sessionStorage.setItem(REGISTRATION_JWT_STORAGE_KEY, data.registrationToken);
    return {
      ok: true,
      message:
        data.message ??
        "Revisa tu correo institucional (y spam); enviamos un codigo de 6 digitos.",
    };
  }
  return {
    ok: false,
    message: "El servidor no devolvio el token de registro. Revisa la configuracion.",
  };
}

registerDataForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!registerDataForm || !registerContinueBtn) {
    return;
  }

  const fd = new FormData(registerDataForm);
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");

  if (!isUdlaEmailClient(email)) {
    showInlineMessage(registerDataMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }

  if (password.length < 8) {
    showInlineMessage(registerDataMessage, "La contrasena debe tener al menos 8 caracteres.", "error");
    return;
  }

  const sem = Number(fd.get("semestre"));
  if (!Number.isInteger(sem) || sem < 1 || sem > 20) {
    showInlineMessage(registerDataMessage, "El semestre debe ser un numero entre 1 y 20.", "error");
    return;
  }

  pendingRegistration = {
    email: email.trim().toLowerCase(),
    nombre: String(fd.get("nombre") ?? "").trim(),
    genero: String(fd.get("genero") ?? ""),
    celular: String(fd.get("celular") ?? "").trim(),
    programa: String(fd.get("programa") ?? "").trim(),
    semestre: sem,
    password,
  };

  if (
    !pendingRegistration.nombre ||
    !pendingRegistration.celular ||
    !pendingRegistration.programa ||
    !pendingRegistration.genero
  ) {
    showInlineMessage(registerDataMessage, "Completa todos los campos obligatorios.", "error");
    pendingRegistration = null;
    return;
  }

  registerContinueBtn.disabled = true;
  showInlineMessage(registerDataMessage, "", "");

  try {
    if (SKIP_EMAIL_VERIFICATION) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingRegistration.email,
          nombre: pendingRegistration.nombre,
          genero: pendingRegistration.genero,
          celular: pendingRegistration.celular,
          programa: pendingRegistration.programa,
          semestre: pendingRegistration.semestre,
          password: pendingRegistration.password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        showInlineMessage(
          registerDataMessage,
          data.message ?? "No se pudo completar el registro.",
          "error",
        );
        pendingRegistration = null;
        return;
      }
      pendingRegistration = null;
      registerDataForm.reset();
      setAuthMode("login");
      showInlineMessage(
        authMessage,
        data.message ?? "Registro exitoso. Ya puedes iniciar sesion.",
        "success",
      );
      return;
    }

    const result = await sendRegistrationCodeRequest(pendingRegistration.email);
    if (!result.ok) {
      showInlineMessage(registerDataMessage, result.message, "error");
      pendingRegistration = null;
      return;
    }
    if (verifyEmailText) {
      verifyEmailText.textContent = pendingRegistration.email;
    }
    showRegisterStep("verify");
    showInlineMessage(verifyMessage, result.message, "success");
  } catch {
    showInlineMessage(registerDataMessage, "No hay conexion con el servidor.", "error");
    pendingRegistration = null;
  } finally {
    registerContinueBtn.disabled = false;
  }
});

codeDigitInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    const digit = input.value.replace(/\D/g, "").slice(-1);
    input.value = digit;
    if (digit && index < codeDigitInputs.length - 1) {
      codeDigitInputs[index + 1]?.focus();
    }
    updateVerifyButtonState();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) {
      codeDigitInputs[index - 1]?.focus();
    }
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
    for (let i = 0; i < codeDigitInputs.length; i++) {
      codeDigitInputs[i]!.value = text[i] ?? "";
    }
    const nextEmpty = Array.from(codeDigitInputs).findIndex((el) => !el.value);
    (nextEmpty === -1 ? codeDigitInputs[5] : codeDigitInputs[nextEmpty])?.focus();
    updateVerifyButtonState();
  });
});

verifySubmitBtn?.addEventListener("click", async () => {
  if (!pendingRegistration || !verifySubmitBtn) {
    return;
  }

  const verificationCode = getCodeFromDigits();
  if (verificationCode.length !== 6) {
    return;
  }

  const registrationToken = sessionStorage.getItem(REGISTRATION_JWT_STORAGE_KEY);
  if (!registrationToken) {
    showInlineMessage(
      verifyMessage,
      "Sesion de verificacion expirada. Vuelve a Continuar en el paso anterior.",
      "error",
    );
    return;
  }

  verifySubmitBtn.disabled = true;
  showInlineMessage(verifyMessage, "", "");

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...pendingRegistration,
        verificationCode,
        registrationToken,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      showInlineMessage(verifyMessage, data.message ?? "No se pudo completar el registro.", "error");
      updateVerifyButtonState();
      return;
    }
    clearRegistrationToken();
    pendingRegistration = null;
    registerDataForm?.reset();
    setAuthMode("login");
    showInlineMessage(authMessage, data.message ?? "Registro exitoso. Ya puedes iniciar sesion.", "success");
  } catch {
    showInlineMessage(verifyMessage, "No hay conexion con el servidor.", "error");
  } finally {
    verifySubmitBtn.disabled = getCodeFromDigits().length !== 6;
  }
});

resendCodeBtn?.addEventListener("click", async () => {
  if (!pendingRegistration) {
    showInlineMessage(verifyMessage, "Vuelve al paso anterior y pulsa Continuar.", "error");
    return;
  }
  resendCodeBtn.disabled = true;
  showInlineMessage(verifyMessage, "", "");
  try {
    const result = await sendRegistrationCodeRequest(pendingRegistration.email);
    if (!result.ok) {
      showInlineMessage(verifyMessage, result.message, "error");
      return;
    }
    resetCodeDigits();
    showInlineMessage(verifyMessage, result.message, "success");
  } catch {
    showInlineMessage(verifyMessage, "No hay conexion con el servidor.", "error");
  } finally {
    resendCodeBtn.disabled = false;
  }
});

verifyBackLoginBtn?.addEventListener("click", () => {
  clearRegistrationToken();
  pendingRegistration = null;
  showRegisterStep("data");
  registerDataForm?.reset();
  authCard?.classList.remove("auth-card--verify");
  setAuthMode("login");
});

verifyBackEditBtn?.addEventListener("click", () => {
  clearRegistrationToken();
  populateRegisterFormFromPending();
  showRegisterStep("data");
  authCard?.classList.remove("auth-card--verify");
  showInlineMessage(verifyMessage, "", "");
  showInlineMessage(
    registerDataMessage,
    "Corrige lo que necesites. Luego pulsa Continuar para enviarte un codigo nuevo al correo.",
    "success",
  );
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm) {
    return;
  }

  const fd = new FormData(loginForm);
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");

  if (!isUdlaEmailClient(email)) {
    showInlineMessage(authMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }

  const submitBtn = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitBtn?.setAttribute("disabled", "");
  showInlineMessage(authMessage, "", "");

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      message?: string;
      userId?: number;
      nombre?: string;
      email?: string;
    };
    if (!res.ok || !data.ok) {
      showInlineMessage(authMessage, data.message ?? "No se pudo iniciar sesion.", "error");
      return;
    }
    const normalizedUserId = normalizeUserId(data.userId);
    if (
      normalizedUserId !== null &&
      typeof data.email === "string" &&
      typeof data.nombre === "string"
    ) {
      saveUserSession({
        userId: normalizedUserId,
        email: data.email,
        nombre: data.nombre,
      });
    }
    applyHeaderAuthState();
    loginForm.reset();
    showInlineMessage(authMessage, "", "");
    showHomeView();
    showHomeSessionToast(data.message ?? "Sesion iniciada con exito.");
  } catch {
    showInlineMessage(authMessage, "No hay conexion con el servidor.", "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});

userMenuTrigger?.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = !userMenu?.classList.contains("is-open");
  if (open) {
    userMenu?.classList.add("is-open");
    userMenuTrigger?.setAttribute("aria-expanded", "true");
  } else {
    closeUserMenu();
  }
});

userLogoutBtn?.addEventListener("click", () => {
  clearUserSession();
  applyHeaderAuthState();
  closeUserMenu();
  showHomeView();
});

document.addEventListener("click", () => {
  closeUserMenu();
});

userMenu?.addEventListener("click", (e) => {
  e.stopPropagation();
});

applyHeaderAuthState();
