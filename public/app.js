const apiUrl = '/api/productos';

function redirectIfNotLogged() {
  const conectado = localStorage.getItem('usuario_conectado');
  if (!conectado) {
    alert('Acceso denegado. Debes iniciar sesión.');
    window.location.href = 'login.html';
  }
}

async function fetchProductos() {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error('No fue posible cargar los productos');
  }
  return response.json();
}

function limpiarFormulario() {
  document.getElementById('producto-id').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('cantidad').value = 0;
  document.getElementById('precio').value = '0.00';
}

function mostrarProductos(productos) {
  const tbody = document.querySelector('#productos-table tbody');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  if (productos.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  productos.forEach((producto) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${producto.nombre}</td>
      <td>${producto.cantidad}</td>
      <td>$${Number(producto.precio).toFixed(2)}</td>
      <td class="actions-cell">
        <button class="btn small" data-id="${producto.id}" data-action="edit">Editar</button>
        <button class="btn small secondary" data-id="${producto.id}" data-action="delete">Eliminar</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function cargarProductos() {
  try {
    const productos = await fetchProductos();
    mostrarProductos(productos);
  } catch (error) {
    alert(error.message);
  }
}

async function guardarProducto(event) {
  event.preventDefault();
  const id = document.getElementById('producto-id').value;
  const nombre = document.getElementById('nombre').value.trim();
  const cantidad = Number(document.getElementById('cantidad').value);
  const precio = Number(document.getElementById('precio').value);

  if (!nombre || cantidad < 0 || precio < 0) {
    return alert('Completa todos los campos con valores válidos.');
  }

  const body = { nombre, cantidad, precio };
  const url = id ? `${apiUrl}/${id}` : apiUrl;
  const method = id ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en la operación');
    }

    limpiarFormulario();
    cargarProductos();
    alert(id ? 'Producto actualizado' : 'Producto creado');
  } catch (error) {
    alert(error.message);
  }
}

async function manejarAccionTabla(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (action === 'edit') {
    const row = button.closest('tr');
    document.getElementById('producto-id').value = id;
    document.getElementById('nombre').value = row.children[0].textContent;
    document.getElementById('cantidad').value = row.children[1].textContent;
    document.getElementById('precio').value = row.children[2].textContent.replace('$', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (action === 'delete') {
    const confirmar = confirm('¿Eliminar este producto?');
    if (!confirmar) return;

    try {
      const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el producto');
      }
      cargarProductos();
      alert('Producto eliminado');
    } catch (error) {
      alert(error.message);
    }
  }
}

function cerrarSesion() {
  localStorage.removeItem('usuario_conectado');
  window.location.href = 'login.html';
}

function iniciarApp() {
  redirectIfNotLogged();
  cargarProductos();

  document.getElementById('producto-form').addEventListener('submit', guardarProducto);
  document.getElementById('productos-table').addEventListener('click', manejarAccionTabla);
  document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
  document.getElementById('btn-cancel').addEventListener('click', limpiarFormulario);
}

iniciarApp();
