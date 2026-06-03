import { createClient } from 'redis';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  const client = createClient({
    url: process.env.NOUVEAU_REDIS_URL || process.env.REDIS_URL
  });

  client.on('error', err => console.error('Redis Client Error', err));

  try {
    await client.connect();
    
    const responses = await client.lRange('responses', 0, -1);
    
    // On parse chaque ligne pour retourner de vrais objets JSON
    const parsed = responses.map(res => JSON.parse(res));
    
    await client.disconnect();
    return response.status(200).json(parsed);
  } catch (error) {
    console.error('Erreur Redis:', error);
    return response.status(500).json({ error: 'Erreur lors de la récupération : ' + error.message });
  }
}
