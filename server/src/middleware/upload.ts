import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../env.js';

// Stockage EN MÉMOIRE : on inspecte le type MIME réel avant d'écrire sur disque
// sous un nom interne aléatoire. Un seul fichier par requête ; taille plafonnée.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});
