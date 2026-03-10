import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // On récupère toutes les réponses de la liste 'responses'
    // LRANGE responses 0 -1 (tous les éléments)
    const responses = await kv.lrange('responses', 0, -1);
    
    return response.status(200).json(responses);
  } catch (error) {
    console.error('Erreur KV:', error);
    return response.status(500).json({ error: 'Erreur lors de la récupération : ' + error.message });
  }
}
