let currentStepIndex = 0;
let stepsSequence = ['step-categories'];

const form = document.getElementById('diagnosticForm');
const progressBar = document.getElementById('progress');

// Gérer la sélection visuelle des cartes options
document.querySelectorAll('.option-card input').forEach(input => {
    input.addEventListener('change', () => {
        updateSelectedClasses();
    });
});

function updateSelectedClasses() {
    document.querySelectorAll('.option-card').forEach(card => {
        const input = card.querySelector('input');
        if (input.checked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Initialiser les classes au chargement (pour le cas où le navigateur mémorise des choix)
updateSelectedClasses();

function updateStepsSequence() {
    // Récupérer les catégories cochées
    const selectedCategories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
        .map(input => input.value);
    
    // Construire la séquence : Catégories -> [Détails Pannes] -> Identification -> Success
    stepsSequence = ['step-categories'];
    
    if (selectedCategories.includes('alimentation')) stepsSequence.push('step-alimentation');
    if (selectedCategories.includes('son')) stepsSequence.push('step-son');
    if (selectedCategories.includes('touches')) stepsSequence.push('step-touches');
    if (selectedCategories.includes('diapason')) stepsSequence.push('step-diapason');
    if (selectedCategories.includes('affichage')) stepsSequence.push('step-affichage');
    if (selectedCategories.includes('memoire')) stepsSequence.push('step-memoire');
    if (selectedCategories.includes('autre')) stepsSequence.push('step-autre');
    
    stepsSequence.push('step-identification');
    stepsSequence.push('step-success');
}

function showStep(id) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Update progress
    const progress = ((stepsSequence.indexOf(id)) / (stepsSequence.length - 1)) * 100;
    progressBar.style.width = `${progress}%`;
    
    window.scrollTo(0, 0);
}

function validateStep(stepId) {
    const step = document.getElementById(stepId);
    if (!step) return true;

    // 1. Cas particulier pour l'étape des catégories
    if (stepId === 'step-categories') {
        const selected = step.querySelectorAll('input[name="categories"]:checked');
        if (selected.length === 0) {
            alert("Veuillez sélectionner au moins une catégorie.");
            return false;
        }
        return true;
    }

    // 2. Validation des groupes de boutons radio (input-group)
    const radioGroups = {};
    step.querySelectorAll('input[type="radio"]').forEach(radio => {
        radioGroups[radio.name] = true;
    });

    for (const groupName in radioGroups) {
        const checked = step.querySelector(`input[name="${groupName}"]:checked`);
        if (!checked) {
            alert("Veuillez répondre à toutes les questions de cette étape.");
            return false;
        }
    }

    // 3. Validation des Textareas (ex: étape 'autre')
    const textareas = step.querySelectorAll('textarea');
    for (const tex of textareas) {
        if (tex.value.trim() === "") {
            alert("Veuillez remplir le champ de description.");
            return false;
        }
    }

    // 4. Validation des inputs requis (ex: étape 'identification')
    const requiredInputs = step.querySelectorAll('input[required]');
    for (const input of requiredInputs) {
        if (input.value.trim() === "") {
            alert("Veuillez remplir tous les champs obligatoires.");
            return false;
        }
    }

    return true;
}

function nextStep() {
    const currentStepId = stepsSequence[currentStepIndex];
    
    // Valider l'étape actuelle avant de passer à la suivante
    if (!validateStep(currentStepId)) {
        return;
    }

    if (currentStepId === 'step-categories') {
        updateStepsSequence();
    }
    
    if (currentStepIndex < stepsSequence.length - 1) {
        currentStepIndex++;
        showStep(stepsSequence[currentStepIndex]);
    }
}

function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        showStep(stepsSequence[currentStepIndex]);
    }
}

// Soumission du formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        if (data[key]) {
            if (!Array.isArray(data[key])) data[key] = [data[key]];
            data[key].push(value);
        } else {
            data[key] = value;
        }
    });

    // Indiquer le chargement
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Envoi en cours...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            nextStep(); // Va vers 'step-success'
        } else {
            const err = await response.json();
            throw new Error(err.error || "Erreur lors de l'envoi");
        }
    } catch (error) {
        alert("Oups ! " + error.message);
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});
