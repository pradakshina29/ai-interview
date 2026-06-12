# AI Interview Practice System Deployment Guide

We have optimized the codebase for a **single-service deployment**. This means the Express backend and the React frontend will be hosted together on a single server, saving you hosting costs and completely resolving CORS errors.

---

## 🛠️ Summary of Changes Made
To prepare the system for deployment, the following changes were implemented:
1. **Unified Production Build**: Added a root `build` script in `package.json` that installs dependencies for both `server` and `client` and builds the React client.
2. **Express Static Assets Serving**: Updated `server/index.js` to serve compiled React files statically under `client/build` when `NODE_ENV=production`.
3. **Smart API Resolution**: Updated the React pages (`Interview.js`, `Dashboard.js`, `History.js`, `Results.js`, `ChatbotWidget.js`) to automatically choose between `localhost:5000` (in local development) and relative path `""` (in production). This means you **do not** need to configure any frontend API URL environment variables!

---

## ⚡ Deployment Platforms

### Option 1: Render (Recommended & Free)
Render is the easiest way to deploy a Node.js full-stack app for free.

1. **Push to GitHub**:
   Initialize a Git repository, commit the files, and push them to a private GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Configure for single-service production deployment"
   # Create a repository on github.com, then run:
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and log in.
   - Click **New +** > **Web Service**.
   - Connect your GitHub repository.
   - Set the following settings:
     - **Name**: `ai-interview-system` (or similar)
     - **Region**: Choose the closest region to your users
     - **Branch**: `main`
     - **Language**: `Node`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`

3. **Configure Environment Variables**:
   Under the **Environment** tab on Render, add the variables listed in the configuration section below.

---

### Option 2: Railway (Fast & Premium Free Tier)
Railway is another excellent developer-first platform.

1. Go to [railway.app](https://railway.app/) and sign in.
2. Click **New Project** > **Deploy from GitHub repo**.
3. Choose your repository.
4. Railway will automatically detect the root `package.json` and start build.
5. Go to **Variables** > **New Variable** and configure the production environment.
6. The start command will automatically run `npm start` (which executes `node server/index.js`).

---

## 🔑 Required Environment Variables
You must configure these variables in your hosting provider's dashboard (Render or Railway). **Do not upload your `.env` file to GitHub.**

| Variable | Recommended Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` *(Tells the server to serve the React frontend)* |
| `GEMINI_API_KEY` | *Your Gemini API Key* |
| `FIREBASE_PROJECT_ID` | `ai-interview-system-2907` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@ai-interview-system-2907.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | *Paste your full private key (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`). If copy-pasting into Render UI, it will automatically handle line breaks.* |
| `PORT` | *Leave empty (the hosting platform will assign this automatically)* |

> [!IMPORTANT]
> **Handling the Firebase Private Key:**
> When pasting the `FIREBASE_PRIVATE_KEY` into Render or Railway, paste it directly as the raw multiline string starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----`. The server has code to automatically parse both standard newlines and raw `\n` characters:
> `process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')`

---

## 🧪 Testing the Production Build Locally
You can test the entire production setup on your local machine to make sure it builds and runs correctly before deploying it online.

1. **Build the project**:
   Run the unified build script from the root directory:
   ```powershell
   npm run build
   ```
   *This will compile your React app into `/client/build`.*

2. **Run the server in production mode**:
   - **On Windows PowerShell:**
     ```powershell
     $env:NODE_ENV="production"; npm start
     ```
   - **On macOS/Linux/Git Bash:**
     ```bash
     NODE_ENV=production npm start
     ```

3. **Access the application**:
   Open [http://localhost:5000](http://localhost:5000) in your browser. You should see your React application, and all API endpoints will operate seamlessly on port `5000`.
