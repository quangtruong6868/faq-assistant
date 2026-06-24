(function () {
  if (document.getElementById('th-widget-iframe')) return;

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var siteKey = (script && script.getAttribute('data-site')) || 'th-group';

  var iframe = document.createElement('iframe');
  iframe.id = 'th-widget-iframe';
  iframe.src = 'https://faq-assistant-zeta.vercel.app?site=' + encodeURIComponent(siteKey);
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('frameborder', '0');

  // Closed: just the button
  function setSmall() {
    iframe.style.cssText = [
      'position:fixed',
      'bottom:0',
      'right:0',
      'width:260px',
      'height:80px',
      'border:none',
      'z-index:2147483647',
      'background:transparent',
      'pointer-events:auto',
    ].join(';');
  }

  // Open: chat panel positioned bottom-right with padding
  function setOpen() {
    var w = Math.min(400, window.innerWidth - 24);
    var h = Math.min(620, window.innerHeight - 24);
    iframe.style.cssText = [
      'position:fixed',
      'bottom:12px',
      'right:12px',
      'width:' + w + 'px',
      'height:' + h + 'px',
      'border:none',
      'z-index:2147483647',
      'background:transparent',
      'pointer-events:auto',
      'border-radius:16px',
      'box-shadow:0 20px 60px rgba(0,0,0,0.2)',
    ].join(';');
  }

  setSmall();
  document.body.appendChild(iframe);

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'th-widget-open') setOpen();
    else if (e.data.type === 'th-widget-close') setSmall();
  });
})();
