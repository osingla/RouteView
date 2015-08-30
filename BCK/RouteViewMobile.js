/* ******************************************************************************************** */
/* ***                                                                                      *** */ 
/* *** RouteView - Olivier Singla                                                           *** */
/* ***                                                                                      *** */ 
/* *** StreeView Player - Virtual Drive or Virtual Ride, using Google Maps and Street View  *** */
/* ***                                                                                      *** */ 
/* ******************************************************************************************** */

define( function( m ) {

	var startup_done;
    var map;
    var panorama;
    var map_is_shown;
    var polyline = undefined;
    var location_from;
    var location_to;
    var timer_animate;
    var dist_route;
    var step;               // metres
    var interval;           // milliseconds
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_display = undefined;
	var curr_layout;
    
    function enter_full_screen( ) {

    	var d = document.getElementById("id_body");
    	if (d.requestFullscreen) {
    		d.requestFullscreen();
    	} else if (d.webkitRequestFullscreen) {
    		d.webkitRequestFullscreen();
    	} else if (d.mozRequestFullScreen) {
    		d.mozRequestFullScreen();
    	} else if (d.msRequestFullscreen) {
    		d.msRequestFullscreen();
    	}
    	
    }

    function exit_full_screen( ) {

    	if (document.exitFullscreen) {
    		document.exitFullscreen();
    	} else if (document.webkitExitFullscreen) {
    		document.webkitExitFullscreen();
    	} else if (document.mozCancelFullScreen) {
    		document.mozCancelFullScreen();
    	} else if (document.msExitFullscreen) {
    		document.msExitFullscreen();
    	}

    }
    
	function show_dialog( dlg ) {
        require(["dijit/registry"], function( registry ) {
        	registry.byId(dlg).show();
        });
	}
	
	function hide_dialog( dlg ) {
        require(["dijit/registry"], function( registry ) {
        	registry.byId(dlg).hide();
        });
	}
	
	function cb_route_from_or_to_changed( evt ) {
		
		console.log( "cb_route_from_or_to_changed" );

        start_location = dijit.byId('id_route1_from').get( 'value' );
        end_location   = dijit.byId('id_route1_to').get( 'value' );
        console.log( "from = " + start_location );
        console.log( "to   = " + end_location );

        var start_disabled = (start_location == "") || (end_location == "");
		dijit.byId('btn_start').set( 'disabled', start_disabled );
		
	}

    function cb_map_click( evt ) {
    	console.log( "cb_map_click" );
        document.getElementById("td_map_canvas").style.display = "None";
        document.getElementById("td_panorama").style.display = "";
        google.maps.event.trigger( panorama, 'resize' );
    }
    
    function cb_panorama_click( evt ) {
		if ( evt.handled != true ) {
			console.log( "cb_panorama_click" );
            document.getElementById("td_map_canvas").style.display = "";
            document.getElementById("td_panorama").style.display = "None";
            google.maps.event.trigger( map, 'resize' );
		}
    }
    
    function startup( ) {

    	var home = new google.maps.LatLng( 35.733435, -78.907684 );

        var panorama_options = {
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
            imageDateControl: false
        };
        panorama = new google.maps.StreetViewPanorama( document.getElementById('div_panorama'), panorama_options );

        var map_options = {
           center: home,
           zoom: 14,
           overviewMapControl: false,
           streetView: panorama
        };
        map = new google.maps.Map( document.getElementById('div_map_canvas'), map_options );

        map.setStreetView( panorama );

		google.maps.event.addListener( map, "click", function( evt ) { 
			cb_map_click( evt ); 
		});
		document.getElementById('div_panorama').onclick = cb_panorama_click;
		
        map_is_shown = false;

    } // startup
    
    function cb_animate( d ) {

        curr_dist = d;

        if ( d > dist_route ) {
            console.log( "Route is done" );
            return;
        }
        
        var p = polyline.GetPointAtDistance( d );
        if ( !map.getBounds().contains( p ) )
           	map.panTo( p );

        var bearing = polyline.Bearing( polyline.GetIndexAtDistance(d) );
        console.log( "d=" + d + " - " + polyline.GetIndexAtDistance(d) + " / " + bearing);
        panorama.setPosition( new google.maps.LatLng( p.G, p.K ) );
        panorama.setPov({
            heading: bearing,
            pitch: 1
        });

        if ( step > 0 )
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(d+step)+',50); })', interval );

        dijit.byId('id_input_route').set( 'value', d );

        if ( abc ) {
        	document.getElementById("td_map_canvas").style.display = "None"; 
        	document.getElementById("td_panorama").style.display = "";
        	abc = false;
        }
        
    }

    function start_driving( ) {
        
        if ( timer_animate ) 
            clearTimeout( timer_animate );
            
        dist_route = polyline.Distance();
        map.setCenter( polyline.getPath().getAt(0) );
        var p = polyline.GetPointAtDistance( 50 );
        if ( !map.getBounds().contains( p ) )
           	map.panTo( p );

        timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(50); })', 250 );
    }

    function show_route_distance_duration( dist_meters, duration_secs ) {

        console.log( "dist_meters=" + dist_meters + " duration_secs=" + duration_secs );

/*
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
*/
        // Update route slider
		dijit.byId('id_input_route').set( 'max', dist_meters );
		dijit.byId('id_input_route').set( 'value', 0 );
        
    }
    
    function do_start( ) {

    	enter_full_screen( );
//    	screen.orientation.lock('landscape');
    	require(["dojo/ready"], function( ready ) {
//            ready( function() {
        		set_size_objects( );
//            });
    	});

/*
    	require(["dojo/on"], function( on ) {
    		on( window, "fullscreenchange", function( evt ) {
    			alert( "Full Screen!!!" );
    			console.log( evt );
    			set_size_objects( );
    		});
		});
*/
    	var w = dijit.byId('view_config');
    	w.performTransition('view_map', 1, "slide", null);

    	if ( !startup_done ) {
    		startup_done = true;
    		startup( );
    	}
    	
    	if ( directions_display != undefined ) {
    		console.log( "Delete current route" )
    		directions_display.setMap( null );
        	directions_display = undefined;
        	if ( polyline != undefined ) {
        		polyline.setMap( null );
        		polyline = undefined;
        	}
    	}

    	map_is_shown = false;
    	
        step      = parseInt( dijit.byId('id_input_meters').get( 'value' ) );
        interval  = parseInt(dijit.byId('id_input_interval').get( 'value' ) );
        console.log( "step=" + step + " interval=" + interval );

        start_location = dijit.byId('id_route1_from').get( 'value' );
        end_location   = dijit.byId('id_route1_to').get( 'value' );
        console.log( "from = " + start_location );
        console.log( "to   = " + end_location );

        var no_hwy  = dijit.byId('id_check_no_hwy').get( 'checked' );
        var no_toll = dijit.byId('id_check_no_toll').get( 'checked' );

        var rendererOptions = {
            map: map,
            suppressMarkers : true,
            preserveViewport: true
        }
        var directions_service = new google.maps.DirectionsService( );

        var travelMode = google.maps.DirectionsTravelMode.DRIVING;  
        
        var request = {
            origin: start_location,
            destination: end_location,
            travelMode: travelMode,
            optimizeWaypoints: true,
            avoidHighways: no_hwy,
            avoidTolls: no_toll
        };  

        directions_service.route( request, cb_make_route( ) );
        
        function cb_make_route( ) {

            return function( response, status ) {

                if ( status == google.maps.DirectionsStatus.OK ) {

                    var bounds = new google.maps.LatLngBounds();
                    var route = response.routes[0];
                    location_from = new Object();
                    location_to = new Object();


                    polyline = new google.maps.Polyline({
                        path: [],
                        strokeColor: '#FFFF00',
                        strokeWeight: 3
                    });

                    // For each route, display summary information.
                    var path = response.routes[0].overview_path;
                    var legs = response.routes[0].legs;

                    directions_display = new google.maps.DirectionsRenderer( rendererOptions );     
                    directions_display.setMap( map );
                    directions_display.setDirections( response );

                    // Markers
                    var dist_meters = 0;
                    var duration_secs = 0;
                    for ( i = 0; i < legs.length; i++) {
                        dist_meters += legs[i].distance.value;
                        duration_secs += legs[i].duration.value;
                        console.log( i + ": m=" + legs[i].distance.value + " secs=" + legs[i].duration.value );
                        if ( i == 0 ) {
                            location_from.latlng  = legs[i].start_location;
                            location_from.address = legs[i].start_address;
                        }
                        location_to.latlng  = legs[i].end_location;
                        location_to.address = legs[i].end_address;
                        var steps = legs[i].steps;

                        for ( j = 0; j < steps.length; j++) {
                            var nextSegment = steps[j].path;                
                            var nextSegment = steps[j].path;

                            for ( k=0;k < nextSegment.length;k++) {
                                polyline.getPath().push(nextSegment[k]);
                                bounds.extend(nextSegment[k]);
                            }
                        }
                    }
                    
                    show_route_distance_duration( dist_meters, duration_secs );

                }

                polyline.setMap( map );
                map.fitBounds( bounds );
                start_driving( );  

            }

        } // cb_make_route

		document.getElementById("td_map_canvas").style.display = "";

		abc = true;
//		document.getElementById("td_map_canvas").style.display = "None"; 
//		document.getElementById("td_panorama").style.display = ""

		dijit.byId('id_btn_layout').set( 'disabled', false );
		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled', false );
        
        curr_layout = 1;
		
    } // do_start
	
    function do_layout( ) {

    	console.log( curr_layout );
    	console.log( w_body );
    	if ( curr_layout == 1 ) {

            document.getElementById("td_map_canvas").style.display = "";
            document.getElementById("td_panorama").style.display = "";
            document.getElementById("div_map_canvas").style.width = (w_body/2)+"px";
            document.getElementById("td_panorama").style.width  = (w_body/2)+"px";

            curr_layout = 2;
        
    	}
    	else if ( curr_layout == 2 ) {

            document.getElementById("td_map_canvas").style.display = "";
            document.getElementById("td_panorama").style.display = "None";
            document.getElementById("div_map_canvas").style.width = (w_body)+"px";
            document.getElementById("td_panorama").style.width  = (w_body)+"px";

            curr_layout = 1;

    	}

        google.maps.event.trigger( panorama, 'resize' );
        google.maps.event.trigger( map, 'resize' );
        
    }
    
    function set_size_objects( ) {

    	require(["dojo/dom", "dojo/dom-style", "dojo/dom-geometry", ], function( dom, domStyle, domGeom ) {

    		var node = dom.byId("id_body");
    		var computedStyle = domStyle.getComputedStyle(node);
    		var output = domGeom.getContentBox(node, computedStyle);
    		w_body = output.w;
    		var h = output.h;
    		console.log( "w=" + w_body + " h=" + h );
    		
    		var node = dom.byId("tr_controls");
    		var computedStyle = domStyle.getComputedStyle(node);
    		var output = domGeom.getContentBox(node, computedStyle);
    		var h_controls = output.h;
    		
       		domStyle.set( "div_map_canvas", "width", w_body+"px" );
       		domStyle.set( "div_map_canvas", "height", (h-h_controls)+"px" );

       		domStyle.set( "div_panorama", "width", w_body+"px" );
       		domStyle.set( "div_panorama", "height", (h-h_controls)+"px" );
    		
    	});
		
    }
    
    function initialize() {
        
    	startup_done = false;

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/ready"], function( dom, on, style, domGeom, ready ) {
    		
            ready( function() {

            	var input_from = dom.byId('id_route1_from');
            	var autocomplete_from = new google.maps.places.Autocomplete(input_from);
        		on( input_from, "change", function( evt ) {
        			cb_route_from_or_to_changed( evt );
       			});

            	var input_to = dom.byId('id_route1_to');
    	        var autocomplete_to = new google.maps.places.Autocomplete(input_to);
        		on( input_to, "change", function( evt ) {
        			cb_route_from_or_to_changed( evt );
       			});

        		on( window, "resize", function( evt ) {
        			console.log( "Resized!!!" );
        			console.log( evt );
        			set_size_objects( );
       			});

        		on( window, "orientationchange", function( evt ) {
        			console.log( window.orientation );
        	        var previous_orientation = window.orientation;
        	        var check_orientation = function() {
        	        	alert( "Checking orientation" );
//        	        	alert( window.orientation );
        	            if (window.orientation !== previous_orientation ) {
        	            	previous_orientation = window.orientation;
        	                console.log( "Orientation changed" );
        	            	if ( (window.orientation == -90) || (window.orientation == 90) ) {
        	            		console.log( "Window orientation=" + window.orientation );
        	            	}
        	            	else if ( window.orientation == 0 ) {
        	            		console.log( "Window orientation=" + window.orientation );
        	            	}
        	                google.maps.event.trigger( panorama, 'resize' );
        	            }
        	        };
       			});

            });

        });
        
    } // initialize
    
    
	// ---------
	// Externals
	// ---------

    return {

        initialize: function( ) { initialize( ); },

        show_dialog: function( dlg ) { show_dialog( dlg ); },
        hide_dialog: function( dlg ) { hide_dialog( dlg ); },

        do_start:  function( ) { do_start(); },
        do_layout: function( ) { do_layout(); },
		do_pause:  function( ) { do_pause(); },
		do_stop:   function( ) { do_stop(); },

		cb_animate: function( d ) { cb_animate( d ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input: function( ) { cb_route_input( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_click_force_panto:  function( ) { cb_click_force_panto(); },

		cb_route_from_or_to_changed: function( ) { cb_route_from_or_to_changed(); },
		
    };
 
});
