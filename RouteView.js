define( function( m ) {

    var map;
    var panorama;
    var map_full_screen;
    var panorama_full_screen;
    var polyline = [];
    var location_from = [];
    var location_to = [];
    var poly2 = [];
    var timer_animate = [];
    var eol = [];
    var step;               // metres
    var interval;           // milliseconds
	var is_force_panto = true;
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_service = [];
	var directions_display = [];
	var route_directions_first = [];

    function show_route_distance_duration( route_num, dist_meters, duration_secs ) {

        console.log( "dist_meters=" + dist_meters + " duration_secs=" + duration_secs );

        document.getElementById("id_route1_dist").innerHTML = Math.round( dist_meters / 1000 );
        
        var nb_hours   = Math.floor( duration_secs / 3600 );
        var nb_minutes = Math.floor( (duration_secs - (nb_hours * 3600)) / 60 );
        var nb_seconds = Math.floor( duration_secs - (nb_hours * 3600) - (nb_minutes * 60) );
        if ( nb_hours == 0 ) {
            if ( nb_minutes == 0 ) {
                document.getElementById("id_route1_duration").innerHTML = nb_seconds + '"';
            }
            else {
                if ( nb_seconds == 0 )
                    document.getElementById("id_route1_duration").innerHTML = nb_minutes + "'";
                else
                    document.getElementById("id_route1_duration").innerHTML = nb_minutes + "'" + nb_seconds + '"';
            }
        }
        else {
            document.getElementById("id_route1_duration").innerHTML = nb_hours + "h" + nb_minutes + "'" + nb_seconds + '"';
        }
        
        document.getElementById("id_route1_distance_duration").style.display = "";
        
        // Update route slider
		dijit.byId('id_input_route').set( 'maximum', dist_meters );
		dijit.byId('id_input_route').set( 'discreteValues,', dist_meters );
		dijit.byId('id_input_route').set( 'value', 0 );
        
    }
    
    function updatePoly( i, d ) {
        var lastVertex = 1;
        // Spawn a new polyline every 30 vertices, because updating a 100-vertex poly is too slow
        if ( poly2[i].getPath().getLength() > 30 ) {
            poly2[i] = new google.maps.Polyline([polyline[i].getPath().getAt( lastVertex - 1 )]);
            // map.addOverlay( poly2 )
        }

        if ( polyline[i].GetIndexAtDistance(d) < lastVertex + 2 ) {
            if ( poly2[i].getPath().getLength() > 1 )
                poly2[i].getPath().removeAt(poly2[i].getPath().getLength()-1)
            poly2[i].getPath().insertAt( poly2[i].getPath().getLength(),polyline[i].GetPointAtDistance(d) );
        } 
        else {
            poly2[i].getPath().insertAt( poly2[i].getPath().getLength(),location_to[i].latlng );
        }
    }

    function cb_animate( num_route, d ) {

//    	alert( 'num_route=' + num_route );
//    	alert( 'd=' + d );
    	
        curr_dist = d;

        if ( d > eol[num_route] ) {
            console.log( "Route " + num_route + " is done" );
            return;
        }
        
        var p = polyline[num_route].GetPointAtDistance( d );
        if ( !map.getBounds().contains( p ) )
			if ( is_force_panto )
            	map.panTo( p );

        var bearing = polyline[num_route].Bearing( polyline[num_route].GetIndexAtDistance(d) );
        console.log( "d=" + d + " - " + polyline[num_route].GetIndexAtDistance(d) + " / " + bearing);
        panorama.setPosition( new google.maps.LatLng( p.G, p.K ) );
        panorama.setPov({
            heading: bearing,
            pitch: (panorama_full_screen) ? 2 : 10
        });

        updatePoly( num_route, d );
        if ( step > 0 )
            timer_animate[num_route] = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate(0, '+(d+step)+',50); })', interval );

        // Update route slider
        document.getElementById("id_input_route").value = d;
    }

    function start_driving( route_num ) {
        
        if ( timer_animate[route_num] ) 
            clearTimeout( timer_animate[route_num] );
            
        eol[route_num] = polyline[route_num].Distance();
        map.setCenter( polyline[route_num].getPath().getAt(0) );

        poly2[route_num] = new google.maps.Polyline({
            path: [polyline[route_num].getPath().getAt(0)], strokeColor:"#FFFF00", strokeWeight:3
        });

        timer_animate[route_num] = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate(0, 50); })', 250 );
    }

    function do_route( ) {

    	if ( directions_display[0] != undefined ) {
    		console.log( "Delete current route" )
    		var route_num = 0;
    		directions_display[route_num].setMap( null );
        	directions_display[route_num] = undefined;
        	if ( polyline[route_num] != undefined ) {
        		polyline[route_num].setMap( null );
        		polyline[route_num] = undefined;
        	}
    	}

    	step = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        var startLoc = new Array();
        startLoc[0] = dijit.byId('id_route1_from').get( 'value' );
        console.log( "from = " + startLoc[0] );

        var way_points = [];
        waypt = dijit.byId('id_route1_waypoint1').get( 'value' );
        if ( waypt != "" ) {
            console.log( "waypt = " + waypt );
            way_points.push({
                  location:waypt,
                  stopover:true
            });
        }

        var endLoc = new Array();
        endLoc[0] = dijit.byId('id_route1_to').get( 'value' );
        console.log( "to   = " + endLoc[0] );

        var no_hwy  = dijit.byId('id_check_no_hwy').get( 'checked' );
        var no_toll = dijit.byId('id_check_no_toll').get( 'checked' );
        console.log( "no_hwy=" + no_hwy + " no_toll=" + no_toll );
        
        for ( var route_num = 0; route_num < startLoc.length; route_num++ ) {

            directions_service[route_num] = new google.maps.DirectionsService( );
            
            directions_display[route_num] = new google.maps.DirectionsRenderer({
                draggable: true,
                map: map,
                hideRouteList: false,
                preserveViewport: true,
                suppressMarkers : false,
             });

        	route_directions_first[route_num] = true;
            directions_display[route_num].addListener('directions_changed', function() {
            	var route_num = 0;
                console.log( directions_display[route_num].getDirections() );
                if ( route_directions_first[route_num] ) {
                	route_directions_first[route_num] = false;
                }
                else {
                	show_error( "Sorry, this feature is not yet implemented!<br><br>Hopefuly I'll have time next week-end to work on it..." );
                }
            });

            var request = {
                origin: startLoc[route_num],
                destination: endLoc[route_num],
                travelMode: google.maps.DirectionsTravelMode.DRIVING,
                waypoints: way_points,
                optimizeWaypoints: true,
                avoidHighways: no_hwy,
                avoidTolls: no_toll
            };  

            directions_service[route_num].route( request, cb_make_route( route_num ) );

        }
        
        function cb_make_route( route_num ) {

            return function( response, status ) {

                if ( status == google.maps.DirectionsStatus.OK ) {

                	directions_display[route_num].setMap( map );
                	directions_display[route_num].setDirections( response );

                    var bounds = new google.maps.LatLngBounds();
                    var route = response.routes[0];
                    location_from[route_num] = new Object();
                    location_to[route_num] = new Object();

                    polyline[route_num] = new google.maps.Polyline({
                        path: [],
                        strokeColor: '#FFFF00',
                        strokeWeight: 3
                    });

                    poly2[route_num] = new google.maps.Polyline({
                        path: [],
                        strokeColor: '#FFFF00',
                        strokeWeight: 3
                    });     

                    // For each route, display summary information.
                    var path = response.routes[0].overview_path;
                    var legs = response.routes[0].legs;

                    // Markers
                    var dist_meters = 0;
                    var duration_secs = 0;
                    for ( i = 0; i < legs.length; i++) {
                        dist_meters += legs[i].distance.value;
                        duration_secs += legs[i].duration.value;
                        console.log( i + ": m=" + legs[i].distance.value + " secs=" + legs[i].duration.value );
                        if ( i == 0 ) {
                            location_from[route_num].latlng  = legs[i].start_location;
                            location_from[route_num].address = legs[i].start_address;
                        }
                        location_to[route_num].latlng  = legs[i].end_location;
                        location_to[route_num].address = legs[i].end_address;
                        var steps = legs[i].steps;

                        for ( j = 0; j < steps.length; j++) {
                            var nextSegment = steps[j].path;                
                            var nextSegment = steps[j].path;

                            for ( k=0;k < nextSegment.length;k++) {
                                polyline[route_num].getPath().push(nextSegment[k]);
                                bounds.extend(nextSegment[k]);
                            }
                        }
                    }
                    
                    show_route_distance_duration( route_num, dist_meters, duration_secs );

                    polyline[route_num].setMap( map );
                    map.fitBounds( bounds );
//                  start_driving( route_num );  

                    document.getElementById("id_input_route").style.display = "";
            		dijit.byId('id_input_route').set( 'disabled', true );
            		
            		dijit.byId('id_btn_route').set( 'disabled', true );
            		dijit.byId('id_btn_play').set( 'disabled', false );
            		dijit.byId('id_btn_pause').set( 'disabled', true );
            		dijit.byId('id_btn_stop').set( 'disabled', true );

                }
                else {
                	
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

        }

    }
    
    function do_play( ) {

    	console.log( "Play!" );
    	var route_num = 0;
        start_driving( route_num );  

		dijit.byId('id_btn_route').set( 'disabled', true );
		dijit.byId('id_btn_play').set( 'disabled', true );
		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled', false );

		dijit.byId('id_route1_from').set( 'disabled', true );
		dijit.byId('id_route1_waypoint1').set( 'disabled', true );
		dijit.byId('id_route1_to').set( 'disabled', true );

		dijit.byId('id_check_no_hwy').set( 'disabled', true );
		dijit.byId('id_check_no_toll').set( 'disabled', true );

        var renderer_options = {
            draggable: true,
        };
    	directions_display[0].setOptions( renderer_options );
    		
    }
    
    function show_error( message ) {
    	
    	require(["dijit/Dialog", "dojo/domReady!"], function(Dialog){

    		message += "<hr>" +
    			"<div align='right'>" +
    			"<button dojoType='dijit/form/Button' type='button' onclick='dlg_error.hide()'>Ok</button>" +
    			"</div>";
    		
    		dlg_error = new Dialog({
    	        title: "Error",
    	        closable: false,
    	        duration:1500,
    	        content: message,
    	        style: "min-width: 250px"
    	    });
    		
    		dlg_error.show();
    	});
    }
    
    function do_pause( ) {
    	
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Pause" ) {
            clearTimeout( timer_animate[0] );
        	dijit.byId('id_btn_pause').set( 'label', "Continue" );
            console.log( "curr_dist=" + curr_dist );
        }
        else if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" ) {
        	dijit.byId('id_btn_pause').set( 'label', "Pause" );
            var num_route = 0;
            timer_animate[num_route] = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate(0, '+(curr_dist)+'); })', interval );
//          timer_animate[num_route] = setTimeout( "cb_animate(" + num_route + "," + curr_dist + ")", interval );
        }

		dijit.byId('id_input_route').set( 'disabled', false );

    }

    function do_stop( ) {

        clearTimeout( timer_animate[0] );

		dijit.byId('id_route1_from').set( 'disabled', false );
		dijit.byId('id_route1_waypoint1').set( 'disabled', false );
		dijit.byId('id_route1_to').set( 'disabled', false );

		dijit.byId('id_check_no_hwy').set( 'disabled', false );
		dijit.byId('id_check_no_toll').set( 'disabled', false );

		dijit.byId('id_btn_route').set( 'disabled', true );
		dijit.byId('id_btn_play').set( 'disabled', true );
		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		
    }

    function resize_sliders( ) {
    	
    	require(["dojo/dom-geometry", "dojo/dom", "dojo/dom-style"], function( domGeom, dom, domStyle) {
		    var node = dom.byId("id_left_layout");
		    var computedStyle = domStyle.getComputedStyle( node );
		    var output = domGeom.getContentBox( node, computedStyle );
    		domStyle.set( "id_input_meters",   "width", (output.w - 22)+ "px" );
    		domStyle.set( "id_input_interval", "width", (output.w - 22)+ "px" );
//		    console.log( output );
   		});
    	
    }

    function initialize( ) {

        var home = new google.maps.LatLng( 35.733435, -78.907684 );
        var mapOptions = {
           center: home,
           zoom: 14
        };

        map = new google.maps.Map( document.getElementById('id_map_canvas'), mapOptions );
        var panoramaOptions = {
            position: home,
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

        panorama = new google.maps.StreetViewPanorama( document.getElementById('id_panorama'), panoramaOptions );
        map.setStreetView( panorama );

        map_full_screen = false;
        panorama_full_screen = false;
        
        require(["dojo/dom", "dojo/on"], function( dom, on ) {

        	var id_map_canvas = dom.byId('id_map_canvas');
    		on( id_map_canvas, "click", function( evt ) {
   				if ( evt.handled != true )
   					cb_map_click( );
   			});
    		
        	var id_panorama = dom.byId('id_panorama');
    		on( id_panorama, "click", function( evt ) {
   				if ( evt.handled != true )
   					cb_panorama_click( );
   			});
    		
        });

        require(["dojo/ready", "dojo/aspect", "dijit/registry", "dojo/dom-style"], function(ready, aspect, registry, domStyle) {
            ready( function() {

//        		domStyle.set( "id_left_layout", "display", "None" );
            	
            	aspect.after(registry.byId("id_middle_layout"), "resize", function() {
                    google.maps.event.trigger( map, 'resize' );
                    map.setCenter( panorama.location.latLng );
                    google.maps.event.trigger( panorama, 'resize' );
                });
/*
                aspect.after(registry.byId("id_left_layout"), "resize", function(changeSize) {
                	console.log( changeSize );
                	resize_sliders( );                	
                }, true);                
*/

            });
        });
        
//		resize_sliders( );
        
    }
    
	function move_to_dist( new_pos ) {

		var num_route = 0;

        var p = polyline[num_route].GetPointAtDistance( new_pos );
        if ( !map.getBounds().contains( p ) )
            map.panTo( p );

        var bearing = polyline[num_route].Bearing( polyline[num_route].GetIndexAtDistance( new_pos ) );
        panorama.setPosition( new google.maps.LatLng( p.G, p.K ) );
        panorama.setPov({
            heading: bearing,
            pitch: 10
        });

        updatePoly( num_route, new_pos );

		cb_move_to_dist = undefined;

		curr_dist = new_pos;
	}

    function cb_route_input( ) {
		if ( cb_move_to_dist != undefined )
			clearTimeout( cb_move_to_dist );
		var new_pos = dijit.byId('id_input_route').get( 'value' );
		console.log( new_pos );
		cb_move_to_dist = setTimeout( 'require(["RouteView.js"], function( s ) { s.move_to_dist('+new_pos+'); })', 25 );
    }

    function cb_step_changed( ) {
    	step = dijit.byId('id_input_meters').get( 'value' );
        document.getElementById("id_meters").innerHTML = step;
    }

    function cb_interval_changed( new_interval ) {
    	interval = dijit.byId('id_input_interval').get( 'value' );
        document.getElementById("id_interval").innerHTML = interval;
    }
    

    function cb_click_no_hwy( ) {
    }

    function cb_click_no_toll( ) {
    }

    function cb_click_force_panto( ) {
		is_force_panto = dijit.byId('id_check_force_panto').get( 'checked' );
		console.log( "is_force_panto=" + is_force_panto );
    }

    function download_file( text, name, type ) {
        var a = document.createElement("a");
        var file = new Blob([text], {type: type});
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
    }
    
    function do_save_gpx( ) {
    	
    	download_file( "Hello", "test.gpx", "application/gpx+xml" );

    }
    
    function cb_route1_changed( ) {
    	
    	console.log( "route 1 has changed ");

		var origin = dijit.byId('id_route1_from').get( 'value' );
		var destination = dijit.byId('id_route1_to').get( 'value' );
		var waypoint1 = dijit.byId('id_route1_waypoint1').get( 'value' );
		console.log( "origin= [" + origin + "]" );
		console.log( "destination= [" + destination + "]" );
		console.log( "waypoint1= [" + waypoint1 + "]" );

        var directions = new google.maps.DirectionsService( );

		dijit.byId('id_btn_route').set( 'disabled', false );
		dijit.byId('id_btn_play').set( 'disabled', true );
        
    }
    
    function cb_route1_from_blur( ) {
    	console.log("blur!");
    }
	
    function cb_map_click( ) {
    	
        require(["dojo/ready", "dojo/dom-style"], function( ready, domStyle ) {
            ready( function() {

                if ( !map_full_screen ) {
                	map_full_screen = true;
                    console.log( "Map switching to full screen" );
            		domStyle.set( "id_right_layout", "display", "None" );
                }
                else {
                	map_full_screen = false;
                    console.log( "Map leaving full screen" );
            		domStyle.set( "id_right_layout", "display", "" );
                }
        		var main_layout = dijit.byId('app_layout');
        		main_layout.resize();
        		
            });
        });
            	
    }
    
    function cb_panorama_click( ) {
    	
        require(["dojo/ready", "dojo/dom-style"], function( ready, domStyle ) {
            ready( function() {

                if ( !panorama_full_screen ) {
                    panorama_full_screen = true;
                    console.log( "Panorama switching to full screen" );
            		domStyle.set( "id_right_layout", "width", "100%" );
                }
                else {
                    panorama_full_screen = false;
                    console.log( "Panorama leaving full screen" );
            		domStyle.set( "id_right_layout", "width", "50%" );
                }
        		var main_layout = dijit.byId('app_layout');
        		main_layout.resize();
        		
            });
        });
            	
        google.maps.event.trigger( panorama, 'resize' );
    }
    
	// ---------
	// Externals
	// ---------

    return {

        initialize: function( ) { initialize( ); },
		
        do_route: function( ) { do_route(); },
        do_play:  function( ) { do_play(); },
		do_pause: function( ) { do_pause(); },
		do_stop:  function( ) { do_stop(); },

		do_save_gpx: function( ) { do_save_gpx(); },
		
		cb_animate: function( num_route, d ) { cb_animate( num_route, d ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input: function( ) { cb_route_input( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_click_no_hwy:  function( ) { cb_click_no_hwy(); },
		cb_click_no_toll: function( ) { cb_click_no_toll(); },

		cb_click_force_panto:  function( ) { cb_click_force_panto(); },

		cb_route1_changed:  function( ) { cb_route1_changed(); },
		cb_route1_from_blur:  function( ) { cb_route1_from_blur(); },
		
    };
 
});
