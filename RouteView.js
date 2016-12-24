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

define( function( m ) {

	var MAX_NB_ROUTES = 4;
	var MAX_NB_WAYPOINTS = 8;

	var total_max_nb_waypoints = (MAX_NB_ROUTES * (MAX_NB_WAYPOINTS+2));

	var autocompletes = [];
    var map;
    var service;
    var panorama;
	var map_or_panorama_full_screen;
    var panorama_full_screen;
    var curr_route;
    var curr_leg;
	var timer_show_pano_on_mousemove = undefined;
    var timer_animate = undefined;
	var timer_set_bearing = undefined;
    var eol;
    var step;               			// meters
    var interval;           			// milliseconds
    var route_tickness;					// pixels
    var google_api;						// 3.25 or 3.26
    var prev_bearing;
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_service = [];
	var directions_service_request = [];
	var directions_renderer = [];
	var polylines = [];
    var route_bounds = [];
    var legs_bounds = [];
	var xroute;
	var cb_route_from_or_to_changed_handle = [];
	var places = [];
	var got_location;
   	var streetViewLayer;
   	var street_view_check = [];
   	var marker_no_street_view;
   	var marker_pos_using_slider;
   	var marker_pos_using_slider_no_pano;
   	var selected_route_index = 0;
   	var timer_map_mousemove = undefined;
   	var dlg_panorama_map_mousemove;
   	var is_dirty = false;
   	var is_ff = false;

	var search_places = [];

   	var ctrl_mode = false;
   	var temp_directions_service = undefined;
	var temp_directions_service_request;
 	var temp_directions_renderer = undefined;
	var temp_polylines = undefined;

   	var alt_down = false;
   	
   	var browse_images_mode = false;
   	
	var tooltip_dlg = undefined;				// Tooltip dialog used to show the JPEG thumbnail
	var dlg_commands = undefined;
   	
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
  
	function show_route_distance_duration( route_index, dist_meters, duration_secs ) {

//      console.log( "dist_meters=" + dist_meters + " duration_secs=" + duration_secs );

        document.getElementById("id_route"+route_index+"_dist_kms").innerHTML = Math.round( dist_meters / 1000 );
        document.getElementById("id_route"+route_index+"_dist_miles").innerHTML = Math.round( dist_meters * 0.000621371 );
        
        var nb_hours   = Math.floor( duration_secs / 3600 );
        var nb_minutes = Math.floor( (duration_secs - (nb_hours * 3600)) / 60 );
        var nb_seconds = Math.floor( duration_secs - (nb_hours * 3600) - (nb_minutes * 60) );
        if ( nb_hours == 0 ) {
            if ( nb_minutes == 0 ) {
                document.getElementById("id_route"+route_index+"_duration").innerHTML = nb_seconds + '"';
            }
            else {
                if ( nb_seconds == 0 )
                    document.getElementById("id_route"+route_index+"_duration").innerHTML = nb_minutes + "'";
                else
                    document.getElementById("id_route"+route_index+"_duration").innerHTML = nb_minutes + "'" + nb_seconds + '"';
            }
        }
        else {
            document.getElementById("id_route"+route_index+"_duration").innerHTML = nb_hours + "h" + nb_minutes + "'" + nb_seconds + '"';
        }
        
        document.getElementById("id_route"+route_index+"_distance_duration").style.display = "";
        
    }
    
    function cb_animate( route_index, d ) {
    
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
        	return;

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
		    if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
		        console.log( "No street view available - route=" + route_index );        
        		marker_no_street_view.setPosition( p );
		    }
		    else {
        		marker_no_street_view.setPosition( null );
		        var iad = polyline.GetIndexAtDistance( curr_dist );
		        prev_bearing = bearing;
        		var bearing = polyline.Bearing( iad );
//				console.log( curr_dist + " / " + eol + " --> " + bearing);
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
	        if ( step > 0 ) {
				if ( timer_animate ) 
					clearTimeout( timer_animate );
            	timer_animate = setTimeout( (function(route_index) { return function() {
            		cb_animate( route_index, curr_dist+step );
				}})(route_index), interval );
			}
			dijit.byId('id_input_route').set( 'value', curr_dist, false );
		}})(route_index));

    }

    function start_driving( route_index ) {
        
		streetViewLayer.setMap( null );

		if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
			clearTimeout( timer_set_bearing );
			timer_set_bearing = undefined;
		} 
        if ( timer_animate ) {
            clearTimeout( timer_animate );
            timer_animate = undefined;
        }
        eol = polylines[route_index][curr_leg].Distance();
        map.setCenter( polylines[route_index][curr_leg].getPath().getAt(0) );

		map.fitBounds( legs_bounds[route_index][curr_leg] );

       	timer_animate = setTimeout( function(route_index) { cb_animate(route_index, 50); }, 5, route_index );

        // Update route slider
		dijit.byId('id_input_route').set( 'maximum', eol );
		dijit.byId('id_input_route').set( 'discreteValues,', eol );
		dijit.byId('id_input_route').set( 'value', 0, false );

        map.setOptions( {draggableCursor:'hand'} );

		directions_renderer.forEach( function( e ) {
	       	e.setOptions( { zIndex:99, draggable:false } ); })

		panorama.setVisible( true );
    }

    function find_first_hidden( route_index ) {

        var first_hidden = MAX_NB_WAYPOINTS + 2;
    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_tr_' + route_index + '_' + n;
        		var display = domStyle.get( id, "display" );
//            	console.log( id + " --> " + display );
            	if ( display == "none" ) {
            		first_hidden = n;
            		break;
            	}
            }
 		});
    	
    	return first_hidden;
    }
    
    function find_total_nb_waypoints( ) {

		var total_nb_waypoints = 0;
		var stop = false;
    	require(["dojo/dom-style"], function( domStyle) {
			for ( var r = 0; r < MAX_NB_ROUTES; r++ ) {
				for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
					var id = 'id_tr_' + r + '_' + n;
					var display = domStyle.get( id, "display" );
					if ( display == "none" ) {
						stop = true;
						break;
					}
					total_nb_waypoints++;
				}
				if ( stop )
					break;
			}
 		});

		return total_nb_waypoints;
	}

    function find_all_nb_waypoints( ) {

		var total = [];
		for ( var r = 0; r < MAX_NB_ROUTES; r++ )
			total[r] = 0;

    	require(["dojo/dom-style"], function( domStyle) {
			for ( var r = 0; r < MAX_NB_ROUTES; r++ ) {
				var display = domStyle.get( "id_fieldset_route_"+r, "display" );
				if ( display == "none" )
					break;
				for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
					var id = 'id_tr_' + r + '_' + n;
					var display = domStyle.get( id, "display" );
					if ( display == "none" )
						break;
					total[r]++;
				}
			}
 		});

		return total;
	}

	function cb_show_all_routes( ) {
	
		if ( dijit.byId("id_btn_drive_0_1").get("disabled") )
			return;
		 
        var is_show_all_routes = dijit.byId('id_check_show_all_routes').get('checked');
        if ( !is_show_all_routes ) {
            map.fitBounds( route_bounds[selected_route_index] );
        }
        else {
        	var b = new google.maps.LatLngBounds;
			route_bounds.forEach( function(e) { b.union(e); });
            map.fitBounds( b );
        }
	}

	function cb_click_use_route( route ) {

        var is_route = dijit.byId('id_check_use_route_'+(route)).get( 'checked' );
    	require(["dojo/dom-style"], function( domStyle) {
			if (is_route) {
				domStyle.set( "id_fieldset_route_"+route, "display", "" );
			}
			else {
				for (var n = route; n < MAX_NB_ROUTES; n++)
					domStyle.set( "id_fieldset_route_"+n, "display", "none" );
				for (var n = route+1; n < MAX_NB_ROUTES; n++) {
//					console.log( "--> " + 'id_check_use_route_'+n);
					dijit.byId('id_check_use_route_'+n).set('checked', false, false);
				}
			}
		});
		
	}
    
	function cb_click_fieldset_route( route_index ) {

    	require(["dojo/dom-style"], function( domStyle) {

			for (var n = 0; n < MAX_NB_ROUTES; n++ ) {
	           	var id = 'id_fieldset_route_' + n;
//    	   		console.log( domStyle.get( id, "background") );
	       		domStyle.set( id, "background", (n == route_index) ? "#80c1ff": "#b3daff");
	       	}
	       	
	       	if ( (selected_route_index != route_index) && !ctrl_mode ) {
		        var is_show_all_routes = dijit.byId('id_check_show_all_routes').get('checked');
		        if ( !is_show_all_routes ) {
	       			if ( route_bounds[route_index] != undefined ) 
	            		map.fitBounds( route_bounds[route_index] );
	            }
	            else {
	        		var b = new google.maps.LatLngBounds;
					route_bounds.forEach( function(e) { b.union(e); });
					if ( (places[route_index][0] != undefined) && (places[route_index][0].geometry != undefined) )
						b.extend( places[route_index][0].geometry.location );
	            		map.fitBounds( b );
	            }
	       	}
	       	
	       	selected_route_index = route_index;

    	});
	
	}
    
    function get_route_waypoint( obj, ref ) {
    
		var index_route = undefined;
		var index_waypoint = undefined;
		for ( var r = 0; r < MAX_NB_ROUTES; r++ ) {
			index_waypoint = obj[r].indexOf( ref );
			if (index_waypoint != -1) {
				index_route = r;
				break;
			}
		}

		return {route_index: index_route, waypoint_index: index_waypoint};
    }
    
function calculateDistance(lat1, long1, lat2, long2)
  {    

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

	    dijit.byId("id_pane_standby").show();

    	if ( directions_renderer[route_index] != undefined ) {
    		console.log( "Delete current route " + route_index )
    		directions_renderer[route_index].setMap( null );
        	directions_renderer[route_index] = undefined;
        	if ( polylines[route_index] )
				polylines[route_index].forEach( function(e) { e.setMap(null); })
    	}

        var no_hwy  = dijit.byId('id_check_no_hwy_'+route_index).get( 'checked' );
        var no_toll = dijit.byId('id_check_no_toll_'+route_index).get( 'checked' );
//      console.log( "no_hwy=" + no_hwy + " no_toll=" + no_toll );
        
    	step     = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
//      console.log( "step=" + step + " interval=" + interval );

    	route_tickness = dijit.byId('id_input_route_tickness').get( 'value' );
//  	console.log( "route_tickness=" + route_tickness );

        var first_hidden = find_first_hidden( route_index );
//    	console.log( "first_hidden=" + first_hidden );
        
        var start_location = dijit.byId('id_wp_'+route_index+'_0').get( 'value' );
        console.log( "from = " + start_location );

        var way_points = [];
        for ( var n = 1; n < first_hidden-1; n++ ) {
        	
            waypt = dijit.byId('id_wp_'+route_index+'_'+n).get( 'value' );
            console.log( "n=" + n + " => [" + waypt + "]" );
            if ( waypt != "" ) {
                way_points.push({
                    location: waypt,
                    stopover: true
                });
            }
        }

        var end_location = dijit.byId('id_wp_'+route_index+'_'+(first_hidden-1)).get( 'value' );
        console.log( "to   = " + end_location );

        street_view_check[route_index] = new google.maps.StreetViewService( );

        directions_service[route_index] = new google.maps.DirectionsService( );

        directions_renderer[route_index] = new google.maps.DirectionsRenderer({
            draggable: true,
            map: map,
            hideRouteList: false,
            preserveViewport: true,
            suppressMarkers: false,
	        markerOptions: {
	          	opacity: 1.0,
            },
            polylineOptions: {
            	strokeColor: route_colors[route_index],
            	strokeWeight: route_tickness
            }
        });

    	var initial_info_use_icon = localStorage.getItem("initial_info_use_icon");
    	if ( !initial_info_use_icon ) {
			do_show_message( false, "Information", 
				"<div align='center'>" +
				"  You can play the route between<br><br>" +
				start_location + "<br>" +
				"and<br>" +
				end_location + "<br><br>" +
				"  by using the icon<br><br>" +
				"  <img src='icons/btn-drive.png' style='width:16px;height:16px;'>" +
				"</div>" );
			localStorage.setItem( "initial_info_use_icon", "true" );
		}

        var old_nb_waypoints = way_points.length + 2;
		google.maps.event.clearListeners( directions_renderer[route_index], 'directions_changed' );
        directions_renderer[route_index].addListener('directions_changed', function() {
			
            var route_index = directions_renderer.indexOf( this );
//          console.log("directions_changed: route_index=" + route_index);
            var new_dir = directions_renderer[route_index].getDirections();
          console.log( new_dir );

			is_dirty = true;
			var path = new_dir.routes[0].overview_path;
			var eventLine = new google.maps.Polyline({
				path: path,
				visible: true,
				strokeOpacity: 0,
				zIndex: 1000,
			}); 
//			console.log( eventLine );
//			console.log( path.length );
			eventLine.setMap( map );

            var index_waypoint = undefined;
            if (new_dir.request.Xc != undefined)
				index_waypoint = new_dir.request.Xc;
            if (new_dir.request.Yc != undefined)
				index_waypoint = new_dir.request.Yc;
            if (new_dir.request.Uc != undefined)
				index_waypoint = new_dir.request.Uc;
            if (new_dir.request.Vc != undefined)
				index_waypoint = new_dir.request.Vc;
            if (new_dir.request.Yb != undefined)
				index_waypoint = new_dir.request.Yb;
            if (new_dir.request.ec != undefined)
				index_waypoint = new_dir.request.ec;
            if ( index_waypoint != undefined ) {

                console.log( directions_renderer[route_index] );
                var new_nb_waypoints = new_dir.geocoded_waypoints.length;
                console.log( "old_nb_waypoints=" + old_nb_waypoints + " new_nb_waypoints=" + new_nb_waypoints + " index_waypoint=" + index_waypoint );
                var place_id = new_dir.geocoded_waypoints[index_waypoint].place_id;

                service.getDetails({
	              	placeId: place_id
                }, function ( place, status ) {
                	if ( status == google.maps.places.PlacesServiceStatus.OK ) {
//		                console.log( old_nb_waypoints );
//                		console.log( new_nb_waypoints );
//		                console.log( index_waypoint );
//                	    console.log( place.formatted_address );
                	    if (new_nb_waypoints == old_nb_waypoints) {
                	    	change_waypoint( route_index, index_waypoint, place.formatted_address );
                	    }
                	    else {
                	    	cb_click_btn_add(route_index, new_nb_waypoints)
                	    	for (var n = old_nb_waypoints - 1; n >= index_waypoint; n--) {
						        var w = dijit.byId('id_wp_'+route_index+'_'+n).get( 'value' );
						        dijit.byId('id_wp_'+route_index+'_'+(n+1)).set( 'value', w );
						        places[route_index][n+1] = places[route_index][n];
                	    	}
                	    	change_waypoint( route_index, index_waypoint, place.formatted_address );
                	    	places[route_index][index_waypoint] = place;
                	    }
                	}
                	else {
			        	var message = "?";
			            if ( status == google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR )
			            	message = "A directions request could not be processed due to a server error. The request may succeed if you try again.";
			            else if ( status == google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT )
			            	message = "The webpage has gone over the requests limit in too short a period of time.";
			            else if ( status == google.maps.places.PlacesServiceStatus.NOT_FOUND )
			            	message = "At least one of the origin, destination, or waypoints could not be geocoded.";
			            else if ( status == google.maps.places.PlacesServiceStatus.REQUEST_DENIED )
			            	message = "The webpage is not allowed to use the directions service.";
			            else if ( status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS )
			            	message = "No route could be found between the origin and destination.";
			            else if ( status == google.maps.places.PlacesServiceStatus.INVALID_REQUEST )
			            	message = "The PlacesService request provided was invalid.";
			            show_error( message );
                	}
                });

//             	show_error( "Sorry, this feature is not yet implemented!" );
            }

        });

        update_btns_remove_up_down( route_index );
    
        map.setOptions({draggableCursor: 'crosshair'});

		dijit.byId('id_btn_save_gpx').set( 'disabled', false );
		dijit.byId('id_btn_create_long_url').set( 'disabled', false );
        
        directions_service_request[route_index] = {
            origin: start_location,
            destination: end_location,
            travelMode: google.maps.DirectionsTravelMode.DRIVING,
            waypoints: way_points,
            optimizeWaypoints: false,
            avoidHighways: no_hwy,
            avoidTolls: no_toll,
        };

      	directions_service[route_index].route( directions_service_request[route_index], 
      		function(response, status) { cb_make_route(response, status); })
    }
    
	function cb_make_route(response, status) {

        if ( status == google.maps.DirectionsStatus.OK ) {

		    dijit.byId("id_pane_standby").hide();

//			console.log( response );
			var route_index = directions_service_request.indexOf( response.request );

            var legs = response.routes[0].legs;
            var leg = legs[0];
            var distance = leg.distance.text;
            var meters = leg.distance.value;
            var duration = leg.duration.text;
//          console.log( "distance = " + distance );
//          console.log( "duration = " + duration );

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
            
            show_route_distance_duration( route_index, dist_meters, duration_secs );

			polylines[route_index].forEach( function(e) { e.setMap(map); })
			cb_show_all_routes();

    		dijit.byId('id_input_route').set( 'disabled', true );
    		
    		dijit.byId('id_btn_pause').set( 'disabled', true );
    		dijit.byId('id_btn_stop').set( 'disabled', true );

        }
        else {
        	
		    dijit.byId("id_pane_standby").hide();

        	var message = "?";
            if ( status == google.maps.DirectionsStatus.UNKNOWN_ERROR )
            	message = "A directions request could not be processed due to a server error. The request may succeed if you try again.";
            else if ( status == google.maps.DirectionsStatus.OVER_QUERY_LIMIT )
            	message = "The webpage has gone over the requests limit in too short a period of time.";
            else if ( status == google.maps.DirectionsStatus.NOT_FOUND )
            	message = "At least one of the origin, destination, or waypoints could not be geocoded.";
            else if ( status == google.maps.DirectionsStatus.REQUEST_DENIED )
            	message = "The webpage is not allowed to use the directions service.";
            else if ( status == google.maps.DirectionsStatus.ZERO_RESULTS )
            	message = "No route could be found between the origin and destination.";
            else if ( status == google.maps.DirectionsStatus.INVALID_REQUEST )
            	message = "The DirectionsRequest provided was invalid.";
            show_error( message );

        }

    }

    function do_show_commands_message( ) {
    	
    	require(["dijit/Dialog", "dojo/domReady!"], function(Dialog){

    		var message = 
    			"<div align='center'>" +
    			"  <table>" +
				"    <tr>" +
				"      <td>" +
				"        <b>S</b> : " + 
				"      </td>" +
				"      <td>" +
				"        Show StreetView" +
				"      </td>" +
				"    </tr>" +
				"    <tr>" +
				"      <td>" +
				"        <b>P</b> : " + 
				"      </td>" +
				"      <td>" +
				"        "+((!ctrl_mode)?"Start" : "Cancel")+" Route Preview Mode" +
				"      </td>" +
				"    </tr>" +
				"    <tr>" +
				"      <td colspan=2>" +
				"        <hr>" +
				"      </td>" +
				"    </tr>" +
				"    <tr>" +
				"      <td>" +
				"        <b>ESC</b> : " + 
				"      </td>" +
				"      <td>" +
				"        Cancel" +
				"      </td>" +
				"    </tr>" +
    			"  </table>" +
    			"</div>";
    		
    		dlg_commands = new Dialog({
    	        title: "Commands",
    	        closable: false,
    	        duration:250,
    	        content: message,
    	        style: "min-width: 250px"
    	    });
    		
    		dlg_commands.show();
    	});
    }

    function do_hide_commands_message( ) {
		
   		dlg_commands.hide();
   		dlg_commands.destroyRecursive();
   		dlg_commands = undefined;
	}
    
    function do_show_message( is_error, title, message ) {
    	
    	require(["dijit/Dialog", "dojo/domReady!"], function(Dialog){

    		message += "<hr>" +
    			"<div align='right'>" +
    			"<button dojoType='dijit/form/Button' type='button' onclick='dlg_error.hide()'>Ok</button>" +
    			"</div>";
    		
    		dlg_error = new Dialog({
    	        title: title,
    	        closable: false,
    	        duration:250,
    	        content: message,
    	        style: "min-width: 250px"
    	    });
    		
    		dlg_error.show();
    	});
    }
    
    function show_error( message ) {
    	do_show_message( true, "Error", message );
    }
    
    function show_message( title, message ) {
    	do_show_message( false, title, message );
    }
    
    function do_copy_message( title, message, text ) {
    	
    	require(["dijit/Dialog", "dojo/domReady!"], function(Dialog){

			var d =  message + "<br>" + 
				"<br>" +
				"<p><textarea readonly row=1 class='js-copytextarea' style='width:100%'>" + text + "</textarea></p>" +
				"<br>" +
				"<hr>" +
				"<br>" +
    			"<div align='right'>" +
    			"  <button dojoType='dijit/form/Button' type='button' onclick='require([\"RouteView.js\"], function( s ) { s.cb_copy_long_url(); dlg_copy_text.hide(); })'>Copy to Clipboard</button>" +
    			"  <button dojoType='dijit/form/Button' type='button' onclick='dlg_copy_text.hide()'>Cancel</button>" +
    			"</div>";

    		dlg_copy_text = new Dialog({
    	        title: title,
    	        closable: false,
    	        duration:250,
    	        content: d,
    	        style: "min-width:450px; min-heigh:350px"
    	    });
    		
    		dlg_copy_text.show();
    	});
    }
    
    function do_pause( ) {

		var route_index = curr_route;

        console.log( dijit.byId('id_btn_pause').get( 'label' ) );
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Pause" ) {
			if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
				clearTimeout( timer_set_bearing );
				timer_set_bearing = undefined;
			} 
			if ( timer_animate != undefined ) { 
				clearTimeout( timer_animate );
				timer_animate = undefined;
			}				
	    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct ) {
				if ( map_or_panorama_full_screen ) {
					domConstruct.place("td_map_canvas", "td_panorama", "before");
		        	document.getElementById("td_map_canvas").style.width = "50%";
			        document.getElementById("td_panorama").style.width = "50%";
					map_or_panorama_full_screen = false;
				}
	    		dijit.byId('app_layout').resize();
		        google.maps.event.trigger( map, 'resize' );
			});
        	dijit.byId('id_btn_pause').set( 'label', "Continue" );
//          console.log( "curr_dist=" + curr_dist );
        }
        else if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" ) {
        	dijit.byId('id_btn_pause').set( 'label', "Pause" );
			if ( timer_animate != undefined ) { 
				clearTimeout( timer_animate );
				timer_animate = undefined;
			}				
	       	timer_animate = setTimeout( function() { cb_animate(curr_route, curr_dist); }, 250 );
        }

		dijit.byId('id_input_route').set( 'disabled', false );
		dijit.byId('id_input_route').set( 'intermediateChanges', true );
    }

    function do_stop( ) {

		if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
			clearTimeout( timer_set_bearing );
			timer_set_bearing = undefined;
		} 
		if ( timer_animate != undefined ) {
			clearTimeout( timer_animate );
			timer_animate = undefined;
		}

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct ) {
			domStyle.set( "id_top_layout", "display", "" );
			domStyle.set( "id_left_layout", "display", (ctrl_mode) ? "none" : "table-cell" );
    		document.getElementById("td_map_canvas").style.width = "100%";
            document.getElementById("td_panorama").style.width = "0%";
			if ( !map_or_panorama_full_screen ) {
				domConstruct.place("td_panorama", "id_hidden", "after");
				map_or_panorama_full_screen = true;	
			}
			else {
				domConstruct.place("td_map_canvas", "td_panorama", "before");
				domConstruct.place("td_panorama", "td_map_canvas", "after");
				map_or_panorama_full_screen = false;
			}
    		dijit.byId('app_layout').resize();
	        google.maps.event.trigger( map, 'resize' );
		});
    	
		panorama.setVisible( false );

		var route_index = curr_route;
		if ( curr_route == -1 ) {
			stop_driving_temporary_route( );
			return;
		}

		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		dijit.byId('id_input_route').set( 'intermediateChanges', false );
		
        map.setOptions({draggableCursor: 'crosshair'});

		directions_renderer.forEach( function( e ) {
	       	e.setOptions( { zIndex:99, draggable: true } ); })
    }

    function start( ) {

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/store/Memory", "dojo/ready"], function( dom, on, domStyle, domGeom, Memory, ready ) {
            ready( function() {
   				load_settings( );
				google_api = dom.byId('id_google_api').value;

//				dojoConfig = { gmaps: { v: '3.25', libraries: 'places,geometry' } };
//				var rq = "//maps.google.com/maps/api/js?v=3.25&sensor=false&libraries=places,geometry";
				var rq = "//maps.google.com/maps/api/js?v="+google_api+"&sensor=false&libraries=places,geometry";
		    	var google_maps_api_key = localStorage.getItem("id_google_maps_api_key");
		    	if ( google_maps_api_key && (google_maps_api_key != "") )
					rq += "&key=" + google_maps_api_key;
				require([rq], function( ) {
					require(["v3_epoly.js"], function( ) {
						require(["RouteView.js", "dojo/domReady!"], function( ) {
			 				initialize( );
						});
					});
				});
   				
   			});
		});
	}

	function create_route_dlg() {
	
		require(["dojo/dom-construct", "dijit/form/TextBox", "dijit/form/Button", "dijit/Tooltip", "dojo/dom-style"], function(domConstruct, TextBox, Button, Tooltip, domStyle) {
			
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
			
				for (var n = 0; n < MAX_NB_WAYPOINTS+2; n++) { 
	
			  		var id_tr = domConstruct.create("tr", { 
			  			id: "id_tr_"+route_index+"_"+n,
			  			style: "display:" + ((n < 2) ? "" : "none") 
			  		}, "id_table_route"+route_index, "last");
			  		var id_label_wp = "id_label_wp_"+route_index+"_"+n;
			  		domConstruct.create("td", { innerHTML:String.fromCharCode(n+65)+"&nbsp;", align:"right", valign:"middle", id:id_label_wp}, id_tr, "first");
	
			  		var id_td2 = domConstruct.create("td", { align:"left", valign:"middle"}, id_tr, "last");
			  		var input = new TextBox({
			  			id: "id_wp_"+route_index+'_'+n,
			  			type: "text", 
			  			style: "width:22em", 
			  			trim: true,
			  			intermediateChanges: false,
			  			selectOnClick: true,
						onKeyPress: function() { domStyle.set( this.id, { color: "red" } ); },
			  			['route_index']: route_index,
			  			['waypoint_index']: n 
			  		}, id_td2, "last");
	
			  		var id_td3 = domConstruct.create("td", { 
			  			align:"right", 
			  			valign:"middle"
			  		}, id_tr, "last");
			  		var btn_add = new Button({
						iconClass: "icon_btn_add",
						showLabel: false,
						onClick: function() { cb_click_btn_add(this.route_index, this.waypoint_index+1); },
						id: "id_btn_add_"+route_index+'_'+n,
						disabled: true,
						route_index: route_index,
						waypoint_index: n
			  		}, id_td3); 

			  		new Tooltip({
	 			        id: ["id_tooltip_btn_add_"+route_index+'_'+n],
	 			        connectId: ["id_btn_add_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Create a new Waypoint",
	 			        showDelay:999999,
	 			        hideDelay:0
			  		});
	
			  		var id_td4 = domConstruct.create("td", { 
			  			align:"right", 
			  			valign:"middle"
			  		}, id_tr, "last");
			  		var btn_remove = new Button({
						iconClass: "icon_btn_remove",
						showLabel: false,
						onClick: function() { cb_click_btn_remove(this.route_index, this.waypoint_index); },
						id: "id_btn_remove_"+route_index+'_'+n,
						disabled: true,
						route_index: route_index,
						waypoint_index: n
			  		}, id_td4);
	
			  		new Tooltip({
						id: "id_tooltip_btn_remove_"+route_index+'_'+n,
	 			        connectId: ["id_btn_remove_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Delete the Waypoint",
	 			        showDelay:999999,
	 			        hideDelay:0
			  		});
	
			  		var id_td5 = domConstruct.create("td", { 
			  			align:"right", 
			  			valign:"middle"
			  		}, id_tr, "last");
			  		var btn_up = new Button({
						iconClass: "icon_btn_up",
						showLabel: false,
						onClick: function() { cb_click_btn_up(this.route_index, this.waypoint_index); },
						id: "id_btn_up_"+route_index+'_'+n,
						disabled: true,
						route_index: route_index,
						waypoint_index: n
			  		}, id_td5);
	
			  		new Tooltip({
	 			        id: ["id_tooltip_btn_up_"+route_index+'_'+n],
	 			        connectId: ["id_btn_up_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Move the Waypoint up",
	 			        showDelay:999999,
	 			        hideDelay:0
			  		});
	
			  		var id_td6 = domConstruct.create("td", { 
			  			align:"right", 
			  			valign:"middle"
			  		}, id_tr, "last");
			  		var btn_down = new Button({
						iconClass: "icon_btn_down",
						showLabel: false,
						onClick: function() { cb_click_btn_down(this.route_index, this.waypoint_index); },
						id: "id_btn_down_"+route_index+'_'+n,
						disabled: "true",
						route_index: route_index,
						waypoint_index: n
			  		}, id_td6);
	
			  		new Tooltip({
	 			        id: ["id_tooltip_btn_down_"+route_index+'_'+n],
	 			        connectId: ["id_btn_down_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Move the Waypoint down",
	 			        showDelay:999999,
	 			        hideDelay:0
			  		});
	
			  		var tooltip = new Tooltip({
			  			id: "gps_loc_wp_"+route_index+"_"+n,
	 			        connectId: ["id_wp_"+route_index+"_"+n],
	 			        position:['after-centered'],
	 			        showDelay:650,
	 			        hideDelay:0
			  		});
			  	}
	
				for (var n = 1; n < MAX_NB_WAYPOINTS+2; n++) {
				
			  		var id_tr = domConstruct.create("tr", { 
			  			id: "id_drive_tr_"+route_index+"_"+n,
			  			style: "display:" + ((n < 2) ? "" : "none") 
			  		}, "id_table_drive_"+route_index, "last");
			  		
			  		var id_td = domConstruct.create("td", { align:"right", valign:"middle"}, id_tr, "first");
			  		
			  		var btn_drive = new Button({
						iconClass: "icon_btn_drive",
						showLabel: false,
						onClick: function() { cb_click_btn_drive(this.route_index, this.waypoint_index); },
						id: "id_btn_drive_"+route_index+"_"+n,
						disabled: true,
						route_index: route_index,
						waypoint_index: n-1
			  		}, id_td);

			  		new Tooltip({
						id: "id_tooltip_btn_drive_"+route_index+"_"+n,
	 			        connectId: ["id_btn_drive_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Virtual Ride!<br><br>Play the route using StreetView<br><br>" +
							"Note: This is different from showing images along the ride using <img src=\"icons/btn-browse.png\" style=\"width:16px; height:16px; vertical-align:middle\" />.<br><br>" +
							"<table>" +
							"	<tr>" +
							"		<td valign=\"middle\" >" +
							"			<img src=\"icons/btn-drive.png\" style=\"width:16px; height:16px; vertical-align:middle\" />" +
							"		</td>" +
							"		<td>" +
							"			This allows to <b><i>play</b></i> a leg of the route. Each image will stay for a specifc time (default is 1,200 msec), <br>" +
							"			and each new image is separated from the previous one by 175 meters." +
							"		</td>" +
							"	</tr>" +
							"	<tr>" +
							"	</tr>" +
							"	<tr>" +
							"		<td valign=\"middle\" >" +
							"			<img src=\"icons/btn-browse.png\" style=\"width:16px; height:16px; vertical-align:middle\"/>" +
							"		</td>" +
							"		<td>" +
							"			This allows to <b><i>show</b></i> an image along the route depending where the mouse cursor is." +
							"		</td>" +
							"	</tr>" +
							"</table>",
	 			        showDelay:9999999,
	 			        hideDelay:0
			  		});
	
				}
	
			}
			
		});
	}
	
	function clear_place( ) {

		console.log( search_places.length );
		search_places.forEach( function(e) {
//			console.log( e );
			e.setMap( null );
			delete e;
		})
		search_places = [];
		console.log( search_places.length );
		
    	var dlg = dijit.byId('id_places_dlg');
    	dlg.closeDropDown( false );
	}
	
	function show_place( ) {

		clear_place( );

		var place_val = dijit.byId("id_place").get("value");
		console.log( place_val );
		var infowindow = new google.maps.InfoWindow();
		
		function createMarker( place ) {
			var placeLoc = place.geometry.location;
			var marker = new google.maps.Marker({
				map: map,
				position: place.geometry.location,
				icon: "icons/marker_flag.png"
			});
			search_places.push( marker );

			google.maps.event.addListener(marker, 'click', function() {
				infowindow.setContent( place.name + "<br>" + place.vicinity );
			console.log( place );
				infowindow.open(map, this);
			});
		}
      
      	function callback(results, status) {
			if (status === google.maps.places.PlacesServiceStatus.OK) {
				for (var i = 0; i < results.length; i++) {
					createMarker(results[i]);
				}
			}
		}

		var radius = undefined;
		var bounds = map.getBounds();
		var center = map.getCenter();
		if ( bounds && center ) {
			var ne = bounds.getNorthEast();
			var radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		}

		var service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
          location: map.getCenter(),
          radius: radius,
          name: [place_val]
        }, callback);
		
    	var dlg = dijit.byId('id_places_dlg');
    	dlg.closeDropDown( false );
		
	}

	function decode_url_params() {
	
		var query = location.search.substr(1);
	  	var result = [];
	  	
	  	var play_route = undefined;
	  	var play_waypoint = undefined;

		var total_nb_waypoints = 0;
		var nb_routes = 0;
		query.split("route=").forEach(function(part) {
			if ( part != "" ) {
				result[nb_routes] = [];
				var item = part;
				console.log( part );
				part.split("&").forEach(function(part) {
					var item = part;
					console.log(item);
					if (item != "") {
						if ( item.slice(0,5) == "play=" ) {
							var p = item.slice(5);
							var q = p.split(",");
							if ( q.length == 2 ) {
								play_route    = parseInt( q[0] );
								play_waypoint = parseInt( q[1] );
								console.log("play_route=" + play_route + " - play_waypoint=" + play_waypoint);
							}
						}
						else {
							result[nb_routes].push( decodeURIComponent(item) );
							console.log( decodeURIComponent(item) );
							total_nb_waypoints++;
						}
					}
				});	
				nb_routes++;
			}
	  	});	
	  	if (nb_routes == 0)
			return false;

	    dijit.byId("id_pane_standby").show();

		console.log( "nb_routes=" + nb_routes );
	  	console.log(result);
		var waypoints = [];
	  	for (var route_index = 0; route_index < nb_routes; route_index++) {
			for ( var waypoint_index = 0; waypoint_index < result[route_index].length; waypoint_index++ ) {
				require(["dojo/dom-style"], function( domStyle) {
					dijit.byId('id_wp_'+route_index+'_'+waypoint_index).set( 'value', result[route_index][waypoint_index] );
					domStyle.set( 'id_wp_'+route_index+'_'+waypoint_index, { color: "red" } );
					show_waypoint( route_index, waypoint_index );
					if ( waypoint_index >= 1 ) {
						dijit.byId('id_btn_drive_'+route_index+"_"+waypoint_index).set( 'disabled', false );
						domStyle.set( 'id_tr_'+route_index+'_'+(waypoint_index), "display", "" );
						domStyle.set( 'id_drive_tr_'+route_index+"_"+(waypoint_index), "display", "" );
					}
				});
			}
			update_btns_remove_up_down( route_index );
		}
		
		(function ( total_nb_waypoints ) {
			console.log( "total_nb_waypoints=" + total_nb_waypoints );
			var done_nb_waypoints = 0;
			var set_ti = 250;
			for (var route_index = 0; route_index < nb_routes; route_index++) {
				for ( var waypoint_index = 0; waypoint_index < result[route_index].length; waypoint_index++ ) {
					
					function look_for_address( place_name, route_index, waypoint_index) {
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode( { 'address': place_name}, function(results, status) {
							if ( status == google.maps.GeocoderStatus.OK ) {
//								console.log( results);
								service.getDetails({
									placeId: results[0].place_id
								}, function ( place, status ) {
									if ( status == google.maps.places.PlacesServiceStatus.OK ) {
										console.log( done_nb_waypoints + " / " + total_nb_waypoints + route_index + " , " + waypoint_index + " --> " + place_name );
										is_dirty = true;
										places[route_index][waypoint_index] = place;
										require(["dojo/dom-style"], function( domStyle) {
											domStyle.set( 'id_wp_'+route_index+'_'+waypoint_index, { color: "black" } );
										});
										require(["dijit/Tooltip"], function(Tooltip) {
											new Tooltip({
												id: ["id_tooltip_label_wp_"+route_index+'_'+waypoint_index],
												connectId: ["id_label_wp_"+route_index+'_'+waypoint_index],
												position:['below-centered'],
												label: place.name,
												showDelay:650,
												hideDelay:0
											});
										});
										done_nb_waypoints++;
										if ( (route_index == 0) && (waypoint_index == 0) )
											map.setCenter(results[0].geometry.location);
										if ( done_nb_waypoints == total_nb_waypoints ) {
											for (var r = 0; r < nb_routes; r++)
												do_route( r );
											dijit.byId("id_pane_standby").hide();
											if ( (play_route != undefined) && (play_waypoint != undefined)) {
												console.log( "play_route="+play_route+" - play_waypoint="+play_waypoint);
												curr_route = play_route;	
												curr_leg = play_waypoint;
												(function ( play_route, play_waypoint ) {
													function play_route_at_startup() {
														if ( (polylines[play_route] == undefined) || (polylines[play_route][play_waypoint] == undefined))
															setTimeout( function() { play_route_at_startup(); }, 250 );
														else
															cb_click_btn_drive( play_route, play_waypoint );
													}
													setTimeout( function() { play_route_at_startup(); }, 250 );
												})( play_route, play_waypoint );
											}
										}
									}
								});
							} 
							else {
								console.log("Geocode was not successful for [" + place_name + "]: " + status);
							}
						});
					}
					(function ( result, route_index, waypoint_index ) {
						setTimeout( function() { look_for_address( result, route_index, waypoint_index ); }, set_ti );
					})( result[route_index][waypoint_index], route_index, waypoint_index );
					set_ti += 750;
				}
			}
		})( total_nb_waypoints );

	  	return true;
	}
	
	function blah(e) {
		console.log( "!!!!!!!!!!!!!!!!!! Full screen" );
		console.log(e);
	}

    function is_full_screen_supported( ) {

    	var d = document.getElementById("id_body");
    	if ( document.exitFullscreen || document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen )
    		return true;

    	return false;
    }

    function is_in_full_screen( ) {
		if ( !window.screenTop && !window.screenY )
			return true;
		else
			return false; 
    }

	function begin_ctrl_mode() {

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct) {
    	
			domStyle.set( "id_div_top_layout", "display", "none" );
			domStyle.set( "id_div_top_layout_ctrl_mode", "display", "" );
			domStyle.set( "id_text_cancel_ctrl_mode", "display", "" );
			domStyle.set( "id_left_layout", "display", "none" );
			dijit.byId('app_layout').resize();
			domConstruct.place("td_panorama", "id_hidden", "after");
		    document.getElementById("td_map_canvas").style.width = "100%";
        	document.getElementById("td_panorama").style.width = "0%";
	        google.maps.event.trigger( map, 'resize' );
	        google.maps.event.trigger( panorama, 'resize' );
			map_or_panorama_full_screen = true;	

//	        map.setOptions({draggableCursor: 'url(icons/map-select-start.png), auto' });
	        map.setOptions({draggableCursor: 'crosshair'});

			directions_renderer.forEach( function( e ) {
		       	e.setOptions( { zIndex:99, draggable:false } ); })

			panorama.setVisible( true );

			curr_route = -1;	
			curr_leg = -1;

    	});
	
	}
	
	function end_ctrl_mode( ) {
	
		panorama.setVisible( false );

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct) {
    	
			domStyle.set( "id_div_top_layout", "display", "" );
			domStyle.set( "id_div_top_layout_ctrl_mode", "display", "none" );
			domStyle.set( "id_text_cancel_ctrl_mode", "display", "" );
			domStyle.set( "id_left_layout", "display", "" );
			dijit.byId('app_layout').resize();
			domConstruct.place("td_panorama", "td_map_canvas", "after");
            document.getElementById("td_map_canvas").style.width = "100%";
          	document.getElementById("td_panorama").style.width = "0%";	
	        google.maps.event.trigger( map, 'resize' );
			map_or_panorama_full_screen = false;	

    		directions_renderer.forEach( function( e ) {
		       	e.setOptions( { zIndex:99, draggable: true } ); })

    	});
	
	}
    
    function initialize( ) {

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/store/Memory", "dojo/ready"], 
    		function( dom, on, domStyle, domGeom, Memory, ready ) {
    		
            ready( function() {

				console.log("Google Maps API version: " + google.maps.version);

				is_ff = false;
				require(["dojo/sniff"], function( has ){
					console.log( "has(ie) = " + has("ie") );
					if ( has("ff") )
						is_ff = true;
					if ( has("ie") <= 8 ) {
						do_show_message( false, "Error!", "Sorry IE is not supported!\n\nPlease use either Chrome, Firefox or Edge" );
					}
				});

				var url = location.host + location.pathname;
				console.log( "url= [" + url + "]" );
				if ( url == "rawgit.com/osingla/RouteView/master/RouteView.html" ) {
					console.log( "Switching to http://streetviewplayer.org/VirtualRide" );
					document.location.href = newUrl = "http://StreetViewPlayer.org";
   				}

				var map_options = {
					disableDoubleClickZoom: true,
					fullscreenControl: false,
					draggable: true,
                   	zoom: 14,
                   	clickableIcons: false,
                   	keyboardShortcuts: false,
                   	rotateControl: false,
                   	scaleControl: true,
                   	scrollwheel: true,
                   	zoomControl: true,
                   	mapTypeControl: false,
                   	streetViewControl: true,
                };
                map = new google.maps.Map( document.getElementById('id_map_canvas'), map_options );
				create_route_dlg();

				require(["dojo/dom", "dojo/on", "dojo/dom-style"], function( dom, on, domStyle ) {
					for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
						for (var n = 0; n < MAX_NB_WAYPOINTS+2; n++) { 
							(function (route_index, n) {
								var id_label_wp = "id_label_wp_"+route_index+"_"+n;
								on( dom.byId(id_label_wp), "click", function( evt ) {
//									console.log("XX: "+route_index+","+n);
								});
							})(route_index, n);
						}
					}
				});

			    require(["RouteViewMapStyles.js"], function( s ) { 
			    	var map_style = dom.byId('id_map_style').value;
			    	if ( map_style != "" )
			    		s.set_map_style( map, parseInt( map_style ) ); 
			    });

                service = new google.maps.places.PlacesService( map );
                
   				marker_no_street_view = new google.maps.Marker({
					map: map,
					title: 'No Street View available',
					icon: "http://www.google.com/mapfiles/arrow.png"
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
                    fullscreenControl: false
                };

                panorama = new google.maps.StreetViewPanorama( document.getElementById('id_panorama'), panorama_options );
                map.setStreetView( panorama );

            	map_or_panorama_full_screen = false;

        		google.maps.event.addListener( map, "click", function( evt ) {
        			cb_map_click( evt );
       			});
        		
				google.maps.event.clearListeners( map, 'rightclick' );
        		google.maps.event.addListener( map, "rightclick", function( evt ) {
        			cb_map_rightclick( evt );
       			});
        		
            	var id_panorama = dom.byId('id_panorama');
        		on( id_panorama, "click", function( evt ) {
       				if ( evt.handled != true )
       					cb_panorama_click( );
       			});

        		_list_countries = [
        		    {id: 0,    list:['Algeria','Burkina Faso','Faeroe Islands','Ghana','Guinea Republic','Iceland','Ireland','Ivory Coast','Liberia','Mali','Morocco','Sao Tome and Principe','Senegal','Sierra Leone','Saint Helena','Gambia','Togo','United Kingdom']},
        		    {id: 1,    list:['Albania','Andorra','Angola','Australia','Austria','Belgium','Benin','Bosnia','Cameroon','Central Africa Republic','Chad','Congo','Croatia','Czech Republic','Congo, Democratic Republic','Denmark','Equatorial Guinea','France','Gabon','Germany','Gibraltar','Guam','Hungary','Italy','Liechtenstein','Luxembourg','Macedonia (Fyrom)','Malta','Mariana Islands','Marshall Islands','Micronesia','Monaco','Netherlands','Niger','Nigeria','Norway','Papua New Guinea','Poland','Portugal','San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Tunisia']},
        		    {id: -1,   list:['Cape Verde','Cook Islands','French Polynesia','Guinea Bissau','USA']},
        		    {id: 11,   list:['New Caledonia','Solomon Islands','Vanuatu']},
        		    {id: -11,  list:['Niue','American Samoa','Samoa','USA']},
        		    {id: 11.5, list:['Norfolk Island']},
        		    {id: 12,   list:['Fiji','Kiribati','Nauru','New Zealand','Tuvalu','Wallis and Futuna']},
        		    {id: 2,    list:['Botswana','Bulgaria','Burundi','Cyprus','Congo, Democratic Republic','Egypt','Finland','Greece','Israel','Jordan','Lebanon','Lesotho','Libya','Lithuania','Malawi','Mozambique','Namibia','Palestine','Romania','Rwanda','South Africa','Sudan','Swaziland','Syria','Turkey','Zambia','Zimbabwe']},
        		    {id: 3,    list:['Bahrain','Belarus','Comoros','Djibouti','Eritrea','Estonia','Ethiopia','Iraq','Kenya','Kuwait','latvia','Madagascar','Mayotte','Moldova','Qatar','Russia','Saudi Arabia','Somalia','Tanzania','Uganda','Ukraine','Yemen Arab Republic']},
        		    {id: -3,   list:['Argentina','Brazil','Cuba','Greenland','Guyana','Uruguay']},
        		    {id: 3.5,  list:['Iran']},
        		    {id: -3.5, list:['Surinam']},
        		    {id: 4,    list:['Armenia','Azerbaijan','Georgia','Mauritius','Oman','Reunion','Seychelles','United Arab Emirates']},
        		    {id: -4,   list:['Anguilla','Antigua and Barbuda','Aruba','Barbados','Bermuda','Bolivia','Brazil','Canada','Chile','Dominica','Dominican Republic','Falkland Islands (Malvinas)','French Guiana ','Grenada','Guadeloupe','Martinique','Montserrat','Netherlands Antilles','Paraguay','Puerto Rico','Saint Kitts and Nevis','Saint Lucia','Trinidad and Tobago','Venezuela']},
        		    {id: 5,    list:['Diego Garcia','Maldives Republic','Pakistan','Turkmenistan']},
        		    {id: -5,   list:['Bahamas','Brazil','Canada','Cayman Islands','Colombia','Ecuador','Haiti','Jamaica','Panama','Peru','Turks and Caicos Islands','USA']},
        		    {id: 5.5,  list:['Bhutan','India','Nepal','Sri Lanka']},
        		    {id: 6,    list:['Bangladesh','Kazakhstan','Kyrgyzstan','Tajikistan','Uzbekistan']},
        		    {id: -6,   list:['Belize','Canada','Costa Rica','El Salvador','Guatemala','Honduras','Mexico','Nicaragua','USA']},
        		    {id: 6.5,  list:['Myanmar']},
        		    {id: 7,    list:['Australia','Cambodia','Indonesia','Laos','Thailand','Vietnam']},
        		    {id: -7,   list:['Canada','Mexico','USA']},
        		    {id: 8,    list:['Australia','Brunei','China','Hong Kong','Indonesia','Macau','Malaysia','Mongolia','Philippines','Singapore','Taiwan']},
        		    {id: -8,   list:['Canada','Mexico','USA']},
        		    {id: 9,    list:['Australia','Indonesia','Japan','Korea','Palau']},
        		    {id: -9,   list:['USA']},
        		];
        		list_countries = new Memory({data: _list_countries});

        		iso_countries = new Memory({data: _iso_countries});

        		var list_all_countries_store = new Memory({ idProperty: "name", data: [ ], type: "separator" });
        		_iso_countries.forEach( function(entry) {
//	         		console.log( entry.id );
					if ( entry.id == "" )
        		    	list_all_countries_store.add( { name: entry.id, type: "separator" } );
					else
        		    	list_all_countries_store.add( { name: entry.id } );
        		});
        		
				var options = ' \
					<optgroup label="North America"> \
						<option value="US">USA</option> \
						<option value="CA">Canada</option> \
						<option value="MX">Mexico</option> \
					</optgroup> \
					<optgroup label="South America"> \
						<option value="CL">Chile</option> \
						<option value="BR">Brazil</option> \
					</optgroup> \
					<optgroup label="Europe"> \
						<option value="AD"Andorre</option> \
						<option value="AT"Austria</option> \
						<option value="BE">Belgium</option> \
						<option value="CH">Switzerland</option> \
						<option value="CZ">Czech Republic</option> \
						<option value="DK">Denmark</option> \
						<option value="DE">Germany</option> \
						<option value="FI">Finland</option> \
						<option value="FR">France</option> \
						<option value="GR">Greece</option> \
						<option value="HU">Hungury</option> \
						<option value="IE">Ireland</option> \
						<option value="IT">Italy</option> \
						<option value="LU">Luxembourg</option> \
						<option value="MC">Monaco</option> \
						<option value="NL">Netherlands</option> \
						<option value="NO">Norway</option> \
						<option value="PL">Poland</option> \
						<option value="PT">Portugal</option> \
						<option value="SE">Sweden</option> \
						<option value="GB">United Kingdom</option> \
					</optgroup>';

        		Date.prototype.stdTimezoneOffset = function() {
        		    var jan = new Date(this.getFullYear(), 0, 1);
        		    var jul = new Date(this.getFullYear(), 6, 1);
        		    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
        		}

        		Date.prototype.dst = function() {
        		    return this.getTimezoneOffset() < this.stdTimezoneOffset();
        		}

        		var langCode = navigator.language || navigator.systemLanguage;
        		var lang = langCode.toLowerCase(); 
        		lang = lang.substr(0,2);
        		var dateObject = new Date(); //this timezone offset calc taken from http://unmissabletokyo.com/country-detector.html
        		var timeOffset = - dateObject.getTimezoneOffset() / 60; 
        		if ( dateObject.dst() )
        		    timeOffset += ((timeOffset < 0) ? -1 : 1);
        		console.log( "lang=[" + lang + "]" );
        		console.log( "timeOffset=[" + timeOffset + "]" );
        		console.log( "dst=" + dateObject.dst() );

                require(["dojo/ready", "dojo/aspect", "dijit/registry", "dojo/dom-style"], function(ready, aspect, registry, domStyle) {
                    ready( function() {
                    	aspect.after(dom.byId("id_left_layout"), "resize", function() {
                            google.maps.event.trigger( map, 'resize' );
                            google.maps.event.trigger( panorama, 'resize' );
                        });
                    });
                });

/*
                require(["dojo/dnd/Moveable", "dojo/dom", "dojo/on", "dojo/domReady!"], function(Moveable, dom, on){
                	var dnd = new Moveable( dom.byId("id_tr_0_0"), {hint: "avatar"} );
                	on( dnd, "MoveStart", function (e) {
                        console.log( "Move started" );
                		console.log(e);
                    });
                	on( dnd, "FirstMove", function (e) {
                        console.log( "First Move" );
                		console.log(e);
                    });
                	on( dnd, "MoveStop", function (e) {
                        console.log( "Move stopped" );
                		console.log(e);
                    });
                	on( dnd, "Drop", function (e) {
                        console.log( "Move stopped" );
                		console.log(e);
                    });
           		});
*/

				for (var r = 0; r < MAX_NB_ROUTES; r++) {
					cb_route_from_or_to_changed_handle[r] = [];
					for (var n = 0; n < MAX_NB_WAYPOINTS+2; n++)
						cb_route_from_or_to_changed_handle[r][n] = undefined;
				}

		    	var autocomplete_restriction = dom.byId('id_autocomplete_restriction').value;
		    	var autocomplete_restrict_country = dom.byId('id_autocomplete_restrict_country').value;
  	  	       	var code_country = autocomplete_restrict_country;
  	  	       	console.log( "code_country = [" + code_country + "]" );
       			autocompletes = [];
       			places = [];
       			for ( var route = 0; route < MAX_NB_ROUTES; route++ ) {
	       			autocompletes[route] = [];
	       			places[route] = [];
	       			for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) { 
	       				autocompletes[route][n] = new google.maps.places.Autocomplete( dom.byId('id_wp_'+route+'_'+n) );
	       				if ( autocomplete_restriction != "" )
            	       		autocompletes[route][n].setTypes([ autocomplete_restriction ]);
	       				if ( code_country != "" )
			 	  	    	autocompletes[route][n].setComponentRestrictions( {country: code_country} );
	       				google.maps.event.clearListeners( autocompletes[route][n], 'place_changed' );
	       				autocompletes[route][n].addListener('place_changed', function( ) {
//							console.log( this );
	            			var r = get_route_waypoint( autocompletes, this );
			            	var route_index = r.route_index;
	            			var waypoint_index = r.waypoint_index;
							console.log( "route_index=" + route_index + " waypoint_index=" + waypoint_index );
	                		console.log( "Place changed: route=" + route_index + " waypoint_index=" + waypoint_index );
	                		console.log( autocompletes[route_index][waypoint_index] );
	                		var place = autocompletes[route_index][waypoint_index].getPlace();
	                		console.log( place );
	                		if ( place.geometry == undefined ) {
								function look_for_address( place_name, route_index, waypoint_index) {
									var geocoder = new google.maps.Geocoder();
									geocoder.geocode( { 'address': place_name}, function(results, status) {
										if ( status == google.maps.GeocoderStatus.OK ) {
//											console.log( results);
											service.getDetails({
												placeId: results[0].place_id
											}, function ( place, status ) {
												console.log( " --> " + route_index + " , " + waypoint_index );
												if ( status == google.maps.places.PlacesServiceStatus.OK ) {
													places[route_index][waypoint_index] = place;
													require(["dojo/dom-style"], function( domStyle) {
														domStyle.set( "id_wp_"+route_index+"_"+waypoint_index, { color: "black" } );
													});
												}
											});
										} 
										else {
											console.log("Geocode was not successful for the following reason: " + status);
										}
									});
								}
								look_for_address( place.name, route_index, waypoint_index );
							}
							else {
								require(["dojo/dom-style"], function( domStyle) {
									domStyle.set( "id_wp_"+route_index+"_"+waypoint_index, { color: "black" } );
								});
								dijit.byId("id_wp_"+route_index+"_"+waypoint_index).set( 'value', place.formatted_address );
								require(["dijit/Tooltip"], function(Tooltip) {
									var tooltip = dijit.byId("id_tooltip_label_wp_"+route_index+'_'+waypoint_index);
									if (tooltip == undefined) {
										new Tooltip({
											id: ["id_tooltip_label_wp_"+route_index+'_'+waypoint_index],
											connectId: ["id_label_wp_"+route_index+'_'+waypoint_index],
											position:['below-centered'],
											label: place.name,
											showDelay:650,
											hideDelay:0
										});
									}
									else {
										dijit.byId("id_tooltip_label_wp_"+route_index+'_'+waypoint_index).set( 'label', place.name );
									}
								});
							}
	                		if ( cb_route_from_or_to_changed_handle[route_index][waypoint_index] != undefined )
	                			clearTimeout( cb_route_from_or_to_changed_handle[route_index][waypoint_index] );
	                		places[route_index][waypoint_index] = place;
						   	require(["dojo/dom"], function( dom ) {
						   		if ( place.geometry && place.geometry.location )
	    							dijit.byId("gps_loc_wp_"+route_index+"_"+waypoint_index).innerHTML = "<b>" + place.geometry.location.lat() + " " + place.geometry.location.lng() + "</b>";
						   	});
			            	cb_route_from_or_to_changed_handle[route_index][waypoint_index] = setTimeout( 
			            		function() { cb_route_from_or_to_changed(route_index, waypoint_index); }, interval, 250 );
	                	});
	       			}
       			}

   				got_location = false;

   				var decoded_flags = decode_url_params();

				if ( !decoded_flags ) {
					var is_addr_for_orig = (dijit.byId('id_addr_for_orig').get( 'value') == "") ? false : true;
					if (is_addr_for_orig) {
						dijit.byId('id_wp_0_0').set('value', dijit.byId('id_addr_for_orig').get( 'value'));

						var geocoder = new google.maps.Geocoder();
						geocoder.geocode( { 'address': dijit.byId('id_addr_for_orig').get( 'value')}, function(results, status) {
							if ( status == google.maps.GeocoderStatus.OK ) {
//								console.log( results);
								service.getDetails({
									placeId: results[0].place_id
								}, function ( place, status ) {
									if ( status == google.maps.places.PlacesServiceStatus.OK ) {
										places[0][0] = place;
									}
								});
								map.setCenter(results[0].geometry.location);
								update_btns_remove_up_down( 0 );
							} 
							else {
								console.log("Geocode was not successful for the following reason: " + status);
							}
						});
					}
				}
				
				on( dijit.byId("id_input_route"), "click", function( evt ) {

					require(["dojo/dom-geometry", "dojo/dom", "dojo/dom-style"], function(domGeom, dom, style){
						var node = dom.byId("id_input_route");
						var includeScroll = false;
						var output = domGeom.position(node, includeScroll);
						var x = (is_ff) ? evt.clientX : evt.x;
						var perc = ((x - output.x) / output.w) * 100;
						var new_curr_dist = (eol * perc) / 100;
						console.log( perc + " / " + eol + " -> " + new_curr_dist );
						if ( timer_animate != undefined ) { 
							clearTimeout( timer_animate );
							timer_animate = undefined;
						}				
						if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
							clearTimeout( timer_set_bearing );
							timer_set_bearing = undefined;
						} 
						(function (route_index, curr_dist ) {
							marker_pos_using_slider.setMap( null );
							marker_pos_using_slider_no_pano.setMap( null );
							if ( timer_animate != undefined ) { 
								clearTimeout( timer_animate );
								timer_animate = undefined;
							}				
							timer_animate = setTimeout( function() { cb_animate(route_index, curr_dist); }, 50 );
						})(curr_route, new_curr_dist);
					});

       			});

				on( dijit.byId("id_input_route"), "mousemove", function( evt ) {
					
					if ( (selected_route_index == undefined) || (polylines[selected_route_index] == undefined) || (timer_animate == undefined) )
						return;
					
					if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
						return;
					
					var node = dom.byId("id_input_route");
					var includeScroll = false;
					var output = domGeom.position(node, includeScroll);

					var x = (is_ff) ? evt.clientX : evt.x;
					var perc = ((x - output.x) / output.w) * 100;
					var new_curr_dist = (eol * perc) / 100;
					console.log( perc + " / " + eol + " -> " + new_curr_dist );
					var polyline = (curr_route == -1) ? temp_polylines[0] : polylines[curr_route][curr_leg];
					
					var p = polyline.GetPointAtDistance( new_curr_dist );
					if ( !map.getBounds().contains( p ) )
						map.panTo( p );

					street_view_check[(curr_route == -1) ? 0 : curr_route].getPanoramaByLocation(p, 50, (function() { return function(result, status) {
						if (status == google.maps.StreetViewStatus.ZERO_RESULTS ) {
							if ( marker_pos_using_slider.getMap() != undefined )
								marker_pos_using_slider.setMap( null );
							marker_pos_using_slider_no_pano.setPosition( p );
							if ( marker_pos_using_slider_no_pano.getMap() == undefined )
								marker_pos_using_slider_no_pano.setMap( map );
						}
						else {
							if ( marker_pos_using_slider_no_pano.getMap() != undefined )
								marker_pos_using_slider_no_pano.setMap( null );
							marker_pos_using_slider.setPosition( p );
							if ( marker_pos_using_slider.getMap() == undefined )
								marker_pos_using_slider.setMap( map );
						}
					}})());

				});

        		on( window, "resize", function( evt ) {
	        		if ( is_in_full_screen() )
						domStyle.set( "id_top_layout", "display", "none" );
	        		else
						domStyle.set( "id_top_layout", "display", "" );
					dijit.byId('app_layout').resize();
       			});

				window.onkeydown = function( evt ) {

					if (map.getCenter() == undefined)
						return;
					if (timer_animate != undefined)
						return;

//					console.log( evt.ctrlKey + " , " + evt.altKey );
					if ( (dlg_commands == undefined) && evt.ctrlKey && evt.altKey ) {
						do_show_commands_message();
						domStyle.set( "id_show_help", "display", "" );
						domStyle.set( "id_control_route", "display", "none" );
						return;
					}
					
					if ( dlg_commands == undefined )
						return;

					var force_close = false;
						
					if ( (evt.key =='s') || (evt.key =='S') ) {
						if ( streetViewLayer.getMap() != undefined )
							streetViewLayer.setMap( null );
						else
							streetViewLayer.setMap( map );
						force_close = true;
					}

					else if ( (evt.key == "P") || (evt.key == "p") ) {
						streetViewLayer.setMap( null );
						if ( !ctrl_mode ) {
							ctrl_mode = true;
							begin_ctrl_mode();
						}
						else if ( (timer_animate == undefined) && (temp_directions_renderer == undefined) ) {
							ctrl_mode = false;
							end_ctrl_mode();
						}
						force_close = true;
					}

					if ( force_close || (evt.key == "Escape") ) {
						do_hide_commands_message();
						domStyle.set( "id_show_help", "display", "none" );
						domStyle.set( "id_control_route", "display", "" );
						return;
					}

				}

				var is_file_api = (window.File && window.FileReader && window.FileList && window.Blob) ? true : false;
				console.log( "is_file_api = " + is_file_api );
				if ( is_file_api ) {
					document.getElementById( 'id_btn_load_file').addEventListener('change', load_file_select, false );
				}

            });

/*		
			window.onerror = function(message, file, lineNumber) {
				console.log(message);
				console.log(file);
				console.log(lineNumber);
				return false; 
			};
*/

		});
            	
		window.onblur = function() {

			if ( alt_down ) {
				console.log( "Cancel alt mode" );
				alt_down = false;
				streetViewLayer.setMap( null );
			}

			if ( browse_images_mode ) {
				console.log( "Cancel browse mode" );
				cb_route_input_mouse_leave( );
			}

		}

		window.onbeforeunload = function() {
			if ( (location.hostname != "localhost") && is_dirty )
				return "Route not saved";
			return null;
		}

    }
    
	function move_to_dist( new_pos, go_timer ) {

		var slider_disabled = dijit.byId('id_input_route').get( 'disabled' );
		if ( slider_disabled )
			return;

		var route_index = curr_route;

		if ( go_timer ) {
			if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
				clearTimeout( timer_set_bearing );
				timer_set_bearing = undefined;
			} 
			if ( timer_animate != undefined ) { 
				clearTimeout( timer_animate );
				timer_animate = undefined;
			}				
	       	timer_animate = setTimeout( function() { cb_animate(new_pos); }, interval );
		}

		var polyline = (route_index == -1) ? temp_polylines[0] : polylines[route_index][curr_leg];
		
        var p = polyline.GetPointAtDistance( new_pos );
        if ( !map.getBounds().contains( p ) )
            map.panTo( p );

		street_view_check[(route_index == -1) ? 0 : route_index].getPanoramaByLocation(p, 50, (function(route_index) { return function(result, status) {
		    if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
		        console.log( "No street view available" );        
        		marker_no_street_view.setPosition( p );
		    }
		    else {
        		marker_no_street_view.setPosition( null );
        		panorama.setPosition( p );
        		var prev_bearing = bearing;
		        var bearing = polyline.Bearing( polyline.GetIndexAtDistance( new_pos ) );
				if (bearing == undefined)
					bearing = prev_bearing;
		        panorama.setPov({
            		heading: bearing,
		            pitch: 1
        		});
		    }
		}})(route_index));

		cb_move_to_dist = undefined;

		curr_dist = new_pos;
	}

    function cb_route_input( ) {

		var slider_disabled = dijit.byId('id_input_route').get( 'disabled' );
		if ( slider_disabled ) 
			return;

		var new_pos = dijit.byId('id_input_route').get( 'value' );
		new_pos = Math.round( new_pos );

		if ( cb_move_to_dist != undefined ) {
			clearTimeout( cb_move_to_dist );
			cb_move_to_dist = undefined;
		}
		if ( new_pos == 0 )
			new_pos = 50;
		cb_move_to_dist = setTimeout( 'require(["RouteView.js"], function( s ) { s.move_to_dist('+new_pos+', false); })', 125 );
    }

    function cb_route_input_mouse_enter( ) {
	
		if ( (selected_route_index == undefined) || (polylines[selected_route_index] == undefined) || (timer_animate == undefined) )
			return;
		
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
			return;
		
//		console.log( "Enter" );
	
	/*
		browse_images_mode = true;

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct ) {
			domStyle.set( "id_top_layout", "display", "none" );
			domStyle.set( "id_left_layout", "display", "none" );
			dijit.byId('app_layout').resize();
				if ( map_or_panorama_full_screen ) {
					domConstruct.place("td_panorama", "td_map_canvas", "after");
		            document.getElementById("td_map_canvas").style.width = "50%";
		            document.getElementById("td_panorama").style.width = "50%";
					map_or_panorama_full_screen = false;
				}
			document.getElementById("td_map_canvas").style.width = "50%";
			document.getElementById("td_panorama").style.width = "50%";
		});
*/
		
	}

    function cb_route_input_mouse_leave( ) {
		
		if ( (selected_route_index == undefined) || (polylines[selected_route_index] == undefined) || (timer_animate == undefined) )
			return;
		
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" )
			return;
		
//		console.log( "Leave" );

		marker_pos_using_slider.setMap( null );
		marker_pos_using_slider_no_pano.setMap( null );

/*
		if ( !browse_images_mode )
			return;
		browse_images_mode = false;

		if ( timer_show_pano_on_mousemove != undefined ) {
			clearTimeout( timer_show_pano_on_mousemove );
			timer_show_pano_on_mousemove = undefined;
		}

		marker_no_street_view.setPosition( null );

		directions_renderer.forEach( function( e ) {
		   	e.setOptions( { zIndex:99, draggable:true } ); })

		google.maps.event.clearListeners( map, 'mousemove' );
		
		panorama.setVisible( false );

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct ) {
			domStyle.set( "id_top_layout", "display", "" );
			domStyle.set( "id_left_layout", "display", (ctrl_mode) ? "none" : "table-cell" );
    		document.getElementById("td_map_canvas").style.width = "100%";
            document.getElementById("td_panorama").style.width = "0%";
			if ( !map_or_panorama_full_screen ) {
				domConstruct.place("td_panorama", "id_hidden", "after");
				map_or_panorama_full_screen = true;	
			}
			else {
				domConstruct.place("td_map_canvas", "td_panorama", "before");
				domConstruct.place("td_panorama", "td_map_canvas", "after");
				map_or_panorama_full_screen = false;
			}
    		dijit.byId('app_layout').resize();
	        google.maps.event.trigger( map, 'resize' );
		});
*/
    	
	}

	function browse_images( route_index ) {
		
		cb_route_input_mouse_enter( );
		browse_images_mode = true;
		
   		map.fitBounds( route_bounds[route_index] );

		directions_renderer.forEach( function( e ) {
		   	e.setOptions( { zIndex:99, draggable:false } ); })

        var new_dir = directions_renderer[route_index].getDirections();

		is_dirty = true;
		var path = new_dir.routes[0].overview_path;

		panorama.setVisible( true );

		(function (path ) {
			google.maps.event.addListener( map, 'mousemove', function (event) {

				var prev_closest_lat_lng = undefined;
				var closest_lat_lng = undefined;
				var index_found = undefined;
				var dist0 = 0;
				var nb = 0;
				var prev_ee;
				var ee;
				path.forEach( function( e, index ) {
					nb++;
					var dist = calculateDistance( event.latLng.lat(), event.latLng.lng(), e.lat(), e.lng() );
					if ( (closest_lat_lng == undefined) || (dist < dist0) ) {
						index_found = index;
						dist0 = dist;
						if ( prev_ee == undefined )
							prev_ee = e;
						prev_closest_lat_lng = {lat: prev_ee.lat(), lng: prev_ee.lng()};
						closest_lat_lng = {lat: e.lat(), lng: e.lng()};
						ee = e;
						prev_ee = e;
					}
				});
				
				if ( index_found != undefined ) {
					
					if ( timer_show_pano_on_mousemove != undefined ) {
						clearTimeout( timer_show_pano_on_mousemove );
						timer_show_pano_on_mousemove = undefined;
					}

					(function ( prev_closest_lat_lng, closest_lat_lng, index_found ) {

						timer_show_pano_on_mousemove = setTimeout( function() { 

							function radians( n ) {
								return n * (Math.PI / 180);
							}
							
							function degrees( n ) {
								return n * (180 / Math.PI);
							}

							function getBearing( startLat, startLong, endLat, endLong) {
								startLat = radians(startLat);
								startLong = radians(startLong);
								endLat = radians(endLat);
								endLong = radians(endLong);

								var dLong = endLong - startLong;

								var dPhi = Math.log(Math.tan(endLat/2.0+Math.PI/4.0)/Math.tan(startLat/2.0+Math.PI/4.0));
								if (Math.abs(dLong) > Math.PI){
									if (dLong > 0.0)
										dLong = -(2.0 * Math.PI - dLong);
									else
										dLong = (2.0 * Math.PI + dLong);
								}

								return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
							}
						
							var route_index = selected_route_index;

							street_view_check[route_index].getPanorama( {location: closest_lat_lng, radius: 50}, function(data, status) {
								if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
//									console.log( "No street view available" ); 
									marker_no_street_view.setPosition( closest_lat_lng );
								}
								else {
									marker_no_street_view.setPosition( null );
									panorama.setPano( data.location.pano );
									var prev_bearing = bearing;
									var bearing = getBearing( prev_closest_lat_lng.lat, prev_closest_lat_lng.lng, closest_lat_lng.lat, closest_lat_lng.lng );
									if (bearing == undefined)
										bearing = prev_bearing;
									setTimeout( function() { panorama.setPov( { heading: bearing, pitch: 1 } ); }, 25 );
								}
							});

						}, 50);
					})( prev_closest_lat_lng, closest_lat_lng, index_found );

				}

			});
		})(path);

	}

    function cb_step_changed( ) {
    	step = dijit.byId('id_input_meters').get( 'value' );
        document.getElementById("id_meters").innerHTML = step;
        document.getElementById("id_feet").innerHTML = Math.floor(step * 3.2808);
    }

    function cb_interval_changed( ) {
    	interval = dijit.byId('id_input_interval').get( 'value' );
        document.getElementById("id_interval").innerHTML = interval;
    }
    
	function cb_route_tickness_changed( ) {
    	route_tickness = dijit.byId('id_input_route_tickness').get( 'value' );
        document.getElementById("id_route_tickness").innerHTML = route_tickness;
		directions_renderer.forEach( function( e ) {
            var route_index = directions_renderer.indexOf( e );
	       	e.setOptions( { polylineOptions: { strokeColor: route_colors[route_index], strokeWeight: route_tickness } } ); 
	       	e.setMap( map );
		})
	}

    function cb_click_no_hwy( route_index ) {

    	if ( !dijit.byId("id_btn_drive_"+route_index+"_1").get("disabled") )
    		do_route( route_index );
    }

    function cb_click_no_toll( route_index ) {
    	
    	if ( !dijit.byId("id_btn_drive_"+route_index+"_1").get("disabled") )
    		do_route( route_index );
    }

	function start_driving_temporary_route( xroute ) {

		require(["dojo/dom-construct"], function(domConstruct){
			domConstruct.place("td_panorama", "td_map_canvas", "after");
            document.getElementById("td_map_canvas").style.width = "50%";
            document.getElementById("td_panorama").style.width = "50%";
			map_or_panorama_full_screen = false;
	        google.maps.event.trigger( map, 'resize' );
	        google.maps.event.trigger( panorama, 'resize' );
		});

        var path = xroute.overview_path;
        var legs = xroute.legs;
        var leg = legs[0];
        var distance = leg.distance.text;
        var meters = leg.distance.value;
        var duration = leg.duration.text;
        console.log( "distance = " + distance );
        console.log( "duration = " + duration );

		temp_polylines = [];
		var legs_bounds = new google.maps.LatLngBounds();
        for ( i = 0; i < legs.length; i++) {
        
            temp_polylines[i] = new google.maps.Polyline({
                path: [],
                strokeColor: '#FFFF00',
                strokeWeight: 5
            });
            
            var steps = legs[i].steps;
            console.log( i + ": m=" + legs[i].distance.value + " secs=" + legs[i].duration.value + " - len=" + steps.length );

            for ( var j = 0; j < steps.length; j++) {
                var nextSegment = steps[j].path;
                for ( var k = 0; k < nextSegment.length; k++) {
                    temp_polylines[i].getPath().push(nextSegment[k]);
                    legs_bounds.extend(nextSegment[k]);
                }
            }
            
        }
	
		temp_polylines.forEach( function(e) { e.setMap(map); })

		dijit.byId('id_btn_pause').set( 'disabled', false );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', false );
		
		dijit.byId('id_input_route').set( 'disabled', false );
		dijit.byId('id_input_route').set( 'intermediateChanges', false );

        eol = temp_polylines[0].Distance();
        map.setCenter( temp_polylines[0].getPath().getAt(0) );
		map.fitBounds( legs_bounds );

    	step     = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        street_view_check[0] = new google.maps.StreetViewService( );

		if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
			clearTimeout( timer_set_bearing );
			timer_set_bearing = undefined;
		} 
		if ( timer_animate != undefined ) { 
			clearTimeout( timer_animate );
			timer_animate = undefined;
		}				
       	timer_animate = setTimeout( function() { cb_animate(-1, 50); }, 250 );

        // Update route slider
		dijit.byId('id_input_route').set( 'maximum', eol );
		dijit.byId('id_input_route').set( 'discreteValues,', eol );
		dijit.byId('id_input_route').set( 'value', 0 );

        map.setOptions({draggableCursor: 'hand'});
	}

	function start_temporary_route( latLng ) {
	
		console.log( "Start temporary route" );

    	require(["dojo/dom-style"], function( domStyle) {
			domStyle.set( "id_text_cancel_ctrl_mode", "display", "none" );
		});

		map.setOptions({draggableCursor: 'crosshair'});

 		panorama.setVisible( true );

        temp_directions_service = new google.maps.DirectionsService( );

        temp_directions_renderer = new google.maps.DirectionsRenderer({
            draggable: true,
            map: map,
            hideRouteList: false,
            preserveViewport: true,
            suppressMarkers: false,
	        markerOptions: {
	          	opacity: 1.0
            }
        });

        temp_directions_renderer.addListener('directions_changed', function() {
        	console.log( "Directions Changed!");
        	console.log(temp_directions_renderer);
            var new_dir = temp_directions_renderer.getDirections();
            console.log( new_dir );
            if ( new_dir.geocoded_waypoints[0].place_id != new_dir.geocoded_waypoints[1].place_id ) {
		       	temp_directions_renderer.setOptions( { zIndex:99, draggable:false } );
            	start_driving_temporary_route( new_dir.routes[0] );
            }
        });
            
        temp_directions_service_request = {
            origin: latLng,
            destination: latLng,
            travelMode: google.maps.DirectionsTravelMode.DRIVING,
            optimizeWaypoints: false,
            avoidHighways: true,
            avoidTolls: true,
        };

      	temp_directions_service.route( temp_directions_service_request, 
			(function(temp_directions_renderer) { return function(response, status) {
				if ( status == google.maps.DirectionsStatus.OK ) {
//					console.log( response );
		        	temp_directions_renderer.setMap( map );
	    	    	temp_directions_renderer.setDirections( response );
				}
		}})(temp_directions_renderer));
      	
	}
	
	function stop_driving_temporary_route( ) {
	
		console.log("stop_driving_temporary_route");
	
    	require(["dojo/dom-style"], function( domStyle) {
    	
			if ( (google_api == 3.25) && (timer_set_bearing != undefined) ) { 
				clearTimeout( timer_set_bearing );
				timer_set_bearing = undefined;
			} 
			if ( timer_animate != undefined ) { 
				clearTimeout( timer_animate );
				timer_animate = undefined; 
			}
	
			domStyle.set( "id_text_cancel_ctrl_mode", "display", "" );
	
			dijit.byId('id_btn_pause').set( 'disabled', true );
	    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
			dijit.byId('id_btn_stop').set( 'disabled', true );
			
			dijit.byId('id_input_route').set( 'disabled', true );
			dijit.byId('id_input_route').set( 'intermediateChanges', false );
			
	   		if ( temp_directions_renderer != undefined )
	   			temp_directions_renderer.setMap( null );
	       	if ( temp_polylines != undefined )
				temp_polylines.forEach( function(e) { e.setMap(null); })
			temp_polylines = undefined;
	   		temp_directions_renderer = undefined;
	
	   		marker_no_street_view.setPosition( null );
	
	    	map.setOptions({draggableCursor: 'crosshair'});
	    	
	    	temp_directions_service = undefined;
    	});
	}

    function download_file( text, name, type ) {
    
        var a = document.createElement("a");
        var file = new Blob([text], {type: type});
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
    }

    function do_create_long_url( ) {

		var url = location.origin + location.pathname;
		url += "?";

		var nb_routes = 0;
		var nb_wp = [];
    	require(["dojo/dom-style"], function( domStyle) {
    		for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
        		var display = domStyle.get( 'id_fieldset_route_'+route_index, "display" );
        		if (display == "none")
        			break;
				if (route_index > 0)
					url += "&"; 
				url += "route="; 
        		nb_routes++;
				nb_wp[route_index] = 0;
	            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
	        		var display = domStyle.get( 'id_tr_'+route_index+'_' + n, "display" );
	            	if ( display != "none" ) {
						if ((places[route_index][n] == undefined) || (places[route_index][n].geometry == undefined) || (places[route_index][n].geometry.location == undefined))
							domStyle.set( 'id_wp_'+route_index+'_'+n, { color: "red" } );
	            		console.log( n + " ==> " + places[route_index][n].name + " : " + places[route_index][n].geometry.location.lat() + " , " + places[route_index][n].geometry.location.lng() );
						if (n > 0)
							url += "&"; 
						var v = dijit.byId('id_wp_'+route_index+'_'+n).get( 'value');
		    	        url += encodeURIComponent(v);
	            	}
	            }
	            console.log("Route " + route_index + " : " + nb_wp[route_index] + " waypoints");
    		}
 		})

		do_copy_message( "Long URL", "Long URL to create these routes", url );
    
    }

    function do_create_short_url( ) {

		console.log( "do_create_short_url" );
    
 		gapi.client.setApiKey( api_key );
		gapi.client.load( 'urlshortener', 'v1', makeRequest );

		 function makeRequest() {
			var request = gapi.client.urlshortener.url.insert({
				'resource': {'longUrl': 'https://codepen.io/'}
			});
			request.execute(function(response) {
		    	alert(JSON.stringify(window.got = response));
			});
		}
		
    }
    
    function do_save_gpx( ) {
    	
    	// xmllint --noout --schema http://www.topografix.com/GPX/1/0/gpx.xsd testfile.gpx

		var nb_routes = 0;
		var nb_wp = [];
		console.log( places );
    	require(["dojo/dom-style"], function( domStyle) {
    		for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
        		var display = domStyle.get( 'id_fieldset_route_'+route_index, "display" );
//        		console.log(display);
        		if (display == "none")
        			break;
        		nb_routes++;
				nb_wp[route_index] = 0;
				console.log( places[route_index] );
	            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
	        		var display = domStyle.get( 'id_tr_'+route_index+'_' + n, "display" );
	            	if ( display != "none" ) {
						if ( (places[route_index][n] == undefined) || (places[route_index][n].geometry == undefined) ) {
//							console.log( route_index + " , " + n + " ==> " + places[route_index][n].name + " ? " );
							domStyle.set( 'id_wp_'+route_index+'_'+n, { color: "red" } );
						}
						else {
							if ( places[route_index][n].geometry.location == undefined ) {
								console.log( route_index + " , " + n + " ==> " + places[route_index][n].name + " ? " + places[route_index][n].geometry );
							}
							else {
								console.log( route_index + " , " + n + " ==> " + places[route_index][n].name + " : " + places[route_index][n].geometry.location.lat() + " , " + places[route_index][n].geometry.location.lng() );
							}
						}
	            		nb_wp[route_index]++;
	            	}
	            }
	            console.log("Route " + route_index + " : " + nb_wp[route_index] + " waypoints");
    		}
 		})
    	
    	var crlf = String.fromCharCode(13) + String.fromCharCode(10);
    	
        var gpx = '';
        
        gpx += '<?xml version="1.0" encoding="UTF-8"?>' + crlf +
        	'<gpx version="1.0" creator="" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/0" xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd">' + crlf + 
        	'<time>2015-06-12T21:36:34Z</time>' +crlf;

		var src = '';
		var dst = '';

   		for (var route_index = 0; route_index < nb_routes; route_index++) {
	        for ( n = 0; n < nb_wp[route_index]; n++ ) {
	        	if ( src == "" )
	        		src = places[route_index][n].name;
	        	if ( places[route_index][n] == undefined )
					break;
	        	dst = places[route_index][n].name;
	        	if ((route_index > 0) && (n == 0) && (places[route_index-1][nb_wp[route_index-1]-1].name == dst))
	        		continue;
	        	gpx += '<wpt ' + crlf;
	        	gpx += '  lat="' + places[route_index][n].geometry.location.lat() + '" lon="' + places[route_index][n].geometry.location.lng() + '">' + crlf;
	        	gpx += '  <name>' + places[route_index][n].name + '</name>' + crlf;
	        	gpx += '</wpt>' + crlf;
	        }
   		}
        
        gpx += '<rte>' + crlf;
//      gpx += '  <name>' + route.summary + '</name>' + crlf;
        gpx += '  <name>' + src + ' to ' + dst + '</name>' + crlf;
   		for (var route_index = 0; route_index < nb_routes; route_index++) {
	        for ( n = 0; n < nb_wp[route_index]; n++ ) {
//				console.log( "route:" + route_index + " - waypoint:" + n );
	        	gpx += '  <rtept ' + crlf;
	        	if ((places[route_index][n].geometry == undefined) || (places[route_index][n].geometry.location == undefined))
					domStyle.set( 'id_wp_'+route_index+'_'+n, { color: "red" } );
	        	gpx += '    lat="' + places[route_index][n].geometry.location.lat() + '" lon="' + places[route_index][n].geometry.location.lng() + '">' + crlf;
	        	gpx += '    <name>' + places[route_index][n].name + '</name>' + crlf;
	        	gpx += '  </rtept>' + crlf;
	        }
        }
        gpx += '</rte>' + crlf;
        gpx += '</gpx>' + crlf;
        	
		var d = new Date();
		var year = d.getFullYear();
		var mon  = d.getMonth() + 1;
		var day  = d.getDate();
		var fname = year + '-' + ((mon < 10) ? '0' : '') + mon + '-' + ((day < 10) ? '0' : '') + day + '.gpx';
//		console.log( gpx );	
    	download_file( gpx, fname, "application/gpx+xml" );

    }
    
    function cb_route_from_or_to_changed( route_index, waypoint_index ) {

		console.log( 'cb_route_from_or_to_changed: ' + route_index + " --- " + waypoint_index );

		cb_route_from_or_to_changed_handle[route_index][waypoint_index] = undefined; 

		var origin = dijit.byId('id_wp_'+route_index+'_0').get( 'value' );
		var waypoint1 = dijit.byId('id_wp_'+route_index+'_1').get( 'value' );
		var destination = dijit.byId('id_wp_'+route_index+'_2').get( 'value' );
		console.log( "origin= [" + origin + "]" );
		console.log( "destination= [" + destination + "]" );
		console.log( "waypoint1= [" + waypoint1 + "]" );

		var nok_route = ((origin == "") || ((waypoint1 == "") && (destination == ""))) ? true : false;
		console.log( "nok_route= " + nok_route);
        
    	update_btns_remove_up_down( route_index );
    	
		if ( !nok_route ) {
    		do_route( route_index );
    	}
    	else if ( (origin != "") && (waypoint1 == "") && (destination == "") ) {
    		if ( (places[route_index][0].geometry != undefined) && (places[route_index][0].geometry.location != undefined) )
           		map.panTo( places[route_index][0].geometry.location );
/*
	        var is_show_all_routes = dijit.byId('id_check_show_all_routes').get('checked');
	        if ( !is_show_all_routes ) {
	           	map.panTo( places[route_index][0].geometry.location );
	        }
	        else {
	        	if ( route_bounds.length == 1 ) {
		           	map.panTo( places[route_index][0].geometry.location );
	        	}
	        	else {
	        		var b = new google.maps.LatLngBounds;
					route_bounds.forEach( function(e) { b.union(e); });
					b.extend( places[route_index][0].geometry.location );
				}
	        }
*/
    	}
    }
    
    function cb_map_click( evt ) {
    	
    	console.log( "cb_map_click" );
    	
    	if ( ctrl_mode ) {
    		if ( temp_directions_service == undefined )
				start_temporary_route( evt.latLng );
			return;
    	}

		if ( browse_images_mode ) {
			console.log( "Cancel browse mode" );
			cb_route_input_mouse_leave( );
			return;
		}
    	
    }

    function cb_panorama_click( ) {

		require(["dojo/dom-construct"], function(domConstruct){
			if ( !map_or_panorama_full_screen ) {
				domConstruct.place("td_map_canvas", "id_hidden", "after");
				map_or_panorama_full_screen = true;
			}
			else {
				domConstruct.place("td_map_canvas", "td_panorama", "before");
		        document.getElementById("td_map_canvas").style.width = "50%";
		        document.getElementById("td_panorama").style.width = "50%";
				map_or_panorama_full_screen = false;
			}
			google.maps.event.trigger( map, 'resize' );
			google.maps.event.trigger( panorama, 'resize' );
		});

    }
    
    function show_waypoint( route_index, index ) {

		if ( route_index >= 1 ) {
			dijit.byId('id_check_use_route_'+(route_index)).set( 'checked', true );
			cb_click_use_route( route_index );
		}

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr_' + route_index + '_' + index, "display", "" );
    	});
    }
    
    function set_labels_from_wp_to( ) {

    	require(["dojo/dom-style"], function( domStyle) {
    	var route = 0;
            for ( var n = 1; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_tr_'+route+'_' + n;
        		var display = domStyle.get( id, "display" );
            	if ( display == "none" ) {
                	var id_label = 'id_label' + (n-1);
                    document.getElementById(id_label).innerHTML = "To&nbsp;";
            		break;
            	}
            	else {
                	var id_label = 'id_label' + n;
                    document.getElementById(id_label).innerHTML = "Through&nbsp;";
            	}
            }
 		});

    }
    
    function cb_map_rightclick( evt ) {

//		console.log( evt );    	
//    	console.log( "Right click: " + evt.latLng );

    	if ( ctrl_mode || browse_images_mode ) {
			return;
    	}

		if ( !dijit.byId("id_btn_stop").get("disabled") )
			return;

		if ( !dijit.byId("id_btn_pause").get("disabled") && (dijit.byId('id_btn_pause').get('label') == "Pause") )
			return;

    	if ( dijit.byId("id_btn_drive_"+selected_route_index+"_1").get("disabled") )
    		return;
    	
    	var latlng = {lat: evt.latLng.lat, lng: evt.latLng.lng};
		var geocoder = new google.maps.Geocoder();
    	geocoder.geocode( {'location': evt.latLng}, function( results, status ) {
    	    if (status === google.maps.GeocoderStatus.OK) {

    	    	console.log( results[0].formatted_address );

    	        var first_hidden = find_first_hidden( selected_route_index );
    	        console.log( "first_hidden=" + first_hidden );
    	        if ( first_hidden != (MAX_NB_WAYPOINTS + 2) ) {
//    	        	show_waypoint( selected_route_index, first_hidden );
	    	        var new_nb_waypoints = first_hidden;
	       	    	cb_click_btn_add(selected_route_index, new_nb_waypoints)
    	    		var id = 'id_wp_' + selected_route_index + "_" + first_hidden;
   	        		dijit.byId( id ).set( "value", results[0].formatted_address );
										require(["dijit/Tooltip"], function(Tooltip) {
											new Tooltip({
												id: ["id_tooltip_label_wp_"+selected_route_index+'_'+first_hidden],
												connectId: ["id_label_wp_"+selected_route_index+'_'+first_hidden],
												position:['below-centered'],
												label: results[0].name,
												showDelay:650,
												hideDelay:0
											});
										});
			    	update_btns_remove_up_down( selected_route_index );
	    	        do_route( selected_route_index );
    	        }
    	    	
    	    }
    	});
    	
    }
    
    function do_cb_map_mousemove( evt ) {
    
    console.log( evt );
    	console.log( evt.latLng );
		dlg_panorama_map_mousemove.placeAt( "id_map_canvas", "last" );
    	dlg_panorama_map_mousemove.show( );
    	
    	// evt.pixel.x, evt.pixel.y
    }
    
    function cb_map_mousemove( evt ) {

return;
    	dlg_panorama_map_mousemove.hide( );
		if ( timer_map_mousemove != undefined ) 
			clearTimeout( timer_map_mousemove );
		timer_map_mousemove = setTimeout( function() { do_cb_map_mousemove( evt ); }, 750 );
    }
    
    function change_waypoint( route_index, index_wp, place_name ) {

    	console.log( index_wp + " -> " + place_name );
    	var id_label_wp = "id_wp_" + route_index + "_" + index_wp;
		dijit.byId(id_label_wp).set( 'value', place_name );

		do_route( route_index );
    }

    function reset_panorama( ) {
    	
    	
    }

	function cb_click_btn_add( route_index, index ) {
		
//		console.log( "*** Add: route_index=" + route_index + " index=" + index );

//		var total_waypoints = find_all_nb_waypoints();
//		console.log( total_waypoints );

        var first_hidden = find_first_hidden( route_index );
//    	console.log( "first_hidden=" + first_hidden );

    	for ( var n = first_hidden - 1; n >= index; n-- ) {
			var wp = dijit.byId('id_wp_'+route_index+'_'+(n)).get( 'value' );
			console.log( n + " -> " + wp );
			dijit.byId('id_wp_'+route_index+'_'+(n+1)).set( 'value', wp );
			places[route_index][n+1] = places[route_index][n];
    	}
    	if (index < MAX_NB_WAYPOINTS+2)
			dijit.byId('id_wp_'+route_index+'_'+(index)).set( 'value', "" );

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr_'+route_index+'_'+(first_hidden), "display", "" );
    		domStyle.set( 'id_drive_tr_'+route_index+"_"+(first_hidden), "display", "" );
    	});
    	
		require([ "dijit/focus", "dojo/dom", "dojo/domReady!" ], function(focusUtil, dom){
			focusUtil.focus(dom.byId('id_wp_'+route_index+'_'+(index)));
		});
		
		var tooltip_wp_a = undefined;
		var x = dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index));
		if (x) {
			var tooltip_wp_a = x.get( 'label' );

			dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index)).set( 'label', "" );
			require(["dijit/Tooltip"], function(Tooltip) {
				var tooltip = dijit.byId("id_tooltip_label_wp_"+route_index+'_'+(index+1));
				if (tooltip == undefined) {
					new Tooltip({
						id: ["id_tooltip_label_wp_"+route_index+'_'+(index+1)],
						connectId: ["id_label_wp_"+route_index+'_'+(index+1)],
						position:['below-centered'],
						label: tooltip_wp_a,
						showDelay:650,
						hideDelay:0
					});
				}
				else {
					dijit.byId("id_tooltip_label_wp_"+route_index+'_'+(index+1)).set( 'label', tooltip_wp_a );
				}
			});
		}
		
		update_btns_remove_up_down( route_index );		
	}
		
	function cb_click_btn_remove( route_index, index ) {
		
		console.log( "*** Remove: route_index=" + route_index + " index=" + index );

        var first_hidden = find_first_hidden( route_index );
    	console.log( "first_hidden=" + first_hidden );

		for ( var n = index; n < first_hidden - 1; n++ ) {
			var wp = dijit.byId('id_wp_'+route_index+'_'+(n+1)).get( 'value' );
			dijit.byId('id_wp_'+route_index+'_'+(n)).set( 'value', wp );
		}

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr_'+route_index+'_'+(first_hidden-1), "display", "none" );
    		domStyle.set( 'id_drive_tr_'+route_index+"_"+(first_hidden-1), "display", "none" );
    	});
    	
    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr_'+route_index+'_'+(first_hidden-1), "display", "none" );
    	});
		
		// TODO : move the tooltips on id_tooltip_label_wp_
		
		do_route( route_index );
		update_btns_remove_up_down( route_index );		
	}

	function cb_click_btn_up( route_index, index ) {

		console.log( "*** Up: route_index=" + route_index + " index=" + index );

		var wp_a = dijit.byId('id_wp_'+route_index+'_'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_wp_'+route_index+'_'+(index-1)).get( 'value' );

		dijit.byId('id_wp_'+route_index+'_'+(index)).set( 'value', wp_b );
		dijit.byId('id_wp_'+route_index+'_'+(index-1)).set( 'value', wp_a );
		
		var tooltip_wp_a = dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index)).get( 'label' );
		var tooltip_wp_b = dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index-1)).get( 'label' );

		dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index)).set( 'label', tooltip_wp_b );
		dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index-1)).set( 'label', tooltip_wp_a );
		
		do_route( route_index );
	}

	function cb_click_btn_down( route_index, index ) {

		console.log( "*** Down: route_index=" + route_index + " index=" + index );

		var wp_a = dijit.byId('id_wp_'+route_index+'_'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_wp_'+route_index+'_'+(index+1)).get( 'value' );

		dijit.byId('id_wp_'+route_index+'_'+(index)).set( 'value', wp_b );
		dijit.byId('id_wp_'+route_index+'_'+(index+1)).set( 'value', wp_a );
		
		var tooltip_wp_a = dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index)).get( 'label' );
		var tooltip_wp_b = dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index+1)).get( 'label' );

		dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index)).set( 'label', tooltip_wp_b );
		dijit.byId('id_tooltip_label_wp_'+route_index+'_'+(index+1)).set( 'label', tooltip_wp_a );
		
		do_route( route_index );
	}
	
	function cb_click_btn_drive( route_index, waypoint_index ) {
		
		console.log( "Drive: route_index=" + route_index + " waypoint_index=" + waypoint_index );

		curr_route = route_index;	
		curr_leg = waypoint_index;

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct ) {
			domStyle.set( "id_top_layout", "display", "none" );
			domStyle.set( "id_left_layout", "display", "none" );
			dijit.byId('app_layout').resize();
				if ( map_or_panorama_full_screen ) {
					domConstruct.place("td_panorama", "td_map_canvas", "after");
		            document.getElementById("td_map_canvas").style.width = "50%";
		            document.getElementById("td_panorama").style.width = "50%";
					map_or_panorama_full_screen = false;
				}
			document.getElementById("td_map_canvas").style.width = "50%";
			document.getElementById("td_panorama").style.width = "50%";
		});

   		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled', false );

        start_driving( route_index );  
	}
	
	function update_btns_remove_up_down( route_index, all ) {
		
//		var total_nb_waypoints = find_total_nb_waypoints();
//		console.log("total_nb_waypoints =" + total_nb_waypoints);
		
        var first_hidden = find_first_hidden( route_index );
//    	console.log( "first_hidden=" + first_hidden );

		var origin = dijit.byId('id_wp_'+route_index+'_0').get( 'value' );
   		dijit.byId('id_btn_add_'+route_index+'_0').set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_tooltip_btn_add_'+route_index+'_0').set( 'showDelay', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? 650 : 999999 );
   		dijit.byId('id_btn_remove_'+route_index+'_0').set( 'disabled', (first_hidden > 2) ? false : true );
   		dijit.byId('id_tooltip_btn_remove_'+route_index+'_0').set( 'showDelay', (first_hidden > 2) ? 650 : 999999 );
   		dijit.byId('id_btn_down_'+route_index+'_0').set( 'disabled', (origin == '') ? true : false ); 
   		dijit.byId('id_tooltip_btn_down_'+route_index+'_0').set( 'showDelay', (origin == '') ? 999999 : 650 ); 
    	
		for ( var n = 1; n < first_hidden - 1; n++ ) {
			var waypoint = dijit.byId('id_wp_'+route_index+'_'+n).get( 'value' );
	   		dijit.byId('id_btn_add_'+route_index+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_tooltip_btn_add_'+route_index+'_'+n).set( 'showDelay', 650 ); 
	   		dijit.byId('id_btn_remove_'+route_index+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_tooltip_btn_remove_'+route_index+'_'+n).set( 'showDelay', 650 ); 
	   		dijit.byId('id_btn_up_'+route_index+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
	   		dijit.byId('id_tooltip_btn_up_'+route_index+'_'+n).set( 'showDelay', (waypoint == '') ? 999999 : 650 ); 
	   		dijit.byId('id_btn_down_'+route_index+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
	   		dijit.byId('id_tooltip_btn_down_'+route_index+'_'+n).set( 'showDelay', (waypoint == '') ? 9999999 : 650 ); 
		}
		
		for ( var n = 1; n < first_hidden; n++ ) {
			var wp0 = dijit.byId('id_wp_'+route_index+'_'+(n-1)).get( 'value' );
			var wp1 = dijit.byId('id_wp_'+route_index+'_'+n).get( 'value' );
// 			dijit.byId('id_btn_drive_'+route_index+"_"+n).set( 'disabled', ((wp0 == '') || (wp1 == '')) ? true : false );
	   		if ( (wp0 == '') || (wp1 == '') ) {
		   		dijit.byId('id_btn_drive_'+route_index+"_"+n).set( 'disabled', true );
				dijit.byId('id_tooltip_btn_drive_'+route_index+"_"+n).set( 'showDelay', 999999 );
				if ( n == 1 ) {
					dijit.byId('id_btn_browse_images_'+route_index).set( 'disabled', true );
					dijit.byId('id_btn_browse_images_'+route_index).set( 'showDelay', 999999 );
				}
	   		}
	   		else {
		   		dijit.byId('id_btn_drive_'+route_index+"_"+n).set( 'disabled', false );
				dijit.byId('id_tooltip_btn_drive_'+route_index+"_"+n).set( 'showDelay', 650 );
				if ( n == 1 ) {
					dijit.byId('id_btn_browse_images_'+route_index).set( 'disabled', false );
					dijit.byId('id_tooltip_btn_browse_images_'+route_index).set( 'showDelay', 650 );
				}
	   		}
		}
		
   		dijit.byId('id_btn_add_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_tooltip_btn_add_'+route_index+'_'+(first_hidden-1)).set( 'showDelay', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? 650 : 999999 );
   		dijit.byId('id_btn_remove_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (first_hidden > 2) ? false : true );
   		dijit.byId('id_tooltip_btn_remove_'+route_index+'_'+(first_hidden-1)).set( 'showDelay', (first_hidden > 2) ? 650 : 999999 );
		var destination = dijit.byId('id_wp_'+route_index+'_'+(first_hidden-1)).get( 'value' );
   		dijit.byId('id_btn_up_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (destination == '') ? true : false );
   		dijit.byId('id_tooltip_btn_up_'+route_index+'_'+(first_hidden-1)).set( 'showDelay', (destination == '') ? 999999 : 650 );
   		dijit.byId('id_btn_down_'+route_index+'_'+(first_hidden-1)).set( 'disabled', true );
   		dijit.byId('id_tooltip_btn_down_'+route_index+'_'+(first_hidden-1)).set( 'showDelay', 999999 );
	
	}
	
	function cb_open_settings( ) {
		require(["dijit/Dialog", "dojo/domReady!"], function( Dialog ) {
		    dlg = new Dialog({
		        title: "Settings",
    		    closable: false,
		        href: "dlg-settings.html"
		    });
		});
	    dlg.show();
	}

	function cb_copy_long_url( ) {
	
		console.log(1);
		
		var copyTextarea = document.querySelector('.js-copytextarea');
		copyTextarea.select();

		try {
			var successful = document.execCommand('copy');
			var msg = successful ? 'successful' : 'unsuccessful';
			console.log('Copying text command was ' + msg);
			is_dirty = false;
		} catch (err) {
			console.log('Oops, unable to copy');
		}
		
	}

    function parse( type ) {
    	return typeof type == 'string' ? JSON.parse(type) : type;
    }
    
    function save_settings( ) {

        require(["dojo/dom"], function( dom) {

	    	if ( typeof(Storage) == "undefined" ) {
	    		console.log( "No local storage!" );
	    		return;
	    	}
	
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
		        var no_hwy  = dijit.byId('id_check_no_hwy_'+route_index).get( 'checked' );
		    	localStorage.setItem( "no_highway_"+route_index, no_hwy );
		    	console.log( "Route " + route_index + " no_hwy= " + no_hwy );
			}
	
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
		        var no_toll = dijit.byId('id_check_no_toll_'+route_index).get( 'checked' );
		    	localStorage.setItem( "no_toll_"+route_index, no_hwy );
		    	console.log( "Route " + route_index + " no_toll= " + no_hwy );
		    }
	
	    	var google_api = dom.byId('id_google_api').value;
	    	localStorage.setItem( "google_api", google_api );
	    	console.log( "google_api= " + google_api );
	    		
	    	var step = dijit.byId('id_input_meters').get( 'value' );
	    	localStorage.setItem( "step", step );
	    	console.log( "step= " + step );
	    	
	    	var interval = dijit.byId('id_input_interval').get( 'value' );
	    	localStorage.setItem( "interval", interval );
	    	console.log( "interval= " + interval );
	    	
	    	var route_tickness = dijit.byId('id_input_route_tickness').get( 'value' );
	    	localStorage.setItem( "route_tickness", route_tickness );
	    	console.log( "route_tickness= " + route_tickness );
	    	
	        var google_maps_api_key = dijit.byId('id_google_maps_api_key').get( 'value' );
	    	localStorage.setItem( "id_google_maps_api_key", google_maps_api_key );
	    	console.log( "google_maps_api_key= " + google_maps_api_key );
	    		
	        var addr_for_orig = dijit.byId('id_addr_for_orig').get( 'value' );
	    	localStorage.setItem( "id_addr_for_orig", addr_for_orig );
	    	console.log( "addr_for_orig= " + addr_for_orig );

	    	var map_style = dom.byId('id_map_style').value;
	    	localStorage.setItem( "map_style", map_style );
	    	console.log( "map_style= " + map_style );
	    		
	    	var autocomplete_restriction = dom.byId('id_autocomplete_restriction').value;
	    	localStorage.setItem( "autocomplete_restriction", autocomplete_restriction );
	    	console.log( "autocomplete_restriction= " + autocomplete_restriction );
	    		
	    	var autocomplete_restrict_country = dom.byId('id_autocomplete_restrict_country').value;
	    	localStorage.setItem( "autocomplete_restrict_country", autocomplete_restrict_country );
	    	console.log( "autocomplete_restrict_country= " + autocomplete_restrict_country );
	    		
	    	var dlg = dijit.byId('id_configuration_dlg');
	    	dlg.closeDropDown( false );
	    	
    	});
    }
    
    function load_settings( ) {

        require(["dojo/dom"], function( dom) {

	    	if ( typeof(Storage) == "undefined" ) {
	    		console.log( "No local storage!" );
	    		return;
	    	}
	    	
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
		    	var no_hwy = localStorage.getItem("no_highway_"+route_index);
		    	if ( !no_hwy )
		    		no_hwy = true;
	    		console.log( "Route " + route_index + " - Restored no_hwy= " + no_hwy );
		    	if ( no_hwy != null )
	    	        dijit.byId('id_check_no_hwy_'+route_index).set( 'checked', parse(no_hwy), false );
			}
	    	
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
		    	var no_toll = localStorage.getItem("no_toll_"+route_index);
		    	if ( !no_toll )
		    		no_toll = true;
	    		console.log( "Route " + route_index + " - Restored no_toll= " + no_toll );
	    		if ( no_toll != null )
	            	dijit.byId('id_check_no_toll_'+route_index).set( 'checked', parse(no_toll), false );
			}
	
	    	var google_api = localStorage.getItem("google_api");
	    	if ( !google_api )
	    		google_api = 3.25;
	    	console.log( "Restored google_api= " + google_api );
	    	if ( google_api != null )
	            dom.byId('id_google_api').value = google_api;
	    	
	    	var step = localStorage.getItem("step");
	    	if ( !step )
	    		step = 175;
	    	console.log( "Restored step= " + step );
	    	if ( step != null )
	            dijit.byId('id_input_meters').set( 'value', parse(step) );
	    	
	    	var interval = localStorage.getItem("interval");
	    	if ( !interval )
	    		interval = 1350;
	    	console.log( "Restored interval= " + interval );
	    	if ( interval != null )
	            dijit.byId('id_input_interval').set( 'value', parse(interval) );
	    	
	    	var route_tickness = localStorage.getItem("route_tickness");
	    	if ( !route_tickness )
	    		route_tickness = 4;
	    	console.log( "Restored route_tickness= " + route_tickness );
	    	if ( route_tickness != null )
	            dijit.byId('id_input_route_tickness').set( 'value', parse(route_tickness) );
	    	
	    	var google_maps_api_key = localStorage.getItem("id_google_maps_api_key");
	    	if ( !google_maps_api_key )
	    		google_maps_api_key = "";
	    	console.log( "Restored google_maps_api_key= " + google_maps_api_key );
	        dijit.byId('id_google_maps_api_key').set( 'value', google_maps_api_key );
	    	
	    	var addr_for_orig = localStorage.getItem("id_addr_for_orig");
	    	if ( !addr_for_orig )
	    		addr_for_orig = "";
	    	console.log( "Restored addr_for_orig= " + addr_for_orig );
	        dijit.byId('id_addr_for_orig').set( 'value', addr_for_orig );
	    	
	    	var map_style = localStorage.getItem("map_style");
	    	if ( !map_style )
	    		map_style = "1";
	    	console.log( "Restored map_style= " + map_style );
	    	dom.byId('id_map_style').value = map_style;
	            
	    	var autocomplete_restriction = localStorage.getItem("autocomplete_restriction");
	    	if ( !autocomplete_restriction )
	    		autocomplete_restriction = "";
	    	console.log( "Restored autocomplete_restriction= " + autocomplete_restriction );
	    	dom.byId('id_autocomplete_restriction').value = autocomplete_restriction;
	            
	    	var autocomplete_restrict_country = localStorage.getItem("autocomplete_restrict_country");
	    	if ( !autocomplete_restrict_country )
	    		autocomplete_restrict_country = "";
	    	console.log( "Restored autocomplete_restrict_country= " + autocomplete_restrict_country );
	    	dom.byId('id_autocomplete_restrict_country').value = autocomplete_restrict_country;
	            
        });
    	
    }
    
    function clear_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}

    	localStorage.clear( );

    	var dlg = dijit.byId('id_configuration_dlg');
    	dlg.closeDropDown( false );
    }
    
    function load_file_select( evt ) {
		
		var files = evt.target.files; 
		console.log( files );
	}

	function save_ride( ) {
		console.log( "Save ride" );
		
	}
    
	require(["dojo/store/Memory"], function( Memory ) {
		_iso_countries = [
            {code: 'AL', id: 'Albania'},
            {code: 'DZ', id: 'Algeria'},
            {code: 'AS', id: 'American Samoa'},
            {code: 'XX', id: ''},
            {code: 'AD', id: 'Andorra'},
            {code: 'AO', id: 'Angola'},
            {code: 'AI', id: 'Anguilla'},
            {code: 'AG', id: 'Antigua and Barbuda'},
            {code: 'AR', id: 'Argentina'},
            {code: 'AM', id: 'Armenia'},
            {code: 'AW', id: 'Aruba'},
            {code: 'AU', id: 'Australia'},
            {code: 'AT', id: 'Austria'},
            {code: 'AZ', id: 'Azerbaijan'},
            {code: 'BS', id: 'Bahamas'},
            {code: 'BH', id: 'Bahrain'},
            {code: 'BD', id: 'Bangladesh'},
            {code: 'BB', id: 'Barbados'},
            {code: 'BY', id: 'Belarus'},
            {code: 'BE', id: 'Belgium'},
            {code: 'BZ', id: 'Belize'},
            {code: 'BJ', id: 'Benin'},
            {code: 'BM', id: 'Bermuda'},
            {code: 'BT', id: 'Bhutan'},
            {code: 'BO', id: 'Bolivia'},
            {code: 'BA', id: 'Bosnia'},
            {code: 'BW', id: 'Botswana'},
            {code: 'BR', id: 'Brazil'},
            {code: 'BN', id: 'Brunei'},
            {code: 'BG', id: 'Bulgaria'},
            {code: 'BF', id: 'Burkina Faso'},
            {code: 'BI', id: 'Burundi'},
            {code: 'KH', id: 'Cambodia'},
            {code: 'CM', id: 'Cameroon'},
            {code: 'CA', id: 'Canada'},
            {code: 'CV', id: 'Cape Verde'},
            {code: 'KY', id: 'Cayman Islands'},
            {code: 'CF', id: 'Central African Republic'},
            {code: 'TD', id: 'Chad'},
            {code: 'CL', id: 'Chile'},
            {code: 'CN', id: 'China'},
            {code: 'CO', id: 'Colombia'},
            {code: 'KM', id: 'Comoros'},
            {code: 'CG', id: 'Congo'},
            {code: 'CD', id: 'Congo, Democratic Republic'},
            {code: 'CK', id: 'Cook Islands'},
            {code: 'CR', id: 'Costa Rica'},
            {code: 'CI', id: 'Ivory Coast'},
            {code: 'HR', id: 'Croatia'},
            {code: 'CU', id: 'Cuba'},
            {code: 'CY', id: 'Cyprus'},
            {code: 'CZ', id: 'Czech Republic'},
            {code: 'DK', id: 'Denmark'},
            {code: 'DJ', id: 'Djibouti'},
            {code: 'DM', id: 'Dominica'},
            {code: 'DO', id: 'Dominican Republic'},
            {code: 'EC', id: 'Ecuador'},
            {code: 'EG', id: 'Egypt'},
            {code: 'SV', id: 'El Salvador'},
            {code: 'GQ', id: 'Equatorial Guinea'},
            {code: 'ER', id: 'Eritrea'},
            {code: 'EE', id: 'Estonia'},
            {code: 'ET', id: 'Ethiopia'},
            {code: 'FK', id: 'Falkland Islands (Malvinas)'},
            {code: 'FJ', id: 'Fiji'},
            {code: 'FI', id: 'Finland'},
            {code: 'FR', id: 'France'},
            {code: 'GF', id: 'French Guiana'},
            {code: 'PF', id: 'French Polynesia'},
            {code: 'GA', id: 'Gabon'},
            {code: 'GM', id: 'Gambia'},
            {code: 'GE', id: 'Georgia'},
            {code: 'DE', id: 'Germany'},
            {code: 'GH', id: 'Ghana'},
            {code: 'GI', id: 'Gibraltar'},
            {code: 'GR', id: 'Greece'},
            {code: 'GL', id: 'Greenland'},
            {code: 'GD', id: 'Grenada'},
            {code: 'GP', id: 'Guadeloupe'},
            {code: 'GU', id: 'Guam'},
            {code: 'GT', id: 'Guatemala'},
            {code: 'GG', id: 'Guernsey'},
            {code: 'GN', id: 'Guinea'},
            {code: 'GW', id: 'Guinea Bissau'},
            {code: 'GY', id: 'Guyana'},
            {code: 'HT', id: 'Haiti'},
            {code: 'HN', id: 'Honduras'},
            {code: 'HK', id: 'Hong Kong'},
            {code: 'HU', id: 'Hungary'},
            {code: 'IS', id: 'Iceland'},
            {code: 'IN', id: 'India'},
            {code: 'ID', id: 'Indonesia'},
            {code: 'IR', id: 'Iran'},
            {code: 'IQ', id: 'Iraq'},
            {code: 'IE', id: 'Ireland'},
            {code: 'IL', id: 'Israel'},
            {code: 'IT', id: 'Italy'},
            {code: 'JM', id: 'Jamaica'},
            {code: 'JP', id: 'Japan'},
            {code: 'JO', id: 'Jordan'},
            {code: 'KZ', id: 'Kazakhstan'},
            {code: 'KE', id: 'Kenya'},
            {code: 'KI', id: 'Kiribati'},
            {code: 'KR', id: 'Korea'},
            {code: 'KW', id: 'Kuwait'},
            {code: 'KG', id: 'Kyrgyzstan'},
            {code: 'LA', id: 'Laos'},
            {code: 'LV', id: 'Latvia'},
            {code: 'LB', id: 'Lebanon'},
            {code: 'LS', id: 'Lesotho'},
            {code: 'LR', id: 'Liberia'},
            {code: 'LY', id: 'Libya'},
            {code: 'LI', id: 'Liechtenstein'},
            {code: 'LT', id: 'Lithuania'},
            {code: 'LU', id: 'Luxembourg'},
            {code: 'MK', id: 'Macedonia'},
            {code: 'MG', id: 'Madagascar'},
            {code: 'MW', id: 'Malawi'},
            {code: 'MY', id: 'Malaysia'},
            {code: 'MV', id: 'Maldives'},
            {code: 'ML', id: 'Mali'},
            {code: 'MT', id: 'Malta'},
            {code: 'MH', id: 'Marshall Islands'},
            {code: 'MQ', id: 'Martinique'},
            {code: 'MU', id: 'Mauritius'},
            {code: 'YT', id: 'Mayotte'},
            {code: 'MX', id: 'Mexico'},
            {code: 'FM', id: 'Micronesia'},
            {code: 'MD', id: 'Moldova'},
            {code: 'MC', id: 'Monaco'},
            {code: 'MN', id: 'Mongolia'},
            {code: 'MS', id: 'Montserrat'},
            {code: 'MA', id: 'Morocco'},
            {code: 'MZ', id: 'Mozambique'},
            {code: 'MM', id: 'Myanmar'},
            {code: 'NA', id: 'Namibia'},
            {code: 'NR', id: 'Nauru'},
            {code: 'NP', id: 'Nepal'},
            {code: 'NL', id: 'Netherlands'},
            {code: 'AN', id: 'Netherlands Antilles'},
            {code: 'NC', id: 'New Caledonia'},
            {code: 'NZ', id: 'New Zealand'},
            {code: 'NI', id: 'Nicaragua'},
            {code: 'NE', id: 'Niger'},
            {code: 'NG', id: 'Nigeria'},
            {code: 'NU', id: 'Niue'},
            {code: 'NF', id: 'Norfolk Island'},
            {code: 'MP', id: 'Mariana Islands'},
            {code: 'NO', id: 'Norway'},
            {code: 'OM', id: 'Oman'},
            {code: 'PK', id: 'Pakistan'},
            {code: 'PW', id: 'Palau'},
            {code: 'PA', id: 'Panama'},
            {code: 'PG', id: 'Papua New Guinea'},
            {code: 'PY', id: 'Paraguay'},
            {code: 'PE', id: 'Peru'},
            {code: 'PH', id: 'Philippines'},
            {code: 'PL', id: 'Poland'},
            {code: 'PT', id: 'Portugal'},
            {code: 'PR', id: 'Puerto Rico'},
            {code: 'QA', id: 'Qatar'},
            {code: 'RE', id: 'Reunion'},
            {code: 'RO', id: 'Romania'},
            {code: 'RU', id: 'Russia'},
            {code: 'RW', id: 'Rwanda'},
            {code: 'SH', id: 'Saint Helena'},
            {code: 'KN', id: 'Saint Kitts And Nevis'},
            {code: 'LC', id: 'Saint Lucia'},
            {code: 'WS', id: 'Samoa'},
            {code: 'SM', id: 'San Marino'},
            {code: 'ST', id: 'Sao Tome And Principe'},
            {code: 'SA', id: 'Saudi Arabia'},
            {code: 'SN', id: 'Senegal'},
            {code: 'RS', id: 'Serbia'},
            {code: 'SC', id: 'Seychelles'},
            {code: 'SL', id: 'Sierra Leone'},
            {code: 'SG', id: 'Singapore'},
            {code: 'SK', id: 'Slovakia'},
            {code: 'SI', id: 'Slovenia'},
            {code: 'SB', id: 'Solomon Islands'},
            {code: 'SO', id: 'Somalia'},
            {code: 'ZA', id: 'South Africa'},
            {code: 'ES', id: 'Spain'},
            {code: 'LK', id: 'Sri Lanka'},
            {code: 'SD', id: 'Sudan'},
            {code: 'SR', id: 'Surinam'},
            {code: 'SZ', id: 'Swaziland'},
            {code: 'SE', id: 'Sweden'},
            {code: 'CH', id: 'Switzerland'},
            {code: 'SY', id: 'Syria'},
            {code: 'TW', id: 'Taiwan'},
            {code: 'TJ', id: 'Tajikistan'},
            {code: 'TZ', id: 'Tanzania'},
            {code: 'TH', id: 'Thailand'},
            {code: 'TG', id: 'Togo'},
            {code: 'TT', id: 'Trinidad And Tobago'},
            {code: 'TN', id: 'Tunisia'},
            {code: 'TR', id: 'Turkey'},
            {code: 'TM', id: 'Turkmenistan'},
            {code: 'TC', id: 'Turks And Caicos Islands'},
            {code: 'TV', id: 'Tuvalu'},
            {code: 'UG', id: 'Uganda'},
            {code: 'UA', id: 'Ukraine'},
            {code: 'AE', id: 'United Arab Emirates'},
            {code: 'GB', id: 'United Kingdom'},
            {code: 'US', id: 'USA'},
            {code: 'UY', id: 'Uruguay'},
            {code: 'UZ', id: 'Uzbekistan'},
            {code: 'VU', id: 'Vanuatu'},
            {code: 'VE', id: 'Venezuela'},
            {code: 'VN', id: 'Vietnam'},
            {code: 'WF', id: 'Wallis And Futuna'},
            {code: 'YE', id: 'Yemen'},
            {code: 'ZM', id: 'Zambia'},
            {code: 'ZW', id: 'Zimbabwe'}
        ];
	});
    
    
	// ---------
	// Externals
	// ---------

    return {

		start: function( ) {
			require(["dojo/domReady!"], function( ) {
				start( );
			});
		},
        initialize: function( ) { initialize(); },

		cb_click_use_route: function( route ) { cb_click_use_route( route ); },
		cb_show_all_routes: function( ) { cb_show_all_routes( ); },
		
		cb_click_fieldset_route: function( route_index ) { cb_click_fieldset_route( route_index ); },

        do_street_view: function( ) { do_street_view(); },
		do_pause: function( ) { do_pause(); },
		do_stop:  function( ) { do_stop(); },

		clear_place:  function( ) { clear_place(); },
		show_place:   function( ) { show_place(); },

		do_save_gpx: function( ) { do_save_gpx(); },
		do_create_long_url: function ( ) { do_create_long_url(); },
		do_create_short_url: function ( ) { do_create_short_url(); },
		
		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		browse_images: function( route_index ) { browse_images( route_index ); },

		cb_route_input: function( ) { cb_route_input( ); },
		cb_route_input_mouse_enter: function( ) { cb_route_input_mouse_enter( ); },
		cb_route_input_mouse_leave: function( ) { cb_route_input_mouse_leave( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		cb_route_tickness_changed: function( ) { cb_route_tickness_changed(); },
		
		cb_click_no_hwy:  function( route_index ) { cb_click_no_hwy( route_index ); },
		cb_click_no_toll: function( route_index ) { cb_click_no_toll( route_index ); },

		cb_open_settings: function( ) { cb_open_settings( ); },

		cb_copy_long_url: function( ) { cb_copy_long_url( ); },
		
		save_settings: 		function( ) { save_settings(); },
		clear_settings: 	function( ) { clear_settings(); },
		
		save_ride:	function() { save_ride(); }
		
    };
 
});
