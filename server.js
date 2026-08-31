const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Sirve el build de Vite (dist). Si no existe -- porque el build fallo o no
// llego a ejecutarse -- cae al ultimo build subido a mano (publico), para que
// la web nunca se quede sin servir nada.
const DIST = path.join(__dirname, 'dist');
const RESPALDO = path.join(__dirname, 'publico');
const WEB = fs.existsSync(path.join(DIST, 'index.html')) ? DIST : RESPALDO;

console.log('AsesorIA sirviendo desde: ' + path.basename(WEB));

app.use(express.static(WEB, { maxAge: '1h' }));
app.get('/salud', (req, res) =>
  res.json({ ok: true, servicio: 'AsesorIA', sirviendo: path.basename(WEB) })
);
app.get('*', (req, res) => res.sendFile(path.join(WEB, 'index.html')));

app.listen(PORT, () => console.log('AsesorIA en el puerto ' + PORT));
