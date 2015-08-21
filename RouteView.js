/* ******************************************************************************************** */
/* ***                                                                                      *** */ 
/* *** RouteView - Olivier Singla                                                           *** */
/* ***                                                                                      *** */ 
/* *** StreeView Player - Virtual Drive or Virtual Ride, using Google Maps and Street View  *** */
/* ***                                                                                      *** */ 
/* ******************************************************************************************** */

define( function( m ) {

	var MAX_NB_WAYPOINTS = 8;
	
    var map;
    var geocoder;
    var service;
    var panorama;
    var map_full_screen;
    var panorama_full_screen;
    var polyline = [];
    var location_from = [];
    var location_to = [];
    var poly2 = [];
    var timer_animate = [];
    var eol = [];
    var step;               			// meters
    var interval;           			// milliseconds
	var is_force_panto = true;
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_service = [];
	var directions_display = [];
	var route = [];

    function show_route_distance_duration( route_num, dist_meters, duration_secs ) {

        console.log( "dist_meters=" + dist_meters + " duration_secs=" + duration_secs );

        document.getElementById("id_route1_dist_kms").innerHTML = Math.round( dist_meters / 1000 );
        document.getElementById("id_route1_dist_miles").innerHTML = Math.round( dist_meters * 0.000621371 );
        
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
		dijit.byId('id_input_route').set( 'value', d );
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

    function find_first_hidden( num_route ) {

        var first_hidden = MAX_NB_WAYPOINTS + 2;
    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_route' + (num_route+1) + '_tr' + n;
        		var display = domStyle.get( id, "display" );
            	console.log( id + " --> " + display );
            	if ( display == "none" ) {
            		first_hidden = n;
            		break;
            	}
            }
 		});
    	
    	return first_hidden;
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

        var no_hwy  = dijit.byId('id_check_no_hwy').get( 'checked' );
        var no_toll = dijit.byId('id_check_no_toll').get( 'checked' );
        console.log( "no_hwy=" + no_hwy + " no_toll=" + no_toll );
        
    	step = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        var num_route = 0;
        var first_hidden = find_first_hidden( num_route);
    	console.log( "first_hidden=" + first_hidden );
        
        var start_location = new Array();
        start_location[num_route] = dijit.byId('id_route'+(num_route+1)+'_wp0').get( 'value' );
        console.log( "from = " + start_location[num_route] );

        var way_points = [];
        for ( var n = 1; n < first_hidden-1; n++ ) {
        	
            waypt = dijit.byId('id_route'+(num_route+1)+'_wp'+n).get( 'value' );
            console.log( "n=" + n + " => [" + waypt + "]" );
            if ( waypt != "" ) {
                way_points.push({
                    location:waypt,
                    stopover:true
                });
            }
        }

        var end_location = new Array();
        end_location[num_route] = dijit.byId('id_route'+(num_route+1)+'_wp'+(first_hidden-1)).get( 'value' );
        console.log( "to   = " + end_location[num_route] );

        for ( var route_num = 0; route_num < start_location.length; route_num++ ) {

            directions_service[route_num] = new google.maps.DirectionsService( );
            
            directions_display[route_num] = new google.maps.DirectionsRenderer({
                draggable: true,
                map: map,
                hideRouteList: false,
                preserveViewport: true,
                suppressMarkers : false,
             });

            directions_display[route_num].addListener('directions_changed', function() {
            	var route_num = 0;
            	var new_dir = directions_display[route_num].getDirections();
                console.log( new_dir );
                var index_waypoint = new_dir.request.j;
                if ( index_waypoint != undefined ) {
                	
                    console.log( index_waypoint );
                    var place_id = new_dir.geocoded_waypoints[index_waypoint].place_id ;
                    console.log( place_id );

                	service.getDetails({
                	    placeId: place_id
                	  }, function ( place, status ) {
                	    if ( status === google.maps.places.PlacesServiceStatus.OK ) {
                	    	console.log( place );
                	    	console.log( place.name );
                	    	console.log( place.formatted_address );
                	    	change_waypoint( index_waypoint, place.formatted_address );
                	    }
                	  });
                	
//                 	show_error( "Sorry, this feature is not yet implemented!<br><br>Hopefuly I'll have time next week-end to work on it..." );
                }

            });

            var request = {
                origin: start_location[route_num],
                destination: end_location[route_num],
                travelMode: google.maps.DirectionsTravelMode.DRIVING,
                waypoints: way_points,
                optimizeWaypoints: false,
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
                    route[route_num] = response.routes[0];
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
                    var path = route[route_num].overview_path;
                    var legs = route[route_num].legs;

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

        } // cb_make_route

        update_btns_remove_up_down( );
        set_labels_from_wp_to( 0 );
    
        map.setOptions({draggableCursor: 'crosshair'});

		dijit.byId('id_btn_save_gpx').set( 'disabled', false );
        
    } // do_route
    
    function do_play( ) {

    	console.log( "Play!" );
    	var route_num = 0;
        start_driving( route_num );  

		dijit.byId('id_btn_route').set( 'disabled', true );
		dijit.byId('id_btn_play').set( 'disabled', true );
		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled', false );

		dijit.byId('id_btn_save_gpx').set( 'disabled', true );
        
		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) 
			dijit.byId('id_route1_wp'+n).set( 'disabled', true );

		dijit.byId('id_check_no_hwy').set( 'disabled', true );
		dijit.byId('id_check_no_toll').set( 'disabled', true );

        var renderer_options = { draggable: true };
       	directions_display[0].setOptions( renderer_options );
    		
    	update_btns_remove_up_down( false );
        map.setOptions({draggableCursor: 'hand'});
        
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

        var renderer_options = { draggable: false };
       	directions_display[0].setOptions( renderer_options );
    
        map.setOptions({draggableCursor: 'hand'});
        
    }

    function do_stop( ) {

        clearTimeout( timer_animate[0] );

		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) 
			dijit.byId('id_route1_wp'+n).set( 'disabled', false );

		dijit.byId('id_check_no_hwy').set( 'disabled', false );
		dijit.byId('id_check_no_toll').set( 'disabled', false );

		dijit.byId('id_btn_route').set( 'disabled', false );
		dijit.byId('id_btn_play').set( 'disabled', true );
		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		
        var renderer_options = { draggable: false };
       	directions_display[0].setOptions( renderer_options );

    	update_btns_remove_up_down( false );
    	map.setOptions({draggableCursor: 'hand'});
        
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
//    	if ( navigator.geolocation ) 
//    		navigator.geolocation.getCurrentPosition( function( pos ) { home = pos.coords; console.log( home ); } );
    	
        var map_options = {
           center: home,
           zoom: 14,
//         draggableCursor: 'crosshair',            
//         draggingCursor: 'pointer'           
        };

        map = new google.maps.Map( document.getElementById('id_map_canvas'), map_options );
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

        geocoder = new google.maps.Geocoder;
        
        service = new google.maps.places.PlacesService( map );

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
    		
    		google.maps.event.addListener( map, "rightclick", function( evt ) {
    			cb_map_rightclick( evt );
   			});
    		
        	var id_panorama = dom.byId('id_panorama');
    		on( id_panorama, "click", function( evt ) {
   				if ( evt.handled != true )
   					cb_panorama_click( );
   			});

    		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) { 
        		on( dom.byId('id_route1_wp'+n), "change", function( evt ) {
        			cb_route1_changed( evt ); 
       			});
    		}
    		
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
        
/*
        require(["dojo/dnd/Moveable", "dojo/dom", "dojo/on", "dojo/domReady!"],
        		function(Moveable, dom, on){
        		       var dnd = new Moveable( dom.byId("id_route1_tr0") );
        		});
*/
        

//      update_btns_remove_up_down( );
        set_labels_from_wp_to( 0 );
   
    } // initialize
    
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
		cb_move_to_dist = setTimeout( 'require(["RouteView.js"], function( s ) { s.move_to_dist('+new_pos+'); })', 25 );
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
    

    function cb_click_no_hwy( ) {
    	
    	if ( !dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		do_route();
    }

    function cb_click_no_toll( ) {
    	
    	if ( !dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		do_route();
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
    	
    	var route_num = 0;
    	
    	console.log( "XXXXXXXXXXXXXXXXXXXXXXXX" );
    	console.log( route[route_num].summary );
    	console.log( route[route_num] );
/*
    	var legs = route[route_num].legs;
        for ( n = 0; n < legs.length; n++) {
            console.log( i + ": G=" + legs[n].start_location.G + " K=" + legs[n].start_location.K );
        }
*/
    	var crlf = String.fromCharCode(13) + String.fromCharCode(10);
    	
        var gpx = '';
        
        gpx += '<?xml version="1.0" encoding="UTF-8"?>' + crlf +
        	'<gpx version="1.0" creator="" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/0" xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd">' + crlf + 
        	'<time>2015-06-12T21:36:34Z</time>' +crlf;
        
    	var op = route[route_num].overview_path;
        for ( n = 0; n < op.length; n++ ) {
        	gpx += '<wpt lat="'+op[n].G+'" lon="'+op[n].K+'">' + ' </wpt>' + crlf;
        }
        
        gpx += '<rte>' + crlf;
        gpx += '<name>' + route[route_num].summary + '</name>' + crlf;
//        for ( n = 0; n < op.length; n++ ) {
//        	gpx += '<rtept lat="'+op[n].G+'" lon="'+op[n].K+'">' + ' </rtept>' + crlf;
//        }
    	var legs = route[route_num].legs;
        for ( n = 0; n < legs.length; n++)
        	gpx += '<rtept lat="'+legs[n].start_location.G+'" lon="'+legs[n].start_location.K+'">' + ' </rtept>' + crlf;
    	gpx += '<rtept lat="'+legs[legs.length-1].end_location.G+'" lon="'+legs[legs.length-1].end_location.K+'">' + ' </rtept>' + crlf;
        gpx += '</rte>' + crlf;
        gpx += '</gpx>' + crlf;
        	
    	download_file( gpx, "test.gpx", "application/gpx+xml" );

    }
    
    function cb_route1_changed( evt ) {
    	
		var origin = dijit.byId('id_route1_wp0').get( 'value' );
		var waypoint1 = dijit.byId('id_route1_wp1').get( 'value' );
		var destination = dijit.byId('id_route1_wp2').get( 'value' );
		console.log( "origin= [" + origin + "]" );
		console.log( "destination= [" + destination + "]" );
		console.log( "waypoint1= [" + waypoint1 + "]" );

//		dijit.byId('id_btn_route').set( 'disabled', false );
//		dijit.byId('id_btn_play').set( 'disabled', true );
        
    	if ( !dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		do_route();
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

    function show_waypoint( num_route, index ) {
    	require(["dojo/dom-style"], function( domStyle) {
    		var id = 'id_route' + (num_route+1) + '_tr' + index;
    		domStyle.set( id, "display", "" );
    	});
    }
    
    function set_labels_from_wp_to( num_route ) {

    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 1; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_route' + (num_route+1) + '_tr' + n;
        		var display = domStyle.get( id, "display" );
            	if ( display == "none" ) {
                	var id_label = 'id_route' + (num_route+1) + '_label' + (n-1);
                    document.getElementById(id_label).innerHTML = "To&nbsp;";
            		break;
            	}
            	else {
                	var id_label = 'id_route' + (num_route+1) + '_label' + n;
                    document.getElementById(id_label).innerHTML = "Through&nbsp;";
            	}
            }
 		});

    }
    
    function cb_map_rightclick( evt ) {
    	
    	console.log( "Right click: " + evt.latLng );

    	if ( !dijit.byId( "id_btn_route" ).get( "disabled" ) || dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		return;
    	
    	var latlng = {lat: evt.latLng.G, lng: evt.latLng.K};
    	geocoder.geocode( {'location': latlng}, function( results, status ) {
    	    if (status === google.maps.GeocoderStatus.OK) {

    	    	console.log( results[0].formatted_address );

    	        var num_route = 0;
    	        var first_hidden = find_first_hidden( num_route);
    	        console.log( "first_hidden=" + first_hidden );
    	        if ( first_hidden != (MAX_NB_WAYPOINTS + 2) ) {
    	        	show_waypoint( num_route, first_hidden );
    	    		var id = 'id_route' + (num_route+1) + '_wp' + first_hidden;
   	        		dijit.byId( id ).set( "value", results[0].formatted_address );
//    	            set_labels_from_wp_to( num_route );
//    	            update_btns_remove_up_down( );
    	        }
    	        
    	        do_route( );
    	    	
    	    }
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

    function change_waypoint( index_wp, place_name ) {
    	
    	var id_label_wp = "id_route1_wp" + index_wp;
		dijit.byId(id_label_wp).set( 'value', place_name );

		do_route( );
    }

    function reset_panorama( ) {
    	
    	
    }

	function cb_click_btn_remove( num_route, index ) {
		
		console.log( "Remove: num_route=" + num_route + " index=" + index );

        var first_hidden = find_first_hidden( num_route);
    	console.log( "first_hidden=" + first_hidden );

		for ( var n = 1; n < first_hidden - 1; n++ ) {
			var wp = dijit.byId('id_route'+(num_route+1)+'_wp'+(n+1)).get( 'value' );
			dijit.byId('id_route'+(num_route+1)+'_wp'+(n)).set( 'value', wp );
		}

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_route'+(num_route+1)+'_tr'+(first_hidden-1), "display", "None" );
    	});
		
		do_route( );
	}

	function cb_click_btn_up( num_route, index ) {
		
		console.log( "Up: num_route=" + num_route + " index=" + index );

		var wp_a = dijit.byId('id_route'+(num_route+1)+'_wp'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_route'+(num_route+1)+'_wp'+(index-1)).get( 'value' );

		dijit.byId('id_route'+(num_route+1)+'_wp'+(index)).set( 'value', wp_b );
		dijit.byId('id_route'+(num_route+1)+'_wp'+(index-1)).set( 'value', wp_a );
		
		do_route( );
	}

	function cb_click_btn_down( num_route, index ) {
		
		console.log( "Down: num_route=" + num_route + " index=" + index );

		var wp_a = dijit.byId('id_route'+(num_route+1)+'_wp'+(index)).get( 'value' );
		var wp_b = dijit.byId('id_route'+(num_route+1)+'_wp'+(index+1)).get( 'value' );

		dijit.byId('id_route'+(num_route+1)+'_wp'+(index)).set( 'value', wp_b );
		dijit.byId('id_route'+(num_route+1)+'_wp'+(index+1)).set( 'value', wp_a );
		
		do_route( );
	}
	
	function update_btns_remove_up_down( all ) {
		
		if ( all == false ) {
			var num_route = 0;
            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
		   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
		   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
		   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
			}
			return;
		}
		
    	var num_route = 0;
    	
        var first_hidden = find_first_hidden( num_route);
    	console.log( "first_hidden=" + first_hidden );

		var origin = dijit.byId('id_route'+(num_route+1)+'_wp0').get( 'value' );
   		dijit.byId('id_btn_remove_'+(num_route+1)+'_0').set( 'disabled', (first_hidden > 2) ? false : true );
   		dijit.byId('id_btn_down_'+(num_route+1)+'_0').set( 'disabled', (origin == '') ? true : false ); 
    	
		for ( var n = 1; n < first_hidden - 1; n++ ) {
			var waypoint = dijit.byId('id_route'+(num_route+1)+'_wp'+n).get( 'value' );
	   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
	   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
		}
		
   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', (first_hidden > 2) ? false : true );
		var destination = dijit.byId('id_route'+(num_route+1)+'_wp'+(first_hidden-1)).get( 'value' );
   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', (destination == '') ? true : false );
   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', true );
    	
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

		cb_click_btn_remove: function( num_route, index ) { cb_click_btn_remove( num_route, index ); },
		cb_click_btn_up:     function( num_route, index ) { cb_click_btn_up( num_route, index ); },
		cb_click_btn_down:   function( num_route, index ) { cb_click_btn_down( num_route, index ); },
		
    };
 
});
