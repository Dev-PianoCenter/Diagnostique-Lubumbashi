// ============================================================
//  _github.js — Couche d'accès aux données via l'API GitHub
//  Repo : Dev-PianoCenter/Diagnostique-Lubumbashi
//  Fichier cible : data/submissions.json
// ============================================================

const GITHUB_API = 'https://api.github.com';
const REPO       = process.env.GITHUB_REPO   || 'Dev-PianoCenter/Diagnostique-Lubumbashi';
const BRANCH     = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH  = 'data/submissions.json';

// ── Helpers ─────────────────────────────────────────────────

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Variable d'environnement GITHUB_TOKEN manquante. Veuillez la configurer sur Vercel.");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept:        'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Récupère le contenu actuel du fichier JSON depuis GitHub.
 * Retourne { data: Array, sha: string }
 */
async function fetchFile() {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (res.status === 404) {
    // Le fichier n'existe pas encore → on retourne un tableau vide sans SHA
    return { data: [], sha: null };
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(`GitHub API (GET) erreur ${res.status}: ${body.message}`);
  }

  const json   = await res.json();
  const sha    = json.sha;
  const raw    = Buffer.from(json.content, 'base64').toString('utf-8');
  const data   = JSON.parse(raw);

  return { data, sha };
}

/**
 * Écrit/met à jour le fichier JSON sur GitHub avec un commit.
 * @param {Array}  data    - Le tableau complet à écrire
 * @param {string} sha     - Le SHA courant (null si création)
 * @param {string} message - Message de commit
 */
async function pushFile(data, sha, message = 'update: submissions.json') {
  const url     = `${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const body = {
    message,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method:  'PUT',
    headers: getHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API (PUT) erreur ${res.status}: ${err.message}`);
  }
}

// ── API publique ─────────────────────────────────────────────

/**
 * Récupère toutes les soumissions (triées du plus récent au plus ancien).
 * @returns {Promise<Array>}
 */
export async function getAllSubmissions() {
  const { data } = await fetchFile();
  return data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Enregistre une nouvelle soumission dans le fichier JSON.
 * @param {Object} submission
 */
export async function saveSubmission(submission) {
  const { data, sha } = await fetchFile();
  data.push(submission);
  await pushFile(
    data,
    sha,
    `feat: nouvelle soumission ${submission.id} (${submission.nom || 'anonyme'})`
  );
}

/**
 * Met à jour les champs d'une soumission existante par son ID.
 * @param {string} submissionId
 * @param {Object} updates
 */
export async function updateSubmission(submissionId, updates) {
  const { data, sha } = await fetchFile();
  const index = data.findIndex(s => s.id === submissionId);

  if (index === -1) {
    throw new Error(`Aucune soumission trouvée avec l'ID : ${submissionId}`);
  }

  data[index] = { ...data[index], ...updates };
  await pushFile(data, sha, `fix: mise à jour soumission ${submissionId}`);
}

/**
 * Supprime une soumission par son ID.
 * @param {string} submissionId
 */
export async function deleteSubmission(submissionId) {
  const { data, sha } = await fetchFile();
  const filtered = data.filter(s => s.id !== submissionId);

  if (filtered.length === data.length) {
    throw new Error(`Aucune soumission trouvée avec l'ID : ${submissionId}`);
  }

  await pushFile(filtered, sha, `fix: suppression soumission ${submissionId}`);
}

/**
 * Efface toutes les soumissions (réinitialise le fichier JSON à []).
 */
export async function clearAllSubmissions() {
  const { sha } = await fetchFile();
  await pushFile([], sha, 'fix: effacement de toutes les soumissions');
}
