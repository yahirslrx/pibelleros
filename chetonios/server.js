const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

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
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, content TEXT, image TEXT, likes INTEGER DEFAULT 0)");
    db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER, username TEXT, comment TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER, username TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS superbodrios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, date TEXT)"); // Nueva tabla para superbodrios
});

// Configuración de sesiones
app.use(session({
  secret: 'tu_secreto_seguro',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ruta para servir la página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Ruta para verificar si el usuario está logueado
app.get('/check-auth', (req, res) => {
  if (req.session.username) {
    res.status(200).send({ username: req.session.username });
  } else {
    res.status(401).send({ error: "No autenticado" });
  }
});

// Ruta para registrar un nuevo usuario
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send({ error: "Faltan datos" });
  }

  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
    if (err) {
      return res.status(500).send({ error: "El nombre de usuario ya existe" });
    }
    res.status(201).send({ message: "Usuario registrado correctamente" });
  });
});

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send({ error: "Faltan datos" });
  }

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (row) {
      req.session.username = username; // Guardar el nombre de usuario en la sesión
      res.status(200).send({ message: "Inicio de sesión exitoso" });
    } else {
      res.status(401).send({ error: "Nombre de usuario o contraseña incorrectos" });
    }
  });
});

// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(200).send({ message: "Sesión cerrada correctamente" });
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

// Ruta para dar/quitar like a una publicación
app.post('/posts/:id/like', (req, res) => {
    const postId = req.params.id;
    const { username } = req.body;

    db.get("SELECT * FROM likes WHERE postId = ? AND username = ?", [postId, username], (err, row) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (row) {
            // Si ya dio like, quitarlo
            db.run("DELETE FROM likes WHERE postId = ? AND username = ?", [postId, username], function(err) {
                if (err) {
                    return res.status(500).send(err);
                }

                db.run("UPDATE posts SET likes = likes - 1 WHERE id = ?", [postId], function(err) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(200).send({ likes: this.changes });
                });
            });
        } else {
            // Si no ha dado like, agregar el like
            db.run("INSERT INTO likes (postId, username) VALUES (?, ?)", [postId, username], function(err) {
                if (err) {
                    return res.status(500).send(err);
                }

                db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId], function(err) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(200).send({ likes: this.changes });
                });
            });
        }
    });
});

// Ruta para dar "superbodrio"
app.post('/posts/:id/superbodrio', (req, res) => {
    const postId = req.params.id;
    const { username } = req.body;
    const today = new Date().toISOString().split('T')[0]; // Obtener la fecha actual en formato YYYY-MM-DD

    // Verificar si el usuario ya ha usado el "superbodrio" hoy
    db.get("SELECT * FROM superbodrios WHERE username = ? AND date = ?", [username, today], (err, row) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (row) {
            // Si ya usó el "superbodrio" hoy, no permitir que lo use de nuevo
            return res.status(400).send({ error: "Ya has usado el superbodrio hoy. Intenta mañana." });
        } else {
            // Si no lo ha usado hoy, agregar el "superbodrio"
            db.run("INSERT INTO superbodrios (username, date) VALUES (?, ?)", [username, today], function(err) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.status(200).send({ message: "Superbodrio agregado correctamente." });
            });
        }
    });
});

// Ruta para obtener el número de "superbodrios" de una publicación
app.get('/posts/:id/superbodrios', (req, res) => {
    const postId = req.params.id;

    db.get("SELECT COUNT(*) AS count FROM superbodrios WHERE postId = ?", [postId], (err, row) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send({ count: row.count });
    });
});

// Ruta para agregar un comentario
app.post('/comments', (req, res) => {
    const { postId, username, comment } = req.body;

    if (!postId || !username || !comment) {
        return res.status(400).send({ error: "Faltan datos" });
    }

    db.run("INSERT INTO comments (postId, username, comment) VALUES (?, ?, ?)", [postId, username, comment], function(err) {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(201).send({ id: this.lastID });
    });
});

// Ruta para obtener comentarios de una publicación
app.get('/comments', (req, res) => {
  const postId = req.query.postId;

  db.all("SELECT * FROM comments WHERE postId = ?", [postId], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(rows);
    }
  });
});

// Ruta para borrar una publicación
app.delete('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const { username } = req.body;

    // Verificar si el usuario es el autor o el administrador
    db.get("SELECT username FROM posts WHERE id = ?", [postId], (err, row) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (!row) {
            return res.status(404).send({ error: "Publicación no encontrada" });
        }

        if (row.username === username || username === "Yahir") { // Permitir al autor o al administrador borrar
            db.run("DELETE FROM posts WHERE id = ?", [postId], function(err) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.status(200).send({ message: "Publicación borrada correctamente" });
            });
        } else {
            res.status(403).send({ error: "No tienes permiso para borrar esta publicación" });
        }
    });
});

// Ruta para borrar un comentario
app.delete('/comments/:id', (req, res) => {
    const commentId = req.params.id;
    const { username } = req.body;

    // Verificar si el usuario es el autor o el administrador
    db.get("SELECT username FROM comments WHERE id = ?", [commentId], (err, row) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (!row) {
            return res.status(404).send({ error: "Comentario no encontrado" });
        }

        if (row.username === username || username === "Yahir") { // Permitir al autor o al administrador borrar
            db.run("DELETE FROM comments WHERE id = ?", [commentId], function(err) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.status(200).send({ message: "Comentario borrado correctamente" });
            });
        } else {
            res.status(403).send({ error: "No tienes permiso para borrar este comentario" });
        }
    });
});

// Iniciar el servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});