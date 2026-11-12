/**
 * PROVASEK.XYZ - Interactive Application Logic
 * Including: Dynamic Grid, Live Search, Particles, Terminal & Konami Code
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. CANVAS PARTICLE STARFIELD
       ============================================================ */
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = Math.min(65, Math.floor((width * height) / 18000));
        const maxDist = 120;
        const mouse = { x: -1000, y: -1000, radius: 140 };

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.45;
                this.vy = (Math.random() - 0.5) * 0.45;
                this.radius = Math.random() * 1.5 + 0.8;
                this.alpha = Math.random() * 0.5 + 0.2;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0) this.x = width;
                else if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                else if (this.y > height) this.y = 0;

                // Mouse interaction
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x -= (dx / dist) * force * 1.2;
                    this.y -= (dy / dist) * force * 1.2;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(165, 180, 252, ${this.alpha})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Connect lines
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.18;
                        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        }
        animate();
    }


    /* ============================================================
       2. PROJECTS GRID, SEARCH & CATEGORY FILTERING
       ============================================================ */
    const gridContainer = document.getElementById('projects-grid');
    const filterButtons = document.querySelectorAll('.tab-btn');
    const projectCountEl = document.getElementById('project-count');
    const searchInput = document.getElementById('project-search');
    const searchClearBtn = document.getElementById('search-clear');

    let currentFilter = 'all';
    let currentSearch = '';

    function renderProjects() {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        const filtered = PROJECTS.filter(project => {
            // Category check
            const matchCategory = (currentFilter === 'all') || (project.category === currentFilter);
            if (!matchCategory) return false;

            // Search query check
            if (!currentSearch) return true;
            const query = currentSearch.toLowerCase();
            const inTitle = project.title.toLowerCase().includes(query);
            const inDesc = project.description.toLowerCase().includes(query);
            const inTags = project.tags.some(t => t.toLowerCase().includes(query));
            return inTitle || inDesc || inTags;
        });

        if (projectCountEl) {
            projectCountEl.textContent = `${filtered.length} ${getNoun(filtered.length, 'projekt', 'projekty', 'projektů')}`;
        }

        if (filtered.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
                    <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Žádný projekt neodpovídá hledání</p>
                    <p style="font-size: 0.9rem;">Zkus jiný výraz nebo přepni kategorii.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(project => {
            const card = document.createElement('article');
            card.className = `project-card ${project.featured ? 'featured' : ''}`;

            let badgeClass = 'badge-standard';
            if (project.badgeType === 'featured') badgeClass = 'badge-featured';
            else if (project.badgeType === 'ai') badgeClass = 'badge-ai';

            const tagsHtml = project.tags
                .map(t => `<span class="tag">${t}</span>`)
                .join('');

            let actionsHtml = '';
            if (project.playUrl) {
                actionsHtml += `
                    <a href="${project.playUrl}" class="action-btn action-play">
                        <span>▶ Spustit</span>
                    </a>
                `;
            }
            if (project.githubUrl) {
                actionsHtml += `
                    <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="action-btn action-github">
                        <span>GitHub ↗</span>
                    </a>
                `;
            }

            card.innerHTML = `
                <div>
                    <div class="card-top">
                        <div class="card-icon-wrapper">
                            <span>${project.icon || '🚀'}</span>
                        </div>
                        <span class="badge ${badgeClass}">${project.badge || 'Projekt'}</span>
                    </div>
                    <h3 class="card-title">${project.title}</h3>
                    <p class="card-desc">${project.description}</p>
                    <div class="tags-list">${tagsHtml}</div>
                </div>
                <div class="card-actions">
                    ${actionsHtml}
                </div>
            `;

            gridContainer.appendChild(card);
        });
    }

    function getNoun(number, one, few, many) {
        if (number === 1) return one;
        if (number >= 2 && number <= 4) return few;
        return many;
    }

    // Filter tab buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderProjects();
        });
    });

    // Real-time search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            if (searchClearBtn) {
                searchClearBtn.style.display = currentSearch ? 'block' : 'none';
            }
            renderProjects();
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearch = '';
            searchClearBtn.style.display = 'none';
            searchInput.focus();
            renderProjects();
        });
    }

    renderProjects();


    /* ============================================================
       3. 1-CLICK COPY TO CLIPBOARD
       ============================================================ */
    const toast = document.getElementById('copy-toast');
    let toastTimeout = null;

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const textToCopy = btn.getAttribute('data-copy');
            if (!textToCopy) return;

            try {
                await navigator.clipboard.writeText(textToCopy);
                showToast(`✓ Zkopírováno: ${textToCopy}`);
            } catch (err) {
                // Fallback
                const tempInput = document.createElement('input');
                tempInput.value = textToCopy;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showToast(`✓ Zkopírováno: ${textToCopy}`);
            }
        });
    });


    /* ============================================================
       4. INTERACTIVE DEVELOPER TERMINAL (CLI)
       ============================================================ */
    const termLauncher = document.getElementById('terminal-launcher');
    const termBackdrop = document.getElementById('terminal-modal');
    const termCloseBtn = document.getElementById('terminal-close-btn');
    const termBody = document.getElementById('terminal-body');
    const termInput = document.getElementById('terminal-input');

    const cmdHistory = [];
    let historyIdx = -1;

    function openTerminal() {
        if (!termBackdrop) return;
        termBackdrop.classList.add('open');
        if (termInput) {
            setTimeout(() => termInput.focus(), 150);
        }
    }

    function closeTerminal() {
        if (!termBackdrop) return;
        termBackdrop.classList.remove('open');
    }

    if (termLauncher) termLauncher.addEventListener('click', openTerminal);
    if (termCloseBtn) termCloseBtn.addEventListener('click', closeTerminal);
    if (termBackdrop) {
        termBackdrop.addEventListener('click', (e) => {
            if (e.target === termBackdrop) closeTerminal();
        });
    }

    // Shortcut: Backquote `~` or Ctrl+K to open terminal
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '`' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) {
            e.preventDefault();
            if (termBackdrop.classList.contains('open')) closeTerminal();
            else openTerminal();
        }
        if (e.key === 'Escape' && termBackdrop && termBackdrop.classList.contains('open')) {
            closeTerminal();
        }
    });

    function appendTermLine(html, type = 'output') {
        if (!termBody) return;
        const line = document.createElement('div');
        line.className = `term-line term-${type}`;
        line.innerHTML = html;
        termBody.appendChild(line);
        termBody.scrollTop = termBody.scrollHeight;
    }

    function executeCommand(raw) {
        const cmd = raw.trim().toLowerCase();
        if (!cmd) return;

        appendTermLine(`<span class="term-prompt">provasek@web:~$</span> <span class="term-cmd">${escapeHtml(raw)}</span>`, 'cmd');

        const parts = cmd.split(' ');
        const main = parts[0];
        const arg = parts.slice(1).join(' ');

        switch (main) {
            case 'help':
                appendTermLine(`
                    <strong>Dostupné příkazy:</strong><br>
                    • <span class="term-accent">projects</span> (nebo <span class="term-accent">ls</span>) - Vypíše všechny projekty<br>
                    • <span class="term-accent">play &lt;id&gt;</span> - Spustí projekt (např. <em>play jarvis</em>, <em>play polytropia</em>)<br>
                    • <span class="term-accent">about</span> - Zobrazí informace o vývojáři<br>
                    • <span class="term-accent">skills</span> - Vypíše technologický stack<br>
                    • <span class="term-accent">contact</span> - Kontaktní údaje a sítě<br>
                    • <span class="term-accent">whoami</span> - Kdo jsi ty?<br>
                    • <span class="term-accent">date</span> - Aktuální čas a datum<br>
                    • <span class="term-accent">matrix</span> - Přepne Matrix zelené téma<br>
                    • <span class="term-accent">clear</span> - Vyčistí obrazovku konzole<br>
                    • <span class="term-accent">exit</span> - Zavře terminál
                `, 'output');
                break;

            case 'ls':
            case 'projects':
                let listHtml = '<strong>Katalog projektů provasek.xyz:</strong><br>';
                PROJECTS.forEach(p => {
                    const link = p.playUrl ? `[ <a href="${p.playUrl}" class="term-link">SPUSTIT</a> ]` : `[ ${p.category} ]`;
                    listHtml += `• <strong>${p.id}</strong> - ${p.title} ${link}<br>`;
                });
                listHtml += `<br><small>Tip: Zadej např. <em>play polytropia</em> pro okamžité spuštění.</small>`;
                appendTermLine(listHtml, 'output');
                break;

            case 'play':
            case 'start':
            case 'open':
                if (!arg) {
                    appendTermLine('Použití: play &lt;id-projektu&gt; (např. <em>play jarvis</em> nebo <em>play polytropia</em>)', 'output');
                    break;
                }
                const found = PROJECTS.find(p => p.id === arg || p.id.includes(arg));
                if (found && found.playUrl) {
                    appendTermLine(`🚀 Spouštím ${found.title}... Přesměrovávám na ${found.playUrl}`, 'success');
                    setTimeout(() => {
                        window.location.href = found.playUrl;
                    }, 800);
                } else if (found) {
                    appendTermLine(`Projekt <em>${found.title}</em> zatím nemá webový build. Repozitář: ${found.githubUrl || 'N/A'}`, 'output');
                } else {
                    appendTermLine(`Projekt '${escapeHtml(arg)}' nebyl nalezen. Napiš <em>projects</em> pro seznam.`, 'output');
                }
                break;

            case 'about':
                appendTermLine(`
                    <strong>provasek</strong>: Vývojář & herní tvůrce.<br>
                    Zaměření na HTML5 hry, 4X tahové strategie, Machine Learning (MLP, NLP) a moderní webové UI/HUD.
                `, 'output');
                break;

            case 'skills':
                appendTermLine(`
                    🎮 <strong>Frontend & Hry:</strong> JavaScript, Phaser 3, HTML5 Canvas, Web Audio API, Modern CSS<br>
                    🐍 <strong>Backend:</strong> Python 3, FastAPI, Flask, Asynchronní kód<br>
                    🤖 <strong>AI & Data:</strong> PyTorch, MLP neuronové sítě, NLP, Google Gemini API<br>
                    🛠️ <strong>Nástroje:</strong> Git, GitHub Pages & Actions, VS Code, Linux
                `, 'output');
                break;

            case 'contact':
                appendTermLine(`
                    💻 <strong>GitHub:</strong> <a href="https://github.com/provasek" target="_blank" class="term-link">github.com/provasek</a><br>
                    ✉️ <strong>Email:</strong> kontakt@provasek.xyz<br>
                    💬 <strong>Discord:</strong> @provasek
                `, 'output');
                break;

            case 'whoami':
                appendTermLine('visitor@provasek.xyz // Hledač skvělých projektů a her.', 'output');
                break;

            case 'date':
                appendTermLine(new Date().toLocaleString('cs-CZ'), 'output');
                break;

            case 'matrix':
                document.body.classList.toggle('crt-mode');
                const isCrt = document.body.classList.contains('crt-mode');
                appendTermLine(isCrt ? '🟢 Matrix / CRT režim aktivován!' : '⚪ Nominální režim obnoven.', 'success');
                break;

            case 'clear':
                termBody.innerHTML = '';
                break;

            case 'exit':
            case 'close':
            case 'quit':
                closeTerminal();
                break;

            default:
                appendTermLine(`Příkaz '${escapeHtml(main)}' nebyl rozpoznán. Napiš <span class="term-accent">help</span> pro seznam příkazů.`, 'output');
        }
    }

    if (termInput) {
        termInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = termInput.value;
                if (val.trim()) {
                    cmdHistory.push(val);
                    historyIdx = cmdHistory.length;
                    executeCommand(val);
                    termInput.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIdx > 0) {
                    historyIdx--;
                    termInput.value = cmdHistory[historyIdx] || '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIdx < cmdHistory.length - 1) {
                    historyIdx++;
                    termInput.value = cmdHistory[historyIdx] || '';
                } else {
                    historyIdx = cmdHistory.length;
                    termInput.value = '';
                }
            }
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }


    /* ============================================================
       5. KONAMI CODE EASTER EGG (↑ ↑ ↓ ↓ ← → ← → B A)
       ============================================================ */
    const konamiSequence = [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ];
    let konamiIdx = 0;
    const konamiBanner = document.getElementById('konami-banner');
    const konamiCloseBtn = document.getElementById('konami-close-btn');

    function playRetroFanfare() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C, E, G, C5, E5, G5
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

                gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + i * 0.08);
                osc.stop(ctx.currentTime + i * 0.08 + 0.16);
            });
        } catch (e) {
            console.log("Audio fanfare error:", e);
        }
    }

    window.addEventListener('keydown', (e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        const expected = konamiSequence[konamiIdx].length === 1 
            ? konamiSequence[konamiIdx].toLowerCase() 
            : konamiSequence[konamiIdx];

        if (key === expected) {
            konamiIdx++;
            if (konamiIdx === konamiSequence.length) {
                konamiIdx = 0;
                activateKonamiEasterEgg();
            }
        } else {
            konamiIdx = 0;
        }
    });

    function activateKonamiEasterEgg() {
        document.body.classList.toggle('crt-mode');
        playRetroFanfare();

        if (konamiBanner) {
            konamiBanner.classList.add('active');
            setTimeout(() => {
                konamiBanner.classList.remove('active');
            }, 8000);
        }
    }

    if (konamiCloseBtn) {
        konamiCloseBtn.addEventListener('click', () => {
            document.body.classList.remove('crt-mode');
            if (konamiBanner) konamiBanner.classList.remove('active');
        });
    }

});
