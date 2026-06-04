import { deleteSubmission, clearAllSubmissions } from './_notion.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { action, submission, password } = request.body;

    if (password !== 'longola') {
      return response.status(401).json({ error: "Mot de passe incorrect." });
    }

    if (action === 'clearAll') {
      await clearAllSubmissions();
      return response.status(200).json({ success: true, message: "Toutes les données ont été effacées." });
    }

    if (action === 'deleteSingle' && submission && submission.id) {
      await deleteSubmission(submission.id);
      return response.status(200).json({ success: true, message: "Entrée supprimée." });
    }

    return response.status(400).json({ error: "Action non valide." });

  } catch (error) {
    console.error('Erreur Notion:', error);
    return response.status(500).json({ error: 'Erreur lors de la suppression : ' + error.message });
  }
}
