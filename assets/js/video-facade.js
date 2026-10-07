/* "Klikni za prikaz" za YouTube videe.
   Dok posjetitelj ne klikne, stranica ne kontaktira YouTube (nema prijenosa IP adrese).
   Na klik se gumb .video-facade zamjenjuje YouTube plejerom (youtube-nocookie.com) i video odmah kreće.

   Oznaka u HTML-u:
     <button type="button" class="video-facade" data-yt="ID_VIDEA" data-title="Naslov">
       <img src="slika.jpg" alt="" loading="lazy">
       <span class="video-caption">
         <span class="video-play" aria-hidden="true"></span>
         <span class="video-text"><strong>Naslov</strong> <span data-hr="..." data-en="...">...</span></span>
       </span>
     </button>
*/
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.video-facade');
  if (!btn || !btn.dataset.yt) return;
  var f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(btn.dataset.yt) + '?autoplay=1&rel=0';
  f.title = btn.dataset.title || 'Video';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  btn.replaceWith(f);
  f.focus();
});
