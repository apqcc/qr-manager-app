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
    if (!slugIn || !urlIn) return alert("الرجاء تعبئة جميع الخانات");
    const next = [{ id: Math.random().toString(), slug: slugIn, pdfUrl: urlIn }, ...slugs];
    setSlugs(next);
    localStorage.setItem("qr-slugs", JSON.stringify(next));
    setSlugIn(""); setUrlIn(""); setView("dashboard");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>نظام إدارة الروابط الديناميكية</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setView("dashboard")}>لوحة التحكم</button>
        <button onClick={() => setView("create")} style={{ marginLeft: "10px" }}>+ إنشاء كود جديد</button>
      </div>

      {view === "dashboard" ? (
        <div>
          {slugs.length === 0 ? <p>لا يوجد روابط حالياً</p> : slugs.map(s => (
            <div key={s.id} style={{ border: "1px solid #000", padding: "10px", margin: "10px 0" }}>
              <p>الاسم (Slug): {s.slug}</p>
              <p>الرابط الحالي: {s.pdfUrl}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <input placeholder="اسم الكود (مثلاً file1)" value={slugIn} onChange={e => setSlugIn(e.target.value)} style={{ display: "block", marginBottom: "10px" }} />
          <input placeholder="رابط الملف (PDF URL)" value={urlIn} onChange={e => setUrlIn(e.target.value)} style={{ display: "block", marginBottom: "10px" }} />
          <button onClick={handleCreate}>حفظ وتفعيل</button>
        </div>
      )}
    </div>
  );
}
