# Caos Mundialista

> La quiniela donde las amistades terminan.

Quiniela multijugador de fútbol con mecánicas de caos. App web PWA construida con Next.js 14 + Supabase, desplegada en Vercel.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS 3 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Sesiones con PIN hasheado + cookies httpOnly |
| Deploy | Vercel (región São Paulo — gru1) |
| Package manager | pnpm 9 / Node 20 |

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://caos.portelabs.com
INVITE_CODE=               # código maestro de invitación (opcional)
```

## Desarrollo local

```bash
pnpm install
pnpm dev
```

## Sistema de puntuación

### Predicciones de partido

| Resultado | Puntos base |
|-----------|-------------|
| Marcador exacto 0-0 (**Rey del Empate**) | **+8** (+3 exacto +5 bonus) |
| Marcador exacto | **+3** |
| Marcador espejo (predijiste 2-1, resultó 1-2) | **+2** |
| Solo resultado correcto (ganador / empate) | **+1** |

**Multiplicadores por fase:**

| Fase | Multiplicador |
|------|---------------|
| Grupos / Octavos | ×1 |
| Cuartos / Semis / Final | ×2 |

**Comodín (Joker):** un comodín por jornada. Los puntos de ese partido se calculan como `(base × fase) × 2`. Asignar el comodín a otro partido de la misma jornada desactiva el anterior.

**Modo Supervivencia:** el último 10% del ranking recibe un multiplicador ×1.5 sobre todos sus puntos. Se recalcula dinámicamente en cada consulta al ranking.

### Apuestas de largo plazo

| Apuesta | Puntos |
|---------|--------|
| Campeón | +50 |
| Subcampeón | +30 |
| Tercer lugar | +20 |
| Bota de Oro (goleador) | +40 |
| Equipo Revelación | +25 |
| Gran Decepción | +25 |

Las apuestas se bloquean automáticamente 15 minutos antes del primer partido. Un administrador puede reabrirlas.

### Carta Trampa

- Cada usuario tiene una sola carta trampa por torneo.
- Al activarla sobre un partido pendiente, se designa al líder actual como objetivo.
- Si el usuario acierta el **marcador exacto** de ese partido, el líder pierde el 20 % de los puntos obtenidos por el atacante en ese partido.
- Lockout: no se puede activar a menos de 15 minutos del kick-off.

### Fair Play

Al registrarse, el usuario recibe **1 punto por cada partido ya finalizado** para compensar el ingreso tardío.

## Autenticación

- Login y registro con **apodo + PIN** (4-6 dígitos). Sin email.
- El registro requiere un **código de invitación**: puede ser el código maestro (`INVITE_CODE` en env) o un código de uso único generado desde el panel de administración.
- El PIN se hashea en la base de datos mediante funciones RPC de Supabase (`hash_pin` / `verify_pin`).
- La sesión se almacena en una cookie httpOnly `caos_session` con validez de 90 días.
- Los usuarios con estado `banned` no pueden autenticarse.

## Estructura de rutas

| Ruta | Propósito |
|------|-----------|
| `/` | Redirect → `/partidos` (autenticado) o `/login` |
| `/login` | Login / Registro |
| `/partidos` | Vista principal de partidos y predicciones |
| `/ranking` | Tabla del caos con desglose de puntos |
| `/bonus` | Apuestas de largo plazo |
| `/historial` | Historial de predicciones pasadas |
| `/admin` | Panel de administración (solo admins) |

## API Routes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login o registro |
| `/api/auth/logout` | POST | Cierra sesión |
| `/api/auth/change-pin` | POST | Cambiar PIN |
| `/api/predictions` | GET | Predicciones del usuario autenticado |
| `/api/predictions` | POST | Crear o actualizar predicción |
| `/api/ranking` | GET | Ranking calculado con supervivencia |
| `/api/matches` | GET | Lista de partidos |
| `/api/trap-cards` | GET | Carta trampa del usuario |
| `/api/trap-cards` | POST | Activar carta trampa |
| `/api/long-term-bets` | GET | Apuestas de largo plazo del usuario |
| `/api/long-term-bets` | POST | Guardar apuestas de largo plazo |
| `/api/partidos-data` | GET | Endpoint consolidado (partidos + predicciones en 2 llamadas) |
| `/api/admin/matches` | POST | Crear partido (solo admin) |
| `/api/admin/score` | POST | Registrar resultado (solo admin) |
| `/api/admin/recalculate` | POST | Recalcular puntos (solo admin) |
| `/api/admin/sync` | POST | Sincronizar partidos externos (solo admin) |
| `/api/admin/users` | GET | Listar usuarios (solo admin) |
| `/api/admin/invite-codes` | POST | Generar código de invitación (solo admin) |
| `/api/admin/bonus-lock` | POST | Abrir / cerrar apuestas bonus (solo admin) |
| `/api/admin/long-term-results` | POST | Registrar resultados finales (solo admin) |
| `/api/admin/chaos-events` | POST | Eventos de caos manuales (solo admin) |

## Lockout de predicciones

Las predicciones y la carta trampa se bloquean **15 minutos antes del kick-off** de cada partido. Los partidos con status `finished` no aceptan predicciones.

## PWA

La app registra un Service Worker (`/public/sw.js`) y está configurada con metadatos `apple-mobile-web-app-capable` para instalación en dispositivos móviles. El color de tema es naranja (`#ea580c`).
