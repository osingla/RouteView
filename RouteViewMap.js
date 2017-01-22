var broastcast_channel;
var map;
var marker;
var directions_service;
var directions_service_request;
var directions_renderer;
var route_bounds;
var marker_pos_using_slider;
var marker_pos_using_slider_no_pano;
var prev_zoom = undefined;
var first_pos = false;

function msg_pos( msg ) {

	if ( prev_zoom == undefined ) {
		if ( first_pos ) {
			map.setZoom( 12 );
			first_pos = false;
		}
		var p = {lat:msg.lat, lng:msg.lng};
//		console.log( p );
		if ( !map.getBounds().contains( p ) ) 
			map.panTo( p );
		marker.setPosition( p );
	}
}

function msg_slider_pos_pano( msg ) {
	
	var p = {lat:msg.lat, lng:msg.lng};
//	console.log( msg );
	
	if ( !map.getBounds().contains( p ) )
		map.panTo( p );
	marker_pos_using_slider.setPosition( p );
}

function msg_slider_pos_enter( ) {

	console.log("Enter slider");	
	prev_zoom = map.getZoom();
	map.fitBounds( route_bounds );
}

function msg_slider_pos_leave( ) {
	
	console.log("Leave slider");	
	map.setZoom( prev_zoom );
	prev_zoom = undefined;

	marker_pos_using_slider.setPosition( null );
	marker_pos_using_slider_no_pano.setPosition( null );
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

	first_pos = true;
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
		case "SliderPosPano" :
			msg_slider_pos_pano( msg );
			break;
		case "SliderPosEnter" :
			msg_slider_pos_enter( );
			break;
		case "SliderPosLeave" :
			msg_slider_pos_leave( msg );
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

	marker_pos_using_slider = new google.maps.Marker({
		map: map,
		title: 'Position along the route using the slider',
		icon: "icons/marker_pos_using_slider.png"
	});

	marker_pos_using_slider_no_pano = new google.maps.Marker({
		map: map,
		title: 'Position along the route using the slider',
		icon: "icons/marker_pos_using_slider_no_pano.png"
	});

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
