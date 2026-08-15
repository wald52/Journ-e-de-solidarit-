/* pwa.js — enregistrement progressif du service worker.
   Le site reste pleinement fonctionnel si les service workers ne sont pas pris en charge. */

(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });

      // Vérifie les mises à jour à chaque nouvelle session connectée.
      if (navigator.onLine) registration.update().catch(() => {});

      window.addEventListener('online', () => {
        registration.update().catch(() => {});
      });
    } catch (error) {
      // Une PWA est une amélioration progressive : ne jamais bloquer le site.
      console.warn('Service worker non enregistré :', error);
    }
  });
})();
