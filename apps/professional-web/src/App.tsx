import { NavLink, Route, Routes } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/horarios", label: "Horarios" },
  { to: "/video", label: "Videollamadas" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/chat", label: "Chat" },
  { to: "/ingresos", label: "Ingresos" },
  { to: "/admin", label: "Solapa Admin" },
  { to: "/ajustes", label: "Ajustes" }
];

function Page({ title, description }: { title: string; description: string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export function App() {
  return (
    <div className="layout">
      <header>
        <h1>Professional Portal</h1>
        <p>MVP scaffold: perfil publico, agenda, video, pacientes y cobros.</p>
      </header>

      <nav>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? "active" : "")}
            end={link.to === "/"}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Page title="Dashboard" description="KPIs, proximas sesiones y acceso directo a sesion/chat." />} />
          <Route path="/horarios" element={<Page title="Horarios" description="Calendario interno, carga de disponibilidad y bloqueos por descanso/vacaciones." />} />
          <Route path="/video" element={<Page title="Videollamadas" description="Link unico por sesion y acceso desde agenda y sesion." />} />
          <Route path="/pacientes" element={<Page title="Pacientes" description="Listado por estado: activo, pausa, cancelado, prueba + historial." />} />
          <Route path="/chat" element={<Page title="Mensajeria" description="Chat 1 a 1, indicadores de lectura y notificaciones." />} />
          <Route path="/ingresos" element={<Page title="Ingresos" description="Monto acumulado, periodo actual y detalle de sesiones pagadas." />} />
          <Route path="/admin" element={<Page title="Solapa Administrativa" description="Datos fiscales/cobro, legales, consentimientos y aceptacion con timestamp." />} />
          <Route path="/ajustes" element={<Page title="Ajustes" description="Notificaciones, seguridad basica y cierre de sesion." />} />
        </Routes>
      </main>
    </div>
  );
}
