// Publica gifs/ junto a la app: chellengeux.vercel.app/gifs/
import { cpSync, existsSync } from 'node:fs';
if (existsSync('gifs')) cpSync('gifs', 'dist/gifs', { recursive: true });
