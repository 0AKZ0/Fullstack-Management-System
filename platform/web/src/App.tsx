import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, Building2,
  Check, ChevronDown, Command, FolderKanban, LayoutDashboard,
  LogOut, Plus, Search, Settings2, ShieldCheck, Sparkles, Users, X
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
type Organization = { id: string; name: string; slug: string; role: string };
type Project = {
  id: string; name: string; description: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  createdAt: string; updatedAt: string;
};
type AuditEvent = { id: string; action: string; resourceType: string; resourceId: string; occurredAt: string; metadata: unknown };
const nextStatus: Record<Project["status"], Project["status"] | null> = {
  PLANNING: "ACTIVE", ACTIVE: "ON_HOLD", ON_HOLD: "ACTIVE", COMPLETED: "ARCHIVED", ARCHIVED: null
};

async function api<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
}

export default function App() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("admin@forgeops.local");
  const [password, setPassword] = useState("ChangeMe-Local-Only-2026!");
  const [userName, setUserName] = useState("Workspace admin");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditRestricted, setAuditRestricted] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedOrganization = organizations.find(org => org.id === organizationId);
  const canEditProjects = ["OWNER", "ADMIN", "MANAGER"].includes(selectedOrganization?.role || "");
  const loadProjects = useCallback(async (accessToken: string, orgId: string) => {
    const result = await api<Project[]>("/v1/projects", accessToken, {
      headers: { "x-organization-id": orgId }
    });
    setProjects(result);
  }, []);

  const loadAuditEvents = useCallback(async (accessToken: string, orgId: string) => {
    try {
      const result = await api<{ items: AuditEvent[]; nextCursor: string | null }>("/v1/audit-events?limit=5", accessToken, {
        headers: { "x-organization-id": orgId }
      });
      setAuditEvents(result.items);
      setAuditRestricted(false);
    } catch {
      setAuditEvents([]);
      setAuditRestricted(true);
    }
  }, []);

  const loadOrganizations = useCallback(async (accessToken: string) => {
    const result = await api<Organization[]>("/v1/organizations", accessToken);
    setOrganizations(result);
    if (result[0]) setOrganizationId(result[0].id);
    else setError("This account is not linked to an organization yet.");
  }, []);

  useEffect(() => {
    if (token && organizationId) {
      loadProjects(token, organizationId).catch(err => setError(err.message));
      loadAuditEvents(token, organizationId);
    }
  }, [token, organizationId, loadProjects, loadAuditEvents]);

  const filteredProjects = useMemo(() => projects.filter(project =>
    `${project.name} ${project.description || ""} ${project.status}`.toLowerCase().includes(search.toLowerCase())
  ), [projects, search]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api<{ accessToken: string; user: { name: string; email: string } }>("/v1/auth/login", undefined, {
        method: "POST", body: JSON.stringify({ email, password })
      });
      setToken(result.accessToken);
      setUserName(result.user.name);
      await loadOrganizations(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally { setBusy(false); }
  }

  async function transitionProject(project: Project) {
    const status = nextStatus[project.status];
    if (!status || !selectedOrganization || !canEditProjects) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api<Project>(`/v1/projects/${project.id}/status`, token, {
        method: "PATCH",
        headers: { "x-organization-id": selectedOrganization.id },
        body: JSON.stringify({ status })
      });
      await loadProjects(token, selectedOrganization.id);
      await loadAuditEvents(token, selectedOrganization.id);
      setNotice(`Project moved to ${status.replace("_", " ")}. The change was audited.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update project");
    } finally { setBusy(false); }
  }

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!selectedOrganization) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api<Project>("/v1/projects", token, {
        method: "POST",
        headers: { "x-organization-id": selectedOrganization.id },
        body: JSON.stringify({ name: projectName, description: projectDescription })
      });
      await loadProjects(token, selectedOrganization.id);
      await loadAuditEvents(token, selectedOrganization.id);
      setProjectName(""); setProjectDescription(""); setShowCreate(false);
      setNotice("Project created and recorded in the audit trail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project");
    } finally { setBusy(false); }
  }

  function logout() {
    setToken(""); setOrganizations([]); setProjects([]); setAuditEvents([]); setOrganizationId("");
    setError(""); setNotice("");
  }

  if (!token) return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="login-brand"><span className="brand-mark"><Command size={19}/></span>forgeops<span className="brand-dot">.</span></div>
        <div className="visual-copy"><span className="eyebrow">THE OPERATIONS PLATFORM</span><h1>Clarity for the work that moves you forward.</h1><p>One secure workspace for teams, projects and the decisions behind them.</p></div>
        <div className="visual-footer"><span><ShieldCheck size={14}/> Tenant-aware by design</span><span>ENGINEERED FOR TEAMS</span></div>
        <div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/>
      </div>
      <div className="login-panel"><div className="login-top"><span>WELCOME BACK</span><span className="secure-label"><ShieldCheck size={13}/> SECURE ACCESS</span></div>
        <form className="login-form" onSubmit={handleLogin}>
          <div><h2>Sign in to your workspace</h2><p>Enter your credentials to continue to ForgeOps.</p></div>
          <label>Email address<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
          {error && <div className="error-message">{error}</div>}
          <button className="sign-in" disabled={busy}>{busy?"Signing in…":"Continue to workspace"} <ArrowUpRight size={16}/></button>
          <div className="demo-hint"><Sparkles size={14}/><span>Local demo account is prefilled. Start the API and seed the database to sign in.</span></div>
        </form>
        <div className="login-legal">FORGEOPS PLATFORM <span>·</span> DEVELOPMENT PREVIEW</div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Command size={17}/></span>forgeops<span className="brand-dot">.</span></div>
        <div className="org-switch"><div className="org-icon"><Building2 size={16}/></div><div className="org-copy"><select className="org-select" aria-label="Switch organization" value={organizationId} onChange={event=>setOrganizationId(event.target.value)}>{organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select><small>{selectedOrganization?.role || "Workspace"}</small></div><ChevronDown size={15}/></div>
        <span className="nav-caption">WORKSPACE</span>
        <a className="nav-link active"><LayoutDashboard size={17}/> Overview</a>
        <a className="nav-link"><FolderKanban size={17}/> Projects <span className="nav-count">{projects.length}</span></a>
        <a className="nav-link"><Users size={17}/> People</a>
        <span className="nav-caption nav-caption-spaced">GOVERNANCE</span>
        <a className="nav-link"><Activity size={17}/> Audit trail</a>
        <a className="nav-link"><Settings2 size={17}/> Settings</a>
        <div className="sidebar-bottom">
          <div className="trust-card"><div><ShieldCheck size={15}/> ACCESS CONTROL</div><strong>Protected workspace</strong><p>Organization membership is verified by the API on every scoped request.</p></div>
          <div className="profile-row"><div className="avatar">{initials(userName)}</div><div className="profile-copy"><strong>{userName}</strong><small>{email}</small></div><button className="icon-action" onClick={logout} title="Sign out"><LogOut size={16}/></button></div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="breadcrumb">WORKSPACE <span>/</span> OVERVIEW</span><h1>Overview</h1></div><div className="top-actions"><div className="search-field"><Search size={16}/><input placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-action notification" title="Notifications"><Bell size={17}/><i/></button><div className="avatar top-avatar">{initials(userName)}</div></div></header>
        <section className="welcome"><div><div className="eyebrow">YOUR OPERATIONS, IN FOCUS</div><h2>Good to have you back, {userName.split(" ")[0]}.</h2><p>Here’s the current pulse of your organization.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)}><Plus size={16}/> New project</button></section>
        {error && <div className="error-banner">{error}<button onClick={()=>setError("")}><X size={14}/></button></div>}
        {notice && <div className="success-banner"><Check size={14}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">TOTAL PROJECTS <span className="metric-icon indigo"><FolderKanban size={16}/></span></div><strong>{projects.length.toString().padStart(2,"0")}</strong><small>In this organization</small></article>
          <article className="metric-card"><div className="metric-label">ACTIVE <span className="metric-icon mint"><Activity size={16}/></span></div><strong>{projects.filter(p=>p.status==="ACTIVE").length.toString().padStart(2,"0")}</strong><small>Currently moving forward</small></article>
          <article className="metric-card"><div className="metric-label">COMPLETED <span className="metric-icon amber"><Check size={16}/></span></div><strong>{projects.filter(p=>p.status==="COMPLETED").length.toString().padStart(2,"0")}</strong><small>Delivered by your team</small></article>
          <article className="metric-card"><div className="metric-label">ON HOLD <span className="metric-icon rose"><ArrowDownRight size={16}/></span></div><strong>{projects.filter(p=>p.status==="ON_HOLD").length.toString().padStart(2,"0")}</strong><small>Waiting for next action</small></article>
        </section>
        <section className="content-grid">
          <article className="panel projects-panel"><div className="panel-heading"><div><span className="eyebrow">DELIVERY PIPELINE</span><h3>Projects</h3></div><button className="subtle-button" onClick={()=>setShowCreate(true)}><Plus size={14}/> Add project</button></div>
            <div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>STATUS</th><th>LAST UPDATED</th><th></th></tr></thead><tbody>
              {filteredProjects.map(project=><tr key={project.id}><td><div className="project-cell"><span className="project-mark">{initials(project.name)}</span><div><strong>{project.name}</strong><small>{project.description || "No description provided"}</small></div></div></td><td><button type="button" className={`status-pill ${project.status.toLowerCase()} status-action`} onClick={()=>transitionProject(project)} disabled={!canEditProjects||!nextStatus[project.status]||busy} title={nextStatus[project.status]?`Move to ${nextStatus[project.status]}`:"No further transition"}><i/>{project.status.replace("_"," ")}{canEditProjects&&nextStatus[project.status]?" ↗":""}</button></td><td className="date-cell">{new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(project.updatedAt))}</td><td><button className="icon-action" aria-label={`Open ${project.name}`}><ArrowUpRight size={15}/></button></td></tr>)}
              {filteredProjects.length===0 && <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={20}/></div><strong>{search?"No matching projects":"Your workspace is ready"}</strong><p>{search?"Try another search term.":"Create the first project to start tracking delivery."}</p>{!search&&<button className="primary-button small" onClick={()=>setShowCreate(true)}><Plus size={14}/> Create first project</button>}</div></td></tr>}
            </tbody></table></div>
          </article>
          <aside className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow">PLATFORM HEALTH</span><h3>Workspace integrity</h3></div><span className="health-dot"/></div><div className="health-hero"><div className="health-ring"><ShieldCheck size={23}/></div><div><strong>Protected</strong><span>Tenant context verified</span></div></div><div className="health-list"><div><span>Identity</span><b><Check size={13}/> Enforced</b></div><div><span>Organization access</span><b><Check size={13}/> Scoped</b></div><div><span>Audit events</span><b><Check size={13}/> Transactional</b></div><div><span>API contract</span><b><Check size={13}/> Documented</b></div></div><div className="insight-note"><Sparkles size={14}/><p>Every project write is paired with an audit event in the same database transaction.</p></div></aside>
        </section>
        <section className="panel audit-panel"><div className="panel-heading"><div><span className="eyebrow">ACCOUNTABILITY</span><h3>Recent audit events</h3></div><span className="audit-count">{auditEvents.length} EVENTS</span></div>{auditRestricted?<div className="audit-empty"><ShieldCheck size={16}/> Audit history is restricted to organization admins.</div>:auditEvents.length===0?<div className="audit-empty">No recorded changes yet. Project activity will appear here.</div>:<div className="audit-list">{auditEvents.map(event=><div className="audit-row" key={event.id}><span className="audit-marker"><Activity size={14}/></span><div><strong>{event.action.replace(".", " / ")}</strong><small>{event.resourceType} · {event.resourceId.slice(0,10)}</small></div><time>{new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(event.occurredAt))}</time></div>)}</div>}</section>
        <footer className="footer"><span>FORGEOPS <i>·</i> OPERATIONS PLATFORM</span><span><ShieldCheck size={12}/> MULTI-TENANT FOUNDATION</span></footer>
      </main>
      {showCreate && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}><form className="modal" onSubmit={handleCreateProject}><div className="modal-head"><div><span className="eyebrow">DELIVERY PIPELINE</span><h3>Create project</h3></div><button type="button" className="icon-action" onClick={()=>setShowCreate(false)}><X size={18}/></button></div><label>Project name<input autoFocus minLength={2} maxLength={120} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="e.g. Customer portal" required/></label><label>Description <span>OPTIONAL</span><textarea maxLength={2000} rows={4} value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="What outcome should this project deliver?"/></label><div className="modal-foot"><button type="button" className="cancel-button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary-button" disabled={busy||!projectName.trim()}>{busy?"Creating…":<><Plus size={15}/> Create project</>}</button></div></form></div>}
    </div>
  );
}
