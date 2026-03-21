# Prompt — Ajouter un serveur MCP à une application existante et la dockeriser

## Contexte

J'ai une application web existante avec une API REST. Je veux :
1. Ajouter un serveur MCP (Model Context Protocol) à cette application
2. Dockeriser l'ensemble pour pouvoir l'utiliser depuis Claude Code (CLI) ou Claude (interface web)

---

## Étape 1 — Analyser l'application existante

Commence par explorer le projet :
- Identifie le framework utilisé (Express, Fastify, NestJS, etc.)
- Liste les routes REST existantes (méthodes, chemins, paramètres, réponses)
- Identifie le modèle de données (schéma DB, types, etc.)
- Repère le point d'entrée principal (ex: `index.js`, `server.ts`)

---

## Étape 2 — Implémenter le serveur MCP

### Règles d'implémentation

- Utilise le SDK officiel : `@modelcontextprotocol/sdk`
- Le serveur MCP doit exposer des **tools** qui correspondent aux actions métier de l'API REST
- Chaque tool doit avoir : un `name` clair, une `description` précise, un `inputSchema` JSON complet
- Préfère un transport **stdio** pour une utilisation locale via Claude Code CLI
- Ajoute un transport **HTTP/SSE** si une utilisation via interface web est souhaitée
- Ne duplique pas la logique métier : les tools MCP appellent les fonctions/services existants de l'app
- Le serveur MCP peut être dans un fichier séparé (`mcp-server.js` ou `src/mcp/index.ts`) ou intégré au serveur principal selon la taille du projet

### Structure attendue des tools

Pour chaque ressource principale de l'API (ex: `todo`, `user`, `product`), crée les tools CRUD pertinents :

```
list_<resource>     — lister les éléments (avec filtres optionnels)
get_<resource>      — récupérer un élément par id
create_<resource>   — créer un élément
update_<resource>   — modifier un élément
delete_<resource>   — supprimer un élément
```

Ajoute également des tools pour les actions métier spécifiques si elles existent (ex: `assign_ticket`, `mark_as_done`, `send_notification`).

### Exemple de tool à implémenter

```javascript
server.tool(
  "create_todo",
  "Crée une nouvelle tâche avec un titre, une description optionnelle et une priorité",
  {
    title: z.string().describe("Titre de la tâche"),
    description: z.string().optional().describe("Description détaillée"),
    priority: z.enum(["low", "medium", "high"]).default("medium")
  },
  async ({ title, description, priority }) => {
    // appelle la logique existante de l'app
    const todo = await createTodo({ title, description, priority });
    return { content: [{ type: "text", text: JSON.stringify(todo) }] };
  }
);
```

---

## Étape 3 — Dockeriser l'application (web app + MCP)

### Règles de dockerisation

- Utilise une image de base légère : `node:22-alpine`
- Copie uniquement les fichiers nécessaires (utilise `.dockerignore`)
- Installe les dépendances en couche séparée pour profiter du cache Docker
- Expose les ports nécessaires : le port de l'API REST et celui du serveur MCP (si HTTP/SSE)
- Monte un volume pour les données persistantes (ex: fichier SQLite, uploads)
- Utilise un `docker-compose.yml` pour simplifier le lancement local

### Fichiers à créer

**`Dockerfile`**
```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

**`.dockerignore`**
```
node_modules
.env
*.log
data/*.db   # si SQLite, géré via volume
```

**`docker-compose.yml`**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data   # persistance des données
    environment:
      - NODE_ENV=production
```

---

## Étape 4 — Configurer Claude Code pour utiliser le MCP

Après la dockerisation, génère la configuration MCP adaptée selon le transport choisi.

### Option A — stdio (Claude Code CLI, conteneur démarré à la demande)

```json
{
  "mcpServers": {
    "<nom-du-service>": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-v", "./data:/app/data", "<nom-image>"]
    }
  }
}
```

### Option B — HTTP/SSE (conteneur toujours actif, Claude web ou CLI)

```json
{
  "mcpServers": {
    "<nom-du-service>": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

Indique à l'utilisateur où placer ce fichier :
- **Claude Code CLI** : `.claude/claude_desktop_config.json` à la racine du projet, ou `~/.claude/claude_desktop_config.json` globalement
- **Claude Desktop** : `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

---

## Résultat attendu

À la fin de ces étapes, l'utilisateur doit pouvoir :

1. Lancer `docker compose up` pour démarrer l'application
2. Ouvrir Claude Code ou Claude et voir les tools MCP disponibles
3. Donner des instructions en langage naturel comme :
   - "Crée une tâche 'Implémenter l'auth JWT' avec priorité haute"
   - "Liste toutes les tâches en cours"
   - "Marque le ticket #12 comme terminé"

Et Claude utilisera automatiquement les tools MCP pour interagir avec l'application.
