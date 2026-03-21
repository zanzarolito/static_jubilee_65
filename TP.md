# TP — Créer un serveur MCP pour une application Todo

> **Objectif** : Apprendre à construire un serveur MCP (Model Context Protocol) en TypeScript, étape par étape, en exposant une application Todo existante comme ensemble d'outils utilisables par un LLM.

---

## 0. Prérequis

### Outils nécessaires

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| Node.js | >= 18 | `node --version` |
| npm | >= 9 | `npm --version` |
| Git | >= 2.x | `git --version` |
| GitHub CLI (optionnel) | >= 2.x | `gh --version` |

### Vérifier votre installation

```bash
node --version   # doit afficher v18.x.x ou supérieur
npm --version    # doit afficher 9.x.x ou supérieur
git --version    # doit afficher git version 2.x.x
```

### Connaissances supposées

- Notions de base en TypeScript (types, interfaces, async/await)
- Compréhension des API REST (GET, POST, PATCH, DELETE)
- Avoir lu la [documentation officielle MCP](https://modelcontextprotocol.io/introduction)

### Cloner le dépôt

```bash
git clone https://github.com/VOTRE_USERNAME/mcp-todo-server.git
cd mcp-todo-server
```

---

## 1. Comprendre MCP en 5 minutes

### Le schéma général

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOST (ex: Claude Desktop)               │
│                                                                 │
│   ┌───────────────┐         ┌──────────────────────────────┐   │
│   │  LLM / Claude │◄───────►│       MCP Client             │   │
│   └───────────────┘         └──────────────┬───────────────┘   │
│                                            │ stdio / HTTP SSE   │
└────────────────────────────────────────────┼───────────────────┘
                                             │
                              ┌──────────────▼───────────────┐
                              │       MCP Server             │
                              │   (notre serveur Node.js)    │
                              └──────────────┬───────────────┘
                                             │ HTTP fetch
                              ┌──────────────▼───────────────┐
                              │     Todo App (Express)       │
                              │     localhost:3000           │
                              └──────────────┬───────────────┘
                                             │
                              ┌──────────────▼───────────────┐
                              │     SQLite (tasks.db)        │
                              └──────────────────────────────┘
```

**Flux d'une requête :**
1. L'utilisateur demande à Claude : *"Ajoute une tâche : acheter du lait"*
2. Claude (via le MCP Client) appelle l'outil `add_task` du MCP Server
3. Le MCP Server fait un `POST /tasks` sur l'API Todo
4. L'API Todo insère la tâche dans SQLite et répond
5. Le MCP Server retourne le résultat à Claude
6. Claude répond à l'utilisateur

### Les 3 primitives MCP

| Primitive | Rôle | Ce TP |
|-----------|------|-------|
| **Tools** (Outils) | Actions que le LLM peut déclencher | ✅ Focus principal |
| **Resources** (Ressources) | Données que le LLM peut lire (lecture seule) | 🔭 Voir section 6 |
| **Prompts** | Templates de prompts réutilisables | 🔭 Voir section 6 |

### stdio vs HTTP transport

| Transport | Quand l'utiliser |
|-----------|-----------------|
| **stdio** | Client local (Claude Desktop, Claude Code CLI) — le client lance le serveur comme sous-processus |
| **HTTP/SSE** | Serveur distant, multi-clients, déploiement cloud |

Pour ce TP, nous utilisons **stdio** : c'est le plus simple, et compatible avec tous les clients MCP locaux.

---

## 2. Démarrer l'application Todo

### Installation et lancement

```bash
cd todo-app
npm install
npm run dev
```

Vous devriez voir :
```
✅ Todo API running at http://localhost:3000
   Open http://localhost:3000 in your browser to use the app.
```

### Explorer l'UI

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.
Vous pouvez ajouter, compléter et supprimer des tâches.

### Tester l'API manuellement

Ouvrez un second terminal et testez les endpoints :

```bash
# Lister toutes les tâches
curl http://localhost:3000/tasks

# Créer une tâche
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Acheter du lait", "description": "Au supermarché"}'

# Marquer la tâche #1 comme done
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Lister seulement les tâches en cours
curl "http://localhost:3000/tasks?status=pending"

# Supprimer la tâche #1
curl -X DELETE http://localhost:3000/tasks/1
```

### Structure du backend

```
todo-app/src/
├── server.ts        # Point d'entrée Express + middleware
├── db.ts            # Couche d'accès SQLite (better-sqlite3)
└── routes/
    └── tasks.ts     # Handlers REST pour les 5 endpoints
```

---

## 3. Anatomie d'un serveur MCP (lecture de code guidée)

### Le point d'entrée : `mcp-server/src/index.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListTasks } from "./tools/listTasks.js";
// ... autres imports

// 1. Création du serveur avec ses métadonnées
const server = new McpServer({
  name: "todo-mcp-server",
  version: "1.0.0",
});

// 2. Enregistrement des outils
registerListTasks(server);
registerAddTask(server);
// ...

// 3. Connexion via stdio et démarrage
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Points clés :**
- `McpServer` est la classe principale du SDK MCP
- `StdioServerTransport` lit sur stdin et écrit sur stdout
- Chaque outil est enregistré via une fonction dédiée
- `console.error()` pour les logs (stdout est réservé au protocole MCP !)

### Comment un tool est déclaré

La signature de `server.tool()` est :

```typescript
server.tool(
  "nom_de_loutil",           // Identifiant unique
  "Description pour le LLM", // Ce que l'outil fait (le LLM lit ça !)
  { /* schema Zod */ },      // Paramètres d'entrée
  async (params) => { ... }  // Handler asynchrone
);
```

**Le format de retour :**

```typescript
// Succès
return {
  content: [{ type: "text", text: "Résultat sous forme de texte" }]
};

// Erreur
return {
  isError: true,
  content: [{ type: "text", text: "Message d'erreur" }]
};
```

### Lire `listTasks.ts` ensemble

Ouvrez `mcp-server/src/tools/listTasks.ts` et lisez-le attentivement.

```typescript
// 1. Schéma Zod — définit les paramètres acceptés par l'outil
const listTasksSchema = {
  status: z
    .enum(["all", "done", "pending"])
    .optional()
    .default("all")
    .describe('Filter tasks by status: "all", "done", or "pending"'),
};

// 2. Enregistrement de l'outil
export function registerListTasks(server: McpServer): void {
  server.tool(
    "list_tasks",
    "Returns all tasks from the Todo app...",
    listTasksSchema,
    async ({ status }) => {
      // 3. Appel à l'API REST (pas d'accès direct à la DB !)
      const response = await fetch(`${TODO_API}/tasks?status=${status}`);

      // 4. Gestion des erreurs HTTP
      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed: HTTP ${response.status}` }],
        };
      }

      // 5. Retourner le résultat en JSON stringifié
      const tasks = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    }
  );
}
```

**Pourquoi passer par l'API REST plutôt que la DB directement ?**
- Séparation des responsabilités (le MCP server ne connaît pas le schéma DB)
- Réutilisabilité (on peut remplacer SQLite par PostgreSQL sans changer le MCP server)
- Validation centralisée dans l'API

---

## 4. Exercices progressifs

### Avant de commencer

Dans un terminal, démarrez l'application Todo :
```bash
cd todo-app && npm install && npm run dev
```

Dans un autre terminal, installez les dépendances du serveur MCP :
```bash
cd mcp-server && npm install
```

---

### Étape 1 — Lister les tâches (fourni, à lire)

Le tool `list_tasks` est déjà implémenté dans `mcp-server/src/tools/listTasks.ts`.

**Lisez-le** en vous aidant de l'explication de la section 3.

#### ✅ Checkpoint — Tester avec le protocole MCP brut

```bash
cd mcp-server

# Lister les outils disponibles
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts

# Appeler list_tasks
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"all"}}}' | npx tsx src/index.ts
```

**Résultat attendu pour `tools/list`** (tronqué) :
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      { "name": "list_tasks", ... },
      { "name": "add_task", ... },
      { "name": "complete_task", ... },
      { "name": "delete_task", ... }
    ]
  }
}
```

---

### Étape 2 — Ajouter une tâche (guidé)

Ouvrez `mcp-server/src/tools/addTask.ts`. La structure est fournie, étudiez comment le handler fait un `POST` sur `/tasks`.

**Votre mission :** Comprendre et être capable d'expliquer :
1. Pourquoi utilise-t-on `z.string().min(1)` plutôt que `z.string()` ?
2. Que se passe-t-il si l'API retourne un code 400 ?
3. Pourquoi `description` est-il `optional()` dans le schéma Zod ?

#### Indice si vous êtes bloqué

<details>
<summary>Voir l'indice</summary>

Le schéma Zod du tool doit correspondre exactement au corps JSON que l'API attend.
L'API `POST /tasks` accepte `{ title: string, description?: string }`.

```typescript
const addTaskSchema = {
  title: z.string().min(1).describe("..."),
  description: z.string().optional().describe("..."),
};
```

`min(1)` garantit que le titre n'est pas vide — Zod valide avant même d'appeler le handler.

</details>

#### ✅ Checkpoint

```bash
cd mcp-server
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add_task","arguments":{"title":"Apprendre MCP","description":"Faire le TP complet"}}}' | npx tsx src/index.ts
```

**Résultat attendu :**
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "Task created successfully:\n{\n  \"id\": 1,\n  \"title\": \"Apprendre MCP\", ..."
    }]
  }
}
```

---

### Étape 3 — Compléter une tâche (autonome avec spec)

**Spec fonctionnelle :**

- Nom du tool : `complete_task`
- Description : *"Marks a task as done in the Todo app."*
- Paramètre d'entrée : `{ id: number }` — entier positif
- Comportement :
  - Fait un `PATCH /tasks/:id` avec `{ "done": true }`
  - Si la tâche n'existe pas (HTTP 404) → retourner `isError: true` avec message explicite
  - Si succès → retourner la tâche mise à jour sous forme JSON
- Le fichier à compléter : `mcp-server/src/tools/completeTask.ts`

**Questions à se poser avant de coder :**
1. Quel type Zod utiliser pour un identifiant entier positif ?
2. Comment distinguer un 404 (tâche inexistante) d'une autre erreur HTTP ?

#### Indice

<details>
<summary>Voir l'indice sur le schéma Zod</summary>

```typescript
const completeTaskSchema = {
  id: z.number().int().positive().describe("The task ID"),
};
```

</details>

<details>
<summary>Voir l'indice sur le fetch</summary>

```typescript
const response = await fetch(`${TODO_API}/tasks/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ done: true }),
});
```

</details>

#### ✅ Checkpoint

D'abord, créez une tâche pour avoir un ID à utiliser :
```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"add_task","arguments":{"title":"Test complete"}}}' | npx tsx src/index.ts
# Notez l'id retourné (ex: 2)

# Puis complétez-la
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"complete_task","arguments":{"id":2}}}' | npx tsx src/index.ts
```

---

### Étape 4 — Supprimer une tâche (libre)

**Spec :**

- Nom : `delete_task`
- Paramètre : `{ id: number }`
- Appel API : `DELETE /tasks/:id`
- L'API retourne 204 (No Content) si succès, 404 si la tâche n'existe pas
- Retourner un message de confirmation : `"Task #X has been permanently deleted."`

**⚠️ Attention :** L'API retourne 204 avec un body vide. Ne pas appeler `.json()` sur une réponse 204 !

#### ✅ Checkpoint final

```bash
# Lister les tâches pour trouver un id
echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_tasks","arguments":{}}}' | npx tsx src/index.ts

# Supprimer la tâche (remplacez X par un id existant)
echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"delete_task","arguments":{"id":X}}}' | npx tsx src/index.ts

# Vérifier qu'elle n'existe plus
echo '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"list_tasks","arguments":{}}}' | npx tsx src/index.ts
```

---

## 5. Connecter à un client MCP

### Claude Desktop

1. Trouvez le chemin absolu de votre projet :
   ```bash
   pwd  # depuis le dossier mcp-todo-server
   ```

2. Ouvrez le fichier de configuration Claude Desktop :
   - **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

3. Ajoutez la configuration (remplacez `/CHEMIN/ABSOLU/VERS` par votre chemin réel) :
   ```json
   {
     "mcpServers": {
       "todo": {
         "command": "npx",
         "args": [
           "tsx",
           "/CHEMIN/ABSOLU/VERS/mcp-todo-server/mcp-server/src/index.ts"
         ],
         "env": {
           "TODO_API_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```

4. Redémarrez Claude Desktop.

5. Vérifiez que le serveur est connecté : une icône 🔧 doit apparaître dans l'interface.

6. Testez dans une conversation Claude :
   > *"Liste mes tâches"*
   > *"Ajoute une tâche : préparer la réunion de demain"*
   > *"Marque la tâche 1 comme terminée"*

### Claude Code (CLI)

```bash
# Assurez-vous d'être dans le dossier racine du projet
claude mcp add todo -- npx tsx $(pwd)/mcp-server/src/index.ts

# Vérifier que le serveur est enregistré
claude mcp list

# Lancer une session Claude Code avec le serveur MCP
claude
```

Dans la session, testez :
```
> liste mes tâches todo
> ajoute la tâche "revoir les docs MCP"
```

### Cursor

Dans Cursor, allez dans **Settings > MCP** et ajoutez :

```json
{
  "mcp": {
    "servers": {
      "todo": {
        "command": "npx tsx /CHEMIN/ABSOLU/mcp-todo-server/mcp-server/src/index.ts",
        "env": { "TODO_API_URL": "http://localhost:3000" }
      }
    }
  }
}
```

Consultez la [documentation Cursor MCP](https://docs.cursor.com/context/model-context-protocol) pour plus de détails.

### Zed

Consultez la [documentation Zed MCP](https://zed.dev/docs/assistant/model-context-protocol) pour la configuration spécifique à Zed.

---

## 6. Aller plus loin

### Ajouter une Resource MCP

Les Resources permettent d'exposer des données lisibles (en lecture seule) au LLM, comme un système de fichiers.

```typescript
// Dans mcp-server/src/index.ts, après les tools :
server.resource(
  "tasks://all",
  "tasks://all",
  async (uri) => {
    const res = await fetch("http://localhost:3000/tasks");
    const tasks = await res.json();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(tasks, null, 2),
      }],
    };
  }
);
```

### Ajouter un Prompt MCP

Les Prompts sont des templates réutilisables que l'utilisateur peut invoquer :

```typescript
server.prompt(
  "daily-review",
  "Generate a daily task review",
  {},
  async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: "Please list my pending tasks and suggest which ones to prioritize today.",
      },
    }],
  })
);
```

### Passer au transport HTTP/SSE

Pour un usage multi-clients ou déploiement distant :

```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();
const transport = new SSEServerTransport("/mcp", res);
app.get("/mcp", async (req, res) => {
  await server.connect(transport);
});
```

### Idées d'extensions

- **Priorités** : ajouter un champ `priority: "low" | "medium" | "high"` et un tool `set_priority`
- **Dates d'échéance** : `due_date` avec un tool `list_overdue_tasks`
- **Tags** : système de tags avec filtrage
- **Statistiques** : tool `get_stats` retournant le nombre de tâches par statut
- **Recherche** : tool `search_tasks` avec recherche plein texte

---

## Annexe — Solutions complètes

> ⚠️ **Ne consultez cette annexe qu'après avoir essayé par vous-même !**

### Solution complète : `completeTask.ts`

<details>
<summary>Voir la solution</summary>

```typescript
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

const completeTaskSchema = {
  id: z
    .number()
    .int()
    .positive("id must be a positive integer")
    .describe("The numeric ID of the task to mark as complete"),
};

export function registerCompleteTask(server: McpServer): void {
  server.tool(
    "complete_task",
    "Marks a task as done in the Todo app. Use list_tasks first to find the task ID.",
    completeTaskSchema,
    async ({ id }) => {
      const response = await fetch(`${TODO_API}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });

      if (response.status === 404) {
        return {
          isError: true,
          content: [{ type: "text", text: `Task with ID ${id} not found.` }],
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isError: true,
          content: [
            { type: "text", text: `Failed to complete task: HTTP ${response.status} — ${errorText}` },
          ],
        };
      }

      const task = await response.json();
      return {
        content: [
          { type: "text", text: `Task #${id} marked as done:\n${JSON.stringify(task, null, 2)}` },
        ],
      };
    }
  );
}
```

</details>

### Solution complète : `deleteTask.ts`

<details>
<summary>Voir la solution</summary>

```typescript
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

const deleteTaskSchema = {
  id: z
    .number()
    .int()
    .positive("id must be a positive integer")
    .describe("The numeric ID of the task to delete"),
};

export function registerDeleteTask(server: McpServer): void {
  server.tool(
    "delete_task",
    "Permanently deletes a task from the Todo app. This action cannot be undone.",
    deleteTaskSchema,
    async ({ id }) => {
      const response = await fetch(`${TODO_API}/tasks/${id}`, {
        method: "DELETE",
      });

      if (response.status === 404) {
        return {
          isError: true,
          content: [{ type: "text", text: `Task with ID ${id} not found.` }],
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isError: true,
          content: [
            { type: "text", text: `Failed to delete task: HTTP ${response.status} — ${errorText}` },
          ],
        };
      }

      // 204 No Content — no body to parse
      return {
        content: [{ type: "text", text: `Task #${id} has been permanently deleted.` }],
      };
    }
  );
}
```

</details>

---

*Happy coding ! Si vous avez des questions, ouvrez une issue sur le dépôt GitHub.*
