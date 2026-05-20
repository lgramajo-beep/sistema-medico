# 🩺 Sistema Médico — IL Group
## Guía de Despliegue Paso a Paso

---

## PASO 1: Crear la Base de Datos en Supabase (5 minutos)

1. Ir a **https://supabase.com** y crear cuenta gratis (puede ser con Gmail)
2. Click **"New Project"**
   - **Name:** `sistema-medico-ilgroup`
   - **Database Password:** elegir una contraseña segura (guardarla)
   - **Region:** `South America (São Paulo)` (la más cercana a Guatemala)
   - Click **"Create new project"** y esperar ~2 minutos
3. Ya creado, ir a **SQL Editor** (ícono en el menú izquierdo)
4. Click **"New Query"**
5. **Copiar TODO el contenido del archivo `supabase-schema.sql`** y pegarlo ahí
6. Click **"Run"** (botón verde)
7. Debería decir "Success" — las tablas y datos iniciales están creados

### Obtener las credenciales:
1. Ir a **Settings** → **API** (menú izquierdo)
2. Copiar:
   - **Project URL** → es algo como `https://xxxxx.supabase.co`
   - **anon public key** → es una clave larga que empieza con `eyJ...`

---

## PASO 2: Subir el Código a GitHub (3 minutos)

1. Ir a **https://github.com** y crear cuenta (si no tiene)
2. Click **"New Repository"** (botón verde)
   - **Name:** `sistema-medico`
   - Dejar como **Public** o **Private**
   - Click **"Create repository"**
3. Subir los archivos:
   - En la página del repo, click **"uploading an existing file"**
   - Arrastrar TODOS los archivos del proyecto (package.json, vite.config.js, index.html, src/, etc.)
   - **⚠️ NO subir el archivo `.env`** (tiene las claves privadas)
   - Click **"Commit changes"**

### Si tiene Git instalado (alternativa más rápida):
```bash
cd sistema-medico
git init
git add .
git commit -m "Sistema médico IL Group"
git remote add origin https://github.com/SU-USUARIO/sistema-medico.git
git push -u origin main
```

---

## PASO 3: Desplegar en Vercel (3 minutos)

1. Ir a **https://vercel.com** y crear cuenta con GitHub
2. Click **"Add New Project"**
3. Seleccionar el repositorio `sistema-medico`
4. En **"Environment Variables"**, agregar:
   - `VITE_SUPABASE_URL` = (pegar la Project URL del Paso 1)
   - `VITE_SUPABASE_ANON_KEY` = (pegar la anon key del Paso 1)
5. Click **"Deploy"**
6. En ~1 minuto tendrá una URL como: `https://sistema-medico-xxx.vercel.app`

**¡Listo! El sistema está en línea.**

---

## PASO 4: Probar

1. Abrir la URL de Vercel en el navegador (funciona en celular también)
2. Iniciar sesión:
   - **admin** / **ilgroup2026** (acceso completo)
   - **aylin** / **clinica2026** (médico)
   - **medico** / **medico2026** (médico)
3. Verificar que los 5 pilotos iniciales aparecen
4. Probar: crear paciente, agregar visita, imprimir

---

## Agregar Más Usuarios

En Supabase → SQL Editor, ejecutar:
```sql
INSERT INTO usuarios (usuario, password, nombre, rol)
VALUES ('nuevo_usuario', 'contraseña123', 'Nombre Completo', 'medico');
```

---

## Dominio Personalizado (Opcional)

Si quieren usar algo como `medico.ilgroup.com`:
1. En Vercel → Settings → Domains
2. Agregar el dominio
3. Configurar el DNS según las instrucciones de Vercel

---

## Notas Técnicas

- **Capacidad:** El tier gratuito de Supabase soporta 500MB de datos (~10,000+ pacientes)
- **Backups:** Supabase hace backups automáticos diarios
- **Seguridad:** Los datos viajan encriptados (HTTPS). Las contraseñas están en la BD (para producción seria se recomienda migrar a Supabase Auth con hashing)
- **Costo:** $0/mes con los tiers gratuitos de Supabase y Vercel
- **Límites gratuitos:** 50,000 usuarios activos/mes, 500MB BD, 100GB bandwidth

---

## Soporte

Estructura de archivos:
```
sistema-medico/
├── README.md              ← Este archivo
├── package.json           ← Dependencias (React, Supabase, Recharts)
├── vite.config.js         ← Configuración del build
├── index.html             ← Página principal
├── .env.example           ← Plantilla de variables de entorno
├── supabase-schema.sql    ← Script para crear la BD
└── src/
    ├── main.jsx           ← Punto de entrada
    ├── App.jsx            ← Aplicación completa
    ├── supabase.js        ← Conexión a la BD
    └── index.css          ← Estilos base
```
