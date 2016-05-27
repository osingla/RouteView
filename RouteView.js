/* ********************************************************************************************* */
/* ***                                                                                       *** */ 
/* *** RouteView - Olivier Singla                                                            *** */
/* ***                                                                                       *** */ 
/* *** StreetView Player - Virtual Ride, using Google Maps and Street View                   *** */
/* ***                                                                                       *** */ 
/* ********************************************************************************************* */

define( function( m ) {

	var MAX_NB_ROUTES = 4;
	var MAX_NB_WAYPOINTS = 8;

	var autocompletes = [];
    var map;
    var service;
    var panorama;
	var map_or_panorama_full_screen;
    var panorama_full_screen;
    var curr_route;
    var curr_leg;
    var timer_animate = undefined;
    var eol;
    var step;               			// meters
    var interval;           			// milliseconds
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
   	var streetViewLayer = undefined;
   	var street_view_check = [];
   	var marker_no_street_view;
   	var selected_route_index = 0;
   	var timer_map_mousemove = undefined;
   	var dlg_panorama_map_mousemove;
   	var ctrl_down = false;
   	
   	var temp_directions_service = undefined;
	var temp_directions_service_request;
 	var temp_directions_renderer;
	var temp_polylines;
   	
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

        console.log( "dist_meters=" + dist_meters + " duration_secs=" + duration_secs );

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
        if ( d > eol ) {
            console.log( "Route " + route_index + " is done" );
			if ( timer_animate != undefined ) 
				clearTimeout( timer_animate );
			if (route_index == -1)
				stop_driving_temporary_route( );
            return;
        }

		var polyline = (route_index == -1) ? temp_polylines[0] : polylines[route_index][curr_leg];
        
        var p = polyline.GetPointAtDistance(d);
        if ( !map.getBounds().contains( p ) )
           	map.panTo( p );

		street_view_check[(route_index == -1) ? 0 : route_index].getPanoramaByLocation(p, 50, (function(route_index) { return function(result, status) {
		    if (status == google.maps.StreetViewStatus.ZERO_RESULTS) {
		        console.log( "No street view available - route=" + route_index );        
        		marker_no_street_view.setPosition( p );
		    }
		    else {
        		marker_no_street_view.setPosition( null );
		        var iad = polyline.GetIndexAtDistance(d);
		        prev_bearing = bearing;
        		var bearing = polyline.Bearing(iad);
//				console.log( d + " / " + eol + " --> " + bearing);
				if (bearing == undefined)
					bearing = prev_bearing;
				if (bearing != undefined)
        			timer_animate = setTimeout( function() { panorama.setPov( { heading: bearing, pitch: 1 } ); }, 5 );
        		panorama.setPosition( p );
		    }
	        if ( step > 0 )
            	timer_animate = setTimeout( (function(route_index) { return function() {
            		cb_animate( route_index, d+step );
				}})(route_index), interval );
			dijit.byId('id_input_route').set( 'value', d, false );
		}})(route_index));

    }

    function start_driving( route_index ) {
        
        if ( timer_animate ) 
            clearTimeout( timer_animate );
            
        eol = polylines[route_index][curr_leg].Distance();
        map.setCenter( polylines[route_index][curr_leg].getPath().getAt(0) );

		map.fitBounds( legs_bounds[route_index][curr_leg] );

       	timer_animate = setTimeout( function(route_index) { cb_animate(route_index, 50); }, 250, route_index );

        // Update route slider
		dijit.byId('id_input_route').set( 'maximum', eol );
		dijit.byId('id_input_route').set( 'discreteValues,', eol );
		dijit.byId('id_input_route').set( 'value', 0 );
    }

    function find_first_hidden( route_index ) {

        var first_hidden = MAX_NB_WAYPOINTS + 2;
    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_tr' + route_index + '_' + n;
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
					domStyle.set( "id_fieldset_route_"+n, "display", "None" );
				for (var n = route+1; n < MAX_NB_ROUTES; n++) {
					console.log( "--> " + 'id_check_use_route_'+n);
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
	       	
	       	selected_route_index = route_index;

    	});
	
	}
    
    function do_street_view( ) {
		is_street_view = dijit.byId('id_btn_street_view').get( 'checked' );
   		if (streetViewLayer == undefined)
   			streetViewLayer = new google.maps.StreetViewCoverageLayer();
    	if (is_street_view) {
			streetViewLayer.setMap(map);
		}
		else {
			streetViewLayer.setMap(null);
		}
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
        console.log( "no_hwy=" + no_hwy + " no_toll=" + no_toll );
        
    	step     = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        var first_hidden = find_first_hidden( route_index );
    	console.log( "first_hidden=" + first_hidden );
        
        var start_location = dijit.byId('id_wp'+route_index+'_0').get( 'value' );
        console.log( "from = " + start_location );

        var way_points = [];
        for ( var n = 1; n < first_hidden-1; n++ ) {
        	
            waypt = dijit.byId('id_wp'+route_index+'_'+n).get( 'value' );
            console.log( "n=" + n + " => [" + waypt + "]" );
            if ( waypt != "" ) {
                way_points.push({
                    location:waypt,
                    stopover:true
                });
            }
        }

        var end_location = dijit.byId('id_wp'+route_index+'_'+(first_hidden-1)).get( 'value' );
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
            	strokeColor: route_colors[route_index]
            }
        });

        var old_nb_waypoints = way_points.length + 2;
		google.maps.event.clearListeners( directions_renderer[route_index], 'directions_changed' );
        directions_renderer[route_index].addListener('directions_changed', function() {
            var route_index = directions_renderer.indexOf( this );
            console.log("directions_changed: route_index=" + route_index);
            var new_dir = directions_renderer[route_index].getDirections();
            console.log( new_dir );
            var index_waypoint = undefined;
            if (new_dir.request.Xc != undefined)
				index_waypoint = new_dir.request.Xc;
            if (new_dir.request.Yc != undefined)
				index_waypoint = new_dir.request.Yc;
            if (new_dir.request.Uc != undefined)
				index_waypoint = new_dir.request.Uc;
            if (new_dir.request.Vc != undefined)
				index_waypoint = new_dir.request.Vc;
            if ( index_waypoint != undefined ) {

                console.log( directions_renderer[route_index] );
                var new_nb_waypoints = new_dir.geocoded_waypoints.length;
                console.log( "old_nb_waypoints=" + old_nb_waypoints + " new_nb_waypoints=" + new_nb_waypoints + " index_waypoint=" + index_waypoint );
                var place_id = new_dir.geocoded_waypoints[index_waypoint].place_id;

                service.getDetails({
	              	placeId: place_id
                }, function ( place, status ) {
                	if ( status == google.maps.places.PlacesServiceStatus.OK ) {
		                console.log( old_nb_waypoints );
                		console.log( new_nb_waypoints );
		                console.log( index_waypoint );
                	    console.log( place.formatted_address );
                	    if (new_nb_waypoints == old_nb_waypoints) {
                	    	change_waypoint( route_index, index_waypoint, place.formatted_address );
                	    }
                	    else {
                	    	cb_click_btn_add(route_index, new_nb_waypoints)
                	    	for (var n = old_nb_waypoints - 1; n >= index_waypoint; n--) {
						        var w = dijit.byId('id_wp'+route_index+'_'+n).get( 'value' );
						        dijit.byId('id_wp'+route_index+'_'+(n+1)).set( 'value', w );
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

		dijit.byId('id_btn_street_view').set( 'disabled', false );

        update_btns_remove_up_down( route_index );
    
        map.setOptions({draggableCursor: 'crosshair'});

		dijit.byId('id_btn_save_gpx').set( 'disabled', false );
		dijit.byId('id_btn_create_long_url').set( 'disabled', false );
		dijit.byId('id_btn_create_short_url').set( 'disabled', false );
        
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

			console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
			console.log( response );
			var route_index = directions_service_request.indexOf( response.request );
			console.log( route_index );

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
            console.log("XXXXXXXX - legs.length=" + legs.length);
            route_bounds[route_index] = new google.maps.LatLngBounds();
            polylines[route_index] = [];
            legs_bounds[route_index] = [];
            for ( i = 0; i < legs.length; i++) {

				legs_bounds[route_index][i] = new google.maps.LatLngBounds();
	            polylines[route_index][i] = new google.maps.Polyline({
	                path: [],
	                strokeColor: '#FFFF00',
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
			if ( timer_animate != undefined ) 
				clearTimeout( timer_animate );
        	dijit.byId('id_btn_pause').set( 'label', "Continue" );
            console.log( "curr_dist=" + curr_dist );
        }
        else if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" ) {
        	dijit.byId('id_btn_pause').set( 'label', "Pause" );
	       	timer_animate = setTimeout( function() { cb_animate(curr_route, curr_dist); }, 250 );
        }

		dijit.byId('id_input_route').set( 'disabled', false );
		dijit.byId('id_input_route').set( 'intermediateChanges', true );

/*
        var renderer_options = { draggable: false };
       	directions_renderer[route_index].setOptions( renderer_options );
    
        map.setOptions({draggableCursor: 'hand'});
*/
        
    }

    function do_stop( ) {

		var route_index = curr_route;
		if ( curr_route == -1 ) {
			stop_driving_temporary_route( );
			return;
		}

    	require(["dojo/dom-style"], function( domStyle) {
			domStyle.set( "id_left_layout", "display", "" );
		});
    	
		if ( timer_animate != undefined ) 
			clearTimeout( timer_animate );

//		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) 
//			dijit.byId('id_wp'+route_index+'_'+n).set( 'disabled', false );

//		dijit.byId('id_check_no_hwy_'+route_index).set( 'disabled', false );
//		dijit.byId('id_check_no_toll_'+route_index).set( 'disabled', false );

//		dijit.byId('id_btn_street_view').set( 'disabled', false );
		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		dijit.byId('id_input_route').set( 'intermediateChanges', false );
		
        var renderer_options = { draggable: true };
       	directions_renderer[route_index].setOptions( renderer_options );

    	map.setOptions({draggableCursor: 'hand'});
        
    }

    function start( ) {

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/store/Memory", "dojo/ready"], function( dom, on, domStyle, domGeom, Memory, ready ) {
            ready( function() {
   				load_settings( );

				dojoConfig = { gmaps: { v: '3.22', libraries: 'places,geometry' } };
				require(["//maps.google.com/maps/api/js?v=3.23&sensor=false&libraries=places"], function( ) {
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
	
		require(["dojo/dom-construct", "dijit/form/TextBox", "dijit/form/Button", "dijit/Tooltip"], function(domConstruct, TextBox, Button, Tooltip) {
			
			for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
			
				for (var n = 0; n < MAX_NB_WAYPOINTS+2; n++) { 
	
			  		var id_tr = domConstruct.create("tr", { 
			  			id: "id_tr"+route_index+"_"+n,
			  			style: "display:" + ((n < 2) ? "" : "None") 
			  		}, "id_table_route"+route_index, "last");
			  		domConstruct.create("td", { innerHTML:String.fromCharCode(n+65)+"&nbsp;", align:"right", valign:"middle"}, id_tr, "first");
	
			  		var id_td2 = domConstruct.create("td", { align:"left", valign:"middle"}, id_tr, "last");
			  		var input = new TextBox({
			  			id: "id_wp"+route_index+'_'+n,
			  			type: "text", 
			  			style: "width:22em", 
			  			trim: true,
			  			intermediateChanges: false
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
	 			        connectId: ["id_btn_add_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Create a new Waypoint",
	 			        showDelay:650,
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
	 			        connectId: ["id_btn_remove_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Delete the Waypoint",
	 			        showDelay:650,
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
	 			        connectId: ["id_btn_up_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Move the Waypoint up",
	 			        showDelay:650,
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
	 			        connectId: ["id_btn_down_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Move the Waypoint down",
	 			        showDelay:650,
	 			        hideDelay:0
			  		});
	
			  		var tooltip = new Tooltip({
			  			id: "gps_loc_wp_"+route_index+"_"+n,
	 			        connectId: ["id_wp"+route_index+"_"+n],
	 			        position:['after-centered'],
	 			        showDelay:650,
	 			        hideDelay:0
			  		});
			  	}
	
				for (var n = 1; n < MAX_NB_WAYPOINTS+2; n++) {
				
			  		var id_tr = domConstruct.create("tr", { 
			  			id: "id_drive_tr_"+route_index+"_"+n,
			  			style: "display:" + ((n < 2) ? "" : "None") 
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
	 			        connectId: ["id_btn_drive_"+route_index+'_'+n],
	 			        position:['below-centered'],
	 			        label: "Virtual Ride!<br>Play the route using StreetView",
	 			        showDelay:650,
	 			        hideDelay:0
			  		});
	
				}
	
			}
			
		});
	}

	function decode_url_params() {
	
		var query = location.search.substr(1);
	  	var result = [];
		query.split("&").forEach(function(part) {
	    	var item = part.split("=");
	    	console.log(item);
	    	if (item != "") {
		    	result.push( decodeURIComponent(item[1]) );
			    console.log( decodeURIComponent(item[1]) );
			}
	  	});	

	  	console.log(result);
		var nb_routes = result.length;
		console.log( "nb_routes=" + nb_routes );
		var waypoints = [];
	  	for (var n = 0; n < nb_routes; n++)
	  		waypoints[n] = result[n].split(";");
	  	console.log( waypoints );
	  	console.log( waypoints.length );
	  	if (waypoints.length == 0)
	  		return false;
	  	
	  	return true;
	}

    function initialize( ) {

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/store/Memory", "dojo/ready"], 
    		function( dom, on, domStyle, domGeom, Memory, ready ) {
    		
            ready( function() {

            	var map_options = {
// 				   animatedZoom: false,
                   zoom: 14
                };
                map = new google.maps.Map( document.getElementById('id_map_canvas'), map_options );
				create_route_dlg();

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
				                "visibility": "simplified"
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
                };

                service = new google.maps.places.PlacesService( map );
                
   				marker_no_street_view = new google.maps.Marker({
					map: map,
					title: 'No Street View available',
					icon: "http://www.google.com/mapfiles/arrow.png"
				});

                panorama = new google.maps.StreetViewPanorama( document.getElementById('id_panorama'), panorama_options );
                map.setStreetView( panorama );

            	map_or_panorama_full_screen = false;

            	var id_map_canvas = dom.byId('id_map_canvas');
        		on( id_map_canvas, "click", function( evt ) {
       				if ( evt.handled != true )
       					cb_map_click( );
       			});
        		
				google.maps.event.clearListeners( map, 'rightclick' );
        		google.maps.event.addListener( map, "rightclick", function( evt ) {
        			cb_map_rightclick( evt );
       			});
        		
				google.maps.event.addListener(map, 'mousemove', function (event) {
					cb_map_mousemove( event);
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

        		var list_all_countries_store = new Memory({ idProperty: "name", data: [ ] });
        		_iso_countries.forEach( function(entry) {
//	         		console.log( entry.id );
        		    list_all_countries_store.add( { name: entry.id } );
        		});
        		dijit.byId('id_autocomplete_restrict_list_country2').set( 'store', list_all_countries_store );

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

        		var list_countries_store = new Memory({ idProperty: "name", data: [ ] });
        		var l = list_countries.get(timeOffset);
        		l.list.forEach( function(entry) {
        		    list_countries_store.add( { name: entry } );
        		    if ( entry == "USA" )
        		        dijit.byId('id_autocomplete_restrict_list_country1').set( 'value', entry );
        		});
        		dijit.byId('id_autocomplete_restrict_list_country1').set( 'store', list_countries_store );
        		        		
        		on( dijit.byId('id_is_addr_for_orig'), "change", function( checked ) {
					dijit.byId( "id_addr_for_orig").set("disabled", !checked );
        	    });
        	    
        		on( dijit.byId('id_autocomplete_restrict_type'), "change", function( checked ) {
           		    domStyle.set( "id_autocomplete_restrict_li", "display", (checked) ? "" : "None" );
           		    apply_autocomplete_settings( );
           		 });

        		on( dijit.byId('id_autocomplete_restrict_country'), "change", function( checked ) {
        		    if ( !checked ) {
               		    domStyle.set( "id_autocomplete_restrict_country_use_loc_li", "display", "None" );
               		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", "None" );
        		    }
        		    else {
               		    domStyle.set( "id_autocomplete_restrict_country_use_loc_li", "display", "" );
      	  	       	    var use_loc = dijit.byId('id_autocomplete_restrict_type').get( 'value' );
               		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", (use_loc) ? "" : "None" );
               		    domStyle.set( "id_autocomplete_restrict_country2_li", "display", (use_loc) ? "None" : "" );
        		    }
           		    apply_autocomplete_settings( );
                });

        		on( dijit.byId('id_autocomplete_restrict_country_use_loc'), "change", function( checked ) {
           		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", (checked) ? "" : "None" );
           		    domStyle.set( "id_autocomplete_restrict_country2_li", "display", (checked) ? "None" : "" );
           		    apply_autocomplete_settings( );
        	    });
        	
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
                	var dnd = new Moveable( dom.byId("id_mark1") );
                	on( dnd, "MoveStart", function (e) {
                        console.log( "Move started" );
                		console.log(e);
                    });
                	on( dnd, "FirstMove", function (e) {
                        console.log( "First Move" );
                		console.log(e);
                    });
           		});
        */

/*                
        		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) { 
            		on( dom.byId('id_wp'+n), "change", function( evt ) {
                		console.log( "Change: " );
                		if ( cb_route_from_or_to_changed_handle != undefined )
                			clearTimeout( cb_route_from_or_to_changed_handle );
                		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
           			});
        		}
*/

       			autocompletes = [];
       			places = [];
       			for ( var route = 0; route < MAX_NB_ROUTES; route++ ) {
	       			autocompletes[route] = [];
	       			places[route] = [];
	       			for ( var n = 0; n < MAX_NB_WAYPOINTS+2 - 1; n++ ) { 
	       				autocompletes[route][n] = new google.maps.places.Autocomplete( dom.byId('id_wp'+route+'_'+n) );
	       				google.maps.event.clearListeners( autocompletes[route][n], 'place_changed' );
	       				autocompletes[route][n].addListener('place_changed', function( ) {
		       				console.log("ZZZZZ");
	       					console.log(autocompletes);
	            			var r = get_route_waypoint( autocompletes, this );
			            	var route_index = r.route_index;
	            			var waypoint_index = r.waypoint_index;
							console.log( "route_index=" + route_index + " waypoint_index=" + waypoint_index );
	                		console.log( "Place changed: route=" + route_index + " waypoint_index=" + waypoint_index );
	                		console.log( autocompletes[route_index][waypoint_index] );
	                		var place = autocompletes[route_index][waypoint_index].getPlace();
	                		console.log( place );
	                		if ( cb_route_from_or_to_changed_handle[waypoint_index] != undefined )
	                			clearTimeout( cb_route_from_or_to_changed_handle[waypoint_index] );
	                		places[route_index][waypoint_index] = place;
						   	require(["dojo/dom"], function( dom ) {
	    						dijit.byId("gps_loc_wp_"+route_index+"_"+waypoint_index).innerHTML = "<b>" + place.geometry.location.lat() + " " + place.geometry.location.lng() + "</b>";
						   	});
			            	setTimeout( function() { cb_route_from_or_to_changed(route_index, waypoint_index); }, interval, 25 );
	                	});
	       			}
       			}

   				got_location = false;
   				
            	var restrict_country = dijit.byId('id_autocomplete_restrict_country').get( 'checked' );
  	       		console.log( "restrict_country = " + restrict_country );
            	if ( restrict_country ) {
      	       		var country_use_loc = dijit.byId('id_autocomplete_restrict_country_use_loc').get( 'checked' );
      	       		console.log( "country_use_loc = " + country_use_loc );
      	       		var country = "";
      	  	       	if ( country_use_loc )
      	  	       		country = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
      	  	       	else
      	  	       		country = dijit.byId('id_autocomplete_restrict_list_country2').get( 'value' );
       				var geocoder = new google.maps.Geocoder();
       				geocoder.geocode( { 'address': country}, function(results, status) {
       					if (status == google.maps.GeocoderStatus.OK) {
       						console.log( results );
       						if ( !got_location ) {
       							console.log( "Got gelocation for country " + country );
       							map.setCenter( results[0].geometry.location );
       							map.setOptions({zoom:7});
       					        panorama.setPosition( results[0].geometry.location );
       						}
       					}
       				});
            	}
   				
   				decode_url_params();
   				
				var is_addr_for_orig = dijit.byId('id_is_addr_for_orig').get( 'checked' );
				if (is_addr_for_orig) {
					dijit.byId('id_wp0_0').set('value', dijit.byId('id_addr_for_orig').get( 'value'));

/*
					var request = {
					    input: dijit.byId('id_addr_for_orig').get( 'value')
					};
					var autocomplete_service = new google.maps.places.AutocompleteService();
  					autocomplete_service.getPlacePredictions(request, function(result, status) {
  						if (status == google.maps.places.PlacesServiceStatus.OK) {
			                service.getDetails({
				              	placeId: result[0].place_id
			                }, function ( place, status ) {
			                	if ( status == google.maps.places.PlacesServiceStatus.OK ) {
			                		places[0][0] = place;
			                	}
			                });
  						}
  					});
*/

					var geocoder = new google.maps.Geocoder();
					geocoder.geocode( { 'address': dijit.byId('id_addr_for_orig').get( 'value')}, function(results, status) {
						if ( status == google.maps.GeocoderStatus.OK ) {
	  						console.log( results);
			                service.getDetails({
				              	placeId: results[0].place_id
			                }, function ( place, status ) {
			                	if ( status == google.maps.places.PlacesServiceStatus.OK ) {
			                		places[0][0] = place;
			                	}
			                });
					    	map.setCenter(results[0].geometry.location);
					    } 
					    else {
					    	console.log("Geocode was not successful for the following reason: " + status);
					    }
				    });
				}
				
            });

		window.onkeydown = function(evt) {
			var prev_ctrl_down = ctrl_down;
			ctrl_down = ((evt.keyIdentifier == 'Control') && (evt.ctrlKey == true));
			console.log("Ctrl Down");
			if (ctrl_down && !prev_ctrl_down) {
			}
		}

		window.onkeyup = function(evt) {
		
			var prev_ctrl_down = ctrl_down;
			console.log(evt);
			var no_cd = ((evt.keyIdentifier == 'Control') && (evt.ctrlKey == false));
			
			if (prev_ctrl_down && no_cd) {
			
				if (curr_route != -1) {

					curr_route = -1;	
					curr_leg = -1;
			
			    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct) {
						domStyle.set( "id_left_layout", "display", "None" );
						domConstruct.place("td_panorama", "id_hidden", "after");
						map_or_panorama_full_screen = true;	
					});
            		document.getElementById("td_map_canvas").style.width = "100%";
		            document.getElementById("td_panorama").style.width = "0%";
			        google.maps.event.trigger( map, 'resize' );
			        google.maps.event.trigger( panorama, 'resize' );
				}
				else {
				
					curr_route = 0;	
					curr_leg = 0;
					
					stop_driving_temporary_route( );
				}

			}
		}

/*		
    	window.onerror = function(message, file, lineNumber) {
			console.log(message);
			console.log(file);
			console.log(lineNumber);
			return false; 
		};
*/

	});
            	
    }
    
    function apply_autocomplete_settings( ) {
    	
    	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
    		
            ready( function() {
            	
            	var restrict_type = dijit.byId('id_autocomplete_restrict_type').get( 'checked' );
            	var restrict_value = dijit.byId('id_autocomplete_restrict_cb').get( 'value' );
            	var restrict_country = dijit.byId('id_autocomplete_restrict_country').get( 'checked' );
  	       		var country = "";
  	  	       	if ( dijit.byId('id_autocomplete_restrict_country_use_loc').get( 'checked' ) )
  	  	       		country = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
  	  	       	else
  	  	       		country = dijit.byId('id_autocomplete_restrict_list_country2').get( 'value' );
  	  	       	console.log( "country = [" + country  + "]" );
  	  	       	var code_country = iso_countries.get( country );
  	  	       	console.log( "code_country = [" + code_country.code + "]" );

           		for ( var n = 0; n < MAX_NB_WAYPOINTS+2 - 1; n++ ) {
            	    if ( restrict_type )
            	       	autocompletes[n].setTypes([ restrict_value ]);
            	    else
            	       	autocompletes[n].setTypes([]);

            	    if ( restrict_country && ((country != '') && (country != undefined)) )
        	  	    	autocompletes[n].setComponentRestrictions({country: code_country.code});
            	    else
            	    	autocompletes[n].setComponentRestrictions();
           		}
  	  	  	       	
            });
            	
       	});
    }
    
	function move_to_dist( new_pos, go_timer ) {

		var route_index = curr_route;

		if ( go_timer ) {
			if ( timer_animate != undefined ) 
				clearTimeout( timer_animate );
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
		var new_pos = dijit.byId('id_input_route').get( 'value' );
		new_pos = Math.round( new_pos );
		if ( cb_move_to_dist != undefined ) {
			clearTimeout( cb_move_to_dist );
			cb_move_to_dist = undefined;
		}
		if ( new_pos == 0 )
			new_pos = 50;
		cb_move_to_dist = setTimeout( 'require(["RouteView.js"], function( s ) { s.move_to_dist('+new_pos+', false); })', 25 );
    }

    function cb_step_changed( ) {
    	step = dijit.byId('id_input_meters').get( 'value' );
        document.getElementById("id_meters").innerHTML = step;
        document.getElementById("id_feet").innerHTML = Math.floor(step * 3.2808);
    }

    function cb_interval_changed( new_interval ) {
    	interval = dijit.byId('id_input_interval').get( 'value' );
        document.getElementById("id_interval").innerHTML = interval;
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
                strokeWeight: 3
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

        if ( timer_animate ) 
            clearTimeout( timer_animate );

        eol = temp_polylines[0].Distance();
        map.setCenter( temp_polylines[0].getPath().getAt(0) );
		map.fitBounds( legs_bounds );

    	step     = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        street_view_check[0] = new google.maps.StreetViewService( );

       	timer_animate = setTimeout( function() { cb_animate(-1, 50); }, 250 );

        // Update route slider
		dijit.byId('id_input_route').set( 'maximum', eol );
		dijit.byId('id_input_route').set( 'discreteValues,', eol );
		dijit.byId('id_input_route').set( 'value', 0 );
	}

	function start_temporary_route( latLng ) {
	
		console.log( "Start temporary route" );
		map.setOptions({draggableCursor: 'crosshair'});

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
					console.log( "!!!" );
					console.log( response );
		        	temp_directions_renderer.setMap( map );
	    	    	temp_directions_renderer.setDirections( response );
				}
		}})(temp_directions_renderer));
      	
	}
	
	function stop_driving_temporary_route( ) {
	
		console.log("stop_driving_temporary_route");
	
		if ( timer_animate != undefined ) 
			clearTimeout( timer_animate );

		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		dijit.byId('id_input_route').set( 'intermediateChanges', false );
		
   		temp_directions_renderer.setMap( null );
       	if ( temp_polylines )
			temp_polylines.forEach( function(e) { e.setMap(null); })
		temp_polylines = undefined;
   		temp_directions_renderer = undefined;

   		marker_no_street_view.setPosition( null );

    	require(["dojo/dom-style", "dojo/dom-construct"], function( domStyle, domConstruct) {
			domStyle.set( "id_left_layout", "display", "" );
		});
//      google.maps.event.trigger( map, 'resize' );
//      google.maps.event.trigger( panorama, 'resize' );

    	map.setOptions({draggableCursor: 'hand'});
    	
    	temp_directions_service = undefined;
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
				url += "route"+(route_index+1)+"="; 
        		nb_routes++;
				nb_wp[route_index] = 0;
	            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
	        		var display = domStyle.get( 'id_tr'+route_index+'_' + n, "display" );
	            	if ( display != "none" ) {
	            		console.log( n + " ==> " + places[route_index][n].name + " : " + places[route_index][n].geometry.location.lat() + " , " + places[route_index][n].geometry.location.lng() );
						if (n > 0)
							url += encodeURIComponent(";"); 
						var v = dijit.byId('id_wp'+route_index+'_'+n).get( 'value');
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
    	require(["dojo/dom-style"], function( domStyle) {
    		for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
        		var display = domStyle.get( 'id_fieldset_route_'+route_index, "display" );
        		console.log(display);
        		if (display == "none")
        			break;
        		nb_routes++;
				nb_wp[route_index] = 0;
	            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
	        		var display = domStyle.get( 'id_tr'+route_index+'_' + n, "display" );
	            	if ( display != "none" ) {
	            		console.log( n + " ==> " + places[route_index][n].name + " : " + places[route_index][n].geometry.location.lat() + " , " + places[route_index][n].geometry.location.lng() );
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
	        	dst = places[route_index][n].name;
	        	if ((route_index > 0) && (n == 0) && (places[route_index-1][nb_wp[route_index]-1].name == places[route_index][n].name))
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
	        	gpx += '  <rtept ' + crlf;
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

		var origin = dijit.byId('id_wp'+route_index+'_0').get( 'value' );
		var waypoint1 = dijit.byId('id_wp'+route_index+'_1').get( 'value' );
		var destination = dijit.byId('id_wp'+route_index+'_2').get( 'value' );
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
    
    function cb_map_click( ) {
    	
    	console.log( "cb_map_click - ctrl_down=" + ctrl_down );
    	
		require(["dojo/dom-construct"], function(domConstruct){
			if ( !map_or_panorama_full_screen ) {
				domConstruct.place("td_panorama", "id_hidden", "after");
				map_or_panorama_full_screen = true;	
			}
			else {
				domConstruct.place("td_panorama", "td_map_canvas", "after");
	            document.getElementById("td_map_canvas").style.width = "50%";
	            document.getElementById("td_panorama").style.width = "50%";
				map_or_panorama_full_screen = false;
			}
		});
        google.maps.event.trigger( map, 'resize' );
        google.maps.event.trigger( panorama, 'resize' );
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
    	require(["dojo/dom-style"], function( domStyle) {
    		var id = 'id_tr' + route_index + '_' + index;
    		domStyle.set( id, "display", "" );
    	});
    }
    
    function set_labels_from_wp_to( ) {

    	require(["dojo/dom-style"], function( domStyle) {
    	var route = 0;
            for ( var n = 1; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_tr'+route+'_' + n;
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

		console.log( evt );    	
    	console.log( "Right click: " + evt.latLng );

    	if ( ctrl_down ) {
    		if ( temp_directions_service == undefined )
				start_temporary_route( evt.latLng );
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
    	    		var id = 'id_wp' + selected_route_index + "_" + first_hidden;
   	        		dijit.byId( id ).set( "value", results[0].formatted_address );
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
    	var id_label_wp = "id_wp" + route_index + "_" + index_wp;
		dijit.byId(id_label_wp).set( 'value', place_name );

		do_route( route_index );
    }

    function reset_panorama( ) {
    	
    	
    }

	function cb_click_btn_add( route_index, index ) {
		
		console.log( "*** Add: route_index=" + route_index + " index=" + index );

        var first_hidden = find_first_hidden( route_index );
    	console.log( "first_hidden=" + first_hidden );

    	for ( var n = first_hidden - 1; n >= index; n-- ) {
			var wp = dijit.byId('id_wp'+route_index+'_'+(n)).get( 'value' );
			console.log( n + " -> " + wp );
			dijit.byId('id_wp'+route_index+'_'+(n+1)).set( 'value', wp );
			places[route_index][n+1] = places[route_index][n];
    	}
    	if (index < MAX_NB_WAYPOINTS+2)
			dijit.byId('id_wp'+route_index+'_'+(index)).set( 'value', "" );

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr'+route_index+'_'+(first_hidden), "display", "" );
    		domStyle.set( 'id_drive_tr_'+route_index+"_"+(first_hidden), "display", "" );
    	});
    	
		require([ "dijit/focus", "dojo/dom", "dojo/domReady!" ], function(focusUtil, dom){
			focusUtil.focus(dom.byId('id_wp'+route_index+'_'+(index)));
		});
		
		update_btns_remove_up_down( route_index );		
	}
		
	function cb_click_btn_remove( route_index, index ) {
		
		console.log( "*** Remove: route_index=" + route_index + " index=" + index );

        var first_hidden = find_first_hidden( route_index );
    	console.log( "first_hidden=" + first_hidden );

		for ( var n = index; n < first_hidden - 1; n++ ) {
			var wp = dijit.byId('id_wp'+route_index+'_'+(n+1)).get( 'value' );
			dijit.byId('id_wp'+route_index+'_'+(n)).set( 'value', wp );
		}

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_tr'+route_index+'_'+(first_hidden-1), "display", "None" );
    	});
		
		do_route( route_index );
	}

	function cb_click_btn_up( route_index, index ) {

		console.log( "*** Up: route_index=" + route_index + " index=" + index );

		var wp_a = dijit.byId('id_wp'+route_index+'_'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_wp'+route_index+'_'+(index-1)).get( 'value' );

		dijit.byId('id_wp'+route_index+'_'+(index)).set( 'value', wp_b );
		dijit.byId('id_wp'+route_index+'_'+(index-1)).set( 'value', wp_a );
		
		do_route( route_index );
	}

	function cb_click_btn_down( route_index, index ) {

		console.log( "*** Down: route_index=" + route_index + " index=" + index );

		var wp_a = dijit.byId('id_wp'+route_index+'_'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_wp'+route_index+'_'+(index+1)).get( 'value' );

		dijit.byId('id_wp'+route_index+'_'+(index)).set( 'value', wp_b );
		dijit.byId('id_wp'+route_index+'_'+(index+1)).set( 'value', wp_a );
		
		do_route( route_index );
	}
	
	function cb_click_btn_drive( route_index, waypoint_index ) {
		
		console.log( "Drive: route_index=" + route_index + " waypoint_index=" + waypoint_index );

		curr_route = route_index;	
		curr_leg = waypoint_index;

        document.getElementById("td_map_canvas").style.width = "50%";
        document.getElementById("td_panorama").style.width = "50%";

    	require(["dojo/dom-style"], function( domStyle) {
			domStyle.set( "id_left_layout", "display", "None" );
		});

        document.getElementById("td_map_canvas").style.width = "50%";
        document.getElementById("td_panorama").style.width = "50%";

   		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled', false );

        var renderer_options = { draggable: false };
       	directions_renderer[route_index].setOptions( renderer_options );
        map.setOptions({draggableCursor: 'hand'});

        start_driving( route_index );  

	}
	
	function update_btns_remove_up_down( route_index, all ) {
		
        var first_hidden = find_first_hidden( route_index );
    	console.log( "first_hidden=" + first_hidden );

		var origin = dijit.byId('id_wp'+route_index+'_0').get( 'value' );
   		dijit.byId('id_btn_add_'+route_index+'_0').set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_btn_remove_'+route_index+'_0').set( 'disabled', (first_hidden > 2) ? false : true );
   		dijit.byId('id_btn_down_'+route_index+'_0').set( 'disabled', (origin == '') ? true : false ); 
    	
		for ( var n = 1; n < first_hidden - 1; n++ ) {
			var waypoint = dijit.byId('id_wp'+route_index+'_'+n).get( 'value' );
	   		dijit.byId('id_btn_add_'+route_index+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_btn_remove_'+route_index+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_btn_up_'+route_index+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
	   		dijit.byId('id_btn_down_'+route_index+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
		}
		
		for ( var n = 1; n < first_hidden; n++ ) {
			var wp0 = dijit.byId('id_wp'+route_index+'_'+(n-1)).get( 'value' );
			var wp1 = dijit.byId('id_wp'+route_index+'_'+n).get( 'value' );
	   		dijit.byId('id_btn_drive_'+route_index+"_"+n).set( 'disabled', ((wp0 == '') || (wp1 == '')) ? true : false ); 
		}
		
   		dijit.byId('id_btn_add_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_btn_remove_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (first_hidden > 2) ? false : true );
		var destination = dijit.byId('id_wp'+route_index+'_'+(first_hidden-1)).get( 'value' );
   		dijit.byId('id_btn_up_'+route_index+'_'+(first_hidden-1)).set( 'disabled', (destination == '') ? true : false );
   		dijit.byId('id_btn_down_'+route_index+'_'+(first_hidden-1)).set( 'disabled', true );
    	
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
  } catch (err) {
    console.log('Oops, unable to copy');
  }
		
	}

    function parse( type ) {
    	return typeof type == 'string' ? JSON.parse(type) : type;
    }
    
    function save_settings( ) {

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

    	var step = dijit.byId('id_input_meters').get( 'value' );
    	localStorage.setItem( "step", step );
    	console.log( "step= " + step );
    	
    	var interval = dijit.byId('id_input_interval').get( 'value' );
    	localStorage.setItem( "interval", interval );
    	console.log( "interval= " + interval );
    	
        var is_addr_for_orig = dijit.byId('id_is_addr_for_orig').get( 'checked' );
    	localStorage.setItem( "id_is_addr_for_orig", is_addr_for_orig );
    	console.log( "is_addr_for_orig= " + is_addr_for_orig );
    		
        var addr_for_orig = dijit.byId('id_addr_for_orig').get( 'value' );
    	localStorage.setItem( "id_addr_for_orig", addr_for_orig );
    	console.log( "addr_for_orig= " + addr_for_orig );
    		
	    var autocomplete_restrict_type = dijit.byId('id_autocomplete_restrict_type').get( 'checked' );
    	localStorage.setItem( "autocomplete_restrict_type", autocomplete_restrict_type );
    	console.log( "autocomplete_restrict_type= " + autocomplete_restrict_type );
    		
	    var autocomplete_restrict_cb = dijit.byId('id_autocomplete_restrict_cb').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_cb", autocomplete_restrict_cb );
    	console.log( "autocomplete_restrict_cb= " + autocomplete_restrict_cb );
    		
	    var autocomplete_restrict_country = dijit.byId('id_autocomplete_restrict_country').get( 'checked' );
    	localStorage.setItem( "autocomplete_restrict_country", autocomplete_restrict_country );
    	console.log( "autocomplete_restrict_country= " + autocomplete_restrict_country );
    		
	    var autocomplete_restrict_country_use_loc = dijit.byId('id_autocomplete_restrict_country_use_loc').get( 'checked' );
    	localStorage.setItem( "autocomplete_restrict_country_use_loc", autocomplete_restrict_country_use_loc );
    	console.log( "autocomplete_restrict_country_use_loc= " + autocomplete_restrict_country_use_loc );
    		
	    var autocomplete_restrict_list_country1 = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_list_country1", autocomplete_restrict_list_country1 );
    	console.log( "autocomplete_restrict_list_country1= " + autocomplete_restrict_list_country1 );
    		
	    var autocomplete_restrict_list_country2 = dijit.byId('id_autocomplete_restrict_list_country2').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_list_country2", autocomplete_restrict_list_country2 );
    	console.log( "autocomplete_restrict_list_country2= " + autocomplete_restrict_list_country2 );
    	
    }
    
    function load_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}
    	
		for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
	    	var no_hwy = localStorage.getItem("no_highway_"+route_index);
    		console.log( "Route " + route_index + " - Restored no_hwy= " + no_hwy );
	    	if ( no_hwy != null )
    	        dijit.byId('id_check_no_hwy_'+route_index).set( 'checked', parse(no_hwy), false );
		}
    	
		for (var route_index = 0; route_index < MAX_NB_ROUTES; route_index++) {
	    	var no_toll = localStorage.getItem("no_toll_"+route_index);
    		console.log( "Route " + route_index + " - Restored no_toll= " + no_toll );
    		if ( no_toll != null )
            	dijit.byId('id_check_no_toll_'+route_index).set( 'checked', parse(no_toll), false );
		}

    	var step = localStorage.getItem("step");
    	console.log( "Restored step= " + step );
    	if ( step != null )
            dijit.byId('id_input_meters').set( 'value', parse(step) );
    	
    	var interval = localStorage.getItem("interval");
    	console.log( "Restored interval= " + interval );
    	if ( interval != null )
            dijit.byId('id_input_interval').set( 'value', parse(interval) );
    	
    	var is_addr_for_orig = localStorage.getItem("id_is_addr_for_orig");
    	console.log( "Restored is_addr_for_orig= " + is_addr_for_orig );
    	if ( is_addr_for_orig )
            dijit.byId('id_is_addr_for_orig').set( 'checked', parse(is_addr_for_orig) );
    	
    	var addr_for_orig = localStorage.getItem("id_addr_for_orig");
    	console.log( "Restored addr_for_orig= " + addr_for_orig );
    	if ( addr_for_orig ) {
            dijit.byId('id_addr_for_orig').set( 'value', addr_for_orig );
			dijit.byId( "id_addr_for_orig").set("disabled", !is_addr_for_orig );
        }
    	
    	var autocomplete_restrict_type = localStorage.getItem("autocomplete_restrict_type");
    	console.log( "Restored autocomplete_restrict_type= " + autocomplete_restrict_type );
    	if ( autocomplete_restrict_type )
            dijit.byId('id_autocomplete_restrict_type').set( 'checked', parse(autocomplete_restrict_type) );
    	
    	var autocomplete_restrict_cb = localStorage.getItem("autocomplete_restrict_cb");
    	console.log( "Restored autocomplete_restrict_cb= " + autocomplete_restrict_cb );
    	if ( autocomplete_restrict_cb )
            dijit.byId('id_autocomplete_restrict_cb').set( 'value', autocomplete_restrict_cb );
    	
    	var autocomplete_restrict_country = localStorage.getItem("autocomplete_restrict_country");
    	console.log( "Restored autocomplete_restrict_country= " + autocomplete_restrict_country );
    	if ( autocomplete_restrict_country )
            dijit.byId('id_autocomplete_restrict_country').set( 'checked', parse(autocomplete_restrict_country) );
    	
    	var autocomplete_restrict_country_use_loc = localStorage.getItem("autocomplete_restrict_country_use_loc");
    	console.log( "Restored autocomplete_restrict_country_use_loc= " + autocomplete_restrict_country_use_loc );
    	if ( autocomplete_restrict_country_use_loc )
            dijit.byId('id_autocomplete_restrict_country_use_loc').set( 'checked', parse(autocomplete_restrict_country_use_loc) );
    	
    	var autocomplete_restrict_list_country1 = localStorage.getItem("autocomplete_restrict_list_country1");
    	console.log( "Restored autocomplete_restrict_list_country1= " + autocomplete_restrict_list_country1 );
    	if ( autocomplete_restrict_list_country1 )
            dijit.byId('id_autocomplete_restrict_list_country1').set( 'value', autocomplete_restrict_list_country1 );
    	
    	var autocomplete_restrict_list_country2 = localStorage.getItem("autocomplete_restrict_list_country2");
    	console.log( "Restored autocomplete_restrict_list_country2= " + autocomplete_restrict_list_country2 );
    	if ( autocomplete_restrict_list_country2 )
            dijit.byId('id_autocomplete_restrict_list_country2').set( 'value', autocomplete_restrict_list_country2 );
    	
    } // load_settings
    
    function clear_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}

    	localStorage.clear( );
    	
    }
    
	require(["dojo/store/Memory"], function( Memory ) {
		_iso_countries = [
            {code: 'AL', id: 'Albania'},
            {code: 'DZ', id: 'Algeria'},
            {code: 'AS', id: 'American Samoa'},
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

		do_save_gpx: function( ) { do_save_gpx(); },
		do_create_long_url: function ( ) { do_create_long_url(); },
		do_create_short_url: function ( ) { do_create_short_url(); },
		
		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input: function( ) { cb_route_input( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_click_no_hwy:  function( route_index ) { cb_click_no_hwy( route_index ); },
		cb_click_no_toll: function( route_index ) { cb_click_no_toll( route_index ); },

		cb_open_settings: function( ) { cb_open_settings( ); },

		cb_copy_long_url: function( ) { cb_copy_long_url( ); },
		
		save_settings: 		function( ) { save_settings(); },
		clear_settings: 	function( ) { clear_settings(); },
		
    };
 
});
