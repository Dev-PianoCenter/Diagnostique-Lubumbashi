import { updateSubmission } from './_notion.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { submissionId, updates, password } = request.body;

    if (password !== 'longola') {
      return response.status(401).json({ error: "Mot de passe incorrect." });
    }

    await updateSubmission(submissionId, updates);
    return response.status(200).json({ success: true, message: "Entrée mise à jour." });

  } catch (error) {
    console.error('Erreur Notion:', error);
    return response.status(500).json({ error: 'Erreur lors de la mise à jour : ' + error.message });
  }
}
