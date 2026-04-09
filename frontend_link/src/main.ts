import "./styles.css";

type Role = "estudiante" | "profesor";

type PendingRegistration = {
  email: string;
  nombre: string;
  genero: string;
  celular: string;
  programa: string;
  semestre: number;
  password: string;
  role: Role;
  matricula?: string;
};

type UserSession = {
  userId: number;
  email: string;
  nombre: string;
  role: Role;
};

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

type MetricItem = {
  id: string;
  label: string;
  value: number | string;
  accent: string;
};

type QuickAction = {
  id: string;
  title: string;
  description: string;
};

type ProfessorClass = {
  id: number;
  nombre: string;
  descripcion: string;
  cupo: number;
  visibilidad: string;
  totalStudents: number;
  averageProgress: number;
  totalExercises: number;
};

type ProfessorExercise = {
  id: number;
  titulo: string;
  descripcion: string;
  reviewTopic: string;
  dificultad: string;
  dueDate: string | null;
  className: string;
  coinsReward: number;
  xpReward: number;
};

type ProfessorStudent = {
  id: number;
  nombre: string;
  email: string;
  className: string;
  progress: number;
};

type StudentClass = {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  progress: number;
  totalExercises: number;
  completedExercises: number;
};

type StudentExercise = {
  id: number;
  titulo: string;
  descripcion: string;
  reviewTopic: string;
  dificultad: string;
  dueDate: string | null;
  className: string;
  status: string;
  grade: number | null;
};

type PublicClassOffer = {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  cupo: number;
  enrolled: number;
};

type DashboardResponse = {
  ok: true;
  user: {
    userId: number;
    email: string;
    nombre: string;
    role: Role;
    roleLabel: string;
    programa: string;
    semestre: number;
    matricula?: string | null;
    coinsTotal?: number;
    xpTotal?: number;
  };
  permissions: string[];
  unreadNotifications: number;
  notifications: NotificationItem[];
  quickActions: QuickAction[];
  metrics: MetricItem[];
  professorData?: {
    classes: ProfessorClass[];
    exercises: ProfessorExercise[];
    students: ProfessorStudent[];
    insights: string[];
  };
  studentData?: {
    classes: StudentClass[];
    exercises: StudentExercise[];
    publicClasses?: PublicClassOffer[];
    insights: string[];
  };
};

type ApiEnvelope = {
  ok?: boolean;
  message?: string;
};

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
        <div class="topbar-user-actions">
          <div class="notifications-menu" id="notifications-menu">
            <button
              type="button"
              class="notify-btn"
              id="notifications-trigger"
              aria-expanded="false"
              aria-haspopup="true"
              aria-label="Notificaciones"
            >
              <span class="notify-icon" aria-hidden="true">🔔</span>
              <span class="notify-badge hidden" id="notifications-badge">0</span>
            </button>
            <div class="notifications-dropdown" id="notifications-dropdown" role="menu">
              <div class="notifications-dropdown-header">
                <div>
                  <p class="notifications-title">Notificaciones</p>
                  <p class="notifications-subtitle" id="notifications-subtitle">
                    Mantente al dia con tus clases y ejercicios
                  </p>
                </div>
              </div>
              <div class="notifications-list" id="notifications-list"></div>
            </div>
          </div>
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
                <p class="user-dropdown-role" id="user-dropdown-role"></p>
              </div>
              <button type="button" class="user-dropdown-logout" id="user-logout-btn" role="menuitem">
                Cerrar sesion
              </button>
            </div>
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
            <button type="button" class="link-like link-like-center" id="forgot-password-btn">
              ¿Olvidaste tu contrasena?
            </button>
          </form>
        </div>

        <div id="register-panel" class="hidden">
          <div id="register-step-data">
            <span class="badge">Crear cuenta</span>
            <h2 class="auth-title">Crear cuenta</h2>
            <p class="auth-subtitle">Elige tu rol y completa tus datos institucionales</p>

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
                <span>Rol</span>
                <select name="role" required>
                  <option value="estudiante" selected>Estudiante</option>
                  <option value="profesor">Profesor</option>
                </select>
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

              <label class="auth-field">
                <span>Matricula (opcional)</span>
                <input
                  type="text"
                  name="matricula"
                  inputmode="text"
                  autocomplete="off"
                  placeholder="Ej. 2020123456"
                  maxlength="32"
                />
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

    <section id="dashboard-view" class="hero-content dashboard-view hidden">
      <div id="dashboard-toast" class="home-toast hidden" role="status" aria-live="polite"></div>
      <div class="dashboard-shell">
        <article class="dashboard-banner">
          <div>
            <span class="badge" id="dashboard-role-badge">Panel</span>
            <h2 class="dashboard-title" id="dashboard-title">Tu panel de aprendizaje</h2>
            <p class="dashboard-subtitle" id="dashboard-subtitle"></p>
          </div>
          <div class="dashboard-pills" id="permissions-list"></div>
        </article>

        <section>
          <div class="metrics-grid" id="metrics-grid"></div>
        </section>

        <section>
          <h3 class="dashboard-section-title">Accesos rapidos</h3>
          <div class="quick-actions-grid" id="quick-actions-grid"></div>
        </section>

        <section id="professor-panel" class="role-panel hidden">
          <div class="dashboard-two-columns">
            <article class="panel-card">
              <h3 class="panel-title">Crear estudiante</h3>
              <p class="panel-subtitle">Crea cuenta con contrasena inicial para tu estudiante.</p>
              <form id="create-student-form" class="panel-form panel-form-grid" novalidate>
                <p id="create-student-message" class="auth-message hidden" role="alert"></p>
                <label class="auth-field">
                  <span>Correo institucional</span>
                  <input type="email" name="email" placeholder="estudiante@udla.edu.co" required />
                </label>
                <label class="auth-field">
                  <span>Nombre completo</span>
                  <input type="text" name="nombre" placeholder="Nombre del estudiante" required />
                </label>
                <label class="auth-field">
                  <span>Genero</span>
                  <select name="genero" required>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero_no_decir">Prefiero no decir</option>
                  </select>
                </label>
                <label class="auth-field">
                  <span>Celular</span>
                  <input type="tel" name="celular" placeholder="3001234567" required />
                </label>
                <label class="auth-field">
                  <span>Programa</span>
                  <input type="text" name="programa" placeholder="Programa academico" required />
                </label>
                <label class="auth-field">
                  <span>Semestre</span>
                  <input type="number" name="semestre" min="1" max="20" step="1" value="1" required />
                </label>
                <label class="auth-field">
                  <span>Matricula (opcional)</span>
                  <input type="text" name="matricula" maxlength="32" />
                </label>
                <label class="auth-field">
                  <span>Contrasena inicial</span>
                  <input type="password" name="password" minlength="8" placeholder="Minimo 8 caracteres" required />
                </label>
                <button class="btn btn-primary btn-block auth-field-span-full" type="submit">
                  Crear estudiante
                </button>
              </form>
            </article>

            <article class="panel-card">
              <h3 class="panel-title">Crear clase</h3>
              <p class="panel-subtitle">Organiza grupos y cupos sin salir del panel.</p>
              <form id="create-class-form" class="panel-form" novalidate>
                <p id="create-class-message" class="auth-message hidden" role="alert"></p>
                <label class="auth-field">
                  <span>Nombre de la clase</span>
                  <input type="text" name="nombre" placeholder="Calculo diferencial A" required />
                </label>
                <label class="auth-field">
                  <span>Descripcion</span>
                  <input type="text" name="descripcion" placeholder="Grupo con enfoque en integrales" />
                </label>
                <label class="auth-field">
                  <span>Cupo</span>
                  <input type="number" name="cupo" min="1" max="500" step="1" value="30" required />
                </label>
                <label class="auth-field">
                  <span>Visibilidad</span>
                  <select name="visibilidad">
                    <option value="publica" selected>Publica (cualquier estudiante puede unirse)</option>
                    <option value="privada">Privada (solo matricula el profesor)</option>
                  </select>
                </label>
                <button class="btn btn-primary btn-block" type="submit">Crear clase</button>
              </form>
            </article>

            <article class="panel-card">
              <h3 class="panel-title">Matricular estudiante</h3>
              <p class="panel-subtitle">Matricula por correo institucional o por matricula registrada.</p>
              <form id="enroll-student-form" class="panel-form" novalidate>
                <p id="enroll-student-message" class="auth-message hidden" role="alert"></p>
                <label class="auth-field">
                  <span>Clase</span>
                  <select name="classId" id="enroll-class-select" required></select>
                </label>
                <label class="auth-field">
                  <span>Correo del estudiante</span>
                  <input type="email" name="studentEmail" placeholder="estudiante@udla.edu.co" />
                </label>
                <label class="auth-field">
                  <span>O matricula</span>
                  <input type="text" name="studentMatricula" placeholder="Solo si no usas correo" maxlength="32" />
                </label>
                <button class="btn btn-primary btn-block" type="submit">Matricular</button>
              </form>
            </article>
          </div>

          <article class="panel-card">
            <h3 class="panel-title">Crear ejercicio</h3>
            <p class="panel-subtitle">Publica actividades, define tema de repaso y dispara notificaciones.</p>
            <form id="create-exercise-form" class="panel-form panel-form-grid" novalidate>
              <p id="create-exercise-message" class="auth-message hidden" role="alert"></p>
              <label class="auth-field">
                <span>Clase</span>
                <select name="classId" id="exercise-class-select" required></select>
              </label>
              <label class="auth-field">
                <span>Titulo</span>
                <input type="text" name="titulo" placeholder="Taller de integrales por partes" required />
              </label>
              <label class="auth-field">
                <span>Dificultad</span>
                <select name="difficulty">
                  <option value="basica">Basica</option>
                  <option value="media" selected>Media</option>
                  <option value="avanzada">Avanzada</option>
                </select>
              </label>
              <label class="auth-field">
                <span>Fecha limite</span>
                <input type="date" name="dueDate" />
              </label>
              <label class="auth-field">
                <span>Monedas al completar</span>
                <input type="number" name="coinsReward" min="0" max="100000" step="1" value="0" />
              </label>
              <label class="auth-field">
                <span>XP al completar</span>
                <input type="number" name="xpReward" min="0" max="100000" step="1" value="0" />
              </label>
              <label class="auth-field auth-field-span-full">
                <span>Tema de repaso (opcional)</span>
                <input type="text" name="reviewTopic" placeholder="Ej. Integracion por partes" maxlength="180" />
              </label>
              <label class="auth-field auth-field-span-full">
                <span>Descripcion</span>
                <input type="text" name="descripcion" placeholder="Incluye desarrollo paso a paso" />
              </label>
              <button class="btn btn-primary btn-block auth-field-span-full" type="submit">
                Crear ejercicio
              </button>
            </form>
          </article>

          <div class="dashboard-two-columns">
            <article class="panel-card">
              <h3 class="panel-title">Tus clases</h3>
              <div class="panel-list" id="professor-classes-list"></div>
            </article>
            <article class="panel-card">
              <h3 class="panel-title">Estudiantes recientes</h3>
              <div class="panel-list" id="professor-students-list"></div>
            </article>
          </div>

          <article class="panel-card">
            <h3 class="panel-title">Ejercicios publicados</h3>
            <div class="panel-list" id="professor-exercises-list"></div>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">Ideas para potenciar el panel</h3>
            <div class="insights-list" id="professor-insights-list"></div>
          </article>
        </section>

        <section id="student-panel" class="role-panel hidden">
          <article class="panel-card">
            <h3 class="panel-title">Clases publicas disponibles</h3>
            <p class="panel-subtitle">Unete con un clic si la clase aun tiene cupo.</p>
            <div class="panel-list" id="student-public-classes-list"></div>
          </article>

          <div class="dashboard-two-columns">
            <article class="panel-card">
              <h3 class="panel-title">Clases matriculadas</h3>
              <div class="panel-list" id="student-classes-list"></div>
            </article>
            <article class="panel-card">
              <h3 class="panel-title">Ejercicios activos</h3>
              <div class="panel-list" id="student-exercises-list"></div>
            </article>
          </div>

          <article class="panel-card">
            <h3 class="panel-title">Sugerencias del sistema</h3>
            <div class="insights-list" id="student-insights-list"></div>
          </article>
        </section>
      </div>
    </section>
  </main>
`;

const tabButtons = document.querySelectorAll<HTMLButtonElement>("[data-auth-tab]");
const goHomeButton = document.querySelector<HTMLButtonElement>("[data-go-home]");
const homeView = document.querySelector<HTMLElement>("#home-view");
const authView = document.querySelector<HTMLElement>("#auth-view");
const dashboardView = document.querySelector<HTMLElement>("#dashboard-view");
const authCard = document.querySelector<HTMLElement>("#auth-card");
const loginPanel = document.querySelector<HTMLElement>("#login-panel");
const registerPanel = document.querySelector<HTMLElement>("#register-panel");
const registerStepData = document.querySelector<HTMLElement>("#register-step-data");
const registerStepVerify = document.querySelector<HTMLElement>("#register-step-verify");
const loginForm = document.querySelector<HTMLFormElement>("#login-form");
const forgotPasswordBtn = document.querySelector<HTMLButtonElement>("#forgot-password-btn");
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
const userDropdownRole = document.querySelector<HTMLElement>("#user-dropdown-role");
const userLogoutBtn = document.querySelector<HTMLButtonElement>("#user-logout-btn");
const homeSessionToast = document.querySelector<HTMLElement>("#home-session-toast");
const dashboardToast = document.querySelector<HTMLElement>("#dashboard-toast");
const notificationsMenu = document.querySelector<HTMLElement>("#notifications-menu");
const notificationsTrigger = document.querySelector<HTMLButtonElement>("#notifications-trigger");
const notificationsDropdown = document.querySelector<HTMLElement>("#notifications-dropdown");
const notificationsBadge = document.querySelector<HTMLElement>("#notifications-badge");
const notificationsSubtitle = document.querySelector<HTMLElement>("#notifications-subtitle");
const notificationsList = document.querySelector<HTMLElement>("#notifications-list");
const dashboardRoleBadge = document.querySelector<HTMLElement>("#dashboard-role-badge");
const dashboardTitle = document.querySelector<HTMLElement>("#dashboard-title");
const dashboardSubtitle = document.querySelector<HTMLElement>("#dashboard-subtitle");
const permissionsList = document.querySelector<HTMLElement>("#permissions-list");
const metricsGrid = document.querySelector<HTMLElement>("#metrics-grid");
const quickActionsGrid = document.querySelector<HTMLElement>("#quick-actions-grid");
const professorPanel = document.querySelector<HTMLElement>("#professor-panel");
const studentPanel = document.querySelector<HTMLElement>("#student-panel");
const createClassForm = document.querySelector<HTMLFormElement>("#create-class-form");
const createClassMessage = document.querySelector<HTMLParagraphElement>("#create-class-message");
const createStudentForm = document.querySelector<HTMLFormElement>("#create-student-form");
const createStudentMessage = document.querySelector<HTMLParagraphElement>("#create-student-message");
const enrollStudentForm = document.querySelector<HTMLFormElement>("#enroll-student-form");
const enrollStudentMessage = document.querySelector<HTMLParagraphElement>("#enroll-student-message");
const createExerciseForm = document.querySelector<HTMLFormElement>("#create-exercise-form");
const createExerciseMessage = document.querySelector<HTMLParagraphElement>("#create-exercise-message");
const enrollClassSelect = document.querySelector<HTMLSelectElement>("#enroll-class-select");
const exerciseClassSelect = document.querySelector<HTMLSelectElement>("#exercise-class-select");
const professorClassesList = document.querySelector<HTMLElement>("#professor-classes-list");
const professorStudentsList = document.querySelector<HTMLElement>("#professor-students-list");
const professorExercisesList = document.querySelector<HTMLElement>("#professor-exercises-list");
const professorInsightsList = document.querySelector<HTMLElement>("#professor-insights-list");
const studentClassesList = document.querySelector<HTMLElement>("#student-classes-list");
const studentExercisesList = document.querySelector<HTMLElement>("#student-exercises-list");
const studentPublicClassesList = document.querySelector<HTMLElement>("#student-public-classes-list");
const studentInsightsList = document.querySelector<HTMLElement>("#student-insights-list");

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ??
  "https://backend-tesis-4m3e.onrender.com";

const SKIP_EMAIL_VERIFICATION =
  (import.meta as any).env?.VITE_SKIP_EMAIL_VERIFICATION !== "false";

const REGISTRATION_JWT_STORAGE_KEY = "todoak_registration_jwt";
const USER_SESSION_KEY = "tesisamazonia_user_session";

let authMode: "login" | "register" = "login";
let homeToastHideTimer: number | undefined;
let dashboardToastHideTimer: number | undefined;
let pendingRegistration: PendingRegistration | null = null;
let dashboardData: DashboardResponse | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function roleLabel(role: Role): string {
  return role === "profesor" ? "Profesor" : "Estudiante";
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
      typeof data.nombre !== "string" ||
      (data.role !== "estudiante" && data.role !== "profesor")
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

function closeNotificationsMenu(): void {
  notificationsMenu?.classList.remove("is-open");
  notificationsTrigger?.setAttribute("aria-expanded", "false");
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
    if (userDropdownRole) {
      userDropdownRole.textContent = roleLabel(session.role);
    }
  } else {
    topbarGuest?.classList.remove("hidden");
    topbarUser?.classList.add("hidden");
    closeUserMenu();
    closeNotificationsMenu();
  }
}

function updateNotificationsBadge(unreadCount: number): void {
  if (!notificationsBadge || !notificationsSubtitle) {
    return;
  }
  notificationsBadge.textContent = String(unreadCount);
  notificationsBadge.classList.toggle("hidden", unreadCount <= 0);
  notificationsSubtitle.textContent =
    unreadCount > 0
      ? `Tienes ${unreadCount} notificacion${unreadCount === 1 ? "" : "es"} sin leer`
      : "No tienes notificaciones pendientes";
}

function showToast(
  target: HTMLElement | null,
  text: string,
  timerKey: "home" | "dashboard",
): void {
  if (!target) {
    return;
  }
  target.textContent = text;
  target.classList.remove("hidden");
  const activeTimer = timerKey === "home" ? homeToastHideTimer : dashboardToastHideTimer;
  if (activeTimer !== undefined) {
    window.clearTimeout(activeTimer);
  }
  const nextTimer = window.setTimeout(() => {
    target.classList.add("hidden");
  }, 4500);
  if (timerKey === "home") {
    homeToastHideTimer = nextTimer;
  } else {
    dashboardToastHideTimer = nextTimer;
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin fecha limite";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha limite";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDifficulty(value: string): string {
  if (value === "basica") {
    return "Basica";
  }
  if (value === "avanzada") {
    return "Avanzada";
  }
  return "Media";
}

function formatVisibilidad(value: string): string {
  return value === "privada" ? "Privada" : "Publica";
}

function formatPermission(permission: string): string {
  return permission.replaceAll("_", " ");
}

function exerciseStatusLabel(status: string): string {
  return status === "entregado" ? "Completado" : "Pendiente";
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
    .map((element) => element.value.replace(/\D/g, ""))
    .join("");
}

function updateVerifyButtonState(): void {
  if (!verifySubmitBtn) {
    return;
  }
  verifySubmitBtn.disabled = getCodeFromDigits().length !== 6;
}

function showInlineMessage(
  element: HTMLParagraphElement | null,
  text: string,
  kind: "error" | "success" | "",
): void {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.classList.remove("auth-message--error", "auth-message--ok", "hidden");
  if (!text) {
    element.classList.add("hidden");
    return;
  }
  if (kind === "error") {
    element.classList.add("auth-message--error");
  }
  if (kind === "success") {
    element.classList.add("auth-message--ok");
  }
}

function populateRegisterFormFromPending(): void {
  if (!pendingRegistration || !registerDataForm) {
    return;
  }
  const form = registerDataForm;
  const set = (name: string, value: string) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = value;
    }
  };
  set("email", pendingRegistration.email);
  set("nombre", pendingRegistration.nombre);
  set("role", pendingRegistration.role);
  set("genero", pendingRegistration.genero);
  set("celular", pendingRegistration.celular);
  set("programa", pendingRegistration.programa);
  set("semestre", String(pendingRegistration.semestre));
  set("password", pendingRegistration.password);
  set("matricula", pendingRegistration.matricula ?? "");
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
  clearRegistrationToken();
  pendingRegistration = null;
  showInlineMessage(authMessage, "", "");
  showInlineMessage(registerDataMessage, "", "");
  showInlineMessage(verifyMessage, "", "");
  showRegisterStep("data");
  homeView?.classList.remove("hidden");
  authView?.classList.add("hidden");
  dashboardView?.classList.add("hidden");
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
  dashboardView?.classList.add("hidden");

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

function showDashboardView(): void {
  homeView?.classList.add("hidden");
  authView?.classList.add("hidden");
  dashboardView?.classList.remove("hidden");
  tabButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
}

function renderEmptyState(
  title: string,
  body: string,
): string {
  return `
    <article class="empty-state">
      <p class="empty-state-title">${escapeHtml(title)}</p>
      <p class="empty-state-text">${escapeHtml(body)}</p>
    </article>
  `;
}

function renderMetrics(items: MetricItem[]): void {
  if (!metricsGrid) {
    return;
  }
  metricsGrid.innerHTML = items
    .map(
      (item) => `
        <article class="metric-card metric-card--${escapeHtml(item.accent)}">
          <p class="metric-label">${escapeHtml(item.label)}</p>
          <p class="metric-value">${escapeHtml(String(item.value))}</p>
        </article>
      `,
    )
    .join("");
}

function renderQuickActions(items: QuickAction[]): void {
  if (!quickActionsGrid) {
    return;
  }
  quickActionsGrid.innerHTML = items
    .map(
      (item) => `
        <article class="quick-action-card">
          <p class="quick-action-title">${escapeHtml(item.title)}</p>
          <p class="quick-action-description">${escapeHtml(item.description)}</p>
        </article>
      `,
    )
    .join("");
}

function renderNotifications(items: NotificationItem[]): void {
  if (!notificationsList) {
    return;
  }
  if (items.length === 0) {
    notificationsList.innerHTML = renderEmptyState(
      "Sin novedades",
      "Cuando haya nuevas matriculas, ejercicios o avances apareceran aqui.",
    );
    return;
  }
  notificationsList.innerHTML = items
    .map(
      (item) => `
        <article class="notification-item${item.isRead ? " notification-item--read" : ""}">
          <div class="notification-item-top">
            <p class="notification-item-title">${escapeHtml(item.title)}</p>
            <span class="notification-type">${escapeHtml(item.type)}</span>
          </div>
          <p class="notification-item-body">${escapeHtml(item.body)}</p>
          <div class="notification-item-bottom">
            <span>${escapeHtml(formatDate(item.createdAt.slice(0, 10) || null))}</span>
            ${
              item.isRead
                ? `<span class="notification-status">Leida</span>`
                : `<button type="button" class="notification-read-btn" data-notification-id="${item.id}">
                    Marcar como leida
                  </button>`
            }
          </div>
        </article>
      `,
    )
    .join("");
}

function populateProfessorSelects(classes: ProfessorClass[]): void {
  const options = classes.length
    ? classes
        .map(
          (classItem) =>
            `<option value="${classItem.id}">${escapeHtml(classItem.nombre)}</option>`,
        )
        .join("")
    : `<option value="">Primero crea una clase</option>`;

  if (enrollClassSelect) {
    enrollClassSelect.innerHTML = options;
    enrollClassSelect.disabled = classes.length === 0;
  }
  if (exerciseClassSelect) {
    exerciseClassSelect.innerHTML = options;
    exerciseClassSelect.disabled = classes.length === 0;
  }
}

function renderProfessorDashboard(data: DashboardResponse): void {
  if (!data.professorData) {
    return;
  }

  populateProfessorSelects(data.professorData.classes);

  if (professorClassesList) {
    professorClassesList.innerHTML =
      data.professorData.classes.length > 0
        ? data.professorData.classes
            .map(
              (classItem) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(classItem.nombre)}</p>
                    <span class="list-chip">${escapeHtml(formatVisibilidad(classItem.visibilidad))}</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(classItem.descripcion || "Sin descripcion")}</p>
                  <div class="list-card-meta">
                    <span>${classItem.totalStudents}/${classItem.cupo} estudiantes</span>
                    <span>${classItem.totalExercises} ejercicios</span>
                    <span>${classItem.averageProgress}% avance</span>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "Aun no tienes clases",
            "Crea una clase para empezar a matricular estudiantes y publicar ejercicios.",
          );
  }

  if (professorStudentsList) {
    professorStudentsList.innerHTML =
      data.professorData.students.length > 0
        ? data.professorData.students
            .map(
              (student) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(student.nombre)}</p>
                    <span class="list-chip">${student.progress}% progreso</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(student.email)}</p>
                  <div class="progress-track">
                    <span class="progress-bar" style="width: ${Math.max(0, Math.min(100, student.progress))}%"></span>
                  </div>
                  <div class="list-card-meta">
                    <span>${escapeHtml(student.className)}</span>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "Sin estudiantes recientes",
            "Las matriculas nuevas se veran aqui junto con su progreso.",
          );
  }

  if (professorExercisesList) {
    professorExercisesList.innerHTML =
      data.professorData.exercises.length > 0
        ? data.professorData.exercises
            .map(
              (exercise) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(exercise.titulo)}</p>
                    <span class="list-chip">${escapeHtml(formatDifficulty(exercise.dificultad))}</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(exercise.descripcion || "Sin descripcion")}</p>
                  ${
                    exercise.reviewTopic
                      ? `<div class="list-card-meta"><span class="topic-chip">Tema de repaso: ${escapeHtml(exercise.reviewTopic)}</span></div>`
                      : ""
                  }
                  <div class="list-card-meta">
                    <span>${escapeHtml(exercise.className)}</span>
                    <span>${escapeHtml(formatDate(exercise.dueDate))}</span>
                    <span>+${exercise.coinsReward} mon / +${exercise.xpReward} XP</span>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "No has publicado ejercicios",
            "Publica tu primer ejercicio para activar progreso y notificaciones.",
          );
  }

  if (professorInsightsList) {
    professorInsightsList.innerHTML = data.professorData.insights
      .map(
        (item) => `
          <article class="insight-card">
            <p>${escapeHtml(item)}</p>
          </article>
        `,
      )
      .join("");
  }
}

function renderStudentDashboard(data: DashboardResponse): void {
  if (!data.studentData) {
    return;
  }

  const publicClasses = data.studentData.publicClasses ?? [];
  if (studentPublicClassesList) {
    studentPublicClassesList.innerHTML =
      publicClasses.length > 0
        ? publicClasses
            .map(
              (item) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(item.nombre)}</p>
                    <span class="list-chip">${item.enrolled}/${item.cupo} cupo</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(item.descripcion || "Sin descripcion")}</p>
                  <div class="list-card-meta">
                    <span>Prof. ${escapeHtml(item.profesor)}</span>
                  </div>
                  <div class="list-card-actions">
                    <button
                      type="button"
                      class="btn btn-primary btn-small"
                      data-join-class-id="${item.id}"
                    >
                      Unirme a la clase
                    </button>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "No hay clases publicas abiertas",
            "Cuando exista una clase publica con cupo libre podras unirte aqui.",
          );
  }

  if (studentClassesList) {
    studentClassesList.innerHTML =
      data.studentData.classes.length > 0
        ? data.studentData.classes
            .map(
              (classItem) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(classItem.nombre)}</p>
                    <span class="list-chip">${classItem.progress}% progreso</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(classItem.descripcion || "Sin descripcion")}</p>
                  <div class="progress-track">
                    <span class="progress-bar" style="width: ${Math.max(0, Math.min(100, classItem.progress))}%"></span>
                  </div>
                  <div class="list-card-meta">
                    <span>Profesor: ${escapeHtml(classItem.profesor)}</span>
                    <span>${classItem.completedExercises}/${classItem.totalExercises} ejercicios</span>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "No tienes clases matriculadas",
            "Cuando un profesor te agregue a una clase la veras aqui con su avance.",
          );
  }

  if (studentExercisesList) {
    studentExercisesList.innerHTML =
      data.studentData.exercises.length > 0
        ? data.studentData.exercises
            .map(
              (exercise) => `
                <article class="list-card">
                  <div class="list-card-top">
                    <p class="list-card-title">${escapeHtml(exercise.titulo)}</p>
                    <span class="list-chip">${escapeHtml(exerciseStatusLabel(exercise.status))}</span>
                  </div>
                  <p class="list-card-text">${escapeHtml(exercise.descripcion || "Sin descripcion")}</p>
                  ${
                    exercise.reviewTopic
                      ? `<div class="list-card-meta"><span class="topic-chip">Tema de repaso: ${escapeHtml(exercise.reviewTopic)}</span></div>`
                      : ""
                  }
                  <div class="list-card-meta">
                    <span>${escapeHtml(exercise.className)}</span>
                    <span>${escapeHtml(formatDifficulty(exercise.dificultad))}</span>
                    <span>${escapeHtml(formatDate(exercise.dueDate))}</span>
                  </div>
                  ${
                    exercise.status === "entregado"
                      ? `<div class="list-card-actions">
                          <span class="exercise-complete-tag">Completado</span>
                        </div>`
                      : `<div class="list-card-actions">
                          <button
                            type="button"
                            class="btn btn-primary btn-small"
                            data-complete-exercise-id="${exercise.id}"
                          >
                            Marcar como completado
                          </button>
                        </div>`
                  }
                </article>
              `,
            )
            .join("")
        : renderEmptyState(
            "No tienes ejercicios activos",
            "Cuando tu profesor publique actividades apareceran aqui.",
          );
  }

  if (studentInsightsList) {
    studentInsightsList.innerHTML = data.studentData.insights
      .map(
        (item) => `
          <article class="insight-card">
            <p>${escapeHtml(item)}</p>
          </article>
        `,
      )
      .join("");
  }
}

function renderDashboard(data: DashboardResponse): void {
  dashboardData = data;
  if (dashboardRoleBadge) {
    dashboardRoleBadge.textContent = data.user.roleLabel;
  }
  if (dashboardTitle) {
    dashboardTitle.textContent =
      data.user.role === "profesor"
        ? `Hola ${data.user.nombre}, gestiona tus clases`
        : `Hola ${data.user.nombre}, sigue tu progreso`;
  }
  if (dashboardSubtitle) {
    dashboardSubtitle.textContent =
      data.user.role === "profesor"
        ? `Crea ejercicios, matricula estudiantes y revisa avances desde un solo panel. Programa: ${data.user.programa}.`
        : `Revisa tus clases matriculadas, ejercicios pendientes y progreso promedio. Programa: ${data.user.programa}.`;
  }
  if (permissionsList) {
    permissionsList.innerHTML = data.permissions
      .map(
        (permission) => `
          <span class="dashboard-pill">${escapeHtml(formatPermission(permission))}</span>
        `,
      )
      .join("");
  }

  renderMetrics(data.metrics);
  renderQuickActions(data.quickActions);
  renderNotifications(data.notifications);
  updateNotificationsBadge(data.unreadNotifications);

  const isProfessor = data.user.role === "profesor";
  professorPanel?.classList.toggle("hidden", !isProfessor);
  studentPanel?.classList.toggle("hidden", isProfessor);

  if (isProfessor) {
    renderProfessorDashboard(data);
  } else {
    renderStudentDashboard(data);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const data = (await response.json()) as T & ApiEnvelope;
  if (!response.ok || !data.ok) {
    throw new Error(data.message ?? "No se pudo completar la solicitud.");
  }
  return data;
}

async function sendRegistrationCodeRequest(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const data = await requestJson<{ registrationToken?: string; message?: string }>(
      "/auth/register/send-code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      },
    );
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
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo enviar el codigo.",
    };
  }
}

async function loadDashboard(toastMessage?: string): Promise<boolean> {
  const session = getUserSession();
  if (!session) {
    return false;
  }

  try {
    const data = await requestJson<DashboardResponse>(
      `/auth/dashboard?userId=${encodeURIComponent(String(session.userId))}`,
    );
    renderDashboard(data);
    showDashboardView();
    if (toastMessage) {
      showToast(dashboardToast, toastMessage, "dashboard");
    }
    return true;
  } catch (error) {
    showToast(
      homeSessionToast,
      error instanceof Error ? error.message : "No se pudo cargar el panel.",
      "home",
    );
    return false;
  }
}

function isUdlaEmailClient(value: string): boolean {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at !== email.indexOf("@")) {
    return false;
  }
  return email.slice(at + 1) === "udla.edu.co";
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.authTab === "register" ? "register" : "login";
    setAuthMode(mode);
  });
});

goHomeButton?.addEventListener("click", () => {
  if (getUserSession()) {
    void loadDashboard();
    return;
  }
  showHomeView();
});

registerDataForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!registerDataForm || !registerContinueBtn) {
    return;
  }

  const formData = new FormData(registerDataForm);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rawRole = String(formData.get("role") ?? "estudiante");
  const role: Role = rawRole === "profesor" ? "profesor" : "estudiante";

  if (!isUdlaEmailClient(email)) {
    showInlineMessage(registerDataMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }

  if (password.length < 8) {
    showInlineMessage(registerDataMessage, "La contrasena debe tener al menos 8 caracteres.", "error");
    return;
  }

  const semester = Number(formData.get("semestre"));
  if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
    showInlineMessage(registerDataMessage, "El semestre debe ser un numero entre 1 y 20.", "error");
    return;
  }

  const rawMatricula = String(formData.get("matricula") ?? "").trim();
  let matricula: string | undefined;
  if (rawMatricula) {
    const norm = rawMatricula.toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{4,32}$/.test(norm)) {
      showInlineMessage(
        registerDataMessage,
        "La matricula opcional debe tener entre 4 y 32 caracteres (letras, numeros, guiones o guion bajo).",
        "error",
      );
      return;
    }
    matricula = norm;
  }

  pendingRegistration = {
    email: email.trim().toLowerCase(),
    nombre: String(formData.get("nombre") ?? "").trim(),
    genero: String(formData.get("genero") ?? ""),
    celular: String(formData.get("celular") ?? "").trim(),
    programa: String(formData.get("programa") ?? "").trim(),
    semestre: semester,
    password,
    role,
    ...(matricula ? { matricula } : {}),
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
      const data = await requestJson<{ message?: string }>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRegistration),
      });
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

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && index > 0) {
      codeDigitInputs[index - 1]?.focus();
    }
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
    for (let indexItem = 0; indexItem < codeDigitInputs.length; indexItem += 1) {
      codeDigitInputs[indexItem]!.value = text[indexItem] ?? "";
    }
    const nextEmpty = Array.from(codeDigitInputs).findIndex((element) => !element.value);
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
    const data = await requestJson<{ message?: string }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...pendingRegistration,
        verificationCode,
        registrationToken,
      }),
    });
    clearRegistrationToken();
    pendingRegistration = null;
    registerDataForm?.reset();
    setAuthMode("login");
    showInlineMessage(authMessage, data.message ?? "Registro exitoso. Ya puedes iniciar sesion.", "success");
  } catch (error) {
    showInlineMessage(
      verifyMessage,
      error instanceof Error ? error.message : "No se pudo completar el registro.",
      "error",
    );
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

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isUdlaEmailClient(email)) {
    showInlineMessage(authMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }

  const submitButton = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "");
  showInlineMessage(authMessage, "", "");

  try {
    const data = await requestJson<{
      userId?: number;
      nombre?: string;
      email?: string;
      role?: Role;
      message?: string;
    }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const normalizedUserId = normalizeUserId(data.userId);
    if (
      normalizedUserId === null ||
      typeof data.email !== "string" ||
      typeof data.nombre !== "string" ||
      (data.role !== "estudiante" && data.role !== "profesor")
    ) {
      showInlineMessage(authMessage, "El servidor devolvio una sesion incompleta.", "error");
      return;
    }

    saveUserSession({
      userId: normalizedUserId,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
    });
    applyHeaderAuthState();
    loginForm.reset();
    showInlineMessage(authMessage, "", "");
    await loadDashboard(data.message ?? "Sesion iniciada con exito.");
  } catch {
    showInlineMessage(authMessage, "No hay conexion con el servidor.", "error");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

forgotPasswordBtn?.addEventListener("click", async () => {
  const emailInput = window.prompt("Ingresa tu correo institucional (@udla.edu.co):", "");
  if (!emailInput) {
    return;
  }
  const email = emailInput.trim().toLowerCase();
  if (!isUdlaEmailClient(email)) {
    showInlineMessage(authMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }

  try {
    const sendData = await requestJson<{ message?: string; passwordResetToken?: string }>(
      "/auth/password/send-code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );
    const token = sendData.passwordResetToken;
    if (!token) {
      showInlineMessage(
        authMessage,
        sendData.message ?? "Si el correo existe, revisa tu bandeja de entrada.",
        "success",
      );
      return;
    }
    const code = window.prompt("Ingresa el codigo de 6 digitos que recibiste por correo:", "");
    if (!code) {
      return;
    }
    const newPassword = window.prompt("Ingresa tu nueva contrasena (minimo 8 caracteres):", "");
    if (!newPassword) {
      return;
    }
    const resetData = await requestJson<{ message?: string }>("/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        verificationCode: code,
        passwordResetToken: token,
        newPassword,
      }),
    });
    showInlineMessage(
      authMessage,
      resetData.message ?? "Contrasena actualizada. Ya puedes iniciar sesion.",
      "success",
    );
  } catch (error) {
    showInlineMessage(
      authMessage,
      error instanceof Error ? error.message : "No se pudo cambiar la contrasena.",
      "error",
    );
  }
});

notificationsTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeUserMenu();
  const open = !notificationsMenu?.classList.contains("is-open");
  if (open) {
    notificationsMenu?.classList.add("is-open");
    notificationsTrigger.setAttribute("aria-expanded", "true");
  } else {
    closeNotificationsMenu();
  }
});

notificationsList?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>("[data-notification-id]");
  if (!button) {
    return;
  }
  const session = getUserSession();
  if (!session) {
    return;
  }
  const notificationId = normalizeUserId(button.dataset.notificationId);
  if (notificationId === null) {
    return;
  }
  button.disabled = true;
  try {
    await requestJson("/auth/notifications/" + notificationId + "/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.userId }),
    });
    await loadDashboard();
  } catch {
    button.disabled = false;
  }
});

createStudentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = getUserSession();
  if (!session || session.role !== "profesor" || !createStudentForm) {
    return;
  }
  const formData = new FormData(createStudentForm);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isUdlaEmailClient(email)) {
    showInlineMessage(createStudentMessage, "El correo debe ser institucional: @udla.edu.co", "error");
    return;
  }
  if (password.length < 8) {
    showInlineMessage(createStudentMessage, "La contrasena debe tener al menos 8 caracteres.", "error");
    return;
  }
  const submitButton = createStudentForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "");
  showInlineMessage(createStudentMessage, "", "");
  try {
    const data = await requestJson<{ message?: string }>("/auth/professor/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professorId: session.userId,
        email,
        nombre: String(formData.get("nombre") ?? "").trim(),
        genero: String(formData.get("genero") ?? ""),
        celular: String(formData.get("celular") ?? "").trim(),
        programa: String(formData.get("programa") ?? "").trim(),
        semestre: Number(formData.get("semestre") ?? 1),
        matricula: String(formData.get("matricula") ?? "").trim(),
        password,
      }),
    });
    createStudentForm.reset();
    showInlineMessage(createStudentMessage, data.message ?? "Estudiante creado correctamente.", "success");
    await loadDashboard();
  } catch (error) {
    showInlineMessage(
      createStudentMessage,
      error instanceof Error ? error.message : "No se pudo crear el estudiante.",
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

createClassForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = getUserSession();
  if (!session || session.role !== "profesor" || !createClassForm) {
    return;
  }
  const formData = new FormData(createClassForm);
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    showInlineMessage(createClassMessage, "El nombre de la clase es obligatorio.", "error");
    return;
  }
  const submitButton = createClassForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "");
  showInlineMessage(createClassMessage, "", "");
  try {
    const data = await requestJson<{ message?: string }>("/auth/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professorId: session.userId,
        nombre,
        descripcion: String(formData.get("descripcion") ?? "").trim(),
        cupo: Number(formData.get("cupo") ?? 30),
        visibilidad: String(formData.get("visibilidad") ?? "publica"),
      }),
    });
    createClassForm.reset();
    const cupoInput = createClassForm.elements.namedItem("cupo");
    if (cupoInput instanceof HTMLInputElement) {
      cupoInput.value = "30";
    }
    showInlineMessage(createClassMessage, data.message ?? "Clase creada correctamente.", "success");
    await loadDashboard(data.message ?? "Clase creada correctamente.");
  } catch (error) {
    showInlineMessage(
      createClassMessage,
      error instanceof Error ? error.message : "No se pudo crear la clase.",
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

enrollStudentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = getUserSession();
  if (!session || session.role !== "profesor" || !enrollStudentForm) {
    return;
  }
  const formData = new FormData(enrollStudentForm);
  const classId = normalizeUserId(formData.get("classId"));
  const studentEmail = String(formData.get("studentEmail") ?? "").trim().toLowerCase();
  const studentMatriculaRaw = String(formData.get("studentMatricula") ?? "").trim();
  const studentMatricula = studentMatriculaRaw
    ? studentMatriculaRaw.toUpperCase().replace(/\s+/g, "")
    : "";

  if (classId === null) {
    showInlineMessage(enrollStudentMessage, "Selecciona una clase.", "error");
    return;
  }
  if ((!studentEmail && !studentMatricula) || (studentEmail && studentMatricula)) {
    showInlineMessage(
      enrollStudentMessage,
      "Indica solo el correo institucional o solo la matricula del estudiante.",
      "error",
    );
    return;
  }
  if (studentEmail && !isUdlaEmailClient(studentEmail)) {
    showInlineMessage(enrollStudentMessage, "El correo debe ser @udla.edu.co", "error");
    return;
  }
  if (studentMatricula && !/^[A-Z0-9_-]{4,32}$/.test(studentMatricula)) {
    showInlineMessage(enrollStudentMessage, "La matricula no tiene un formato valido.", "error");
    return;
  }

  const submitButton = enrollStudentForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "");
  showInlineMessage(enrollStudentMessage, "", "");
  try {
    const data = await requestJson<{ message?: string }>(`/auth/classes/${classId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        studentEmail
          ? { professorId: session.userId, studentEmail }
          : { professorId: session.userId, studentMatricula },
      ),
    });
    enrollStudentForm.reset();
    showInlineMessage(
      enrollStudentMessage,
      data.message ?? "Estudiante matriculado correctamente.",
      "success",
    );
    await loadDashboard(data.message ?? "Estudiante matriculado correctamente.");
  } catch (error) {
    showInlineMessage(
      enrollStudentMessage,
      error instanceof Error ? error.message : "No se pudo matricular al estudiante.",
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

createExerciseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = getUserSession();
  if (!session || session.role !== "profesor" || !createExerciseForm) {
    return;
  }
  const formData = new FormData(createExerciseForm);
  const classId = normalizeUserId(formData.get("classId"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (classId === null || !titulo) {
    showInlineMessage(createExerciseMessage, "Selecciona una clase y define un titulo.", "error");
    return;
  }
  const submitButton = createExerciseForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "");
  showInlineMessage(createExerciseMessage, "", "");
  try {
    const data = await requestJson<{ message?: string }>("/auth/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professorId: session.userId,
        classId,
        titulo,
        descripcion: String(formData.get("descripcion") ?? "").trim(),
        difficulty: String(formData.get("difficulty") ?? "media"),
        dueDate: String(formData.get("dueDate") ?? "").trim(),
        coinsReward: Number(formData.get("coinsReward") ?? 0),
        xpReward: Number(formData.get("xpReward") ?? 0),
        reviewTopic: String(formData.get("reviewTopic") ?? "").trim(),
      }),
    });
    createExerciseForm.reset();
    showInlineMessage(
      createExerciseMessage,
      data.message ?? "Ejercicio creado correctamente.",
      "success",
    );
    await loadDashboard(data.message ?? "Ejercicio creado correctamente.");
  } catch (error) {
    showInlineMessage(
      createExerciseMessage,
      error instanceof Error ? error.message : "No se pudo crear el ejercicio.",
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

studentExercisesList?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>("[data-complete-exercise-id]");
  if (!button) {
    return;
  }
  const session = getUserSession();
  if (!session || session.role !== "estudiante") {
    return;
  }
  const exerciseId = normalizeUserId(button.dataset.completeExerciseId);
  if (exerciseId === null) {
    return;
  }
  button.disabled = true;
  try {
    const data = await requestJson<{ message?: string }>(`/auth/exercises/${exerciseId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: session.userId }),
    });
    await loadDashboard(data.message ?? "Ejercicio marcado como completado.");
  } catch {
    button.disabled = false;
  }
});

studentPublicClassesList?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>("[data-join-class-id]");
  if (!button) {
    return;
  }
  const session = getUserSession();
  if (!session || session.role !== "estudiante") {
    return;
  }
  const classId = normalizeUserId(button.dataset.joinClassId);
  if (classId === null) {
    return;
  }
  button.disabled = true;
  try {
    const data = await requestJson<{ message?: string }>(`/auth/classes/${classId}/join-public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: session.userId }),
    });
    await loadDashboard(data.message ?? "Te uniste a la clase.");
  } catch {
    button.disabled = false;
  }
});

userMenuTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeNotificationsMenu();
  const open = !userMenu?.classList.contains("is-open");
  if (open) {
    userMenu?.classList.add("is-open");
    userMenuTrigger.setAttribute("aria-expanded", "true");
  } else {
    closeUserMenu();
  }
});

userLogoutBtn?.addEventListener("click", () => {
  clearUserSession();
  dashboardData = null;
  applyHeaderAuthState();
  closeUserMenu();
  closeNotificationsMenu();
  showHomeView();
  showToast(homeSessionToast, "Sesion cerrada correctamente.", "home");
});

document.addEventListener("click", () => {
  closeUserMenu();
  closeNotificationsMenu();
});

userMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
});

notificationsDropdown?.addEventListener("click", (event) => {
  event.stopPropagation();
});

applyHeaderAuthState();

const session = getUserSession();
if (session) {
  void loadDashboard();
}
