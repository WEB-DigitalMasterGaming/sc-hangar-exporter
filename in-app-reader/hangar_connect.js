// Hangar Connect page walker. Runs INSIDE robertsspaceindustries.com with
// the user's own session. Same selectors the exporter fork verified against
// the live hangar (527-row real export). Emits progress and one final
// payload through flutter_inappwebview handlers.
(async function () {
  const send = (name, arg) => window.flutter_inappwebview.callHandler(name, arg);

  const parsePage = (root, out) => {
    const items = root.querySelectorAll('.list-items > li');
    let firstId = null;
    for (const li of items) {
      const val = (sel) => { const el = li.querySelector(sel); return el ? el.value : null; };
      const pledgeName = val('.js-pledge-name') || '';
      const pledgeId = val('.js-pledge-id');
      if (firstId === null) firstId = pledgeId;
      const pledgeCost = val('.js-pledge-value');
      const dateEl = li.querySelector('.date-col');
      const pledgeDate = dateEl ? dateEl.textContent.replace(/created:\s*/i, '').trim() : null;
      let lti = false;
      for (const t of li.querySelectorAll('.title')) {
        if (t.textContent.indexOf('Lifetime Insurance') >= 0) { lti = true; break; }
      }
      const warbond = pledgeName.toLowerCase().indexOf('warbond') >= 0;

      for (const kindEl of li.querySelectorAll('.kind')) {
        const kind = kindEl.textContent.trim();
        const item = kindEl.parentElement;
        const titleEl = item.querySelector('.title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        if (!title) continue;
        const linerSpan = item.querySelector('.liner span');
        const liner = item.querySelector('.liner');
        const base = {
          lti: lti, warbond: warbond,
          pledge_id: pledgeId, pledge_name: pledgeName,
          pledge_date: pledgeDate, pledge_cost: pledgeCost,
        };
        if (kind === 'Ship') {
          out.push(Object.assign({
            entity_type: 'ship',
            name: title.replace(/^(?:Aegis|Anvil|Aopoa|Banu|CNOU|Crusader|Drake|Greycat Industrial|Greycat|Esperia|Gatac|Kruger|MISC|Mirai|Origin|RSI|Tumbril|Vanduul|Xi'an)[^a-z0-9]+/i, '').trim(),
            manufacturer_code: linerSpan ? linerSpan.textContent.trim() : null,
            manufacturer_name: liner ? liner.textContent.replace(linerSpan ? linerSpan.textContent : '', '').trim() : null,
          }, base));
        } else if (kind.indexOf('Skin') >= 0 || kind.indexOf('Paint') >= 0
                   || title.indexOf('Livery Upgrade') >= 0) {
          let image = null;
          const scope = [item, item.parentElement];
          for (const el of scope) {
            if (!el) continue;
            const imgDiv = el.querySelector('.image');
            if (imgDiv) {
              const bg = getComputedStyle(imgDiv).backgroundImage || '';
              const m = bg.match(/url\(["']?([^"')]+)/);
              if (m) { image = m[1]; break; }
            }
            const img = el.querySelector('img');
            if (img && (img.src || img.dataset.src)) { image = img.src || img.dataset.src; break; }
          }
          if (image && image.indexOf('/') === 0) image = 'https://robertsspaceindustries.com' + image;
          out.push(Object.assign({
            entity_type: 'skin',
            title: title,
            manufacturer_code: linerSpan ? linerSpan.textContent.trim() : null,
            manufacturer_name: liner ? liner.textContent.replace(linerSpan ? linerSpan.textContent : '', '').trim() : null,
            image: image,
          }, base));
        }
      }
    }
    return { count: items.length, firstId: firstId };
  };

  try {
    const out = [];
    let lastFirstId = null;
    for (let page = 1; page <= 300; page++) {
      send('hangarProgress', page);
      let resp = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        resp = await fetch('/account/pledges?page=' + page, { credentials: 'same-origin' });
        if (resp.status === 429) {                 // rate limited: back off
          await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (!resp || !resp.ok) throw new Error('page ' + page + ' failed (' + (resp ? resp.status : 'no response') + ')');
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const info = parsePage(doc, out);
      // RSI serves the LAST page again for any page number past the end
      if (info.count === 0 || info.firstId === lastFirstId) break;
      lastFirstId = info.firstId;
      if (info.count < 10) break;
      await new Promise(r => setTimeout(r, page > 50 ? 500 : 300));
    }
    send('hangarData', JSON.stringify(out));
  } catch (e) {
    send('hangarError', String(e));
  }
})();
