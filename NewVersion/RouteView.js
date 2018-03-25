/* ********************************************************************************************* */
/* ***                                                                                       *** */ 
/* *** RouteView - Olivier Singla                                                            *** */
/* ***                                                                                       *** */ 
/* *** StreetView Player - Virtual Ride, using Google Maps and Street View                   *** */
/* ***                                                                                       *** */ 
/* *** http://routeview.org                                                                  *** */ 
/* *** http://StreetViewPlayer.org                                                           *** */ 
/* ***                                                                                       *** */ 
/* ********************************************************************************************* */

var MAX_NB_WAYPOINTS = 23;

var autocompletes;
var map;
var service;
var panorama, panorama2, panorama3, panorama4;
var pano_pos = [];
var map_or_panorama_full_screen;
var panorama_full_screen;
var map_pano_layout = 2;
var curr_leg;
var play_whole_route;
var prev_zoom;
var timer_show_pano_on_mousemove = undefined;
var timer_animate = undefined;
var curr_dist_in_leg;
var curr_dist_in_route;
var eol;
var step = 150;            			// meters
var interval = 750;        			// milliseconds
var route_thickness;				// pixels
var bearing;
var prev_bearing;
var prev_pano_id;
var pano_cnt = 0;
var cb_move_to_dist = undefined;
var directions_service;
var directions_service_request;
var directions_renderer;
var polylines;
var route_bounds;
var legs_bounds = [];
var distances = [];
var cb_route_from_or_to_changed_handle;
var places;
var got_location;
var streetViewLayer;
var street_view_check;
var marker_small_street_view;
var marker_no_street_view;
var marker_pos_using_slider;
var marker_pos_using_slider_no_pano;
var mouse_over_input_route;
var is_dirty = false;
var is_ff = false;
var browse_images_mode = false;
var marker_browser_images_pos;
var panorama_mouse_down_offsetX = 0;
var panorama_mouse_down_offsetY = 0;

var search_places = [];

var route_colors = [
	"#0066cc",
	"#00cc00",
	"#ff6600",
	"#cc33ff",
];

function rgb(red, green, blue) {
	var rgb = blue | (green << 8) | (red << 16);
	return '#' + (0x1000000 + rgb).toString(16).slice(1)
}
  
function cb_btn_add_waypoint( waypoint_index ) {
    console.log( "Add waypoint: waypoint_index=" + waypoint_index );

	w2ui['layout'].hide('right');
}

function cb_btn_remove_waypoint( waypoint_index ) {
    console.log( "Remove waypoint: waypoint_index=" + waypoint_index );

    do_route( );
}

function gmaps_cb_place_changed( waypoint_index, result ) {
    console.log( "gmaps_cb_place_changed: waypoint_index=" + waypoint_index );

	console.log( autocompletes[waypoint_index] );
	var place = autocompletes[waypoint_index].getPlace();
	console.log( place );
	if ( map.getCenter() == undefined )
		map.setCenter(place.geometry.location);
}

function cb_show_all_routes( ) {

	var is_show_all_routes = true;
//	var is_show_all_routes = dijit.byId('id_check_show_all_routes').get('checked');
	if ( !is_show_all_routes ) {
		map.fitBounds( route_bounds );
	}
	else {
		var b = new google.maps.LatLngBounds;
		route_bounds.forEach( function(e) { b.union(e); });
		map.fitBounds( b );
	}
}

function cb_make_route(response, status) {

	if ( status == google.maps.DirectionsStatus.OK ) {

		console.log( response );
	
		var legs = response.routes[0].legs;
		var leg = legs[0];
		var distance = leg.distance.text;
		var meters = leg.distance.value;
		var duration = leg.duration.text;
        console.log( "distance = " + distance );
        console.log( "duration = " + duration );

		directions_renderer.setMap( map );
		directions_renderer.setDirections( response );

        xroute = response.routes[0];
		var location_from = new Object();
		var location_to = new Object();

		// For each route, display summary information.
		var path = xroute.overview_path;
		var legs = xroute.legs;

		// Markers
		var dist_meters = 0;
		var duration_secs = 0;
		console.log("legs.length=" + legs.length);
		route_bounds = new google.maps.LatLngBounds();
		polylines = [];
		legs_bounds = [];
		for ( i = 0; i < legs.length; i++) {

			legs_bounds[i] = new google.maps.LatLngBounds();
			polylines[i] = new google.maps.Polyline({
				path: [],
				strokeColor: '#FF8000',
				strokeWeight: 3
			});

			dist_meters += legs[i].distance.value;
			duration_secs += legs[i].duration.value;
			var steps = legs[i].steps;
			console.log( i + ": m=" + legs[i].distance.value + " secs=" + legs[i].duration.value + " - len=" + steps.length );
			if ( i == 0 ) {
				location_from.latlng  = legs[i].start_location;
				location_from.address = legs[i].start_address;
			}
			location_to.latlng  = legs[i].end_location;
			location_to.address = legs[i].end_address;

			for ( var j = 0; j < steps.length; j++) {
				var nextSegment = steps[j].path;
				for ( var k=0; k < nextSegment.length;k++) {
					polylines[i].getPath().push(nextSegment[k]);
					legs_bounds[i].extend(nextSegment[k]);
					route_bounds.extend(nextSegment[k]);
				}
			}
			
		}
		
		polylines.forEach( function(e) { e.setMap(map); })
		cb_show_all_routes();

	}
}

function calculateDistance(lat1, long1, lat2, long2) {    

	//radians
	lat1 = (lat1 * 2.0 * Math.PI) / 60.0 / 360.0;      
	long1 = (long1 * 2.0 * Math.PI) / 60.0 / 360.0;    
	lat2 = (lat2 * 2.0 * Math.PI) / 60.0 / 360.0;   
	long2 = (long2 * 2.0 * Math.PI) / 60.0 / 360.0;       

	// use to different earth axis length    
	var a = 6378137.0;        // Earth Major Axis (WGS84)    
	var b = 6356752.3142;     // Minor Axis    
	var f = (a-b) / a;        // "Flattening"    
	var e = 2.0*f - f*f;      // "Eccentricity"      

	var beta = (a / Math.sqrt( 1.0 - e * Math.sin( lat1 ) * Math.sin( lat1 )));    
	var cos = Math.cos( lat1 );    
	var x = beta * cos * Math.cos( long1 );    
	var y = beta * cos * Math.sin( long1 );    
	var z = beta * ( 1 - e ) * Math.sin( lat1 );      

	beta = ( a / Math.sqrt( 1.0 -  e * Math.sin( lat2 ) * Math.sin( lat2 )));    
	cos = Math.cos( lat2 );   
	x -= (beta * cos * Math.cos( long2 ));    
	y -= (beta * cos * Math.sin( long2 ));    
	z -= (beta * (1 - e) * Math.sin( lat2 ));       

	return (Math.sqrt( (x*x) + (y*y) + (z*z) )/1000);  
}

function do_route( ) {
	
    (function ( ) {

		var route_tickness = 3;
		
		var no_hwy = true;
		var no_toll = true;
		
		var start_location = "Apex, nc";
		var end_location = "Waddesboro, nc";
		
		var way_points = [];

		street_view_check = new google.maps.StreetViewService( );

		directions_service = new google.maps.DirectionsService( );

		directions_renderer = new google.maps.DirectionsRenderer({
			draggable: 			true,
			map: 				map,
			hideRouteList: 		false,
			preserveViewport:	true,
			suppressMarkers: 	false,
			markerOptions: {
				opacity: 1.0,
			},
			polylineOptions: {
				strokeColor:	route_colors,
				strokeWeight:	route_tickness
			}
		});

		google.maps.event.clearListeners( directions_renderer, 'directions_changed' );
		directions_renderer.addListener('directions_changed', function() {
				
//			var route_index = directions_renderer.indexOf( this );
//			console.log("directions_changed: route_index=" + route_index);
			var new_dir = directions_renderer.getDirections();
			console.log( new_dir );
		});
		
		directions_service_request = {
			origin: 			start_location,
			destination: 		end_location,
			travelMode: 		google.maps.DirectionsTravelMode.DRIVING,
			waypoints: 			way_points,
			optimizeWaypoints:	false,
			avoidHighways: 		no_hwy,
			avoidTolls: 		no_toll,
		};

		directions_service.route( directions_service_request, 
			function(response, status) { cb_make_route(response, status); })

    })( );

}

function cb_click_btn_drive( waypoint_index ) {
	
	console.log( "Drive: waypoint_index=" + waypoint_index );

	curr_leg = waypoint_index;
	
	start_driving( );  
}

function cb_animate( d ) {

/*
	if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
		return;
*/

	curr_dist = d;
	if ( curr_dist > eol ) {
		console.log( "Route is done" );
		if ( timer_animate != undefined ) { 
			clearTimeout( timer_animate );
			timer_animate = undefined;
		} 
		if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
			clearTimeout( timer_set_bearing );
			timer_set_bearing = undefined;
		} 
//		if (route_index == -1)
//			stop_driving_temporary_route( );
		return;
	}

//	var polyline = (route_index == -1) ? temp_polylines[0] : polylines[route_index][curr_leg];
	var polyline = polylines[curr_leg];
	
	var p = polyline.GetPointAtDistance( curr_dist );
	if ( !map.getBounds().contains( p ) )
		map.panTo( p );

	street_view_check.getPanoramaByLocation(p, 50, (function() { return function(result, status) {
		console.log(result);
		if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
			console.log( "No street view available" );        
			marker_no_street_view.setPosition( p );
		}
		else {
			marker_no_street_view.setPosition( null );
			var iad = polyline.GetIndexAtDistance( curr_dist );
			prev_bearing = bearing;
			var bearing = polyline.Bearing( iad );
			console.log( curr_dist + " / " + eol + " --> " + bearing);
			if (bearing == undefined)
				bearing = prev_bearing;
			if (bearing != undefined) {
				if ( google_api == 3.25  ) { 
					if ( timer_set_bearing != undefined ) { 
						clearTimeout( timer_set_bearing );
						timer_set_bearing = undefined;
					} 
					timer_set_bearing = setTimeout( function() { 
						panorama.setPov( { heading: bearing, pitch: 1 } ); timer_set_bearing = undefined; }, 5 );
					panorama.setPosition( p );
				}
				else {
					panorama.setPosition( p );
					panorama.setPov( { heading: bearing, pitch: 1 } );
				}
			}
		}
/*		
		if ( step > 0 ) {
			if ( timer_animate ) 
				clearTimeout( timer_animate );
			timer_animate = setTimeout( (function() { return function() {
				cb_animate( curr_dist+step );
			}})(), interval );
		}
		dijit.byId('id_input_route').set( 'value', curr_dist, false );
*/
	}})());

}

function start_driving(  ) {
	
	w2ui['layout'].show('right');
	streetViewLayer.setMap( null );
	
/*
	if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
		clearTimeout( timer_set_bearing );
		timer_set_bearing = undefined;
	} 
	if ( timer_animate ) {
		clearTimeout( timer_animate );
		timer_animate = undefined;
	}
*/
	eol = polylines[curr_leg].Distance();
	map.setCenter( polylines[curr_leg].getPath().getAt(0) );

	map.fitBounds( legs_bounds[curr_leg] );

	timer_animate = setTimeout( function() { cb_animate(50); }, 5 );

	// Update route slider
/*
	dijit.byId('id_input_route').set( 'maximum', eol );
	dijit.byId('id_input_route').set( 'discreteValues,', eol );
	dijit.byId('id_input_route').set( 'value', 0, false );
*/
	map.setOptions( {draggableCursor:'hand'} );

	directions_renderer.forEach( function( e ) {
		e.setOptions( { zIndex:99, draggable:false } ); })

	panorama.setVisible( true );
}

function start() {

    var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';
    $('#layout').w2layout({
        name: 'layout',
        panels: [
            { type: 'top',  size: 32, resizable: false, style: pstyle },
            { type: 'left', size: 400, resizable: true, style: pstyle },
            { type: 'main', size: '50%', style: pstyle },
            { type: 'right', size: '50%', hidden: true, style: pstyle },
            { type: 'bottom', size: 50, resizable: false, style: pstyle }
        ]
    });

    w2ui['layout'].content('top', 
        '<table style="width:100%">' +
	    '   <tr>' +
	    '       <td valign="middle" align="left" id="id_mobile_version">' +
	    '           <a href="http://streetviewplayer.org/VirtualRide/RouteViewMobile.html" target="_blank">Mobile&nbsp;Version</a>' +
	    '       </td>' +
	    '       <td valign="middle" align="center" style="width:100%" >' +
		'	    <b>RouteView - Google StreetView Player - Virtual Ride using Google Street View</b>&nbsp;<b id="id_route_info" ></b>' +
	    '       </td>' +
	    '       <td valign="middle" align="right" id="id_link_to_github_project">' +
	    '           <a href="https://github.com/osingla/RouteView" target="_blank">Github&nbsp;Project</a>' +
	    '       </td>' +
	    '   </tr>' +
	    '</table>'
    );

    w2ui['layout'].content('left', 
		'<table id="id_layout_route" cellspacing="0" cellpadding="0" style="width:100%">' +
		'   <tr style="width:100%">' +
		'   	<td>' +
		'   	</td>' +
		'   </tr>' +
		'</table>'
    );

    w2ui['layout'].content('main', 
        '<div style="width:100%; height:100%" id="map"></div>'
    );

    w2ui['layout'].content('right', 
        '<div style="width:100%; height:100%" id="panorama"></div>'
    );

		$( "#id_layout_route" ).append( 
		    '<div class="widget"' +
			'<table cellspacing="0" cellpadding="0" style="white-space: nowrap" style="width:100%">' +
			'  <tr>' +
			'    <td>' +
			
    '<label for="checkbox-nested-1">2 Double' +
    '  <input type="checkbox" name="checkbox-nested-1" id="checkbox-nested-1">' +
    '</label>' +
			
			'    </td>' +
			'  </tr>' +
			'</table>' +
			'</div>'
		);
		
		$( "#id_layout_route" ).append( 
			'<table id="id_table_route_layout" cellspacing="0" cellpadding="0" style="white-space: nowrap" style="width:100%">' +
			'   <tr style="width:100%">' +
			'   	<td>' +
			'   		<table cellspacing="2" cellpadding="2" style="white-space: nowrap" id="id_table_route">' +
			'   		</table>' +
			'   	</td>' +
			'   	<td>' +
			'   		<table cellspacing="0" cellpadding="2" style="height:100%; white-space: nowrap" id="id_table_drive">' +
			'   		</table>' +
			'   	</td>' +
			'   </tr>' +
			'</table>'
		);
		
		for ( var waypoint_index = 0; waypoint_index < MAX_NB_WAYPOINTS+2; waypoint_index++ ) {
			
			console.log( "waypoint_index=" + waypoint_index);

			(function ( waypoint_index ) {

				$( "#id_table_route" ).append( "<tr id='id_route_wp_"+waypoint_index+"_tr' ></tr>" );

				$( "#id_route_wp_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp_"+waypoint_index+"_td1' valign='middle'></td>" );

				$( "#id_route_wp_"+waypoint_index+"_td1" ).append( String.fromCharCode(waypoint_index+65)+"&nbsp;" );

				$( "#id_route_wp_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp_"+waypoint_index+"_td2' valign='middle'></td>" );

				$( "#id_route_wp_"+waypoint_index+"_td2" ).append( 
					"<input name='field_text' type='text' maxlength='100' id='id_route_wp_"+waypoint_index+"_where' style='width: 250px !important;'>" );

				$( "#id_route_wp_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp_"+waypoint_index+"_td3' valign='middle'></td>" );

				$( "#id_route_wp_"+waypoint_index+"_td3" ).append( 
					"<button class='icon_btn_add' id='btn_add_waypoint_"+waypoint_index+"' ></button" );
				$( '#btn_add_waypoint_'+waypoint_index ).on('click', function () {
					cb_btn_add_waypoint( waypoint_index );
				});            

				$( "#id_route_wp_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp_"+waypoint_index+"_td4' valign='middle'></td>" );

				$( "#id_route_wp_"+waypoint_index+"_td4" ).append( 
					"<button class='icon_btn_remove' id='btn_remove_waypoint_"+waypoint_index+"' ></button" );
				$( '#btn_remove_waypoint_'+waypoint_index ).on('click', function () {
					cb_btn_remove_waypoint( waypoint_index );
				});            

				if ( waypoint_index == 0 )
					autocompletes = [];
				autocompletes[waypoint_index] = new google.maps.places.Autocomplete( document.getElementById("id_route_wp_"+waypoint_index+"_where") );
				autocompletes[waypoint_index].addListener('place_changed', function( ) {
					gmaps_cb_place_changed( waypoint_index, this );
				});


			})( waypoint_index );
        
		}
	
		for ( var waypoint_index = 1; waypoint_index < MAX_NB_WAYPOINTS+2; waypoint_index++ ) {
			
			console.log( "waypoint_index=" + waypoint_index);

			(function ( waypoint_index ) {

				$( "#id_table_drive" ).append( "<tr style='height:100%' id='id_drive_wp_"+waypoint_index+"_tr' ></tr>" );

				$( "#id_drive_wp_"+waypoint_index+"_tr" ).append( "<td style='height:100%' id='id_drive_wp_"+waypoint_index+"_td1' valign='middle' align='right'></td>" );

				$( "#id_drive_wp_"+waypoint_index+"_td1" ).append( 
					"<button class='icon_btn_drive' id='btn_drive_waypoint_"+waypoint_index+"' ></button" );
				$( '#btn_drive_waypoint_'+waypoint_index ).on('click', function () {
					cb_click_btn_drive( waypoint_index );
				});            
			})( waypoint_index );
        
		}

		$( "#id_layout_route" ).append( "<hr>" );

	map = new google.maps.Map(document.getElementById('map'), {
//	  center: {lat: 35.720149, lng: -79.172462},
	  zoom: 8
	});

	streetViewLayer = new google.maps.StreetViewCoverageLayer();

	var panorama_options = {
		pov: {
			heading: 34,
			pitch: 10
		},
		enableCloseButton: false,
		linksControl: false,
		panControl: false,
		zoomControl: false,
		clickToGo: false,
		disableDoubleClickZoom: true,
		fullscreenControl: false,
		showRoadLabels: false,
		imageDateControl: true
	};

	panorama = new google.maps.StreetViewPanorama( document.getElementById('panorama'), panorama_options );
	map.setStreetView( panorama );
	
	marker_no_street_view = new google.maps.Marker({
		map: map,
		title: 'No Street View available',
		icon: "http://www.google.com/mapfiles/arrow.png"
	});

	$.getScript("RouteViewMapStyles.js", function(){
		set_map_style( map, 1 ); 
	});

}

$(function () {

    console.log( "jquery version " + $.fn.jquery );

	var google_maps_api_key = "AIzaSyCMtnH6wsRtdcvqB9Nqo7u6xibPSjrpnRw";
	var google_api = "3.30";
	if ( location.hostname != "127.0.0.1" )
		google_api = "3.31";
    var rq = "//maps.google.com/maps/api/js?v="+google_api+"&sensor=false&libraries=places,geometry";
	rq += "&key=" + google_maps_api_key;

    $.getScript(rq, function(){
        console.log("Google Maps API version: " + google.maps.version);
        $.getScript("v3_epoly.js", function(){
			start();
        });
    });

});
