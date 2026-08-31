const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const WEB = path.join(__dirname, 'publico');

app.use(express.static(WEB, { maxAge: '1h' }));
app.get('/salud', (req, res) => res.json({ ok: true, servicio: 'AsesorIA' }));
app.get('*', (req, res) => res.sendFile(path.join(WEB, 'index.html')));

app.listen(PORT, () => console.log('AsesorIA en el puerto ' + PORT));
