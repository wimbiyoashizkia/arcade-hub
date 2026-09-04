console.log('NeonPoi Arcade loaded.');

var toggle = document.getElementById('navToggle');
var navLinks = document.querySelector('.nav-links');

if (toggle && navLinks) {
  toggle.addEventListener('click', function() {
    navLinks.classList.toggle('active');
  });
}

function getBrowserInfo() {
  var ua = navigator.userAgent;
  var info = {
    name: 'Unknown',
    isSafari: false,
    isIOS: false,
    isFirefox: false,
    isChrome: false,
    isEdge: false,
    warning: null
  };

  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) {
    info.name = 'Chrome';
    info.isChrome = true;
  } else if (ua.indexOf('Edg') !== -1) {
    info.name = 'Edge';
    info.isEdge = true;
  } else if (ua.indexOf('Firefox') !== -1) {
    info.name = 'Firefox';
    info.isFirefox = true;
  } else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) {
    info.name = 'Safari';
    info.isSafari = true;
    info.warning = '⚠️ Safari detected - Use Chrome for best experience';
  }

  if (/iPad|iPhone|iPod/.test(ua)) {
    info.isIOS = true;
    if (info.isSafari) {
      info.warning = '⚠️ iOS Safari detected - Use Chrome for best experience';
    }
  }

  return info;
}

function showBrowserWarning(connectionStatusEl) {
  var info = getBrowserInfo();
  if (info.warning && connectionStatusEl) {
    var dot = connectionStatusEl.querySelector('.status-dot');
    var text = connectionStatusEl.querySelector('.status-text');
    if (dot) {
      dot.className = 'status-dot warning';
    }
    if (text) {
      text.textContent = info.warning;
    }
    console.warn('[BROWSER]', info.warning);
  }
  return info;
}

function getConnectionStatus() {
  return document.getElementById('connectionStatus');
}

function updateConnectionStatus(text, status) {
  var connectionStatus = getConnectionStatus();
  if (!connectionStatus) return;
  var dot = connectionStatus.querySelector('.status-dot');
  var textEl = connectionStatus.querySelector('.status-text');
  if (dot) {
    dot.className = 'status-dot ' + status;
  }
  if (textEl) {
    textEl.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var multiplayerControls = document.getElementById('multiplayerControls');
  if (multiplayerControls) {
    var existing = document.getElementById('connectionStatus');
    if (!existing) {
      var html = `
        <div id="connectionStatus" class="connection-status-modern">
          <div class="status-dot disconnected"></div>
          <span class="status-text">Not connected</span>
        </div>
      `;
      multiplayerControls.insertAdjacentHTML('beforeend', html);
      showBrowserWarning(document.getElementById('connectionStatus'));
    }
  }
});
