# Landing Ganamos.net

Landing page (Next.js) con formulario de nombre que redirige a WhatsApp, Facebook Pixel
y un panel `/admin` protegido por contrasena para configurar **2 numeros de WhatsApp con
horarios distintos** (turno mañana / turno tarde-noche) sin tocar codigo.

## Correr en local

```bash
npm install
cp .env.example .env.local   # completar las variables
npm run dev
```

Abrir http://localhost:3000 (landing) y http://localhost:3000/admin (panel admin).

## Variables de entorno

Copiar `.env.example` a `.env.local` (local) y cargar las mismas en Vercel
(Project Settings > Environment Variables):

| Variable | Para que sirve |
|---|---|
| `NEXT_PUBLIC_FB_PIXEL_ID` | ID del Pixel de Facebook. Sin esto no se carga el pixel. |
| `DEFAULT_PHONE` | Numero de WhatsApp que se usa (para los dos turnos) apenas se despliega, antes de configurar Vercel KV o guardar un horario desde el admin. Formato: codigo de pais + numero, solo digitos (ej: `5491122334455`). |
| `SCHEDULE_TIMEZONE` | Zona horaria para decidir que numero esta activo. Opcional, por defecto `America/Argentina/Buenos_Aires`. |
| `ADMIN_PASSWORD` | Contrasena para entrar a `/admin`. |
| `ADMIN_SESSION_SECRET` | String random (cualquier valor largo) usado solo para firmar la sesion del admin. |

## Deploy en Vercel

1. Subir este proyecto a un repo (GitHub/GitLab) o correr `vercel` directo desde esta carpeta.
2. Importar el proyecto en https://vercel.com/new.
3. Cargar las variables de entorno de la tabla de arriba en el proyecto de Vercel.
4. Deploy.

En este punto la landing ya funciona con `DEFAULT_PHONE` y el panel admin permite loguearse,
pero **todavia no puede guardar cambios de numeros/horarios** (necesita Vercel KV, paso siguiente).

## Habilitar el panel admin (Vercel KV)

Los numeros y horarios se guardan en **Vercel KV** (Redis administrado por Vercel a traves
del marketplace de Upstash, tiene un plan gratis mas que suficiente para esto) para que el
cambio se vea en la landing para todos los visitantes al instante, sin volver a hacer deploy.

1. En el dashboard del proyecto en Vercel, ir a la pestana **Storage**.
2. **Create Database > Upstash > Redis**.
3. Conectar esa base al proyecto (**Connect to Project**), eligiendo los tres entornos
   (Production, Preview, Development). Vercel agrega automaticamente las variables
   `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
4. Volver a desplegar (**Redeploy**) el proyecto para que tome las nuevas variables.

Desde ese momento, entrando a `tu-dominio.vercel.app/admin` con `ADMIN_PASSWORD`, se pueden
cambiar los dos numeros de WhatsApp y sus horarios cuando quieran, y se aplica al instante
para todos los que entren a la landing.

## Como funciona el sistema de turnos

En `/admin` se configuran dos numeros, cada uno con un horario `Desde` / `Hasta`:

- **Numero 1**: por ejemplo `00:00` a `12:00`.
- **Numero 2**: por ejemplo `12:00` a `00:00`.

Cada vez que alguien entra a la landing, el servidor calcula la hora actual en la zona
horaria configurada (`SCHEDULE_TIMEZONE`, Argentina por defecto) y muestra el numero del
turno en el que cae esa hora. Si el horario de un turno "cruza la medianoche" (ej. `22:00`
a `06:00`) tambien funciona correctamente. Fuera del rango del Numero 1 siempre se usa el
Numero 2, asi que entre los dos turnos deberian cubrir las 24 horas del dia.

## Como funciona el formulario

El visitante completa su nombre y al tocar "OBTENER MI BONO AHORA":

1. Se dispara el evento `Lead` del Facebook Pixel (si esta configurado).
2. Se arma un link `https://wa.me/<numero>?text=...` con un mensaje que incluye el nombre,
   usando el numero del turno activo en ese momento.
3. Se redirige al visitante directo a WhatsApp con el mensaje ya escrito.

## Estructura

```
app/
  layout.js        Layout global + script del Facebook Pixel
  page.js           Landing (Server Component, calcula el numero activo segun la hora)
  LandingForm.js     Formulario (Client Component)
  admin/
    layout.js        Metadata (noindex)
    page.js           Login + edicion de los 2 numeros y sus horarios
  api/
    schedule/route.js           GET publico (horario actual) / POST protegido (lo guarda)
    admin/login/route.js        Login del admin
    admin/session/route.js      Chequea si hay sesion activa
    admin/logout/route.js       Cierra sesion
lib/
  kv.js    Lectura/escritura del horario en Vercel KV + logica de turno activo (con
           fallback a DEFAULT_PHONE en los dos turnos si KV no esta configurado)
  auth.js  Chequeo de contrasena y firma de la cookie de sesion
public/
  logo.png, bono-15.png   Imagenes originales de la landing
```
