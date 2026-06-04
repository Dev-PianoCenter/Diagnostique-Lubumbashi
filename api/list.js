import { getAllSubmissions } from './_notion.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const submissions = await getAllSubmissions();
    return response.status(200).json(submissions);
  } catch (error) {
    console.error('Erreur Notion:', error);
    return response.status(500).json({ error: 'Erreur lors de la récupération : ' + error.message });
  }
}
