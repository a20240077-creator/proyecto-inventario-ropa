-- Tabla para los usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL
);

-- Tabla para los productos del inventario
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL
);
