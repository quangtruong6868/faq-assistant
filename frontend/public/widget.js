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
  iframe.style.cssText = [
    'position:fixed',
    'bottom:0',
    'right:0',
    'width:420px',
    'height:100vh',
    'border:none',
    'z-index:2147483647',
    'background:transparent',
    'pointer-events:auto',
  ].join(';');
  iframe.setAttribute('allowtransparency', 'true');
  document.body.appendChild(iframe);
})();
