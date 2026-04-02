import { useState, useEffect } from "react";

const STORAGE_KEY = "qr-slugs";
const uid = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const [slugs, setSlugs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [slugIn, setSlugIn] = useState("");
  const [urlIn, setUrlIn] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSlugs(JSON.parse(stored));
  }, []);

  const saveToLocal = (newSlugs) => {
    setSlugs(newSlugs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlugs));
  };

  const handleCreate = () => {
    if (!slugIn || !urlIn) return alert("Please fill all fields");
    const next = [{ id: uid(), slug: slugIn, pdfUrl: urlIn }, ...slugs];
    saveToLocal(next);
    setSlugIn(""); setUrlIn("");
    setView("dashboard");
  };

  const handleDelete = (id) => {
    if (confirm("Delete this QR?")) {
      saveToLocal(slugs.filter(s => s.id !== id));
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ color: "#333" }}>QR Manager - Pure Life</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={() => setView("dashboard")} 
          style={{ padding: "10px", marginRight: "10px", background: view === "dashboard" ? "#007bff" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}
        >Dashboard</button>
        <button 
          onClick={() => setView("create")} 
          style={{ padding: "10px", background: view === "create" ? "#28a745" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}
        >+ Create New QR</button>
      </div>

      {view === "dashboard" ? (
        <div>
          <h2>Your QR Codes</h2>
          {slugs.map(s => (
            <div key={s.id} style={{ background: "#fff", padding: "15px", border: "1px solid #ddd", marginBottom: "10px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Slug: /go/{s.slug}</strong><br/>
                <small style={{ color: "#666" }}>Target: {s.pdfUrl}</small>
              </div>
              <button onClick={() => handleDelete(s.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>Delete</button>
            </div>
          ))}
          {slugs.length === 0 && <p>No QR codes created yet.</p>}
        </div>
      ) : (
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
          <h2>Create Dynamic QR</h2>
          <label>Slug Name (e.g. menu1):</label>
          <input value={slugIn} onChange={e => setSlugIn(e.target.value)} style={{ display: "block", width: "100%", padding: "10px", margin: "10px 0" }} />
          <label>PDF or File URL:</label>
          <input value={urlIn} onChange={e => setUrlIn(e.target.value)} style={{ display: "block", width: "100%", padding: "10px", margin: "10px 0" }} />
          <button onClick={handleCreate} style={{ width: "100%", padding: "12px", background: "#28a745", color: "#fff", border: "none", borderRadius: "5px", fontSize: "16px" }}>Save & Generate</button>
        </div>
      )}
    </div>
  );
}
