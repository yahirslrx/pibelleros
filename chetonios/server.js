const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;  // Usa el puerto del entorno o 4000 por defecto

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Conexión a la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, content TEXT, image TEXT, likes INTEGER DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER, username TEXT, comment TEXT)");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ruta para servir la página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Ruta para obtener todas las publicaciones
app.get('/posts', (req, res) => {
  db.all("SELECT * FROM posts", [], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(rows);
    }
  });
});

// Ruta para agregar una nueva publicación
app.post('/posts', upload.single('image'), (req, res) => {
  const { username, content } = req.body;
  const image = req.file ? req.file.filename : null;

  db.run("INSERT INTO posts (username, content, image) VALUES (?, ?, ?)", [username, content, image], function(err) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send({ id: this.lastID });
    }
  });
});

// Ruta para agregar un comentario
app.post('/comments', (req, res) => {
  const { postId, username, comment } = req.body;

  db.run("INSERT INTO comments (postId, username, comment) VALUES (?, ?, ?)", [postId, username, comment], function(err) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send({ id: this.lastID });
    }
  });
});

// Ruta para dar like a una publicación
app.post('/posts/:id/like', (req, res) => {
  const postId = req.params.id;

  db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId], function(err) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send({ likes: this.changes });
    }
  });
});

// Iniciar el servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});