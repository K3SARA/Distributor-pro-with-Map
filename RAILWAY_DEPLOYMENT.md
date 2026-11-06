# Deploying Distributor Pro on Railway

This guide walks you through hosting your distribution system on **[Railway](https://railway.app/)** with a cloud PostgreSQL database and high availability.

---

## 🏗 Architecture on Railway

```text
┌────────────────────────────────────────────────────────┐
│                      Railway                           │
│                                                        │
│  ┌─────────────────────────┐   ┌────────────────────┐  │
│  │   Web Service           │   │  PostgreSQL DB     │  │
│  │   - Express API         │◄──┤  (Managed Database)│  │
│  │   - React Static Assets │   │  DATABASE_URL      │  │
│  └───────────┬─────────────┘   └────────────────────┘  │
└──────────────┼─────────────────────────────────────────┘
               │ (HTTPS)
               ▼
       Web Browser / Clients
```

The Express server automatically:
1. Serves the **React web frontend** from `dist/` on all standard routes.
2. Handles all **REST API requests** at `/api/...`.
3. Runs database migrations automatically at startup via `npx prisma db push`.

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Your GitHub Repository is Ready
Your repository is already pushed and up-to-date:
- **Repo URL:** `https://github.com/K3SARA/Distributor-pro-with-Map.git`
- `prepare-prisma.js` is automatically configured to detect Railway's PostgreSQL `DATABASE_URL` at runtime.

---

### Step 2: Create a Project on Railway

1. Go to **[Railway.app](https://railway.app/)** and sign in with your GitHub account.
2. Click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. Choose **`K3SARA/Distributor-pro-with-Map`**.

---

### Step 3: Add PostgreSQL Database Service

1. On your Railway project canvas, click **+ New** (or press `Cmd/Ctrl + K`).
2. Select **Database** ➔ **Add PostgreSQL**.
3. Railway will provision a managed PostgreSQL database in a few seconds.

---

### Step 4: Link PostgreSQL to Your Web App Service

1. Click on your **Web Service** card (`Distributor-pro-with-Map`).
2. Navigate to the **Variables** tab.
3. Click **+ Add Variable Reference**.
4. Select `DATABASE_URL` from the PostgreSQL service dropdown.
   *(Railway will link the internal variable reference, e.g. `${{Postgres.DATABASE_URL}}`)*.
5. Railway will automatically trigger a redeploy.

---

### Step 5: Generate a Public Domain URL

1. In your Web Service settings on Railway, go to the **Settings** tab.
2. Scroll down to the **Networking** section.
3. Click **Generate Domain** (e.g. `distributor-pro-with-map.up.railway.app`).
4. Wait for the deploy status to show **Active (Healthy)**.
5. Open your public URL in any browser!

---

## 🔑 Default Login Credentials
Once deployed, the database initializes with:
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator (Full desktop & mobile access)

---

## 🛠 Railway Configuration Details

- **Build Command**: `npm run build` *(compiles Vite React frontend and generates Prisma client)*
- **Start Command**: `npm start` *(pushes DB schema to PostgreSQL and launches Express server)*
- **Configuration File**: [`railway.json`](./railway.json) and [`Procfile`](./Procfile) are already pre-configured in the repository.
