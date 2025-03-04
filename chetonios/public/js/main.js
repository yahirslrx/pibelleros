document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('auth');
  const appSection = document.getElementById('app');
  const showLoginButton = document.getElementById('show-login');
  const showRegisterButton = document.getElementById('show-register');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const postForm = document.getElementById('postForm');
  const postsContainer = document.getElementById('posts');

  let currentUser = null;

  // Mostrar el formulario de inicio de sesión
  showLoginButton.addEventListener('click', () => {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  });

  // Mostrar el formulario de registro
  showRegisterButton.addEventListener('click', () => {
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  // Verificar si el usuario está logueado
  fetch('/check-auth')
    .then(response => response.json())
    .then(data => {
      if (data.username) {
        currentUser = data.username;
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        loadPosts();
      }
    });

  // Manejar el registro
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        // Iniciar sesión automáticamente después del registro
        fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            currentUser = username;
            authSection.style.display = 'none';
            appSection.style.display = 'block';
            loadPosts();
          }
        });
      }
    })
    .catch(error => console.error('Error:', error));
  });

  // Manejar el inicio de sesión
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        currentUser = username;
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        loadPosts();
      }
    })
    .catch(error => console.error('Error:', error));
  });

  // Cargar publicaciones desde el servidor
function loadPosts() {
    fetch('/posts')
    .then(response => response.json())
    .then(posts => {
        postsContainer.innerHTML = ""; // Limpiar el contenedor de publicaciones
        posts.forEach(post => {
            fetch(`/comments?postId=${post.id}`)
            .then(response => response.json())
            .then(comments => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-header">
                        <h3>${post.username}</h3>
                        ${currentUser === post.username || currentUser === "Yahir" ? `
                            <div class="post-options">
                                <span class="options-icon" onclick="showOptions('post', ${post.id})">⋮</span>
                                <div class="options-menu" id="options-post-${post.id}">
                                    <button onclick="deletePost(${post.id})">Borrar</button>
                                </div>
                            </div>
                        ` : ""}
                    </div>
                    <p>${post.content}</p>
                    ${post.image ? `<img src="/images/${post.image}" alt="Imagen de la publicación">` : ""}
                    <button class="like-button" onclick="likePost(${post.id}, event)">❤️ ${post.likes}</button>
                    <button class="superbodrio-button" onclick="superbodrioPost(${post.id}, event)">💩 ${post.superbodrios || 0}</button>
                    <div class="comments-section">
                        ${comments.map(comment => `
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>${comment.username}</strong>
                                    ${currentUser === comment.username || currentUser === "Yahir" ? `
                                        <div class="comment-options">
                                            <span class="options-icon" onclick="showOptions('comment', ${comment.id})">⋮</span>
                                            <div class="options-menu" id="options-comment-${comment.id}">
                                                <button onclick="deleteComment(${comment.id})">Borrar</button>
                                            </div>
                                        </div>
                                    ` : ""}
                                </div>
                                <p>${comment.comment}</p>
                            </div>
                        `).join("")}
                    </div>
                    <div>
                        <input type="text" id="comment-${post.id}" placeholder="Escribe un comentario">
                        <button onclick="addComment(${post.id}, event)">Comentar</button>
                    </div>
                `;
                postsContainer.appendChild(postElement);
            })
            .catch(error => console.error('Error:', error));
        });
    })
    .catch(error => console.error('Error:', error));
}

// Mostrar/ocultar el menú de opciones
window.showOptions = function(type, id) {
    const optionsMenu = document.getElementById(`options-${type}-${id}`);
    optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
}

// Borrar una publicación
window.deletePost = function(postId) {
    if (!currentUser) {
        alert("Debes iniciar sesión para borrar publicaciones.");
        return;
    }

    fetch(`/posts/${postId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            loadPosts(); // Recargar las publicaciones
        }
    })
    .catch(error => console.error('Error:', error));
}

// Borrar un comentario
window.deleteComment = function(commentId) {
    if (!currentUser) {
        alert("Debes iniciar sesión para borrar comentarios.");
        return;
    }

    fetch(`/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            loadPosts(); // Recargar las publicaciones
        }
    })
    .catch(error => console.error('Error:', error));
}

// Función para manejar el "superbodrio"
window.superbodrioPost = function(postId, event) {
    event.preventDefault(); // Evita que la página se recargue
    if (!currentUser) {
        alert("Debes iniciar sesión para usar el superbodrio.");
        return;
    }

    fetch(`/posts/${postId}/superbodrio`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error); // Mostrar mensaje de error si ya usó el superbodrio hoy
        } else {
            loadPosts(); // Recargar las publicaciones para actualizar el contador
        }
    })
    .catch(error => console.error('Error:', error));
}
  // Dar like a una publicación
window.likePost = function(postId, event) {
    event.preventDefault(); // Evita que la página se recargue
    if (!currentUser) {
        alert("Debes iniciar sesión para dar like.");
        return;
    }

    fetch(`/posts/${postId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser
        })
    })
    .then(response => response.json())
    .then(data => {
        loadPosts(); // Recargar las publicaciones para actualizar los contadores
    })
    .catch(error => console.error('Error:', error));
}

// Dar dislike a una publicación
window.dislikePost = function(postId, event) {
    event.preventDefault(); // Evita que la página se recargue
    if (!currentUser) {
        alert("Debes iniciar sesión para dar dislike.");
        return;
    }

    fetch(`/posts/${postId}/dislike`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser
        })
    })
    .then(response => response.json())
    .then(data => {
        loadPosts(); // Recargar las publicaciones para actualizar los contadores
    })
    .catch(error => console.error('Error:', error));
}

  // Agregar un comentario
window.addComment = function(postId, event) {
    event.preventDefault(); // Evita que la página se recargue
    if (!currentUser) {
        alert("Debes iniciar sesión para comentar.");
        return;
    }

    const commentInput = document.getElementById(`comment-${postId}`);
    const comment = commentInput.value;

    if (!comment) {
        alert("Por favor, escribe un comentario.");
        return;
    }

    fetch('/comments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            postId,
            username: currentUser,
            comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            loadPosts();
            commentInput.value = "";
        }
    })
    .catch(error => console.error('Error:', error));
}

  // Agregar una nueva publicación
  window.addPost = function() {
    if (!currentUser) {
      alert("Debes iniciar sesión para publicar.");
      return;
    }

    const content = document.getElementById('content').value;
    const image = document.getElementById('image').files[0];

    const formData = new FormData();
    formData.append('username', currentUser);
    formData.append('content', content);
    formData.append('image', image);

    fetch('/posts', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      loadPosts();
      document.getElementById('content').value = '';
      document.getElementById('image').value = '';
    })
    .catch(error => console.error('Error:', error));
  }
});

// Verificar si el usuario está logueado
fetch('/check-auth')
    .then(response => response.json())
    .then(data => {
        if (data.username) {
            currentUser = data.username;
            authSection.style.display = 'none';
            appSection.style.display = 'block';
            loadPosts();
        }
    });
