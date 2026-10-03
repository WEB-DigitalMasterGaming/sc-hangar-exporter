// The hangar reader: parses the pledge list the My Hangar page already
// shows you, page by page, entirely in your browser with your own session.
// Nothing leaves your machine - the result becomes a local hangar.json.
//
// This is the same reader the SC Ship Database app uses for its in-app
// "Connect to RSI" import, so the two stay in lockstep when RSI's markup
// changes. The export-from-the-hangar-page idea was pioneered by
// HangarXPLOR; this is an independent implementation.
(function () {
  'use strict';

  // One pledge page's rows appended to out. Works on attached documents
  // and on the DETACHED ones DOMParser returns (where getComputedStyle is
  // useless - the inline style attribute is the source of truth).
  function parsePledgePage(root, out) {
    var items = root.querySelectorAll('.list-items > li');
    var firstId = null;
    items.forEach(function (li) {
      var val = function (sel) {
        var el = li.querySelector(sel);
        return el ? el.value : null;
      };
      var pledgeName = val('.js-pledge-name') || '';
      var pledgeId = val('.js-pledge-id');
      if (firstId === null) firstId = pledgeId;
      var pledgeCost = val('.js-pledge-value');
      var dateEl = li.querySelector('.date-col');
      var pledgeDate = dateEl
          ? dateEl.textContent.replace(/created:\s*/i, '').trim()
          : null;
      var lti = false;
      li.querySelectorAll('.title').forEach(function (t) {
        if (t.textContent.indexOf('Lifetime Insurance') >= 0) lti = true;
      });
      var warbond = pledgeName.toLowerCase().indexOf('warbond') >= 0;

      var grabImage = function (item) {
        var scope = [item, item.parentElement];
        for (var i = 0; i < scope.length; i++) {
          var el = scope[i];
          if (!el) continue;
          var imgDiv = el.querySelector('.image');
          if (imgDiv) {
            var bg = imgDiv.style.backgroundImage || '';
            if (!bg) {
              try { bg = getComputedStyle(imgDiv).backgroundImage || ''; } catch (e) {}
            }
            var m = bg.match(/url\(["']?([^"')]+)/);
            if (m) return m[1];
          }
          var img = el.querySelector('img');
          if (img && (img.src || img.dataset.src)) return img.src || img.dataset.src;
        }
        return null;
      };
      var absolutise = function (image) {
        return image && image.indexOf('/') === 0
            ? 'https://robertsspaceindustries.com' + image
            : image;
      };

      li.querySelectorAll('.kind').forEach(function (kindEl) {
        var kind = kindEl.textContent.trim();
        var item = kindEl.parentElement;
        var titleEl = item.querySelector('.title');
        var title = titleEl ? titleEl.textContent.trim() : '';
        if (!title) return;
        var linerSpan = item.querySelector('.liner span');
        var liner = item.querySelector('.liner');
        var base = {
          lti: lti, warbond: warbond,
          pledge_id: pledgeId, pledge_name: pledgeName,
          pledge_date: pledgeDate, pledge_cost: pledgeCost,
        };
        var mfr = {
          manufacturer_code: linerSpan ? linerSpan.textContent.trim() : null,
          manufacturer_name: liner
              ? liner.textContent
                  .replace(linerSpan ? linerSpan.textContent : '', '').trim()
              : null,
        };
        if (kind === 'Ship') {
          out.push(Object.assign({
            entity_type: 'ship',
            name: title.replace(/^(?:Aegis|Anvil|Aopoa|Banu|CNOU|Crusader|Drake|Greycat Industrial|Greycat|Esperia|Gatac|Kruger|MISC|Mirai|Origin|RSI|Tumbril|Vanduul|Xi'an)[^a-z0-9]+/i, '').trim(),
          }, mfr, base));
        } else if (kind.indexOf('Skin') >= 0 || kind.indexOf('Paint') >= 0
                   || title.indexOf('Livery Upgrade') >= 0) {
          out.push(Object.assign({
            entity_type: 'skin',
            title: title,
            image: absolutise(grabImage(item)),
          }, mfr, base));
        } else if (kind !== 'Insurance' && kind !== 'Credits') {
          // Everything else in the hangar is an item. Known kinds get a
          // stable entity_type; anything the store invents later flows
          // through as 'item' with its label kept, instead of vanishing.
          var map = {
            'fps equipment': 'equipment',
            'component': 'component',
            'hangar decoration': 'decoration',
          };
          out.push(Object.assign({
            entity_type: map[kind.toLowerCase()] || 'item',
            kind_label: kind,
            title: title,
            image: absolutise(grabImage(item)),
          }, mfr, base));
        }
      });

      // The 2019 "Best in Show" pledges carry livery items with no .kind
      // at all - catch any .item whose title says Livery Upgrade and that
      // the loop above never saw.
      li.querySelectorAll('.item').forEach(function (item) {
        if (item.querySelector('.kind')) return;
        var titleEl = item.querySelector('.title');
        var title = titleEl ? titleEl.textContent.trim() : '';
        if (title.indexOf('Livery Upgrade') < 0) return;
        var linerSpan = item.querySelector('.liner span');
        var liner = item.querySelector('.liner');
        out.push({
          entity_type: 'skin',
          title: title,
          image: absolutise(grabImage(item)),
          manufacturer_code: linerSpan ? linerSpan.textContent.trim() : null,
          manufacturer_name: liner
              ? liner.textContent
                  .replace(linerSpan ? linerSpan.textContent : '', '').trim()
              : null,
          lti: lti, warbond: warbond,
          pledge_id: pledgeId, pledge_name: pledgeName,
          pledge_date: pledgeDate, pledge_cost: pledgeCost,
        });
      });
    });
    return { count: items.length, firstId: firstId };
  }

  // Walk every pledge page with the user's own session. onPage(n) fires
  // before each fetch; resolves to the full row list.
  async function readHangar(onPage) {
    var out = [];
    var lastFirstId = null;
    for (var page = 1; page <= 300; page++) {
      if (onPage) onPage(page);
      var resp = null;
      for (var attempt = 0; attempt < 4; attempt++) {
        resp = await fetch('/account/pledges?page=' + page,
                           { credentials: 'same-origin' });
        if (resp.status === 429) {               // rate limited: back off
          await new Promise(function (r) { setTimeout(r, 5000 * (attempt + 1)); });
          continue;
        }
        break;
      }
      if (!resp || !resp.ok) {
        throw new Error('page ' + page + ' failed ('
                        + (resp ? resp.status : 'no response') + ')');
      }
      var html = await resp.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var info = parsePledgePage(doc, out);
      // RSI serves the LAST page again for any page number past the end.
      if (info.count === 0 || info.firstId === lastFirstId) break;
      lastFirstId = info.firstId;
      if (info.count < 10) break;
      await new Promise(function (r) { setTimeout(r, page > 50 ? 500 : 300); });
    }
    return out;
  }

  window.SCHangarExporter = {
    parsePledgePage: parsePledgePage,
    readHangar: readHangar,
  };
})();
