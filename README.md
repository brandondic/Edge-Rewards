# 🤖 Microsoft Edge Rewards RPA Bot

Un bot de automatización inteligente (*RPA*) para completar de forma autónoma las actividades diarias y búsquedas de **Microsoft Rewards** en Microsoft Edge para Windows.

---

## ✨ Características

- 🎯 **Conjunto Diario (Daily Set):** Detecta dinámicamente y completa las tarjetas del día en `/dashboard` con resolución automática de cuestionarios (*quizzes*) y encuestas.
- 🎁 **Seguir Ganando:** Localiza y valida todas las tarjetas con insignias `+X` en `/earn`.
- 📷 **Búsqueda Visual con Imagen (`#sb_sbi`):** Sube automáticamente una imagen para reclamar la bonificación de Bing Visual Search.
- 🖥️ **Búsquedas con Auto-Detección de Nivel (Asociado Plata / Oro):** 
  - 🏷️ **Detección Automática:** Lee la insignia oficial en pantalla (`Asociado Plata` o `Asociado Oro`).
  - 🥇 **Asociado Oro (Nivel 2):** 20 búsquedas automáticas en Bing (+60 pts).
  - 🥈 **Asociado Plata (Nivel 1):** 10 búsquedas automáticas en Bing (+30 pts).
- ⏳ **Anti-Detección & Pausas Humanas:** Pausas aleatorias configurables entre 6 y 12 segundos con simulación de desplazamiento (*scroll*).
- 🪟 **Arranque Instantáneo:** Cero cuelgues de inicio y sin ventanas congeladas en `about:blank`.
- 🚪 **Cierre 100% Automático:** Cierra el navegador y la consola tras verificar que no quede ninguna tarea pendiente.

---

## 🔒 Seguridad y Privacidad

- **Sin credenciales en el código:** El bot **nunca** almacena contraseñas ni correos en archivos de texto.
- **Aislamiento por `.env`:** La carpeta que almacena las cookies y sesiones locales (`USER_DATA_DIR`) está configurada en un archivo `.env` privado.
- **Protección Git:** El archivo `.gitignore` excluye estrictamente `.env`, `.env.*` y la carpeta de perfil para evitar que cualquier dato privado o sesión se suba a GitHub.
- **Plantilla pública segura:** Se incluye `.env.example` sin ningún dato personal para que cualquiera pueda clonar el proyecto con seguridad.

---

## 📋 Requisitos Previos

1. **Windows 10 / 11**
2. **Microsoft Edge** instalado.
3. **Node.js (versión 18 o superior):** [Descargar Node.js](https://nodejs.org/)
4. **pnpm** (recomendado) o **npm**:
   ```bash
   npm install -g pnpm
   ```

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/brandondic/edge-rewards.git
cd edge-rewards
```

### 2. Instalar dependencias
```bash
pnpm install
```

### 3. Configurar entorno privado (Opcional)
Copia la plantilla `.env.example` a `.env`:
```bash
copy .env.example .env
```

### 4. Ejecución directa
Solo haz doble clic en:
👉 **`EJECUTAR.bat`**

---

## ⚙️ Configuración Personalizada (`.env`)

Puedes modificar las opciones directamente en tu archivo privado `.env`:

| Variable en `.env` | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `USER_DATA_DIR` | `.edge_rewards_profile` | Carpeta local privada para guardar cookies y sesión. |
| `REWARDS_TIER` | `auto` | Detección automática por insignia (`auto`). Opcional forzar `oro` o `plata`. |
| `SEARCHES_ORO` | `20` | Búsquedas para nivel Oro. |
| `SEARCHES_PLATA` | `10` | Búsquedas para nivel Plata. |
| `MIN_DELAY_MS` | `6000` | Tiempo mínimo de espera entre búsquedas (6s). |
| `MAX_DELAY_MS` | `12000` | Tiempo máximo de espera entre búsquedas (12s). |
| `EDGE_PROFILE` | `Default` | Perfil de Edge a usar (`Default`, `Profile 1`, etc.). |
| `HEADLESS` | `false` | `false` para ver el navegador, `true` para segundo plano. |

---

## ⏰ Programar ejecución diaria automática en Windows

Para que el bot se ejecute todos los días a una hora fija (ej. 09:00 AM):

1. Abre **PowerShell como Administrador**.
2. Ejecuta el script incluido:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\scripts\setup-schedule.ps1
   ```

---

## 📄 Licencia

Proyecto de código abierto bajo la licencia [MIT](LICENSE).
