import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

app.use(express.static(DIST, { maxAge: '1h' }));
app.get('/salud', (_req, res) => res.json({ ok: true, servicio: 'AsesorIA' }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => console.log(`AsesorIA en el puerto ${PORT}`));
