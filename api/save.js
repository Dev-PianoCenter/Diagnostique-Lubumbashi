import { createClient } from 'redis';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée' });
  }

  const client = createClient({
    url: process.env.REDIS_URL
  });

  client.on('error', err => console.error('Redis Client Error', err));

  try {
    await client.connect();
    
    const data = request.body;
    const submission = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      date: new Date().toISOString(),
      ...data
    };

    // On stocke dans une liste nommée 'responses'
    await client.lPush('responses', JSON.stringify(submission));
    
    await client.disconnect();
    return response.status(200).json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Erreur Redis:', error);
    return response.status(500).json({ error: 'Erreur lors de la sauvegarde : ' + error.message });
  }
}
