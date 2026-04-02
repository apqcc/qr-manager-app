import { useState, useEffect, useRef, useCallback } from "react";

const QR_CDN = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

function loadScript(src) {
  return new Promise((res, rej) => {
    if (typeof window === "undefined") return res();
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

const STORAGE_KEY = "qr-slugs";
const uid = () => Math.random().toString(36).slice(2, 9);

const Icon = ({ d, size = 16, color = "currentColor", fill = "none", strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  qr: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM17 17h4M17 21v-4M21 14v3"/></svg>,
  upload: <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  download: <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  copy: <Icon d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M8 4h8" />,
  trash: <Icon d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />,
  edit: <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />,
  eye: <Icon d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  link: <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  check: <Icon d="M20 6L9 17l-5-5" />,
  plus: <Icon d="M12 5v14M5 12h14" />,
  grid: <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" fill="currentColor" stroke="none" />,
  close: <Icon d="M18 6L6 18M6 6l12 12" />,
  pdf: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6M9 11h3"/></svg>,
};

export default function App() {
  const [slugs, setSlugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [qrModal, setQrModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    loadScript(QR_CDN).then(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSlugs(JSON.parse(stored));
      setLoading(false);
    });
  }, []);

  const saveToLocal = (newSlugs) => {
    setSlugs(newSlugs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlugs));
  };

  const toast = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const handleCreate = (entry) => {
    const next = [entry, ...slugs];
    saveToLocal(next);
    toast("QR created!");
    setView("dashboard");
  };

  const handleUpdate = (id, patch) => {
    const next = slugs.map(s => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s);
    saveToLocal(next);
    toast("Updated!");
    setEditModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete?")) return;
    const next = slugs.filter(s => s.id !== id);
    saveToLocal(next);
    toast("Deleted");
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", background: "#f0f2f5", minHeight: "100vh" }}>
      <h1>QR Manager - Pure Life Style</h1>
      <button onClick={() => setView(view === "dashboard" ? "create" : "dashboard")} style={{ padding: "10px 20px", background: "#007bff", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
        {view === "dashboard" ? "+ Create New" : "Back to Dashboard"}
      </button>

      {view === "dashboard" ? (
        <div style={{ marginTop: "20px" }}>
          {slugs.length === 0 ? <p>No QR codes yet.</p> : (
            <table style={{ width: "100%", background: "#fff", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: "10px", border: "1px solid #dee2e6" }}>Slug</th>
                  <th style={{ padding: "10px", border: "1px solid #dee2e6" }}>Destination</th>
                  <th style={{ padding: "10px", border: "1px solid #dee2e6" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slugs.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: "10px", border: "1px solid #dee2e6" }}>/go/{s.slug}</td>
                    <td style={{ padding: "10px", border: "1px solid #dee2e6" }}>{s.pdfUrl}</td>
                    <td style={{ padding: "10px", border: "1px solid #dee2e6" }}>
                       <button onClick={() => handleDelete(s.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ marginTop: "20px", background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Create New Redirect</h3>
          <input type="text" placeholder="Slug (e.g. menu1)" id="slugIn" style={{ display: "block", marginBottom: "10px", width: "100%", padding: "8px" }} />
          <input type="text" placeholder="PDF URL" id="urlIn" style={{ display: "block", marginBottom: "10px", width: "100%", padding: "8px" }} />
          <button onClick={() => handleCreate({ id: uid(), slug: document.getElementById("slugIn").value, pdfUrl: document.getElementById("urlIn").value, createdAt: new Date().toISOString() })} style={{ padding: "10px 20px", background: "green", color: "#fff", border: "none", borderRadius: "5px" }}>Save</button>
        </div>
      )}
    </div>
  );
}
