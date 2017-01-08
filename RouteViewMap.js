var broastcast_channel;
var map;
var marker;
var directions_service;
var directions_service_request;
var directions_renderer;
var route_bounds;

function msg_pos( msg ) {
	var p = {lat:msg.lat, lng:msg.lng};
	console.log( p );
	if ( !map.getBounds().contains( p ) )
		map.panTo( p );
	marker.setPosition( p );
}

function msg_dir( msg ) {
	
	console.log( msg );
	
	directions_service_request = {
		origin: msg.origin,
		destination: msg.destination,
		travelMode: google.maps.DirectionsTravelMode.DRIVING,
		waypoints: msg.waypoints,
		optimizeWaypoints: false,
		avoidHighways: true,
		avoidTolls: true,
	};

	route_bounds = new google.maps.LatLngBounds();

	directions_service.route( directions_service_request, 
		function(response, status) { cb_make_route(response, status); })

}      		
      		
function cb_make_route(response, status) {

	if ( status == google.maps.DirectionsStatus.OK ) {

		console.log( response.routes[0] );
		
        var legs = response.routes[0].legs;
		for ( i = 0; i < legs.length; i++) {
			var steps = legs[i].steps;		
			for ( var j = 0; j < steps.length; j++) {
				var nextSegment = steps[j].path;
				for ( var k = 0; k < nextSegment.length; k++) {
					route_bounds.extend( nextSegment[k] );
				}
			}
		}

       	directions_renderer.setMap( map );
       	directions_renderer.setDirections( response );

		map.fitBounds( route_bounds );
	}
	
}
			

function dispatch_message( msg ) {
	
	switch ( msg.type ) {
		case "Pos" :
			msg_pos( msg );
			break;
		case "Dir" :
			msg_dir( msg );
			break;
	}
	
}

function initMap() {
  
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 35.720149, lng: -79.172462},
		zoom: 12
	});
	
	mapstyle_route_view1();

	directions_service = new google.maps.DirectionsService( );

	directions_renderer= new google.maps.DirectionsRenderer({
		draggable: true,
		map: map,
		hideRouteList: false,
		preserveViewport: true,
		suppressMarkers: false,
		markerOptions: {
			opacity: 1.0,
		},
		polylineOptions: {
			strokeColor: "#0066cc",
			strokeWeight: 3
		}
	});

	marker = new google.maps.Marker({
		map: map,
		icon: "icons/marker_pegman.png"
	});
	marker.setMap( map );

	broastcast_channel = new BroadcastChannel("StreeViewPlayer.org");
	console.log( broastcast_channel );

	broastcast_channel.onmessage = function (ev) { dispatch_message(ev.data ); }
}

function mapstyle_route_view1( ) {

	map.set('styles', [
	{
		"featureType": "administrative",
		"stylers": [
			{
				"visibility": "on"
			}
		]
	},
	{
		"featureType": "poi",
		"stylers": [
			{
				"visibility": "simplified"
			}
		]
	},
	{
		"featureType": "road",
		"elementType": "labels",
		"stylers": [
			{
				"visibility": "on"
			}
		]
	},
	{
		"featureType": "water",
		"stylers": [
			{
				"visibility": "simplified"
			}
		]
	},
	{
		"featureType": "transit",
		"stylers": [
			{
				"visibility": "simplified"
			}
		]
	},
	{
		"featureType": "landscape",
		"stylers": [
			{
				"visibility": "simplified"
			}
		]
	},
	{
		"featureType": "road.local",
		"stylers": [
			{
				"visibility": "on"
			},
			{
				"lightness": 0
			}
		]
	},
	{
		"featureType": "road.highway",
		"elementType": "geometry",
		"stylers": [
			{
				"visibility": "on",
			}
			
		]
	},
	{
		"featureType": "water",
		"stylers": [
			{
				"color": "#84afa3"
			},
			{
				"lightness": 52
			}
		]
	},
	{
		"stylers": [
			{
				"saturation": -17
			},
			{
				"gamma": 0.36
			}
		]
	},
	{
		"featureType": "transit.line",
		"elementType": "geometry",
		"stylers": [
			{
				"color": "#3f518c"
			}
		]
	}
	]);

}
