const CACHE_NAME = "mis-pagos-v10";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css?v=3",
  "./app.js?v=5",
  "./manifest.json?v=5",
  "./icon-mis-pagos-v2.PNG"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});


self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});


self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  /* Navegación: intenta Internet primero */
  if (event.request.mode === "navigate") {

    event.respondWith(
      fetch(event.request)
        .then(response => {

          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then(cache =>
              cache.put("./index.html", copy)
            );

          return response;

        })
        .catch(() =>
          caches.match("./index.html")
        )
    );

    return;
  }


  /* CSS, JS, iconos, manifest, etc. */
  event.respondWith(

    caches.match(event.request)
      .then(cached => {

        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(response => {

            if (
              response
              && response.status === 200
              && response.type !== "opaque"
            ) {

              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(cache =>
                  cache.put(
                    event.request,
                    copy
                  )
                );

            }

            return response;

          });

      })

  );

});