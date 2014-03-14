// loc.js
var curloc;


var RealtimeLocation = {
    run: function () {
        if (RealtimeLocation.running) return;
        RealtimeLocation.running = navigator.geolocation.watchPosition(function(position) {
            curloc = [ pos.coords.latitude, pos.coords.longitude ];
            store_loc();
            if (RealtimeLocation.listener) RealtimeLocation.listener();
        }, function (err) {
            console.warn('ERROR(' + err.code + '): ' + err.message);
            alert('Unable to get your location.  Currently this is required.');
        }, {
            timeout: 10*1000,
            maximumAge: 1000*20,
            enableHighAccuracy: true
        });
    },

    addEventListener: function (evname, cb) {
        // TODO, keep track of multiple listeners
        RealtimeLocation.listener = cb;
        if (!RealtimeLocation.running) RealtimeLocation.run();
    },

    removeEventListener: function (evname, cb) {
        // TODO, stop it if this is the only listener
        RealtimeLocation.listener = null;
    }
};



function with_loc(f){
  navigator.geolocation.getCurrentPosition(
    function(pos){
      curloc = [ pos.coords.latitude, pos.coords.longitude ];
      store_loc();
      f(pos);
    }, function(err) {
      console.warn('ERROR(' + err.code + '): ' + err.message);
      alert('Unable to get your location.  Currently this is required.');
    }, {
      timeout: 10*1000,
      maximumAge: 1000*20,
      enableHighAccuracy: true
    }
  );
}

function store_loc(){
  if (curloc){
    var now = (new Date()).getTime();
    localStorage['loc'] = JSON.stringify({ loc: curloc, at: now });
  }
}

function restore_loc(){
  var data;
  if (data = localStorage['loc']){
    data = JSON.parse(data);
    var now = (new Date()).getTime();
    if (now - data.at < 1000*60*6) curloc = data.loc;
  }
}


restore_loc();






// distance, bearing, etc



function distance(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
};
Number.prototype.toRad = function() {
    return this * Math.PI / 180;
};

function english_bearing(bearing) {
    if (bearing<0) bearing += 360;
    var in_sixteenths = Math.floor(bearing/22.5);
    console.log(bearing, in_sixteenths);
    return [
        'north', 'northeast', 'northeast', 'east', 'east', 'southeast', 'southeast',
        'south', 'south', 'southwest', 'southwest', 'west', 'west', 'northwest', 'northwest',
        'north'
    ][in_sixteenths];
}


function bearing(lat1,lon1,lat2,lon2) {
            var originLL = [lat1, lon1];
            var destLL = [lat2, lon2];

            // difference of longitude coords
			var diffLon = destLL[1].toRad() - originLL[1].toRad();

			// difference latitude coords phi
			var diffPhi = Math.log(Math.tan(destLL[0].toRad() / 2 + Math.PI / 4) / Math.tan(originLL[0].toRad() / 2 + Math.PI / 4));

			//return the angle, normalized
			return (Math.atan2(diffLon, diffPhi).toDeg() + 360) % 360;
};
