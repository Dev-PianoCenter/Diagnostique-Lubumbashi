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

    // Mapping des libellés avec le texte EXACT du formulaire
    const labels = {
        alim_allume: "Votre appareil s'allume-t-il ?",
        alim_auto_off: "L'appareil s'éteint-il tout seul après un certain temps ?",
        son_sortie: "Le son est-il présent sur :",
        son_volume: "Est-ce que le curseur de volume fonctionne ?",
        touches_all: "Est-ce que toutes les touches fonctionnent ?",
        touches_power: "Certaines touches jouent-elles à une puissance de volume différente des autres ?",
        touches_fonctionnent: "Y a-t-il des touches qui ne fonctionnent pas ?",
        touches_commandes: "Rencontrez-vous certains problèmes avec les touches des commandes ?",
        dia_changement: "Constatez-vous un changement brusque des gammes pendant que vous jouez ?",
        display_pb: "Avez-vous un problème d'affichage ?",
        memo_boot: "Est-ce que le démarrage de votre appareil s'exécute complètement ?",
        memo_bug: "Est-ce que votre appareil plante/bug pendant son fonctionnement ?",
        autre_description: "Décrivez votre problème en quelques mots :"
    };

    listContainer.innerHTML = allResponses.map(resp => {
        const dateStr = new Date(resp.date).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const categories = Array.isArray(resp.categories) ? resp.categories : [resp.categories].filter(Boolean);

        // Groupement des réponses par catégories
        const groups = {
            "Alimentation": { alim_allume: resp.alim_allume, alim_auto_off: resp.alim_auto_off },
            "Son": { son_sortie: resp.son_sortie, son_volume: resp.son_volume },
            "Touches": { 
                touches_all: resp.touches_all, 
                touches_power: resp.touches_power, 
                touches_fonctionnent: resp.touches_fonctionnent,
                touches_commandes: resp.touches_commandes 
            },
            "Diapason": { dia_changement: resp.dia_changement },
            "Affichage": { display_pb: resp.display_pb },
            "Mémoire": { memo_boot: resp.memo_boot, memo_bug: resp.memo_bug },
            "Autre": { autre_description: resp.autre_description }
        };

        return `
            <div class="response-card">
                <div class="resp-header">
                    <div class="resp-date">${dateStr}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px;">
                    <!-- BLOC 1 : Identification -->
                    <div style="border-right: 1px solid var(--border); padding-right: 20px;">
                        <h4 style="color: var(--primary); margin-bottom: 15px; font-size: 0.8rem; text-transform: uppercase;">Bloc 1 : Identification</h4>
                        <div class="resp-name" style="font-size: 1.3rem; margin-bottom: 10px;">${resp.nom || 'Anonyme'}</div>
                        <div class="detail-item">
                            <span class="detail-label">Téléphone / WhatsApp</span>
                            <span class="detail-val" style="font-size: 1.1rem;">${resp.tel || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Ville / Province</span>
                            <span class="detail-val">${resp.ville || '-'}</span>
                        </div>
                    </div>

                    <!-- BLOC 2 : Réponses par Catégories -->
                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 15px; font-size: 0.8rem; text-transform: uppercase;">Bloc 2 : Détails du diagnostic</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            ${Object.entries(groups).map(([groupName, fields]) => {
                                const activeFields = Object.entries(fields).filter(([_, val]) => val);
                                if (activeFields.length === 0) return '';
                                
                                return `
                                    <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                        <div style="font-weight: 800; color: var(--primary); font-size: 0.75rem; margin-bottom: 8px; border-bottom: 1px solid rgba(197,160,89,0.2); padding-bottom: 4px;">
                                            ${groupName.toUpperCase()}
                                        </div>
                                        ${activeFields.map(([key, val]) => `
                                            <div class="detail-item" style="margin-bottom: 8px;">
                                                <span class="detail-label" style="font-size: 0.65rem;">${labels[key]}</span>
                                                <span class="detail-val" style="font-size: 0.85rem;">${val}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Initial load
loadResponses();
