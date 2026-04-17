# Proyecto Inventario de Ropa

Aplicación web CRUD para inventario de ropa con frontend estático y backend en Node.js + Express conectado a PostgreSQL.

## Instalación

1. Abre terminal en la carpeta del proyecto.
2. Ejecuta:

```bash
npm install
```

3. Configura tu base de datos PostgreSQL.

## Base de datos

Crea la base de datos `inventario_db` y las tablas con este SQL:

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL
);
```

## Variables de entorno

El servidor puede usar estas variables opcionales:

- `PGHOST` (por defecto `localhost`)
- `PGPORT` (por defecto `5432`)
- `PGDATABASE` (por defecto `inventario_db`)
- `PGUSER` (por defecto `postgres`)
- `PGPASSWORD` (por defecto `postgres`)
- `PORT` (por defecto `3000`)

Por ejemplo:

```bash
export PGUSER=postgres
export PGPASSWORD=miPassword
export PGDATABASE=inventario_db
npm start
```

## Ejecución

```bash
npm start
```

Luego abre en el navegador:

- `http://localhost:3000/login.html`

## Rutas disponibles

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `GET /api/productos` - Listar productos
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

También hay alias con `/api/prendas` para usar los mismos métodos en Postman:

- `GET /api/prendas`
- `POST /api/prendas`
- `PUT /api/prendas/:id`
- `DELETE /api/prendas/:id`

## Flujo de uso

1. Regístrate en `register.html`.
2. Inicia sesión en `login.html`.
3. Administra el inventario desde `index.html`.
4. Cierra sesión con el botón "Cerrar Sesión".

## Despliegue en Render

Para que tu proyecto sea público, puedes desplegarlo en [Render](https://render.com) con un servicio web y una base de datos PostgreSQL.

1. Crea un servicio web de tipo Node en Render.
2. Usa `npm install` como comando de build y `npm start` como comando de inicio.
3. Crea o conecta una base de datos PostgreSQL en Render.
4. En las variables de entorno del servicio web, agrega:
   - `DATABASE_URL` = URL de tu base de datos PostgreSQL en Render
   - `PORT` = `10000` o el puerto que Render asigne automáticamente

Render proveerá una URL pública como `https://tu-app.onrender.com`.

### Probar en Postman

Usa esa URL pública para compartir con tu maestro y probar los métodos:

- `GET https://tu-app.onrender.com/api/productos`
- `POST https://tu-app.onrender.com/api/productos`
- `PUT https://tu-app.onrender.com/api/productos/:id`
- `DELETE https://tu-app.onrender.com/api/productos/:id`

También funcionan estos endpoints alternativos:

- `GET https://tu-app.onrender.com/api/prendas`
- `POST https://tu-app.onrender.com/api/prendas`
- `PUT https://tu-app.onrender.com/api/prendas/:id`
- `DELETE https://tu-app.onrender.com/api/prendas/:id`
