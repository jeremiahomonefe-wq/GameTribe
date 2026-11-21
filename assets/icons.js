(function () {
  'use strict';
  var paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    gamepad: '<path d="M6.5 8h11a3 3 0 0 1 2.9 2.25l.95 3.55A2.5 2.5 0 0 1 19 17h-1.2a2 2 0 0 1-1.7-.95L15 14H9l-1.1 2.05a2 2 0 0 1-1.7.95H5a2.5 2.5 0 0 1-2.35-3.2l.95-3.55A3 3 0 0 1 6.5 8Z"/><path d="M7 12h4M9 10v4M17 11h.01M19 13h.01"/>',
    play: '<path d="m9 8 7 4-7 4z"/><circle cx="12" cy="12" r="9"/>',
    images: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.3"/><path d="m4 17 5-5 3.5 3 2.5-2.5 5 4.5"/>',
    users: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 1 0-1.3-5.7M21 20v-1.5a4 4 0 0 0-2.7-3.8"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1 .9-1.9 1.4-1.9 2.6M12 17h.01"/>',
    message: '<path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-3.5A3 3 0 0 1 3 15V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/>',
    megaphone: '<path d="m3 11 14-6v14L3 13zM17 9h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M6 14l1.5 5h3L9 13"/>',
    bag: '<path d="M5 8h14l-1 12H6zM9 9V6a3 3 0 0 1 6 0v3"/>',
    ticket: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM12 7v10"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    chart: '<path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16V5"/>',
    handshake: '<path d="m8 12 3 3a2 2 0 0 0 3 0l4-4M3 8l3-3 5 5 2-2a3 3 0 0 1 4.2 0L21 12M3 8l4 4-2 2a2 2 0 0 1-2.8 0L1 12z"/>',
    store: '<path d="M3 10h18l-1-5H4zM5 10v10h14V10M9 20v-6h6v6"/><path d="M3 5v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V5"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="14" r="3"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M7 10h.01M17 14h.01"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    flag: '<path d="M5 21V4M5 5c4-3 6 3 10 0v9c-4 3-6-3-10 0"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4"/>'
  };
  function paint(node) {
    var name = node.getAttribute('data-gt-icon');
    if (!name || node.getAttribute('data-gt-icon-ready') === 'true') return;
    node.classList.add('gt-icon');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('data-gt-icon-ready', 'true');
    node.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' + (paths[name] || paths.info) + '</svg>';
  }
  function render(root) {
    if (!root) return;
    if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute('data-gt-icon')) paint(root);
    var nodes = root.querySelectorAll ? root.querySelectorAll('[data-gt-icon]') : [];
    for (var i = 0; i < nodes.length; i++) paint(nodes[i]);
  }
  window.gtIcons = { render: render };
  document.addEventListener('DOMContentLoaded', function () {
    render(document);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        for (var i = 0; i < record.addedNodes.length; i++) render(record.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
}());
