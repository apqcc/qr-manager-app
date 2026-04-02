import { useState, useEffect, useRef, useCallback } from "react";

// ── Inline QR encoder (pure JS, no external lib needed in artifact) ──────────
// Minimal QR Code generator (Mode: byte, ECC: M, version auto)
// We'll use a CDN script instead via dynamic script injection

const QR_CDN = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
export default function App()

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

// ── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "qr-slugs";

async function loadSlugs() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

async function saveSlugs(slugs) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(slugs));
  } catch (e) { console.error(e); }
}

// ── Tiny ID generator ────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Theme tokens ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0d0d0f;
    --ink2: #1c1c21;
    --ink3: #2e2e36;
    --muted: #6b6b7a;
    --border: #e4e4ed;
    --surface: #f7f7fb;
    --white: #ffffff;
    --accent: #4f46e5;
    --accent2: #7c3aed;
    --accent-light: #eef2ff;
    --green: #059669;
    --green-light: #d1fae5;
    --red: #dc2626;
    --red-light: #fee2e2;
    --amber: #d97706;
    --amber-light: #fef3c7;
    --radius: 14px;
    --radius-sm: 8px;
    --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06);
    --shadow-lg: 0 8px 32px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06);
    --font: 'Syne', sans-serif;
    --mono: 'DM Mono', monospace;
  }

  body { font-family: var(--font); background: var(--surface); color: var(--ink); min-height: 100vh; }

  /* Layout */
  .app { display: flex; min-height: 100vh; }
  .sidebar {
    width: 240px; min-height: 100vh; background: var(--ink);
    padding: 28px 20px; display: flex; flex-direction: column; gap: 8px;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
    flex-shrink: 0;
  }
  .sidebar-logo {
    display: flex; align-items: center; gap: 10px; padding: 0 8px 24px;
    border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 8px;
  }
  .logo-icon {
    width: 34px; height: 34px; background: var(--accent);
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
  }
  .logo-text { color: #fff; font-size: 15px; font-weight: 700; letter-spacing: -.3px; }
  .logo-sub { color: rgba(255,255,255,.35); font-size: 10px; font-family: var(--mono); margin-top: 1px; }

  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 12px;
    border-radius: var(--radius-sm); cursor: pointer; font-size: 13.5px;
    font-weight: 500; color: rgba(255,255,255,.5); transition: all .15s; border: none; background: none; width: 100%;
    text-align: left;
  }
  .nav-item:hover { color: #fff; background: rgba(255,255,255,.06); }
  .nav-item.active { color: #fff; background: rgba(79,70,229,.35); }
  .nav-icon { width: 16px; height: 16px; flex-shrink: 0; }

  .nav-section-label {
    font-size: 10px; font-family: var(--mono); color: rgba(255,255,255,.2);
    text-transform: uppercase; letter-spacing: .08em; padding: 16px 12px 4px;
  }

  .main { flex: 1; padding: 32px 36px; overflow-y: auto; max-width: 1100px; }

  /* Header */
  .page-header { margin-bottom: 28px; }
  .page-title { font-size: 26px; font-weight: 800; letter-spacing: -.5px; }
  .page-sub { color: var(--muted); font-size: 14px; margin-top: 4px; }

  /* Stats row */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px 22px; box-shadow: var(--shadow);
  }
  .stat-label { font-size: 11px; font-family: var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .stat-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-top: 4px; }
  .stat-change { font-size: 12px; color: var(--green); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

  /* Card */
  .card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow);
  }
  .card-header {
    padding: 18px 22px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 14px; font-weight: 700; }
  .card-body { padding: 22px; }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    font-family: var(--font); font-size: 13px; font-weight: 600;
    padding: 9px 18px; border-radius: var(--radius-sm); cursor: pointer;
    border: none; transition: all .15s; white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #4338ca; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(79,70,229,.35); }
  .btn-secondary { background: var(--surface); color: var(--ink); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--border); }
  .btn-ghost { background: none; color: var(--muted); }
  .btn-ghost:hover { color: var(--ink); background: var(--surface); }
  .btn-danger { background: var(--red-light); color: var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-green { background: var(--green-light); color: var(--green); }
  .btn-green:hover { background: var(--green); color: #fff; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

  /* Form elements */
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 12.5px; font-weight: 600; color: var(--ink2); }
  .form-label span { color: var(--muted); font-weight: 400; }
  .form-input {
    font-family: var(--font); font-size: 14px; padding: 10px 14px;
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    background: var(--white); color: var(--ink); outline: none;
    transition: border-color .15s;
  }
  .form-input:focus { border-color: var(--accent); }
  .form-input.mono { font-family: var(--mono); }
  .input-prefix-wrap { display: flex; }
  .input-prefix {
    display: flex; align-items: center; padding: 10px 12px;
    background: var(--surface); border: 1.5px solid var(--border); border-right: none;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    font-family: var(--mono); font-size: 12px; color: var(--muted); white-space: nowrap;
  }
  .input-prefix + .form-input { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }

  /* Drop zone */
  .drop-zone {
    border: 2px dashed var(--border); border-radius: var(--radius);
    padding: 32px; text-align: center; cursor: pointer;
    transition: all .2s; background: var(--surface); position: relative;
  }
  .drop-zone:hover, .drop-zone.drag-over { border-color: var(--accent); background: var(--accent-light); }
  .drop-zone.has-file { border-style: solid; border-color: var(--green); background: var(--green-light); }
  .drop-icon { font-size: 28px; margin-bottom: 8px; }
  .drop-title { font-size: 14px; font-weight: 600; }
  .drop-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .drop-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th {
    text-align: left; padding: 10px 16px; font-size: 11px; font-family: var(--mono);
    color: var(--muted); text-transform: uppercase; letter-spacing: .06em;
    border-bottom: 1px solid var(--border); background: var(--surface);
  }
  td { padding: 13px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface); }

  .slug-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--mono); font-size: 12px; font-weight: 500;
    background: var(--accent-light); color: var(--accent);
    padding: 3px 9px; border-radius: 99px;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; }
  .status-active { background: var(--green); }
  .status-inactive { background: var(--muted); }

  .pdf-name {
    max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 13px; color: var(--ink2);
  }
  .pdf-date { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }

  .actions { display: flex; gap: 6px; align-items: center; }

  /* QR Preview modal */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
    z-index: 100; display: flex; align-items: center; justify-content: center;
    animation: fadeIn .15s ease;
  }
  .modal {
    background: var(--white); border-radius: 20px; box-shadow: var(--shadow-lg);
    padding: 32px; width: 360px; max-width: 95vw;
    animation: slideUp .2s cubic-bezier(.34,1.56,.64,1);
    position: relative;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px) scale(.97); opacity:0; } to { transform: none; opacity:1; } }

  .modal-close {
    position: absolute; top: 16px; right: 16px; background: var(--surface);
    border: none; border-radius: 50%; width: 30px; height: 30px;
    cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
    color: var(--muted); transition: all .15s;
  }
  .modal-close:hover { background: var(--border); color: var(--ink); }

  .qr-wrapper {
    background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 18px; display: flex; align-items: center; justify-content: center;
    margin: 20px 0;
  }
  .qr-slug { font-family: var(--mono); font-size: 13px; color: var(--accent); text-align: center; font-weight: 500; }
  .qr-url { font-size: 11px; color: var(--muted); text-align: center; margin-top: 4px; word-break: break-all; }

  /* Toast */
  .toast-area { position: fixed; bottom: 24px; right: 24px; z-index: 200; display: flex; flex-direction: column; gap: 10px; }
  .toast {
    display: flex; align-items: center; gap: 10px; padding: 12px 18px;
    border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); font-size: 13px; font-weight: 500;
    animation: slideUp .2s ease; min-width: 220px;
  }
  .toast-success { background: var(--ink); color: #fff; }
  .toast-error { background: var(--red); color: #fff; }

  /* Tabs */
  .tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px; margin-bottom: 20px; }
  .tab { flex: 1; padding: 8px; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: none; color: var(--muted); transition: all .15s; }
  .tab.active { background: var(--white); color: var(--ink); box-shadow: var(--shadow); }

  /* Misc */
  .empty-state { text-align: center; padding: 48px 0; color: var(--muted); }
  .empty-icon { font-size: 40px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; font-weight: 500; }
  .empty-sub { font-size: 13px; margin-top: 4px; }

  .copy-btn {
    background: none; border: none; cursor: pointer; color: var(--muted);
    font-size: 12px; padding: 2px 6px; border-radius: 4px; transition: all .15s;
  }
  .copy-btn:hover { background: var(--accent-light); color: var(--accent); }

  .chip {
    display: inline-flex; align-items: center; font-size: 11px; font-weight: 600;
    padding: 2px 8px; border-radius: 99px;
  }
  .chip-green { background: var(--green-light); color: var(--green); }
  .chip-amber { background: var(--amber-light); color: var(--amber); }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .flex-end { display: flex; justify-content: flex-end; gap: 8px; }
  .text-muted { color: var(--muted); font-size: 13px; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { padding: 20px 16px; }
    .stats-row { grid-template-columns: 1fr 1fr; }
    .grid2 { grid-template-columns: 1fr; }
  }
`;

// ── Icons (inline SVG components) ──────────────────────────────────────────
const Icon = ({ d, size = 16, color = "currentColor", fill = "none", strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icon = ({ d, size = 16, color = "currentColor", fill = "none", strokeWidth = 1.75 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={fill} 
    stroke={color} 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [slugs, setSlugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [qrModal, setQrModal] = useState(null); // { slug, url, name }
  const [editModal, setEditModal] = useState(null); // existing slug to edit

  useEffect(() => {
    loadScript(QR_CDN).then(() => {});
    loadSlugs().then(d => { setSlugs(d); setLoading(false); });
  }, []);

  const toast = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const handleCreate = async (entry) => {
    const next = [entry, ...slugs];
    setSlugs(next);
    await saveSlugs(next);
    toast("QR slug created successfully!");
    setView("dashboard");
  };

  const handleUpdate = async (id, patch) => {
    const next = slugs.map(s => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s);
    setSlugs(next);
    await saveSlugs(next);
    toast("Slug updated — QR code unchanged ✓");
    setEditModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this slug and its QR code?")) return;
    const next = slugs.filter(s => s.id !== id);
    setSlugs(next);
    await saveSlugs(next);
    toast("Deleted.", "success");
  };

  const BASE = "https://mydomain.com/go/";
  const activeCount = slugs.filter(s => s.active !== false).length;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">{Icons.qr}</div>
            <div>
              <div className="logo-text">QRLink</div>
              <div className="logo-sub">MANAGER v1.0</div>
            </div>
          </div>
          <div className="nav-section-label">Main</div>
          {[
            { id: "dashboard", label: "Dashboard", icon: Icons.grid },
            { id: "create", label: "New QR Slug", icon: Icons.plus },
          ].map(n => (
            <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
              <span className="nav-icon">{n.icon}</span> {n.label}
            </button>
          ))}
          <div className="nav-section-label" style={{ marginTop: 8 }}>Info</div>
          <div style={{ padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,.3)", lineHeight: 1.5 }}>
            Each slug maps to a PDF URL. Update the URL anytime — the QR code never changes.
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {view === "dashboard" && (
            <DashboardView
              slugs={slugs} loading={loading} activeCount={activeCount}
              base={BASE} onQR={setQrModal} onEdit={setEditModal} onDelete={handleDelete}
              onCreate={() => setView("create")}
            />
          )}
          {view === "create" && (
            <CreateView base={BASE} onCreate={handleCreate} onCancel={() => setView("dashboard")} toast={toast} />
          )}
        </main>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <QRModal entry={qrModal} base={BASE} onClose={() => setQrModal(null)} toast={toast} />
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditModal entry={editModal} onSave={(patch) => handleUpdate(editModal.id, patch)} onClose={() => setEditModal(null)} toast={toast} />
      )}

      {/* Toasts */}
      <div className="toast-area">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? "✓" : "✕"} {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ slugs, loading, activeCount, base, onQR, onEdit, onDelete, onCreate }) {
  const [search, setSearch] = useState("");
  const filtered = slugs.filter(s =>
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="page-title">QR Code Manager</div>
            <div className="page-sub">Manage your dynamic PDF redirects and QR codes</div>
          </div>
          <button className="btn btn-primary" onClick={onCreate}>
            {Icons.plus} New Slug
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Slugs</div>
          <div className="stat-value">{slugs.length}</div>
          <div className="stat-change">↑ All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{activeCount}</div>
          <div className="stat-change">Live & redirecting</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Base URL</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", marginTop: 8, color: "var(--accent)", wordBreak: "break-all" }}>
            mydomain.com/go/
          </div>
          <div className="stat-change">Your redirect base</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Slugs</div>
          <input
            className="form-input mono"
            placeholder="Search slugs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, fontSize: 12, padding: "7px 12px" }}
          />
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-text">Loading…</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📎</div>
              <div className="empty-text">{search ? "No results" : "No slugs yet"}</div>
              <div className="empty-sub">{!search && "Create your first QR slug to get started"}</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Slug</th>
                  <th>Friendly Name</th>
                  <th>PDF / URL</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <SlugRow key={s.id} entry={s} base={base} onQR={onQR} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function SlugRow({ entry, base, onQR, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false);
  const url = base + entry.slug;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className={`status-dot ${entry.active !== false ? "status-active" : "status-inactive"}`} />
          <span className="chip chip-green" style={{ fontSize: 10 }}>
            {entry.active !== false ? "Active" : "Off"}
          </span>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="slug-badge">/go/{entry.slug}</span>
          <button className="copy-btn" onClick={copy} title="Copy URL">
            {copied ? "✓" : Icons.copy}
          </button>
        </div>
      </td>
      <td style={{ fontWeight: 600, fontSize: 13 }}>{entry.name || <span style={{ color: "var(--muted)" }}>—</span>}</td>
      <td>
        <div className="pdf-name" title={entry.pdfUrl}>
          {Icons.pdf}&nbsp;
          {entry.pdfName || entry.pdfUrl?.split("/").pop() || "No file"}
        </div>
        <div className="pdf-date">Updated {new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}</div>
      </td>
      <td>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          {new Date(entry.createdAt).toLocaleDateString()}
        </div>
      </td>
      <td>
        <div className="actions">
          <button className="btn btn-sm btn-secondary" onClick={() => onQR(entry)} title="View QR">
            {Icons.qr}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(entry)} title="Edit">
            {Icons.edit}
          </button>
          <a href={entry.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" title="Open PDF">
            {Icons.eye}
          </a>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(entry.id)} title="Delete">
            {Icons.trash}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Create View ──────────────────────────────────────────────────────────────
function CreateView({ base, onCreate, onCancel, toast }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState("url"); // url | file
  const [saving, setSaving] = useState(false);

  const sanitize = v => v.toLowerCase().replace(/[^a-z0-9._-]/g, "");

  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") { toast("Please select a PDF file", "error"); return; }
    setPdfName(file.name);
    // In real deployment: upload to S3/Supabase and get URL. Here we use object URL as demo.
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    toast("PDF ready (object URL — replace with upload endpoint in production)");
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const valid = slug.length >= 2 && pdfUrl;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    const entry = {
      id: uid(), slug, name, pdfUrl, pdfName,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await new Promise(r => setTimeout(r, 300));
    onCreate(entry);
    setSaving(false);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Create New Slug</div>
        <div className="page-sub">Assign a custom slug to a PDF. The QR code will never change — only the destination.</div>
      </div>

      <div className="grid2">
        {/* Left: form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Slug Details</div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Custom Slug <span>(required)</span></label>
                <div className="input-prefix-wrap">
                  <div className="input-prefix">/go/</div>
                  <input
                    className="form-input mono"
                    value={slug}
                    onChange={e => setSlug(sanitize(e.target.value))}
                    placeholder="order123"
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Full URL: <code style={{ fontFamily: "var(--mono)" }}>{base}{slug || "…"}</code>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Friendly Name <span>(optional)</span></label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Menu — Summer 2025" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">PDF Source</div></div>
            <div className="card-body">
              <div className="tabs">
                <button className={`tab ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")}>Paste URL</button>
                <button className={`tab ${tab === "file" ? "active" : ""}`} onClick={() => setTab("file")}>Upload File</button>
              </div>

              {tab === "url" && (
                <div className="form-group">
                  <label className="form-label">PDF URL</label>
                  <input
                    className="form-input mono"
                    value={pdfUrl}
                    onChange={e => { setPdfUrl(e.target.value); setPdfName(""); }}
                    placeholder="https://example.com/menu.pdf"
                  />
                </div>
              )}

              {tab === "file" && (
                <div
                  className={`drop-zone ${dragOver ? "drag-over" : ""} ${pdfName ? "has-file" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input").click()}
                >
                  <div className="drop-icon">{pdfName ? "📄" : "☁️"}</div>
                  <div className="drop-title">{pdfName || "Drop PDF here or click to browse"}</div>
                  <div className="drop-sub">{pdfName ? "Click to replace" : "PDF files only · Max 20MB"}</div>
                  <input id="file-input" type="file" accept="application/pdf" style={{ display: "none" }}
                    onChange={e => handleFile(e.target.files[0])} />
                </div>
              )}
            </div>
          </div>

          <div className="flex-end">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" disabled={!valid || saving} onClick={submit}>
              {saving ? "Creating…" : <>{Icons.plus} Create Slug & QR</>}
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-header"><div className="card-title">Live Preview</div></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <LiveQRPreview url={slug ? base + slug : ""} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                {slug ? `/go/${slug}` : <span style={{ color: "var(--muted)" }}>enter a slug…</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {name || <span style={{ color: "var(--border)" }}>Friendly name appears here</span>}
              </div>
            </div>
            {pdfUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--green-light)", borderRadius: 8, padding: "6px 12px" }}>
                {Icons.pdf}
                <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
                  {pdfName || "PDF URL set"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Live QR preview (no download) ───────────────────────────────────────────
function LiveQRPreview({ url }) {
  const ref = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    if (!url || !window.QRCode) return;
    try {
      qrRef.current = new window.QRCode(ref.current, {
        text: url, width: 160, height: 160,
        colorDark: "#0d0d0f", colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } catch (e) {}
  }, [url]);

  if (!url) {
    return (
      <div style={{ width: 160, height: 160, background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>QR preview</span>
      </div>
    );
  }

  return <div ref={ref} style={{ borderRadius: 8, overflow: "hidden" }} />;
}

// ── QR Modal (with download) ─────────────────────────────────────────────────
function QRModal({ entry, base, onClose, toast }) {
  const url = base + entry.slug;
  const qrRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !window.QRCode) return;
    containerRef.current.innerHTML = "";
    qrRef.current = new window.QRCode(containerRef.current, {
      text: url, width: 220, height: 220,
      colorDark: "#0d0d0f", colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  }, [url]);

  const download = () => {
    setTimeout(() => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) { toast("Canvas not ready", "error"); return; }

      const pad = 32;
      const out = document.createElement("canvas");
      out.width = canvas.width + pad * 2;
      out.height = canvas.height + pad * 2 + 52;
      const ctx = out.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.roundRect(0, 0, out.width, out.height, 16);
      ctx.fill();

      ctx.drawImage(canvas, pad, pad);

      ctx.fillStyle = "#4f46e5";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("/go/" + entry.slug, out.width / 2, canvas.height + pad + 22);

      if (entry.name) {
        ctx.fillStyle = "#6b6b7a";
        ctx.font = "12px sans-serif";
        ctx.fillText(entry.name, out.width / 2, canvas.height + pad + 42);
      }

      const a = document.createElement("a");
      a.download = `qr-${entry.slug}.png`;
      a.href = out.toDataURL("image/png");
      a.click();
      toast("QR code downloaded!");
    }, 100);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>{Icons.close}</button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>QR Code</div>
        <div className="qr-wrapper">
          <div ref={containerRef} />
        </div>
        <div className="qr-slug">/go/{entry.slug}</div>
        {entry.name && <div className="qr-url" style={{ marginTop: 2, color: "var(--ink2)", fontWeight: 500 }}>{entry.name}</div>}
        <div className="qr-url" style={{ marginTop: 6 }}>{url}</div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(url); toast("URL copied!"); }}>
            {Icons.copy} Copy URL
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={download}>
            {Icons.download} Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ entry, onSave, onClose, toast }) {
  const [name, setName] = useState(entry.name || "");
  const [pdfUrl, setPdfUrl] = useState(entry.pdfUrl || "");
  const [pdfName, setPdfName] = useState(entry.pdfName || "");
  const [tab, setTab] = useState("url");

  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") { toast("Please select a PDF file", "error"); return; }
    setPdfName(file.name);
    setPdfUrl(URL.createObjectURL(file));
    toast("PDF ready for update");
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <button className="modal-close" onClick={onClose}>{Icons.close}</button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Update Slug</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          Slug <code style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>/go/{entry.slug}</code> won't change.
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Friendly Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Menu Summer 2025" />
          </div>

          <div className="form-group">
            <label className="form-label">Update PDF Source</label>
            <div className="tabs">
              <button className={`tab ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")}>Paste URL</button>
              <button className={`tab ${tab === "file" ? "active" : ""}`} onClick={() => setTab("file")}>Upload File</button>
            </div>
            {tab === "url" && (
              <input className="form-input mono" value={pdfUrl} onChange={e => { setPdfUrl(e.target.value); setPdfName(""); }} placeholder="https://…/new-menu.pdf" />
            )}
            {tab === "file" && (
              <div className={`drop-zone ${pdfName !== entry.pdfName ? "has-file" : ""}`} onClick={() => document.getElementById("edit-file").click()}>
                <div className="drop-icon">📄</div>
                <div className="drop-title">{pdfName || "Click to choose PDF"}</div>
                <div className="drop-sub">Will replace current PDF</div>
                <input id="edit-file" type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-end" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ name, pdfUrl, pdfName })}>
            {Icons.check} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
