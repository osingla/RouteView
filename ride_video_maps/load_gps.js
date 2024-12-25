var zooms = [5, 8, 6, 11, 13]
//var ride = ["04:34 - 09:07", "19:07 - 21:22", "30:22 - 41:37", "01:20:13 - 01:31:29", "01:39:13 - 01:41:28", "01:53:23 - 02:02:23", "02:07:25 - 02:16:55", "02:40:27 - 02:45:45"]
//var ride = ["00:01 - 34:07"]
var ride = ["00:01 - 30:08"]

function fancyTimeFormat(duration) {
  // Hours, minutes and seconds
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = ~~duration % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";

  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }

  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;

  return ret;
}

function notify_port(port) {
    console.log("Notify port "+port)
    try {
        fetch('http://localhost:'+port+'/foo.txt')
            .then(function (response) {
                // handle success
                console.log(response);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            })
    } catch (error) {
        // TypeError: Failed to fetch
        console.log('There was an error', error);
    }
}

function extract_ride() {
    var xride = []
    var xduration = 0
    ride.forEach( function(value, index, array) {
        console.log(index)
        console.log(value)
        var hh1, mm1, ss1, hh2, mm2, ss2;
        if (value.length == 13) {
            hh1 = 0;
            mm1 = Number( value.substring(0, 2) );
            ss1 = Number( value.substring(3, 5) );
            hh2 = 0;
            mm2 = Number( value.substring(8, 10) );
            ss2 = Number( value.substring(11, 13) );
        }
        else if (value.length == 19) {
            hh1 = Number( value.substring(0, 2) );
            mm1 = Number( value.substring(3, 5) );
            ss1 = Number( value.substring(6, 8) );
            hh2 = Number( value.substring(11, 13) );
            mm2 = Number( value.substring(14, 16) );
            ss2 = Number( value.substring(17, 19) );
        }
        var start = hh1*3600 + mm1*60 + ss1;
        var end   = hh2*3600 + mm2*60 + ss2;
        var duration = end-start+1;
        xduration += duration
        var v = []
        v.push({ name: 'start',    value: start},
               { name: 'end',      value: end},
               { name: 'duration', value: duration} );
        xride.push(v);
    })
    console.log("Total duration = ", fancyTimeFormat(xduration));
    return xride;
}

function get_latlngs_in_out(latlngs, xride) {
  
    var xin = [];
    xride.forEach( function(value, index, array) {
        var zin = latlngs.slice(value[0].value, value[1].value);
        xin.push(zin);
    });    
    
    var xout = [];
    for (var index = 0; index < xride.length; index++) {
        if (index == 0) {
            var zout = latlngs.slice(0, xride[index][0].value-1);
            xout.push(zout);
        } else {
            var zout = latlngs.slice(xride[index-1][1].value+1, xride[index][0].value-1);
            xout.push(zout);
        }
    };    
    var zout = latlngs.slice(xride[xride.length-1][1].value+1, latlngs.length-1);
    xout.push(zout);
    
    return [xin, xout];
}

function loadXMLDoc(filename) { 
    const xhttp = new window.XMLHttpRequest();
    xhttp.open("GET", filename, true); 
    xhttp.overrideMimeType('text/xml')
    xhttp.send(); 

    xhttp.onreadystatechange = function() { 

        function play_gpx(xride) {
            
            notify_port(32001)
            var index = 0
            var newLatLng = new L.LatLng(xlatlngs_in[index][0], xlatlngs_in[index][1]);
            var marker3 = L.marker(newLatLng).addTo(map3);
            var marker4 = L.marker(newLatLng).addTo(map4);
            var marker5 = L.marker(newLatLng).addTo(map5);
            var timeout_id = setInterval(function(){
                var newLatLng = new L.LatLng(xlatlngs_in[index][0], xlatlngs_in[index][1]);
                marker3.setLatLng(newLatLng)
                if (!map3.getBounds().contains(newLatLng))
                    map3.panTo(newLatLng);
                marker4.setLatLng(newLatLng)
                if (!map4.getBounds().contains(newLatLng))
                    map4.panTo(newLatLng);
                marker5.setLatLng(newLatLng)
                if (!map5.getBounds().contains(newLatLng))
                    map5.panTo(newLatLng);
                index++
                if (index+1 == xlatlngs_in.length) {
                    notify_port(32002)
                    clearInterval(timeout_id)
                }
            }, 200);
        }

        if (this.readyState === 4 && this.status === 200) { 

            var xride = extract_ride();
            console.log(xride);
        
            const gpxDoc = this.responseXML; 
            console.log(gpxDoc);
            const trackPoints = Array.from(gpxDoc.getElementsByTagName('trkpt'))
            const _xmlTrackPointToLatLng = (trkpoint) => {
                return [
                    parseFloat(trkpoint.attributes.lat.nodeValue),
                    parseFloat(trkpoint.attributes.lon.nodeValue)
                ]
            }
            var latlngs = trackPoints.map((trkpnt) => _xmlTrackPointToLatLng(trkpnt))
            console.log(latlngs)
            
            var [latlngs_in, latlngs_out] = get_latlngs_in_out(latlngs, xride)
            console.log(latlngs_in);
            //console.log(latlngs_out);
            var xlatlngs_in = Array.prototype.concat.apply([], latlngs_in);
            console.log(xlatlngs_in);
            
            var map1 = L.map("ride_map1", {zoomControl: false});
            var tiles1 = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
            tiles1.addTo(map1);
            
            var map2 = L.map("ride_map2", {zoomControl: false});
            var tiles2 = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
            tiles2.addTo(map2);
            
            var map3 = L.map("ride_map3", {zoomControl: false});
            var tiles3 = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
//          var tiles3 = L.tileLayer('https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=867cce94eb5643f39f75f43ec1a8305e');
            tiles3.addTo(map3);
            
            var map4 = L.map("ride_map4", {zoomControl: false});
            var tiles4 = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
            tiles4.addTo(map4);
            
            var map5 = L.map("ride_map5", {zoomControl: false});
            var tiles5 = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
            tiles5.addTo(map5);
            
            var polyline1 = L.polyline(latlngs, {color: 'blue', weight: 4});
            map1.fitBounds(polyline1.getBounds());
            
            var polyline2 = L.polyline(latlngs, {color: 'blue', weight: 4});
            map2.fitBounds(polyline2.getBounds());
            
            var polyline3 = L.polyline(latlngs, {color: 'blue', weight: 3});
            map3.fitBounds(polyline3.getBounds());

            var polyline4 = L.polyline(latlngs, {color: 'blue', weight: 4});
            map3.fitBounds(polyline4.getBounds());

            var polyline5 = L.polyline(latlngs, {color: 'blue', weight: 4});
            map3.fitBounds(polyline5.getBounds());

            latlngs_in.forEach( function(value, index, array) {
                var polyline1_in = L.polyline(value, {color: 'blue', weight: 4});
                map1.addLayer(polyline1_in);
                var polyline2_in = L.polyline(value, {color: 'blue', weight: 4});
                map2.addLayer(polyline2_in);
                var polyline3_in = L.polyline(value, {color: 'blue', weight: 3});
                map3.addLayer(polyline3_in);
                var polyline4_in = L.polyline(value, {color: 'blue', weight: 4});
                map4.addLayer(polyline4_in);
                var polyline5_in = L.polyline(value, {color: 'blue', weight: 4});
                map5.addLayer(polyline5_in);
            });    
            latlngs_out.forEach( function(value, index, array) {
                var polyline1_out = L.polyline(value, {color: '#30bacb', weight: 4});
                map1.addLayer(polyline1_out);
                var polyline2_out = L.polyline(value, {color: '#30bacb', weight: 4});
                map2.addLayer(polyline2_out);
                var polyline3_out = L.polyline(value, {color: '#30bacb', weight: 3});
                map3.addLayer(polyline3_out);
                var polyline4_out = L.polyline(value, {color: '#30bacb', weight: 4});
                map4.addLayer(polyline4_out);
                var polyline5_out = L.polyline(value, {color: '#30bacb', weight: 4});
                map5.addLayer(polyline5_out);
            });    

            var newLatLng = new L.LatLng(latlngs[0][0], latlngs[0][1]);
            map1.setView(newLatLng, zooms[0]);
            map2.setView(newLatLng, zooms[1]);
            map3.setView(newLatLng, zooms[2]);
            map4.setView(newLatLng, zooms[3]);
            map4.panInside(newLatLng, zooms[3]);
            map5.setView(newLatLng, zooms[4]);

            //map1.fitBounds(polyline1.getBounds());
            //map2.fitBounds(polyline2.getBounds());
            //map3.fitBounds(polyline3.getBounds());
            map4.fitBounds(polyline4.getBounds());
            //map5.fitBounds(polyline5.getBounds());

            setTimeout( function() { play_gpx(xride); }, 1000 );

        } 
    }; 
}

setTimeout(function(){
    loadXMLDoc("http://localhost:8000/ride.gpx");
}, 500);
