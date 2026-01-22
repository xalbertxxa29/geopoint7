// auth.js - Sistema de autenticación con sesión persistente
(() => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Establecer persistencia LOCAL (sesión permanente)
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn('[auth] No se pudo establecer persistencia:', err.message);
  });

  const $ = id => document.getElementById(id);

  const loginForm = $('login-form');
  const loginBtn = $('login-btn');
  const usernameInput = $('username');
  const passwordInput = $('password');
  const togglePassword = $('toggle-password');

  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
  }

  // Verificar si ya hay sesión activa al cargar
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('[auth] ✅ Sesión activa:', user.email);
      // Esperar un poco antes de redirigir para asegurar que Firebase está listo
      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 500);
    }
  });

  // Manejar submit del formulario
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        alert('Por favor completa todos los campos');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Iniciando sesión...';

      try {
        // Intentar login
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log('[auth] ✅ Login exitoso:', result.user.email);
        
        // Esperar a que Firebase guarde la sesión
        setTimeout(() => {
          window.location.href = 'menu.html';
        }, 1000);
      } catch (error) {
        console.error('[auth] ❌ Error de login:', error.message);
        
        let mensaje = 'Error en el login';
        if (error.code === 'auth/user-not-found') {
          mensaje = 'El usuario no existe';
        } else if (error.code === 'auth/wrong-password') {
          mensaje = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
          mensaje = 'Email inválido';
        } else if (error.code === 'auth/too-many-requests') {
          mensaje = 'Demasiados intentos. Intenta más tarde';
        }
        
        alert(mensaje);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
      }
    });
  }

  // Salir (logout)
  window.logoutUser = async function() {
    try {
      await auth.signOut();
      console.log('[auth] ✅ Logout exitoso');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('[auth] ❌ Error en logout:', error.message);
    }
  };

  // Obtener usuario actual
  window.getCurrentUser = () => auth.currentUser;

  // Verificar autenticación
  window.isAuthenticated = () => !!auth.currentUser;
})();
