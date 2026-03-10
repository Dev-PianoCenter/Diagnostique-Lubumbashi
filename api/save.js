import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const data = request.body;
    // On ajoute un ID unique et un horodatage
    const submission = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      date: new Date().toISOString(),
      ...data
    };

    // On stocke dans une liste Redis nommée 'responses'
    await kv.lpush('responses', submission);

    return response.status(200).json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Erreur KV:', error);
    return response.status(500).json({ error: 'Erreur lors de la sauvegarde : ' + error.message });
  }
}
