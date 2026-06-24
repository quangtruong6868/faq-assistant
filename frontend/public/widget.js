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

  // Default: small — just enough for the chat button
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
      'overflow:hidden',
    ].join(';');
  }

  // Open: full chat window size
  function setOpen() {
    iframe.style.cssText = [
      'position:fixed',
      'bottom:0',
      'right:0',
      'width:420px',
      'height:680px',
      'border:none',
      'z-index:2147483647',
      'background:transparent',
      'pointer-events:auto',
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
