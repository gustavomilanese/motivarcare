import { NavLink, Route, Routes } from "react-router-dom";

const links = [
  { to: "/", label: "Overview" },
  { to: "/ops", label: "Operacion" },
  { to: "/payments", label: "Pagos" },
  { to: "/policies", label: "Politicas" },
  { to: "/ai", label: "IA Audit" }
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
        <h1>Admin Portal</h1>
        <p>Gestion transversal del marketplace terapeutico.</p>
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
          <Route path="/" element={<Page title="Overview" description="KPIs globales de pacientes, profesionales, sesiones y revenue." />} />
          <Route path="/ops" element={<Page title="Operacion" description="Gestion de estados, incidentes y soporte operativo." />} />
          <Route path="/payments" element={<Page title="Pagos" description="Seguimiento de checkout Stripe, conciliaciones y payouts." />} />
          <Route path="/policies" element={<Page title="Politicas" description="Cancelacion 24h, no-show y reglas de credito parametrizables." />} />
          <Route path="/ai" element={<Page title="IA Audit" description="Cola de auditoria IA, consentimientos y revision humana obligatoria." />} />
        </Routes>
      </main>
    </div>
  );
}
