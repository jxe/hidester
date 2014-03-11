// loc.js
var curloc;

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
      maximumAge: 1000*60*10,
      enableHighAccuracy: true
    }
  );
}

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

function bearing(lat1, lon1, lat2, lon2) {
    var dLon = (lon2-lon1).toRad();
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1)*Math.sin(lat2) -
            Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    var brng = Math.atan2(y, x).toDeg();
    return brng;
}

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
