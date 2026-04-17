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

app.get('/api/status', (req, res) => {
  res.json({ message: 'Backend de inventario activo' });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const insertQuery = 'INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id, email';
    const result = await pool.query(insertQuery, [email.trim().toLowerCase(), hashed]);
    res.status(201).json({ message: 'Registro exitoso', usuario: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('Error registro:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const query = 'SELECT id, email, password_hash FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email.trim().toLowerCase()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({ message: 'Login exitoso', usuario: { id: usuario.id, email: usuario.email } });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

const getProductos = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, cantidad, precio FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error lista productos:', error);
    res.status(500).json({ error: 'No se pudo obtener la lista de productos' });
  }
};

const createProducto = async (req, res) => {
  const { nombre, cantidad, precio } = req.body;
  if (!nombre || cantidad == null || precio == null) {
    return res.status(400).json({ error: 'Nombre, cantidad y precio son obligatorios' });
  }

  try {
    const insertQuery = 'INSERT INTO productos (nombre, cantidad, precio) VALUES ($1, $2, $3) RETURNING id, nombre, cantidad, precio';
    const result = await pool.query(insertQuery, [nombre, Number(cantidad), Number(precio)]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error crear producto:', error);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
};

const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad, precio } = req.body;
  if (!nombre || cantidad == null || precio == null) {
    return res.status(400).json({ error: 'Nombre, cantidad y precio son obligatorios' });
  }

  try {
    const updateQuery = 'UPDATE productos SET nombre = $1, cantidad = $2, precio = $3 WHERE id = $4 RETURNING id, nombre, cantidad, precio';
    const result = await pool.query(updateQuery, [nombre, Number(cantidad), Number(precio), Number(id)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizar producto:', error);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
};

const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rowCount === 0) {
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
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
