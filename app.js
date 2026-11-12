/**
 * Main application script for provasek.xyz
 */

document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('projects-grid');
    const filterButtons = document.querySelectorAll('.tab-btn');
    const projectCountEl = document.getElementById('project-count');

    let currentFilter = 'all';

    function renderProjects(filter = 'all') {
        gridContainer.innerHTML = '';

        const filtered = PROJECTS.filter(project => {
            if (filter === 'all') return true;
            return project.category === filter;
        });

        if (projectCountEl) {
            projectCountEl.textContent = `${filtered.length} ${getNoun(filtered.length, 'projekt', 'projekty', 'projektů')}`;
        }

        if (filtered.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
                    <p>V této kategorii zatím není žádný projekt.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(project => {
            const card = document.createElement('article');
            card.className = `project-card ${project.featured ? 'featured' : ''}`;

            // Badge class
            let badgeClass = 'badge-standard';
            if (project.badgeType === 'featured') badgeClass = 'badge-featured';
            else if (project.badgeType === 'ai') badgeClass = 'badge-ai';

            // Tags HTML
            const tagsHtml = project.tags
                .map(t => `<span class="tag">${t}</span>`)
                .join('');

            // Action Buttons HTML
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

    // Filter tab listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderProjects(currentFilter);
        });
    });

    // Initial render
    renderProjects('all');
});
