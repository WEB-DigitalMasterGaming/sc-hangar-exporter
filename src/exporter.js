// The one visible thing this extension does: a Download Hangar button on
// your My Hangar page. Click it, the reader walks your pledge pages, and
// your browser saves hangar.json. No servers, no settings, no tracking.
(function () {
  'use strict';

  if (document.getElementById('sc-hangar-exporter-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'sc-hangar-exporter-btn';
  btn.type = 'button';
  btn.textContent = 'Download Hangar';
  document.body.appendChild(btn);

  var busy = false;
  btn.addEventListener('click', async function () {
    if (busy) return;
    busy = true;
    btn.classList.remove('sche-error');
    try {
      var rows = await window.SCHangarExporter.readHangar(function (page) {
        btn.textContent = 'Reading page ' + page + '…';
      });
      if (!rows.length) {
        throw new Error('no pledges found - are you signed in?');
      }
      var blob = new Blob([JSON.stringify(rows, null, 1)],
                          { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hangar.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
      btn.textContent = 'Saved hangar.json (' + rows.length + ' rows)';
    } catch (e) {
      btn.classList.add('sche-error');
      btn.textContent = 'Export failed: ' + (e && e.message ? e.message : e);
    } finally {
      busy = false;
      setTimeout(function () {
        if (!busy) {
          btn.textContent = 'Download Hangar';
          btn.classList.remove('sche-error');
        }
      }, 8000);
    }
  });
})();
