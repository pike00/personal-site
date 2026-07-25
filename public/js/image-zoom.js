(function () {
  var activeOverlay = null;

  function closeZoom() {
    if (!activeOverlay) return;
    var overlay = activeOverlay;
    activeOverlay = null;
    overlay.style.opacity = '0';
    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 200);
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeZoom();
    }
  }

  function openZoom(img) {
    if (activeOverlay) closeZoom();

    var overlay = document.createElement('div');
    overlay.className = 'image-zoom-overlay';
    overlay.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'right: 0',
      'bottom: 0',
      'z-index: 9999',
      'background: rgba(0, 0, 0, 0.88)',
      'backdrop-filter: blur(4px)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'padding: 1.5rem',
      'cursor: zoom-out',
      'opacity: 0',
      'transition: opacity 0.2s ease-in-out'
    ].join(';');

    var zoomedImg = document.createElement('img');
    zoomedImg.src = img.currentSrc || img.src;
    zoomedImg.alt = img.alt || '';
    zoomedImg.style.cssText = [
      'max-width: 95vw',
      'max-height: 92vh',
      'object-fit: contain',
      'border-radius: 0.5rem',
      'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      'transform: scale(0.96)',
      'transition: transform 0.2s ease-in-out'
    ].join(';');

    overlay.appendChild(zoomedImg);
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      zoomedImg.style.transform = 'scale(1)';
    });

    activeOverlay = overlay;

    overlay.addEventListener('click', closeZoom);
    document.addEventListener('keydown', onKeyDown);
  }

  function initImageZoom() {
    var images = document.querySelectorAll('article img');
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (img.dataset.zoomInitialized) continue;
      img.dataset.zoomInitialized = 'true';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function (e) {
        e.preventDefault();
        openZoom(this);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageZoom);
  } else {
    initImageZoom();
  }
})();
