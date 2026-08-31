import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const WEB = path.join(__dirname, 'publico');

app.use(express.static(WEB, { maxAge: '1h' }));
app.get('/salud', (_req, res) => res.json({ ok: true, servicio: 'AsesorIA' }));
app.get('*', (_req, res) => res.sendFile(path.join(WEB, 'index.html')));

app.listen(PORT, () => console.log(`AsesorIA en el puerto ${PORT}`));
