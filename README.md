# provasek.xyz - Portfolio & Herní Rozcestník

Osobní webové portfolio a rozcestník projektů hostovaný na **GitHub Pages** pro doménu `provasek.xyz`.

---

## 🚀 Jak přidat nový projekt

1. **Vytvoř novou složku pro projekt:**
   ```bash
   mkdir projects/muj-novy-projekt
   ```
2. **Nahraj do ní soubory projektu** (např. `index.html`, `style.css`, skripty, obrázky).
3. **Zaregistruj projekt v `projects.js`:**
   Otevři [projects.js](file:///c:/Users/prova/OneDrive/Vibe/Gemini/Web/projects.js) a přidej nový objekt do pole `PROJECTS`:
   ```javascript
   {
       id: "muj-novy-projekt",
       title: "Můj nový projekt",
       category: "games", // nebo "ai", "web"
       badge: "Nové",
       badgeType: "standard",
       icon: "🕹️",
       description: "Krátký popis toho, o co jde...",
       tags: ["JavaScript", "HTML5"],
       playUrl: "/projects/muj-novy-projekt/",
       githubUrl: "https://github.com/provasek/repozitar",
       featured: false
   }
   ```
4. **Odešli změny na GitHub:**
   ```bash
   git add .
   git commit -m "Přidán projekt muj-novy-projekt"
   git push
   ```
   GitHub Pages automaticky nasadí web a projekt bude ihned dostupný na `provasek.xyz/projects/muj-novy-projekt/`!

---

## 📂 Struktura repozitáře

- `index.html` – Hlavní vstupní stránka (portfolio hub)
- `style.css` – Moderní tmavý minimalistický styl
- `projects.js` – Datový seznam projektů a konfigurace
- `app.js` – Logika pro dynamické vykreslování karet a filtrování
- `CNAME` – Nastavení vlastní domény (`provasek.xyz`)
- `projects/` – Jednotlivé projekty s vlastními podsložkami
  - `projects/polytropia/` – 4X strategická hra Polytropia: Civilizace Hvězd
  - `projects/hra/` – Zkratka / alias pro hru
  - `projects/jarvis/` – J.A.R.V.I.S. Mark VII Neural Interface (futuristický HUD asistent)
