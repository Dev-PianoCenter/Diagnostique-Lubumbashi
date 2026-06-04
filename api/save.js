import { saveSubmission } from './_notion.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const data = request.body;
    const submission = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      date: new Date().toISOString(),
      ...data
    };

    await saveSubmission(submission);
    
    return response.status(200).json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Erreur Notion:', error);
    return response.status(500).json({ error: 'Erreur lors de la sauvegarde : ' + error.message });
  }
}
