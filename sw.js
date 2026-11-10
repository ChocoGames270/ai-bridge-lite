/* AI Bridge Lite - Service Worker (Repositorio 1: Landing)
   Rutas relativas al alcance del SW: funciona en la subruta de GitHub Pages.
   Sube CACHE_VERSION cada vez que cambies archivos de la web. */
"use strict";

const CACHE_VERSION = "v2";
const CACHE_NAME = "aibl-cache-" + CACHE_VERSION;

const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/web.js",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

const aUrl = (ruta) => new URL(ruta, self.registration.scope).href;

// Instalación: guarda cada archivo por separado (si uno falta, no se cae todo).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ARCHIVOS.map((ruta) =>
          cache.add(aUrl(ruta)).catch(() => {
            console.log("[SW] No se pudo guardar en caché:", ruta);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Activación: borra cachés de versiones anteriores y toma el control.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((k) => k.startsWith("aibl-cache-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Peticiones: red primero, caché como respaldo sin conexión.
// Solo archivos propios (GET). Cualquier otro dominio (APIs, Repo 2) pasa directo.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Solo lo que cuelga de la subruta de este repositorio.
  if (!req.url.startsWith(self.registration.scope)) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return resp;
      })
      .catch(() =>
        // ignoreSearch: "styles.css?v=6" y "styles.css" cuentan como el mismo archivo
        caches.match(req, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match(aUrl("index.html"));
          return Response.error();
        })
      )
  );
});
