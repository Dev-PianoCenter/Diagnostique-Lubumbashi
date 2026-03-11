let allResponses = [];
let currentSort = 'date';
let isAsc = false; // Par défaut : récent en haut (desc)
let currentPage = 1;
const itemsPerPage = 5;


async function loadResponses() {
    const listContainer = document.getElementById('responsesList');
    listContainer.innerHTML = '<div class="loader">Chargement des données en direct...</div>';
    
    try {
        const response = await fetch('/api/list');
        if (!response.ok) throw new Error("Impossible de récupérer les données");
        
        allResponses = await response.json();
        currentPage = 1;
        updateStats();
        renderResponses(); // renderResponses appelle déjà renderPagination()

        // Afficher l'indicateur de tri initial (Date ▼)
        const btnDate = document.querySelector("button[onclick*='date']");
        if (btnDate) btnDate.innerText = "Trier par Date ▼";
    } catch (error) {
        listContainer.innerHTML = `<div class="no-data">Erreur : ${error.message}<br>Assurez-vous que Vercel KV est configuré.</div>`;
    }
}

function updateStats() {
    document.getElementById('totalCount').innerText = allResponses.length;
}

function handleDelete(id) {
    const resp = allResponses.find(r => r.id === id);
    if (resp) deleteResponse(resp);
}

async function deleteResponse(submission) {
    if (!confirm("Voulez-vous vraiment supprimer ce diagnostic ?")) return;

    const password = prompt("Veuillez entrer le mot de passe pour confirmer la suppression :");
    if (!password) return;

    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteSingle', submission, password })
        });

        if (response.ok) {
            loadResponses();
        } else {
            const err = await response.json();
            alert("Erreur : " + err.error);
        }
    } catch (error) {
        alert("Erreur lors de la suppression : " + error.message);
    }
}

async function clearAllResponses() {
    if (!confirm("ATTENTION : Voulez-vous vraiment supprimer TOUS les diagnostics ? Cette action est irréversible.")) return;

    const password = prompt("Veuillez entrer le mot de passe pour tout EFFACER :");
    if (!password) return;

    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clearAll', password })
        });

        if (response.ok) {
            loadResponses();
        } else {
            const err = await response.json();
            alert("Erreur : " + err.error);
        }
    } catch (error) {
        alert("Erreur lors de la suppression groupée : " + error.message);
    }
}

function sortResponses(criteria) {
    if (currentSort === criteria) {
        isAsc = !isAsc;
    } else {
        currentSort = criteria;
        isAsc = (criteria === 'nom'); // Date -> desc (false), Nom -> asc (true)
    }

    // Mise à jour visuelle des boutons
    const btnDate = document.querySelector("button[onclick*='date']");
    const btnNom = document.querySelector("button[onclick*='nom']");
    
    if (btnDate) btnDate.innerText = `Trier par Date ${currentSort === 'date' ? (isAsc ? '▲' : '▼') : ''}`;
    if (btnNom) btnNom.innerText = `Trier par Nom ${currentSort === 'nom' ? (isAsc ? '▲' : '▼') : ''}`;

    if (criteria === 'date') {
        allResponses.sort((a, b) => {
            return isAsc ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
        });
    } else if (criteria === 'nom') {
        allResponses.sort((a, b) => {
            const nameA = (a.nom || '').toLowerCase();
            const nameB = (b.nom || '').toLowerCase();
            return isAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
    }
    currentPage = 1;
    renderResponses();
}

function renderResponses() {
    const listContainer = document.getElementById('responsesList');
    if (allResponses.length === 0) {
        listContainer.innerHTML = '<div class="no-data">Aucun diagnostic reçu pour le moment.</div>';
        renderPagination(); // On vide quand même la pagination
        return;
    }

    const totalPages = Math.ceil(allResponses.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = allResponses.slice(startIndex, endIndex);

    // Mapping des libellés avec le texte EXACT du formulaire
    const labels = {
        alim_allume: "Votre appareil s'allume-t-il ?",
        alim_auto_off: "L'appareil s'éteint-il tout seul après un certain temps ?",
        son_sortie: "Le son est-il présent sur :",
        son_volume: "Est-ce que le curseur de volume fonctionne ?",
        touches_all: "Est-ce que toutes les touches fonctionnent ?",
        touches_power: "Certaines touches jouent-elles à une puissance de volume différente des autres ?",
        touches_commandes: "Rencontrez-vous certains problèmes avec les touches des commandes ?",
        dia_changement: "Constatez-vous un changement brusque des gammes pendant que vous jouez ?",
        display_pb: "Avez-vous un problème d'affichage ?",
        memo_boot: "Est-ce que le démarrage de votre appareil s'exécute complètement ?",
        memo_bug: "Est-ce que votre appareil plante/bug pendant son fonctionnement ?",
        autre_description: "Décrivez votre problème en quelques mots :"
    };

    // Mapping des réponses avec le texte EXACT du formulaire pour ne pas résumer
    const valueLabels = {
        alim_allume: { "Oui": "Oui, il s'allume", "Non": "Non, il ne s'allume pas" },
        alim_auto_off: { "Souvent": "Oui, souvent", "Jamais": "Non, je ne l'ai jamais constaté" },
        son_sortie: { "HP": "Les hauts-parleurs intégrés", "Jack": "La sortie jack / baffle externe", "Nulle part": "Le son ne sort nulle part" },
        son_volume: { "Oui": "Oui, ça fonctionne quand j'augmente et que je diminue le volume", "Non": "Non, ça ne fonctionne pas correctement" },
        touches_all: { "Oui": "Oui, elles fonctionnent bien", "Non": "Non, certaines ne fonctionnent pas" },
        touches_power: { "Oui": "Oui, je rencontre ce problème", "Non": "Non, toutes les touches fonctionnent bien" },
        touches_commandes: { "Oui": "Oui, certains boutons ne fonctionnent pas", "Non": "Non, tous mes boutons de commande fonctionnent bien" },
        dia_changement: { "Seulement Pitch": "Oui, les gammes changent d'elles-mêmes", "Seules": "Oui, mais seulement quand je touche le pitch bend", "Non": "Non, je ne rencontre pas ce problème" },
        display_pb: { "Casse": "Oui, mon display est cassé", "Rien": "Oui, mon display n'affiche plus les données", "Flou": "Oui, les données apparaissent floues", "Correct": "Non, l'affichage est correct" },
        memo_boot: { "Complet": "Oui, il s'allume complètement", "Logo": "Non, ça s'arrête sur le logo", "Erreur": "Non, ça affiche un message d'erreur", "Eteint": "Non, ça s'éteint dès que j'enlève le doigt du bouton power", "Blanc": "Non, j'ai un fond blanc lorsque j'allume" },
        memo_bug: { "Oui": "Oui, après un moment d’utilisation", "Non": "Non, il ne plante pas" }
    };

    listContainer.innerHTML = paginatedItems.map(resp => {
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
                    <button class="btn-delete" onclick="handleDelete('${resp.id}')">Supprimer</button>
                </div>

                <div class="resp-body">
                    <!-- BLOC 1 : Identification -->
                    <div class="resp-column-left">
                        <h4 class="resp-block-title">Identification</h4>
                        <div class="resp-name">${resp.nom || 'Anonyme'}</div>
                        <div class="detail-item">
                            <span class="detail-label">Téléphone / WhatsApp</span>
                            <span class="detail-val large">${resp.tel || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Ville / Province</span>
                            <span class="detail-val">${resp.ville || '-'}</span>
                        </div>
                    </div>

                    <!-- BLOC 2 : Réponses par Catégories -->
                    <div>
                        <h4 class="resp-block-title">Détails du diagnostic</h4>
                        <div class="resp-grid-details">
                            ${Object.entries(groups).map(([groupName, fields]) => {
                                const activeFields = Object.entries(fields).filter(([_, val]) => val);
                                if (activeFields.length === 0) return '';
                                
                                return `
                                    <div class="resp-category-card">
                                        <div class="resp-category-title">
                                            ${groupName}
                                        </div>
                                        ${activeFields.map(([key, val]) => {
                                            const displayVal = (valueLabels[key] && valueLabels[key][val]) ? valueLabels[key][val] : val;
                                            return `
                                                <div class="detail-item compact">
                                                    <span class="detail-label small">${labels[key]}</span>
                                                    <span class="detail-val small">${displayVal}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(allResponses.length / itemsPerPage);
    const topContainer = document.getElementById('paginationTop');
    const bottomContainer = document.getElementById('paginationBottom');

    if (totalPages < 1) {
        topContainer.innerHTML = '';
        bottomContainer.innerHTML = '';
        return;
    }

    const html = `
        <button class="pagination-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
            &larr;
        </button>
        <div class="page-info">Page <b>${currentPage}</b> sur <b>${totalPages}</b></div>
        <button class="pagination-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
            &rarr;
        </button>
    `;

    topContainer.innerHTML = html;
    bottomContainer.innerHTML = html;
}

function changePage(delta) {
    currentPage += delta;
    renderResponses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initial load
loadResponses();
