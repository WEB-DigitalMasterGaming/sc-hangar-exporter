
var HangarXPLOR = HangarXPLOR || {};

HangarXPLOR._callbacks = HangarXPLOR._callbacks || {};
HangarXPLOR._exportByName = HangarXPLOR._exportByName || {};

(function() {

  var $download = $('<a />');
  $download.hide();
  $(document.body).append($download);
  
  
  $.ajax({
    url: $('#HangarXPLOR-ajax-ship-codes-json').data('ajax'),
    method: 'GET',
    dataType: 'json',
    success: function(data) {
      $.map(data, (ship) => { HangarXPLOR._exportByName[ship.ship_name.toLowerCase()] = ship });
    }
  });

  HangarXPLOR.GetShipList = function($target) {
    
    return $target.map(function() { 
      var $pledge = this;
      var pledge = {};
      pledge.name = $('.js-pledge-name', $pledge).val();
      pledge.id = $('.js-pledge-id', $pledge).val();
      pledge.cost = $('.js-pledge-value', $pledge).val();
      pledge.lti = $('.title:contains(Lifetime Insurance)', $pledge).length > 0;
      pledge.date = $('.date-col:first', $pledge).text().replace(/created:\s+/gi, '').trim();
      pledge.warbond = pledge.name.toLowerCase().indexOf('warbond') > -1;

      return $('.kind:contains(Ship)', this).parent().map(function() {
        var $ship = this;
        var ship_name = $('.title', $ship).text().trim();
        ship_name = ship_name.replace(/^(?:Aegis|Anvil|Aopoa|Banu|CNOU|Crusader|Drake|Greycat Industrial|Greycat|Esperia|Kruger|MISC|Origin|RSI|Tumbril|Vanduul|Xi'an)[^a-z0-9]+/gi, '').trim();
        var lookup = ship_name.toLowerCase();
        var nickname = $('.custom-name-text', $ship).text();
        var i, j;
        
        for (i = 0, j = HangarXPLOR._shipMatrix.length; i < j; i++) {
          if (lookup.indexOf(HangarXPLOR._shipMatrix[i].name.toLowerCase()) > -1 || lookup.indexOf((HangarXPLOR._shipMatrix[i].displayName || 'NOTFOUND').toLowerCase()) > -1) {

            HangarXPLOR.Log('Matched', HangarXPLOR._shipMatrix[i].name, 'in', lookup);

            lookup = (HangarXPLOR._shipMatrix[i].export || HangarXPLOR._shipMatrix[i].name).toLowerCase().trim();
            break;
          }
        }
        
        var ship = HangarXPLOR._exportByName[lookup] ? { ...HangarXPLOR._exportByName[lookup] } : {
          unidentified: 'Please report this ship to the plugin developers at https://github.com/dolkensp/HangarXPLOR/issues',
          ship_code: ($('.liner span', $ship).text().trim() + '_' + ship_name).replace(/[^a-z0-9]/gi, '_').replace(/__+/gi, '_'),
          manufacturer_name: $('.liner', $ship).text().trim().replace(/\(.*\)/, '').trim(),
          lookup: lookup,
        };
        
        ship.manufacturer_code = $('.liner span', $ship).text().trim();
        ship.lti         = pledge.lti;
        ship.name        = ship_name;
        ship.warbond     = pledge.warbond;
        ship.entity_type = 'ship';
        ship.ship_name   = nickname.length > 0 ? nickname : ship.ship_name;
        ship.pledge_id   = pledge.id;
        ship.pledge_name = pledge.name;
        ship.pledge_date = pledge.date;
        ship.pledge_cost = pledge.cost;
        
        return ship;
      }).get()
    }).sort(function(a, b) { return a.manufacturer == b.manufacturer ? (a.name < b.name ? -2 : 2) : (a.manufacturer < b.manufacturer ? -1 : 1); }).get();
  }
  
  // FORK (SC Ship Database): paints export. The hangar page labels every
  // pledge item with a kind, and the stock export keeps only kind "Ship" -
  // the Skins sit in the same parsed pledges and were dropped on the floor.
  // A skin's own title names its target ship, which is far more reliable
  // than the pledge name (a CCU'd pledge keeps its original name forever).
  HangarXPLOR.GetSkinList = function($target) {

    return $target.map(function() {
      var $pledge = this;
      var pledge = {};
      pledge.name = $('.js-pledge-name', $pledge).val() || '';
      pledge.id = $('.js-pledge-id', $pledge).val();
      pledge.cost = $('.js-pledge-value', $pledge).val();
      pledge.lti = $('.title:contains(Lifetime Insurance)', $pledge).length > 0;
      pledge.date = $('.date-col:first', $pledge).text().replace(/created:\s+/gi, '').trim();
      pledge.warbond = pledge.name.toLowerCase().indexOf('warbond') > -1;

      // "Skin" is RSI's label (ParseSkin relies on it); "Paint" is matched
      // defensively in case newer items are labelled the way the store
      // sells them. jQuery de-duplicates the multi-selector for us.
      return $('.kind:contains(Skin), .kind:contains(Paint)', this).parent().map(function() {
        var $skin = this;
        // The thumbnail is not always inside the title/kind wrapper on the
        // live page (401 of 401 real items had it elsewhere), so walk out
        // one level and accept either a background-image or a plain <img>.
        var $scope = $($skin).add($($skin).parent());
        var image = ($scope.find('.image').css('background-image') || '')
          .replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        if (!image || image === 'none') {
          var $img = $scope.find('img').first();
          // lazy-loaded pages keep the real url in a data attribute
          image = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';
        }
        if (image && image.indexOf('/') === 0) {
          image = 'https://robertsspaceindustries.com' + image;
        }

        return {
          entity_type: 'skin',
          title: $('.title', $skin).text().trim(),
          manufacturer_code: $('.liner span', $skin).text().trim() || null,
          // the liner nests the code in a span; text() alone would glue
          // them together ("ORIG Origin Jumpworks")
          manufacturer_name: ($('.liner', $skin).clone().children().remove().end().text() || '')
            .replace(/\(.*\)/, '').trim() || null,
          image: image && image !== 'none' ? image : null,
          lti: pledge.lti,
          warbond: pledge.warbond,
          pledge_id: pledge.id,
          pledge_name: pledge.name,
          pledge_date: pledge.date,
          pledge_cost: pledge.cost,
        };
      }).get();
    }).sort(function(a, b) { return a.title < b.title ? -1 : a.title > b.title ? 1 : 0; }).get();
  }

  // One file with everything the hangar page knows: ships and paints in a
  // single array, each row naming its own entity_type. Apps that read only
  // ships skip the skins; apps that know paints get both in one import.
  HangarXPLOR._callbacks.DownloadHangarJSON = function(e) {
    e.preventDefault();

    var $target = $(HangarXPLOR._selected.length > 0 ? HangarXPLOR._selected : HangarXPLOR._inventory);
    var combined = HangarXPLOR.GetShipList($target).concat(HangarXPLOR.GetSkinList($target));

    $download.attr('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(combined, null, 2)));
    $download.attr('download', 'hangar.json');
    $download.attr('type', 'text/json');
    $download[0].click();
  }

  HangarXPLOR._callbacks.DownloadPaintsJSON = function(e) {
    e.preventDefault();

    var $target = $(HangarXPLOR._selected.length > 0 ? HangarXPLOR._selected : HangarXPLOR._inventory);

    $download.attr('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(HangarXPLOR.GetSkinList($target), null, 2)));
    $download.attr('download', 'paints.json');
    $download.attr('type', 'text/json');
    $download[0].click();
  }

  HangarXPLOR._callbacks.DownloadJSON = function(e) {
    e.preventDefault();
    
    // TODO: Check why
    var $target = $(HangarXPLOR._selected.length > 0 ? HangarXPLOR._selected : HangarXPLOR._inventory);
    
    $download.attr('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(HangarXPLOR.GetShipList($target), null, 2)));
    $download.attr('download', 'shiplist.json');
    $download.attr('type', 'text/json');
    $download[0].click();
  }
  
  HangarXPLOR._callbacks.DownloadCSV = function(e) {
    e.preventDefault();
    
    var $target = $(HangarXPLOR._selected.length > 0 ? HangarXPLOR._selected : HangarXPLOR._inventory);
    
    // TODO: CSV support will need to be careful of user-entered data...
    var buffer = "Manufacturer, Ship, Lti, Warbond, ID, Pledge, Cost, Date\n";
    buffer = buffer + HangarXPLOR.GetShipList($target).map(function(ship) { return [ '"' + ship.manufacturer_name + '"', '"' + ship.ship_name + '"', ship.lti, ship.warbond, ship.pledge_id, '"' + ship.pledge_name + '"', '"' + ship.pledge_cost + '"', '"' + ship.pledge_date + '"' ].join(',')}).join('\n')

    $download.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(buffer));
    $download.attr('download', 'shiplist.csv');
    $download.attr('type', 'text/csv');
    $download[0].click();
  }
})();
