let allResponses = [];
let currentSort = 'date';

async function loadResponses() {
    const listContainer = document.getElementById('responsesList');
    listContainer.innerHTML = '<div class="loader">Chargement des données en direct...</div>';
    
    try {
        const response = await fetch('/api/list');
        if (!response.ok) throw new Error("Impossible de récupérer les données");
        
        allResponses = await response.json();
        renderResponses();
        updateStats();
    } catch (error) {
        listContainer.innerHTML = `<div class="no-data">Erreur : ${error.message}<br>Assurez-vous que Vercel KV est configuré.</div>`;
    }
}

function updateStats() {
    document.getElementById('totalCount').innerText = allResponses.length;
}

function sortResponses(criteria) {
    currentSort = criteria;
    if (criteria === 'date') {
        allResponses.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (criteria === 'nom') {
        allResponses.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    }
    renderResponses();
}

function renderResponses() {
    const listContainer = document.getElementById('responsesList');
    if (allResponses.length === 0) {
        listContainer.innerHTML = '<div class="no-data">Aucun diagnostic reçu pour le moment.</div>';
        return;
    }

    listContainer.innerHTML = allResponses.map(resp => {
        const dateStr = new Date(resp.date).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Extraire les catégories pour les badges
        const categories = Array.isArray(resp.categories) ? resp.categories : [resp.categories].filter(Boolean);

        return `
            <div class="response-card">
                <div class="resp-header">
                    <div>
                        <div class="resp-name">${resp.nom || 'Anonyme'}</div>
                        <div>
                            ${categories.map(cat => `<span class="tag">${cat}</span>`).join('')}
                        </div>
                    </div>
                    <div class="resp-date">${dateStr}</div>
                </div>
                <div class="resp-details">
                    <div class="detail-item">
                        <span class="detail-label">Contact</span>
                        <span class="detail-val">${resp.tel || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Localisation</span>
                        <span class="detail-val">${resp.ville || '-'}</span>
                    </div>
                    ${resp.alim_allume ? `
                    <div class="detail-item">
                        <span class="detail-label">Alimentation</span>
                        <span class="detail-val">${resp.alim_allume} (Boot: ${resp.alim_boot})</span>
                    </div>` : ''}
                    ${resp.son_sortie ? `
                    <div class="detail-item">
                        <span class="detail-label">Son</span>
                        <span class="detail-val">Sortie: ${resp.son_sortie}</span>
                    </div>` : ''}
                    ${resp.touches_all ? `
                    <div class="detail-item">
                        <span class="detail-label">Touches</span>
                        <span class="detail-val">OK: ${resp.touches_all}</span>
                    </div>` : ''}
                    ${resp.display_pb ? `
                    <div class="detail-item">
                        <span class="detail-label">Display</span>
                        <span class="detail-val">${resp.display_pb}</span>
                    </div>` : ''}
                    ${resp.memo_boot ? `
                    <div class="detail-item">
                        <span class="detail-label">Mémoire</span>
                        <span class="detail-val">Boot: ${resp.memo_boot} | Bug: ${resp.memo_bug}</span>
                    </div>` : ''}
                    ${resp.autre_description ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <span class="detail-label">Autre problème</span>
                        <span class="detail-val">${resp.autre_description}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Initial load
loadResponses();
