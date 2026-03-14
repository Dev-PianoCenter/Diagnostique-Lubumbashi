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
    
    const { submissionId, updates, password } = request.body;

    if (password !== 'longola') {
      await client.disconnect();
      return response.status(401).json({ error: "Mot de passe incorrect." });
    }

    // Récupérer toutes les réponses
    const responses = await client.lRange('responses', 0, -1);
    let updated = false;
    let oldJson = null;
    let newJson = null;

    for (const resStr of responses) {
      const res = JSON.parse(resStr);
      if (res.id === submissionId) {
        oldJson = resStr;
        const updatedRes = { ...res, ...updates };
        newJson = JSON.stringify(updatedRes);
        updated = true;
        break;
      }
    }

    if (updated && oldJson && newJson) {
      // Pour mettre à jour dans une liste Redis, on peut utiliser LREM puis LPUSH/RPUSH 
      // ou plus simplement LSET si on connaissait l'index. 
      // Ici on va faire LREM et LPUSH pour garder l'ordre approximatif ou juste s'assurer que c'est mis à jour.
      await client.lRem('responses', 1, oldJson);
      await client.lPush('responses', newJson); // On le remet au début
      
      await client.disconnect();
      return response.status(200).json({ success: true, message: "Entrée mise à jour." });
    }

    await client.disconnect();
    return response.status(404).json({ error: "Entrée non trouvée." });

  } catch (error) {
    console.error('Erreur Redis:', error);
    return response.status(500).json({ error: 'Erreur lors de la mise à jour : ' + error.message });
  }
}
