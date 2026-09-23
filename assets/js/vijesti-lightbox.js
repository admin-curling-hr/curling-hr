// Lightbox za fotografije u vijestima.
// Klik na fotografiju u galeriji vijesti (.foto-grid-vijest) otvara uvećani
// prikaz preko cijelog zaslona s navigacijom lijevo/desno, gumbom za prikaz
// preko cijelog ekrana, brojačem (npr. 2/5) i gumbom za zatvaranje.
// Ne treba nikakvu izmjenu HTML-a galerije — modal se sam ubacuje u stranicu.

(function () {
  document.addEventListener('DOMContentLoaded', init);

  // Sve fotografije u galeriji vijesti nalaze se unutar ".foto-grid-vijest"
  // (jedini, ujednačeni format koji koriste i editor.html i svi članci).
  const PHOTO_SELECTOR = '.foto-grid-vijest img';

  function init() {
    const photoEls = document.querySelectorAll(PHOTO_SELECTOR);
    if (!photoEls.length) return;

    // Skupi sve fotografije sa stranice (iz svih zona/galerija) u jedan niz,
    // redom kojim se pojavljuju u tekstu.
    const photos = [];
    const clickTargets = [];
    photoEls.forEach(img => {
      const index = photos.length;
      photos.push(img.getAttribute('src'));
      clickTargets.push({ el: img.closest('a') || img, index });
    });

    // Ubaci modal u DOM
    const overlay = document.createElement('div');
    overlay.className = 'vijesti-lightbox-overlay';
    overlay.innerHTML = `
      <div class="vijesti-lightbox-modal">
        <button type="button" class="vijesti-lightbox-close" title="Zatvori" aria-label="Zatvori">&times;</button>
        <div class="vijesti-lightbox-stage">
          <button type="button" class="vijesti-lightbox-nav vijesti-lightbox-prev" title="Prethodna" aria-label="Prethodna fotografija">&lsaquo;</button>
          <div class="vijesti-lightbox-frame">
            <img class="vijesti-lightbox-image" alt="">
            <button type="button" class="vijesti-lightbox-fullscreen-btn" title="Prikaži preko cijelog ekrana" aria-label="Cijeli ekran">&#9974;</button>
          </div>
          <button type="button" class="vijesti-lightbox-nav vijesti-lightbox-next" title="Sljedeća" aria-label="Sljedeća fotografija">&rsaquo;</button>
        </div>
        <div class="vijesti-lightbox-counter"></div>
      </div>`;
    document.body.appendChild(overlay);

    const stage = overlay.querySelector('.vijesti-lightbox-stage');
    const imgEl = overlay.querySelector('.vijesti-lightbox-image');
    const counterEl = overlay.querySelector('.vijesti-lightbox-counter');
    const prevBtn = overlay.querySelector('.vijesti-lightbox-prev');
    const nextBtn = overlay.querySelector('.vijesti-lightbox-next');
    const closeBtn = overlay.querySelector('.vijesti-lightbox-close');
    const fsBtn = overlay.querySelector('.vijesti-lightbox-fullscreen-btn');

    let current = 0;

    function render() {
      imgEl.src = photos[current];
      imgEl.alt = `Fotografija ${current + 1}`;
      counterEl.textContent = `${current + 1}/${photos.length}`;
      prevBtn.disabled = photos.length <= 1;
      nextBtn.disabled = photos.length <= 1;
    }

    function open(index) {
      current = index;
      render();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (isFs) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    function nav(delta) {
      current = (current + delta + photos.length) % photos.length;
      render();
    }

    function toggleFullscreen() {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (!isFs) {
        const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
        if (req) req.call(stage);
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    }

    clickTargets.forEach(t => {
      t.el.addEventListener('click', function (e) {
        e.preventDefault();
        open(t.index);
      });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => nav(-1));
    nextBtn.addEventListener('click', () => nav(1));
    fsBtn.addEventListener('click', toggleFullscreen);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    });
  }
})();