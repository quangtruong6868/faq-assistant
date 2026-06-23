(function () {
  if (document.getElementById('faq-widget-iframe')) return;

  var iframe = document.createElement('iframe');
  iframe.id = 'faq-widget-iframe';
  iframe.src = 'https://faq-assistant-zeta.vercel.app';
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
