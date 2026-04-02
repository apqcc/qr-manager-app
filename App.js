import { useState, useEffect } from "react";

export default function App() {
  const [slugs, setSlugs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [slugIn, setSlugIn] = useState("");
  const [urlIn, setUrlIn] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("qr-slugs");
    if (stored) setSlugs(JSON.parse(stored));
  }, []);

  const handleCreate = () => {
    if (!slugIn || !urlIn) return alert("Fill all fields");
    const newEntry = { id: Math.random().toString(), slug: slugIn, pdfUrl: urlIn };
    const next = [newEntry, ...slugs];
    setSlugs(next);
    localStorage.setItem("qr-slugs", JSON.stringify(next));
    setSlugIn(""); setUrlIn(""); setView("dashboard");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>QR Manager - Pure Life</h1>
      
      <nav style={{ marginBottom: "20px" }}>
        <button onClick={() => setView("dashboard")}>Dashboard</button>
        <button onClick={() => setView("create")} style={{ marginLeft: "10px" }}>+ New QR</button>
      </nav>

      {view === "dashboard" ? (
        <div>
          {slugs.map(s => (
            <div key={s.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
              <p><strong>Slug:</strong> /go/{s.slug}</p>
              <p><strong>Link:</strong> {s.pdfUrl}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <input placeholder="Slug Name" value={slugIn} onChange={e => setSlugIn(e.target.value)} style={{ display: "block", marginBottom: "10px" }} />
          <input placeholder="PDF Link" value={urlIn} onChange={e => setUrlIn(e.target.value)} style={{ display: "block", marginBottom: "10px" }} />
          <button onClick={handleCreate}>Save</button>
        </div>
      )}
    </div>
  );
}
