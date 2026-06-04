import { Client } from '@notionhq/client';

let isSchemaInitialized = false;

// Initialiser le client Notion
export function getNotionClient() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token || !databaseId) {
    throw new Error("Variables d'environnement Notion manquantes (NOTION_TOKEN, NOTION_DATABASE_ID). Veuillez les configurer.");
  }

  const notion = new Client({ auth: token });
  return { notion, databaseId };
}

// Initialisation automatique et dynamique du schéma de la base de données Notion
export async function initializeDatabaseSchema(notion, databaseId) {
  if (isSchemaInitialized) return;

  try {
    console.log("Vérification du schéma de la base de données Notion...");
    const db = await notion.databases.retrieve({ database_id: databaseId });

    // 1. Trouver la propriété de type 'title' (clé primaire obligatoire dans Notion)
    const titlePropName = Object.keys(db.properties).find(
      (key) => db.properties[key].type === 'title'
    );

    const updates = {};

    // Si la propriété titre n'est pas nommée 'id', on la renomme en 'id'
    if (titlePropName && titlePropName !== 'id') {
      console.log(`Renommage de la clé primaire '${titlePropName}' en 'id'...`);
      updates[titlePropName] = { name: 'id' };
    }

    // 2. Définir les colonnes attendues avec leurs types respectifs
    const expectedProperties = {
      date: { date: {} },
      nom: { rich_text: {} },
      tel: { rich_text: {} },
      ville: { rich_text: {} },
      marque: { rich_text: {} },
      modele: { rich_text: {} },
      categories: { multi_select: {} },
      alim_allume: { rich_text: {} },
      alim_auto_off: { rich_text: {} },
      son_sortie: { rich_text: {} },
      son_volume: { rich_text: {} },
      touches_all: { rich_text: {} },
      touches_power: { rich_text: {} },
      touches_commandes: { rich_text: {} },
      dia_changement: { rich_text: {} },
      display_pb: { rich_text: {} },
      memo_boot: { rich_text: {} },
      memo_bug: { rich_text: {} },
      autre_description: { rich_text: {} },
    };

    // Ajouter uniquement les propriétés manquantes
    for (const [propName, propConfig] of Object.entries(expectedProperties)) {
      if (!db.properties[propName]) {
        console.log(`Ajout de la colonne manquante '${propName}'...`);
        updates[propName] = propConfig;
      }
    }

    // Appliquer les mises à jour si nécessaire
    if (Object.keys(updates).length > 0) {
      await notion.databases.update({
        database_id: databaseId,
        properties: updates,
      });
      console.log("Schéma de la base de données Notion configuré avec succès !");
    } else {
      console.log("Le schéma de la base de données Notion est déjà à jour.");
    }

    isSchemaInitialized = true;
  } catch (error) {
    console.error("Erreur lors de l'initialisation automatique du schéma Notion :", error);
    // On ne bloque pas l'exécution pour permettre au reste du code de tenter de s'exécuter
  }
}

// Convertir une page Notion en objet de soumission standard
function mapNotionPageToSubmission(page) {
  const props = page.properties;
  const submission = {};

  // Extraction de l'ID (clé primaire title)
  submission.id = props.id?.title?.[0]?.plain_text || '';

  // Extraction de la Date
  submission.date = props.date?.date?.start || '';

  // Extraction des Catégories (multi-select)
  submission.categories = props.categories?.multi_select?.map((opt) => opt.name) || [];

  // Extraction des autres champs au format Rich Text
  const richTextKeys = [
    'nom', 'tel', 'ville', 'marque', 'modele',
    'alim_allume', 'alim_auto_off', 'son_sortie', 'son_volume',
    'touches_all', 'touches_power', 'touches_commandes',
    'dia_changement', 'display_pb', 'memo_boot', 'memo_bug',
    'autre_description'
  ];

  for (const key of richTextKeys) {
    submission[key] = props[key]?.rich_text?.[0]?.plain_text || '';
  }

  return submission;
}

// Récupérer toutes les soumissions
export async function getAllSubmissions() {
  const { notion, databaseId } = getNotionClient();
  await initializeDatabaseSchema(notion, databaseId);

  let results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return results.map(mapNotionPageToSubmission);
}

// Enregistrer une nouvelle soumission
export async function saveSubmission(submission) {
  const { notion, databaseId } = getNotionClient();
  await initializeDatabaseSchema(notion, databaseId);

  const properties = {
    id: {
      title: [
        {
          text: {
            content: submission.id || '',
          },
        },
      ],
    },
    date: {
      date: {
        start: submission.date || new Date().toISOString(),
      },
    },
  };

  if (submission.categories) {
    const cats = Array.isArray(submission.categories)
      ? submission.categories
      : [submission.categories].filter(Boolean);
    properties.categories = {
      multi_select: cats.map((name) => ({ name })),
    };
  }

  const richTextKeys = [
    'nom', 'tel', 'ville', 'marque', 'modele',
    'alim_allume', 'alim_auto_off', 'son_sortie', 'son_volume',
    'touches_all', 'touches_power', 'touches_commandes',
    'dia_changement', 'display_pb', 'memo_boot', 'memo_bug',
    'autre_description'
  ];

  for (const key of richTextKeys) {
    if (submission[key] !== undefined && submission[key] !== null) {
      properties[key] = {
        rich_text: [
          {
            text: {
              content: String(submission[key]),
            },
          },
        ],
      };
    }
  }

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties,
  });
}

// Mettre à jour une soumission existante
export async function updateSubmission(submissionId, updates) {
  const { notion, databaseId } = getNotionClient();
  await initializeDatabaseSchema(notion, databaseId);

  // Recherche de la page par sa clé primaire 'id'
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'id',
      title: {
        equals: submissionId,
      },
    },
  });

  const page = response.results[0];
  if (!page) {
    throw new Error(`Aucune soumission trouvée dans Notion avec l'ID : ${submissionId}`);
  }

  const properties = {};

  if (updates.categories) {
    const cats = Array.isArray(updates.categories)
      ? updates.categories
      : [updates.categories].filter(Boolean);
    properties.categories = {
      multi_select: cats.map((name) => ({ name })),
    };
  }

  if (updates.date) {
    properties.date = {
      date: {
        start: updates.date,
      },
    };
  }

  const richTextKeys = [
    'nom', 'tel', 'ville', 'marque', 'modele',
    'alim_allume', 'alim_auto_off', 'son_sortie', 'son_volume',
    'touches_all', 'touches_power', 'touches_commandes',
    'dia_changement', 'display_pb', 'memo_boot', 'memo_bug',
    'autre_description'
  ];

  for (const key of richTextKeys) {
    if (updates[key] !== undefined && updates[key] !== null) {
      properties[key] = {
        rich_text: [
          {
            text: {
              content: String(updates[key]),
            },
          },
        ],
      };
    }
  }

  await notion.pages.update({
    page_id: page.id,
    properties: properties,
  });
}

// Supprimer (archiver) une soumission
export async function deleteSubmission(submissionId) {
  const { notion, databaseId } = getNotionClient();
  await initializeDatabaseSchema(notion, databaseId);

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'id',
      title: {
        equals: submissionId,
      },
    },
  });

  const page = response.results[0];
  if (!page) {
    throw new Error(`Aucune soumission trouvée dans Notion avec l'ID : ${submissionId}`);
  }

  await notion.pages.update({
    page_id: page.id,
    archived: true,
  });
}

// Effacer (archiver) toutes les soumissions
export async function clearAllSubmissions() {
  const { notion, databaseId } = getNotionClient();
  await initializeDatabaseSchema(notion, databaseId);

  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
    });

    for (const page of response.results) {
      await notion.pages.update({
        page_id: page.id,
        archived: true,
      });
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }
}
