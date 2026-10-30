// Optional static file server (e.g. for a VPS / Cloud Run). The apps do NOT need it:
// all data lives in Firestore, so you can host /dist on Firebase Hosting, Netlify,
// Vercel or Cloudflare Pages instead. Run `npm run build` first.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(express.static(dist, { index: 'index.html', extensions: ['html'] }));
app.get('/pos', (_req, res) => res.sendFile(path.join(dist, 'pos.html')));
app.get('/manager', (_req, res) => res.sendFile(path.join(dist, 'manager.html')));
app.get('/sw.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'sw.js'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`GIVA apps served on port ${PORT}`));
