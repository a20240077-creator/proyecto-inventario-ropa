const AUTH_BASE = '/api/auth';

async function manejarRegistro(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    return alert('Completa todos los campos.');
  }

  try {
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al registrarse');
    }

    alert('Registro exitoso. Ahora inicia sesión.');
    window.location.href = 'login.html';
  } catch (error) {
    alert(error.message);
  }
}

async function manejarLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    return alert('Completa todos los campos.');
  }

  try {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error en inicio de sesión');
    }

    localStorage.setItem('usuario_conectado', 'true');
    localStorage.setItem('usuario_email', data.usuario.email);
    window.location.href = 'index.html';
  } catch (error) {
    alert(error.message);
  }
}

function initAuthListeners() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', manejarLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', manejarRegistro);
  }
}

initAuthListeners();
