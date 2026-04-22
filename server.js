const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
} : {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'inventario_db',
  user: process.env.PGUSER || process.env.USER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

const schemaSql = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL
  );
`;

function createMemoryStore() {
  let nextUserId = 1;
  let nextProductoId = 1;
  const usuarios = [];
  const productos = [];

  return {
    async createUser(email, passwordHash) {
      const existente = usuarios.find((usuario) => usuario.email === email);
      if (existente) {
        const error = new Error('El email ya está registrado');
        error.code = '23505';
        throw error;
      }

      const usuario = {
        id: nextUserId++,
        email,
        password_hash: passwordHash,
      };
      usuarios.push(usuario);

      return { id: usuario.id, email: usuario.email };
    },

    async findUserByEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) || null;
    },

    async listProductos() {
      return [...productos].sort((a, b) => b.id - a.id);
    },

    async createProducto(nombre, cantidad, precio) {
      const producto = {
        id: nextProductoId++,
        nombre,
        cantidad,
        precio,
      };
      productos.push(producto);
      return producto;
    },

    async updateProducto(id, nombre, cantidad, precio) {
      const producto = productos.find((item) => item.id === id);
      if (!producto) {
        return null;
      }

      producto.nombre = nombre;
      producto.cantidad = cantidad;
      producto.precio = precio;
      return producto;
    },

    async deleteProducto(id) {
      const index = productos.findIndex((item) => item.id === id);
      if (index === -1) {
        return false;
      }

      productos.splice(index, 1);
      return true;
    },
  };
}

const memoryStore = createMemoryStore();
const storage = {
  mode: 'postgres',
  detail: 'Usando PostgreSQL',
};

async function initStorage() {
  try {
    await pool.query('SELECT 1');
    await pool.query(schemaSql);
    storage.mode = 'postgres';
    storage.detail = 'Usando PostgreSQL';
    console.log('PostgreSQL conectado y tablas verificadas');
  } catch (error) {
    storage.mode = 'memory';
    storage.detail = 'PostgreSQL no disponible; usando almacenamiento temporal en memoria';
    console.warn('No se pudo conectar a PostgreSQL. Se usara almacenamiento en memoria.');
    console.warn(error.message);
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function parseProductoBody(body) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const cantidad = Number(body.cantidad);
  const precio = Number(body.precio);

  if (!nombre || !Number.isFinite(cantidad) || !Number.isFinite(precio) || cantidad < 0 || precio < 0) {
    return null;
  }

  return { nombre, cantidad, precio };
}

function parseId(id) {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function createUser(email, passwordHash) {
  if (storage.mode === 'memory') {
    return memoryStore.createUser(email, passwordHash);
  }

  const insertQuery = 'INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id, email';
  const result = await pool.query(insertQuery, [email, passwordHash]);
  return result.rows[0];
}

async function findUserByEmail(email) {
  if (storage.mode === 'memory') {
    return memoryStore.findUserByEmail(email);
  }

  const query = 'SELECT id, email, password_hash FROM usuarios WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

async function listProductos() {
  if (storage.mode === 'memory') {
    return memoryStore.listProductos();
  }

  const result = await pool.query('SELECT id, nombre, cantidad, precio FROM productos ORDER BY id DESC');
  return result.rows;
}

async function createProductoInStore(nombre, cantidad, precio) {
  if (storage.mode === 'memory') {
    return memoryStore.createProducto(nombre, cantidad, precio);
  }

  const insertQuery = 'INSERT INTO productos (nombre, cantidad, precio) VALUES ($1, $2, $3) RETURNING id, nombre, cantidad, precio';
  const result = await pool.query(insertQuery, [nombre, cantidad, precio]);
  return result.rows[0];
}

async function updateProductoInStore(id, nombre, cantidad, precio) {
  if (storage.mode === 'memory') {
    return memoryStore.updateProducto(id, nombre, cantidad, precio);
  }

  const updateQuery = 'UPDATE productos SET nombre = $1, cantidad = $2, precio = $3 WHERE id = $4 RETURNING id, nombre, cantidad, precio';
  const result = await pool.query(updateQuery, [nombre, cantidad, precio, id]);
  return result.rows[0] || null;
}

async function deleteProductoInStore(id) {
  if (storage.mode === 'memory') {
    return memoryStore.deleteProducto(id);
  }

  const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Backend de inventario activo',
    storage: storage.mode,
    detail: storage.detail,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena son obligatorios' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const usuario = await createUser(normalizeEmail(email), hashed);
    res.status(201).json({ message: 'Registro exitoso', usuario });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }
    console.error('Error registro:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena son obligatorios' });
  }

  try {
    const usuario = await findUserByEmail(normalizeEmail(email));

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contrasena incorrecta' });
    }

    res.json({ message: 'Login exitoso', usuario: { id: usuario.id, email: usuario.email } });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

const getProductos = async (req, res) => {
  try {
    const productos = await listProductos();
    res.json(productos);
  } catch (error) {
    console.error('Error lista productos:', error);
    res.status(500).json({ error: 'No se pudo obtener la lista de productos' });
  }
};

const createProducto = async (req, res) => {
  const producto = parseProductoBody(req.body);
  if (!producto) {
    return res.status(400).json({ error: 'Nombre, cantidad y precio deben ser validos' });
  }

  try {
    const creado = await createProductoInStore(producto.nombre, producto.cantidad, producto.precio);
    res.status(201).json(creado);
  } catch (error) {
    console.error('Error crear producto:', error);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
};

const updateProducto = async (req, res) => {
  const id = parseId(req.params.id);
  const producto = parseProductoBody(req.body);

  if (!id) {
    return res.status(400).json({ error: 'El id del producto no es valido' });
  }

  if (!producto) {
    return res.status(400).json({ error: 'Nombre, cantidad y precio deben ser validos' });
  }

  try {
    const actualizado = await updateProductoInStore(id, producto.nombre, producto.cantidad, producto.precio);
    if (!actualizado) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(actualizado);
  } catch (error) {
    console.error('Error actualizar producto:', error);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
};

const deleteProducto = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'El id del producto no es valido' });
  }

  try {
    const deleted = await deleteProductoInStore(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Error eliminar producto:', error);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
};

app.get('/api/productos', getProductos);
app.post('/api/productos', createProducto);
app.put('/api/productos/:id', updateProducto);
app.delete('/api/productos/:id', deleteProducto);

app.get('/api/prendas', getProductos);
app.post('/api/prendas', createProducto);
app.put('/api/prendas/:id', updateProducto);
app.delete('/api/prendas/:id', deleteProducto);

const PORT = process.env.PORT || 3000;

initStorage().finally(() => {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT} (${storage.mode})`);
  });
});
