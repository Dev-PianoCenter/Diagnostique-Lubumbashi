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

function nextStep() {
    if (stepsSequence[currentStepIndex] === 'step-categories') {
        updateStepsSequence();
        const selected = document.querySelectorAll('input[name="categories"]:checked');
        if (selected.length === 0) {
            alert("Veuillez sélectionner au moins une catégorie.");
            return;
        }
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
