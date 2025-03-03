document.addEventListener('DOMContentLoaded', () => {
  const postForm = document.getElementById('postForm');
  const postsContainer = document.getElementById('posts');

  // Cargar publicaciones al cargar la página
  loadPosts();

  // Manejar el envío del formulario
  postForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('content', document.getElementById('content').value);
    formData.append('image', document.getElementById('image').files[0]);

    fetch('/posts', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      loadPosts();
      postForm.reset();
    })
    .catch(error => console.error('Error:', error));
  });

  // Cargar publicaciones desde el servidor
  function loadPosts() {
    fetch('/posts')
      .then(response => response.json())
      .then(posts => {
        postsContainer.innerHTML = '';
        posts.forEach(post => {
          const postElement = document.createElement('div');
          postElement.className = 'post';
          postElement.innerHTML = `
            <h3>${post.username}</h3>
            <p>${post.content}</p>
            ${post.image ? `<img src="/images/${post.image}" alt="Imagen de la publicación">` : ''}
            <button class="like-button" onclick="likePost(${post.id})">❤️ ${post.likes}</button>
            <div>
              <input type="text" id="comment-${post.id}" placeholder="Escribe un comentario">
              <button onclick="addComment(${post.id})">Comentar</button>
            </div>
          `;
          postsContainer.appendChild(postElement);
        });
      })
      .catch(error => console.error('Error:', error));
  }

  // Dar like a una publicación
  window.likePost = function(postId) {
    fetch(`/posts/${postId}/like`, {
      method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
      loadPosts();
    })
    .catch(error => console.error('Error:', error));
  }

  // Agregar un comentario
  window.addComment = function(postId) {
    const comment = document.getElementById(`comment-${postId}`).value;

    fetch('/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postId,
        username: 'Anónimo', // Puedes cambiar esto para que el usuario ingrese su nombre
        comment
      })
    })
    .then(response => response.json())
    .then(data => {
      loadPosts();
    })
    .catch(error => console.error('Error:', error));
  }
});