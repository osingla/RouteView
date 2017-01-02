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

var MAX_NB_ROUTES = 1;
var MAX_NB_WAYPOINTS = 4;

var autocompletes = [];
var map;
var panorama;
var directions_service = [];
var directions_service_request = [];
var directions_renderer = [];
var polylines = [];
var route_bounds = [];
var legs_bounds = [];
var streetViewLayer;
var street_view_check = [];
var marker_no_street_view;
var timer_set_bearing = undefined;
var google_api = 3.25;						// 3.25 or 3.26

var route_colors = [
	"#0066cc",
	"#00cc00",
	"#ff6600",
	"#cc33ff",
];

function cb_btn_add_waypoint( route_index, waypoint_index ) {
    console.log( "Add waypoint: route_index=" + route_index + " - waypoint_index=" + waypoint_index );

	w2ui['layout'].hide('right');
}

function cb_btn_remove_waypoint( route_index, waypoint_index ) {
    console.log( "Remove waypoint: route_index=" + route_index + " - waypoint_index=" + waypoint_index );

    do_route( route_index );
}

function gmaps_cb_place_changed( route_index, waypoint_index, result ) {
    console.log( "gmaps_cb_place_changed: route_index=" + route_index + " - waypoint_index=" + waypoint_index );

	console.log( autocompletes[route_index][waypoint_index] );
	var place = autocompletes[route_index][waypoint_index].getPlace();
	console.log( place );
	if ( map.getCenter() == undefined )
		map.setCenter(place.geometry.location);
}

function cb_show_all_routes( ) {

	var is_show_all_routes = true;
//	var is_show_all_routes = dijit.byId('id_check_show_all_routes').get('checked');
	if ( !is_show_all_routes ) {
		map.fitBounds( route_bounds[selected_route_index] );
	}
	else {
		var b = new google.maps.LatLngBounds;
		route_bounds.forEach( function(e) { b.union(e); });
		map.fitBounds( b );
	}
}

function cb_make_route(response, status) {

	if ( status == google.maps.DirectionsStatus.OK ) {

		var route_index = 0;

		console.log( response );
	
		var legs = response.routes[0].legs;
		var leg = legs[0];
		var distance = leg.distance.text;
		var meters = leg.distance.value;
		var duration = leg.duration.text;
        console.log( "distance = " + distance );
        console.log( "duration = " + duration );

		directions_renderer[route_index].setMap( map );
		directions_renderer[route_index].setDirections( response );

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
		route_bounds[route_index] = new google.maps.LatLngBounds();
		polylines[route_index] = [];
		legs_bounds[route_index] = [];
		for ( i = 0; i < legs.length; i++) {

			legs_bounds[route_index][i] = new google.maps.LatLngBounds();
			polylines[route_index][i] = new google.maps.Polyline({
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
					polylines[route_index][i].getPath().push(nextSegment[k]);
					legs_bounds[route_index][i].extend(nextSegment[k]);
					route_bounds[route_index].extend(nextSegment[k]);
				}
			}
			
		}
		
		polylines[route_index].forEach( function(e) { e.setMap(map); })
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

function do_route( route_index ) {
	
    (function ( route_index ) {

		var route_tickness = 3;
		
		var no_hwy = true;
		var no_toll = true;
		
		var start_location = "Apex, nc";
		var end_location = "Waddesboro, nc";
		
		var way_points = [];

		street_view_check[route_index] = new google.maps.StreetViewService( );

		directions_service[route_index] = new google.maps.DirectionsService( );

		directions_renderer[route_index] = new google.maps.DirectionsRenderer({
			draggable: 			true,
			map: 				map,
			hideRouteList: 		false,
			preserveViewport:	true,
			suppressMarkers: 	false,
			markerOptions: {
				opacity: 1.0,
			},
			polylineOptions: {
				strokeColor:	route_colors[route_index],
				strokeWeight:	route_tickness
			}
		});

		google.maps.event.clearListeners( directions_renderer[route_index], 'directions_changed' );
		directions_renderer[route_index].addListener('directions_changed', function() {
				
			var route_index = directions_renderer.indexOf( this );
			console.log("directions_changed: route_index=" + route_index);
			var new_dir = directions_renderer[route_index].getDirections();
			console.log( new_dir );
		});
		
		directions_service_request[route_index] = {
			origin: 			start_location,
			destination: 		end_location,
			travelMode: 		google.maps.DirectionsTravelMode.DRIVING,
			waypoints: 			way_points,
			optimizeWaypoints:	false,
			avoidHighways: 		no_hwy,
			avoidTolls: 		no_toll,
		};

		directions_service[route_index].route( directions_service_request[route_index], 
			function(response, status) { cb_make_route(response, status); })

    })( route_index );

}

function cb_click_btn_drive( waypoint_index ) {
	
	var route_index = 0;
	
	console.log( "Drive: route_index=" + route_index + " waypoint_index=" + waypoint_index );

	curr_route = route_index;	
	curr_leg = waypoint_index;
	
	start_driving( route_index );  
}

function cb_animate( route_index, d ) {

/*
	if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
		return;
*/

	curr_dist = d;
	if ( curr_dist > eol ) {
		console.log( "Route " + route_index + " is done" );
		if ( timer_animate != undefined ) { 
			clearTimeout( timer_animate );
			timer_animate = undefined;
		} 
		if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
			clearTimeout( timer_set_bearing );
			timer_set_bearing = undefined;
		} 
		if (route_index == -1)
			stop_driving_temporary_route( );
		return;
	}

	var polyline = (route_index == -1) ? temp_polylines[0] : polylines[route_index][curr_leg];
	
	var p = polyline.GetPointAtDistance( curr_dist );
	if ( !map.getBounds().contains( p ) )
		map.panTo( p );

	street_view_check[(route_index == -1) ? 0 : route_index].getPanoramaByLocation(p, 50, (function(route_index) { return function(result, status) {
		console.log(result);
		if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
			console.log( "No street view available - route=" + route_index );        
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
			timer_animate = setTimeout( (function(route_index) { return function() {
				cb_animate( route_index, curr_dist+step );
			}})(route_index), interval );
		}
		dijit.byId('id_input_route').set( 'value', curr_dist, false );
*/
	}})(route_index));

}

function start_driving( route_index ) {
	
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
	eol = polylines[route_index][curr_leg].Distance();
	map.setCenter( polylines[route_index][curr_leg].getPath().getAt(0) );

	map.fitBounds( legs_bounds[route_index][curr_leg] );

	timer_animate = setTimeout( function(route_index) { cb_animate(route_index, 50); }, 5, route_index );

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

	for ( var route_index = 0; route_index < MAX_NB_ROUTES; route_index++ ) {

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
			'<table id="id_table_routes_'+route_index+'" cellspacing="0" cellpadding="0" style="white-space: nowrap" style="width:100%">' +
			'   <tr style="width:100%">' +
			'   	<td>' +
			'   		<table cellspacing="2" cellpadding="2" style="white-space: nowrap" id="id_table_route_'+route_index+'">' +
			'   		</table>' +
			'   	</td>' +
			'   	<td>' +
			'   		<table cellspacing="0" cellpadding="2" style="height:100%; white-space: nowrap" id="id_table_drive_'+route_index+'">' +
			'   		</table>' +
			'   	</td>' +
			'   </tr>' +
			'</table>'
		);
		
		for ( var waypoint_index = 0; waypoint_index < MAX_NB_WAYPOINTS+2; waypoint_index++ ) {
			
			console.log( "route_index=" + route_index + " - waypoint_index=" + waypoint_index);

			(function ( route_index, waypoint_index ) {

				$( "#id_table_route_"+route_index ).append( "<tr id='id_route_wp"+route_index+"_"+waypoint_index+"_tr' ></tr>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp"+route_index+"_"+waypoint_index+"_td1' valign='middle'></td>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_td1" ).append( String.fromCharCode(waypoint_index+65)+"&nbsp;" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp"+route_index+"_"+waypoint_index+"_td2' valign='middle'></td>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_td2" ).append( 
					"<input name='field_text' type='text' maxlength='100' id='id_route_wp"+route_index+"_"+waypoint_index+"_where' style='width: 250px !important;'>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp"+route_index+"_"+waypoint_index+"_td3' valign='middle'></td>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_td3" ).append( 
					"<button class='icon_btn_add' id='btn_add_waypoint_"+route_index+"_"+waypoint_index+"' ></button" );
				$( '#btn_add_waypoint_'+route_index+"_"+waypoint_index ).on('click', function () {
					cb_btn_add_waypoint( route_index, waypoint_index );
				});            

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_tr" ).append( "<td id='id_route_wp"+route_index+"_"+waypoint_index+"_td4' valign='middle'></td>" );

				$( "#id_route_wp"+route_index+"_"+waypoint_index+"_td4" ).append( 
					"<button class='icon_btn_remove' id='btn_remove_waypoint_"+route_index+"_"+waypoint_index+"' ></button" );
				$( '#btn_remove_waypoint_'+route_index+"_"+waypoint_index ).on('click', function () {
					cb_btn_remove_waypoint( route_index, waypoint_index );
				});            

				if ( waypoint_index == 0 )
					autocompletes[route_index] = [];
				autocompletes[route_index][waypoint_index] = new google.maps.places.Autocomplete( document.getElementById("id_route_wp"+route_index+"_"+waypoint_index+"_where") );
				autocompletes[route_index][waypoint_index].addListener('place_changed', function( ) {
					gmaps_cb_place_changed(route_index, waypoint_index, this);
				});


			})( route_index, waypoint_index );
        
		}
	
		for ( var waypoint_index = 1; waypoint_index < MAX_NB_WAYPOINTS+2; waypoint_index++ ) {
			
			console.log( "route_index=" + route_index + " - waypoint_index=" + waypoint_index);

			(function ( route_index, waypoint_index ) {

				$( "#id_table_drive_"+route_index ).append( "<tr style='height:100%' id='id_drive_wp"+route_index+"_"+waypoint_index+"_tr' ></tr>" );

				$( "#id_drive_wp"+route_index+"_"+waypoint_index+"_tr" ).append( "<td style='height:100%' id='id_drive_wp"+route_index+"_"+waypoint_index+"_td1' valign='middle' align='right'></td>" );

				$( "#id_drive_wp"+route_index+"_"+waypoint_index+"_td1" ).append( 
					"<button class='icon_btn_drive' id='btn_drive_waypoint_"+route_index+"_"+waypoint_index+"' ></button" );
				$( '#btn_drive_waypoint_'+route_index+"_"+waypoint_index ).on('click', function () {
					cb_click_btn_drive( route_index, waypoint_index );
				});            
			})( route_index, waypoint_index );
        
		}

		$( "#id_layout_route" ).append( "<hr>" );

    }

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

	var google_maps_api_key = "AIzaSyB2ejT4uAX7wmMv8mtMHDWAt3BIgcaVjjM";
    var rq = "//maps.google.com/maps/api/js?v="+google_api+"&sensor=false&libraries=places,geometry";
	rq += "&key=" + google_maps_api_key;

    $.getScript(rq, function(){
        console.log("Google Maps API version: " + google.maps.version);
        $.getScript("v3_epoly.js", function(){
			start();
        });
    });

});
