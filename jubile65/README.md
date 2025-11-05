# Jubilé 65 – FPMA Paris (React + Vite)

Site statique React/Vite prêt pour déploiement gratuit sur Vercel.

## Développement local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173)

## Build & déploiement

```bash
npm run build
```

Le dossier `dist/` est prêt. Sur **Vercel** :

* Importer le repo GitHub
* Build Command : `npm run build`
* Output Directory : `dist`

## Contenus

* Remplacer les images de `public/assets/` (conserver les mêmes noms de fichiers ou mettre à jour les chemins dans `src/data/events.js`).
* Modifier les textes des événements dans `src/data/events.js`.

## Personnalisation

* Couleurs : dans `styles.css` (`:root`)
* Polices web (Google Fonts) : `index.html`

## Licence

Projet communautaire FPMA Paris.

```
