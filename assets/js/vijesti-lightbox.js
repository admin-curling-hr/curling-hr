// Lightbox za fotografije i YouTube videe u vijestima.
// Klik na fotografiju u galeriji vijesti (.foto-grid-vijest) otvara uvećani
// prikaz preko cijelog zaslona s navigacijom lijevo/desno (strelice, tipke, swipe),
// gumbom za prikaz preko cijelog ekrana, brojačem (npr. 2/5) i gumbom za zatvaranje.
// YouTube videi čine isti niz kao fotografije, redom kojim se pojavljuju u vijesti. Video je u galeriji
// sličica iste veličine kao fotke (.foto-grid-vijest .video-tile); klik na nju otvara ovaj prozor na tom
// videu: prikaže se sličica s play gumbom, a tek klikom na nju učitava se YouTube (do tada nema
// kontakta s Googleom). Do videa se može doći i strelicom/swipeom s fotke.
// Starije vijesti imaju video u punoj širini teksta (.vijest-video .video-facade): on se i dalje pokreće
// jednim klikom na mjestu, a u nizu je ovog prozora kao i ostali.
// Ne treba nikakvu izmjenu HTML-a galerije — modal se sam ubacuje u stranicu.

(function () {
  document.addEventListener('DOMContentLoaded', init);

  // Sve fotografije u galeriji vijesti nalaze se unutar ".foto-grid-vijest"
  // (jedini, ujednačeni format koji koriste i editor.html i svi članci).
  const PHOTO_SELECTOR = '.foto-grid-vijest img';
  // Videi: sličica u galeriji (novije vijesti, otvara ovaj prozor) i video u punoj širini teksta
  // (starije vijesti, vidi video-facade.js); oboje ulaze u isti niz kao fotografije.
  const VIDEO_SELECTOR = '.foto-grid-vijest .video-tile, .vijest-video .video-facade';

  function init() {
    // Skupi sve fotografije i videe sa stranice u jedan niz, redom kojim se pojavljuju u tekstu
    // (querySelectorAll sa zarezom vraća elemente baš u redoslijedu dokumenta).
    const items = [];
    const clickTargets = [];
    document.querySelectorAll(PHOTO_SELECTOR + ', ' + VIDEO_SELECTOR).forEach(el => {
      if (el.matches(VIDEO_SELECTOR)) {
        if (!el.dataset.yt) return;
        const poster = el.querySelector('img');
        const isTile = el.classList.contains('video-tile');
        const index = items.length;
        items.push({
          type: 'yt',
          id: el.dataset.yt,
          caption: el.dataset.title || '',
          poster: poster ? poster.getAttribute('src') : '',
          okomit: el.classList.contains('video-tile-okomit') || el.classList.contains('video-facade-okomit')
        });
        if (isTile) clickTargets.push({ el, index });   // sličica u galeriji otvara prozor
        return;
      }
      if (el.closest('.video-tile')) return;   // poster unutar sličice videa nije fotografija
      const index = items.length;
      items.push({
        type: 'photo',
        src: el.getAttribute('src'),
        // Opis fotografije, ako postoji (alt/title na <img> elementu galerije).
        caption: el.getAttribute('alt') || el.getAttribute('title') || ''
      });
      clickTargets.push({ el: el.closest('a') || el, index });
    });

    // Ubaci modal u DOM
    // Bez fotografija i bez sličica videa u galeriji prozor nije potreban (stari video u tekstu pokreće se na mjestu).
    if (!clickTargets.length) return;

    const overlay = document.createElement('div');
    overlay.className = 'vijesti-lightbox-overlay';
    overlay.innerHTML = `
      <div class="vijesti-lightbox-modal">
        <div class="vijesti-lightbox-stage">
          <div class="vijesti-lightbox-body">
            <div class="vijesti-lightbox-frame">
              <img class="vijesti-lightbox-image" alt="">
              <button type="button" class="vijesti-lightbox-nav vijesti-lightbox-prev" title="Prethodna" aria-label="Prethodna fotografija">&lsaquo;</button>
              <button type="button" class="vijesti-lightbox-nav vijesti-lightbox-next" title="Sljedeća" aria-label="Sljedeća fotografija">&rsaquo;</button>
              <button type="button" class="vijesti-lightbox-close" title="Zatvori" aria-label="Zatvori">&times;</button>
              <button type="button" class="vijesti-lightbox-fullscreen-btn" title="Prikaži preko cijelog ekrana" aria-label="Cijeli ekran">&#9974;</button>
            </div>
            <div class="vijesti-lightbox-footer">
              <div class="vijesti-lightbox-caption"></div>
              <div class="vijesti-lightbox-counter"></div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const stage = overlay.querySelector('.vijesti-lightbox-stage');
    const bodyEl = overlay.querySelector('.vijesti-lightbox-body');
    const frameEl = overlay.querySelector('.vijesti-lightbox-frame');
    const imgEl = overlay.querySelector('.vijesti-lightbox-image');
    const captionEl = overlay.querySelector('.vijesti-lightbox-caption');
    const counterEl = overlay.querySelector('.vijesti-lightbox-counter');
    const prevBtn = overlay.querySelector('.vijesti-lightbox-prev');
    const nextBtn = overlay.querySelector('.vijesti-lightbox-next');
    const closeBtn = overlay.querySelector('.vijesti-lightbox-close');
    const fsBtn = overlay.querySelector('.vijesti-lightbox-fullscreen-btn');

    let current = 0;
    let mediaEl = null;   // pločica ili iframe trenutnog videa (kad je prikazan video)

    function clearVideo() {
      // Uklanjanje iframea odmah zaustavlja video i zvuk.
      if (mediaEl) { mediaEl.remove(); mediaEl = null; }
    }

    function isEnglish() {
      try { return localStorage.getItem('hcs-lang') === 'en'; } catch (e) { return false; }
    }

    // Klik na sličicu: tek tada se učitava YouTube plejer (youtube-nocookie.com) i video kreće.
    // Namjerno bez focus(): kad fokus uđe u iframe, tipka Esc ne stiže do stranice i prozor se ne bi zatvarao.
    function startVideo(btn) {
      const f = document.createElement('iframe');
      f.className = 'vijesti-lightbox-player';
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(btn.dataset.yt) + '?autoplay=1&rel=0&playsinline=1';
      f.title = btn.dataset.title || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      btn.replaceWith(f);
      mediaEl = f;
    }

    function renderVideo(it) {
      // Okomiti video ima stalan omjer 9:16 (kao u tekstu vijesti); vodoravni preuzima omjer sličice.
      leaveFullscreen();   // video ima vlastiti gumb za cijeli ekran unutar YouTube plejera
      bodyEl.classList.add('video-body');
      bodyEl.style.setProperty('--ar', it.okomit ? '0.5625' : '1.7778');
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      fsBtn.hidden = true;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vijesti-lightbox-yt';
      btn.dataset.yt = it.id;
      btn.dataset.title = it.caption;
      btn.setAttribute('aria-label', it.caption || 'Video');
      if (it.poster) {
        const im = document.createElement('img');
        im.alt = '';
        if (it.okomit) im.className = 'cover';
        im.addEventListener('load', () => {
          if (!it.okomit && im.naturalWidth && im.naturalHeight) {
            bodyEl.style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(4));
          }
        });
        im.addEventListener('error', () => im.remove());   // bez sličice ostaje tamna pločica
        im.src = it.poster;
        btn.appendChild(im);
      }
      const cap = document.createElement('span');
      cap.className = 'vijesti-lightbox-yt-caption';
      const play = document.createElement('span');
      play.className = 'vijesti-lightbox-yt-play';
      play.setAttribute('aria-hidden', 'true');
      const txt = document.createElement('span');
      txt.textContent = isEnglish()
        ? 'Clicking the image loads the video from YouTube.'
        : 'Klikom na sliku učitava se video s YouTubea.';
      cap.appendChild(play);
      cap.appendChild(txt);
      btn.appendChild(cap);
      btn.addEventListener('click', () => startVideo(btn));
      frameEl.insertBefore(btn, frameEl.firstChild);
      mediaEl = btn;
    }

    function render() {
      const it = items[current];
      clearVideo();
      if (it.type === 'yt') {
        renderVideo(it);
      } else {
        bodyEl.classList.remove('video-body');
        bodyEl.style.removeProperty('--ar');
        imgEl.hidden = false;
        fsBtn.hidden = false;
        imgEl.src = it.src;
        imgEl.alt = `Fotografija ${current + 1}`;
      }
      captionEl.textContent = it.caption || '';
      counterEl.textContent = `${current + 1}/${items.length}`;
      prevBtn.disabled = items.length <= 1;
      nextBtn.disabled = items.length <= 1;
    }

    // Ako se video iz teksta upravo reproducira, pauziraj ga dok je prozor otvoren
    // (video-facade.js plejer dobiva enablejsapi=1, pa prihvaća naredbu pauze).
    function pauseInlineVideos() {
      document.querySelectorAll('.vijest-video iframe').forEach(f => {
        try { f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (e) {}
      });
    }

    function open(index) {
      pauseInlineVideos();
      current = index;
      render();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function leaveFullscreen() {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (isFs) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
      stage.classList.remove('pseudo-fullscreen');
    }

    function close() {
      leaveFullscreen();
      clearVideo();
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    function nav(delta) {
      current = (current + delta + items.length) % items.length;
      render();
    }

    function toggleFullscreen() {
      // Safari na iPhoneu (i iOS općenito) ne podržava Fullscreen API za obične
      // elemente (samo za <video>), pa requestFullscreen/webkitRequestFullscreen
      // tamo ne postoje - u tom slučaju ručno prebacujemo CSS klasu koja postiže
      // isti vizualni rezultat (crna pozadina, fotka preko cijelog zaslona) bez
      // oslanjanja na tu metodu. Na desktopu/Androidu ništa se ne mijenja - i dalje
      // se koristi prava Fullscreen API metoda kao i do sada.
      const supportsFullscreenApi = !!(stage.requestFullscreen || stage.webkitRequestFullscreen);
      if (!supportsFullscreenApi) {
        stage.classList.toggle('pseudo-fullscreen');
        return;
      }
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

    // Swipe prstom lijevo/desno na mobitelu (uz strelice): prethodna/sljedeća fotografija.
    // Okomito pomicanje i uvećavanje (pinch) ne okidaju prelazak.
    let sx = 0, sy = 0, tracking = false;
    overlay.addEventListener('touchstart', (e) => {
      tracking = e.touches.length === 1 && !!e.target.closest('.vijesti-lightbox-frame, .vijesti-lightbox-footer');
      if (tracking) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    }, { passive: true });
    overlay.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
    overlay.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      if (window.visualViewport && window.visualViewport.scale > 1.05) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      nav(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    });
  }
})();