# Landing Ganamos.net

Landing page (Next.js) con formulario de nombre que redirige a WhatsApp, Facebook Pixel
y un panel `/admin` protegido por contrasena para cambiar el numero de WhatsApp sin tocar codigo.

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
| `DEFAULT_PHONE` | Numero de WhatsApp que se usa apenas se despliega, antes de configurar Vercel KV o guardar uno nuevo desde el admin. Formato: codigo de pais + numero, solo digitos (ej: `5491122334455`). |
| `ADMIN_PASSWORD` | Contrasena para entrar a `/admin`. |
| `ADMIN_SESSION_SECRET` | String random (cualquier valor largo) usado solo para firmar la sesion del admin. |

## Deploy en Vercel

1. Subir este proyecto a un repo (GitHub/GitLab) o correr `vercel` directo desde esta carpeta.
2. Importar el proyecto en https://vercel.com/new.
3. Cargar las 4 variables de entorno de la tabla de arriba en el proyecto de Vercel.
4. Deploy.

En este punto la landing ya funciona con `DEFAULT_PHONE` y el panel admin permite loguearse,
pero **todavia no puede guardar cambios de numero** (necesita Vercel KV, paso siguiente).

## Habilitar el cambio de numero desde el panel admin (Vercel KV)

El numero de WhatsApp se guarda en **Vercel KV** (Redis administrado por Vercel, tiene un
plan gratis mas que suficiente para esto) para que el cambio se vea en la landing para
todos los visitantes al instante, sin volver a hacer deploy.

1. En el dashboard del proyecto en Vercel, ir a la pestana **Storage**.
2. **Create Database > KV** (o "Upstash for Redis" segun la version del marketplace).
3. Conectar esa base al proyecto: Vercel agrega automaticamente las variables
   `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
4. Volver a desplegar (redeploy) el proyecto para que tome las nuevas variables.

Desde ese momento, entrando a `tu-dominio.vercel.app/admin` con `ADMIN_PASSWORD`,
se puede cambiar el numero de WhatsApp cuando quieran y se aplica al instante para
todos los que entren a la landing.

## Como funciona el formulario

El visitante completa su nombre y al tocar "OBTENER MI BONO AHORA":

1. Se dispara el evento `Lead` del Facebook Pixel (si esta configurado).
2. Se arma un link `https://wa.me/<numero>?text=...` con un mensaje que incluye el nombre.
3. Se redirige al visitante directo a WhatsApp con el mensaje ya escrito.

## Estructura

```
app/
  layout.js        Layout global + script del Facebook Pixel
  page.js           Landing (Server Component, trae el numero actual)
  LandingForm.js     Formulario (Client Component)
  admin/
    layout.js        Metadata (noindex)
    page.js           Login + edicion del numero
  api/
    phone/route.js              GET publico / POST protegido (guarda el numero)
    admin/login/route.js        Login del admin
    admin/session/route.js      Chequea si hay sesion activa
    admin/logout/route.js       Cierra sesion
lib/
  kv.js    Lectura/escritura del numero en Vercel KV (con fallback a DEFAULT_PHONE)
  auth.js  Chequeo de contrasena y firma de la cookie de sesion
public/
  logo.png, bono-15.png   Imagenes originales de la landing
```
