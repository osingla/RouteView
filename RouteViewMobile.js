/* ********************************************************************************************* */
/* ***                                                                                       *** */ 
/* *** RouteView - Olivier Singla                                                            *** */
/* ***                                                                                       *** */ 
/* *** StreetView Player - Virtual Drive or Virtual Ride, using Google Maps and Street View  *** */
/* ***                                                                                       *** */ 
/* ********************************************************************************************* */

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
    var duration_secs;
    var step;               // metres
    var interval;           // milliseconds
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_display = undefined;
	var curr_layout;		// 1:split 2:unsplit
	var show_duration;		// 1:time 2:km 3:miles
    
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

	function cb_meters_changed( ) { 
        var new_step = dijit.byId('id_input_meters').get( 'value' );
    	require(["dojo/dom"], function( dom ) {
    		dom.byId("id_meters").innerHTML = new_step;
    	});
	}
	
	function cb_interval_changed( ) {
        var new_interval = dijit.byId('id_input_interval').get( 'value' );
    	require(["dojo/dom"], function( dom ) {
    		dom.byId("id_interval").innerHTML = new_interval;
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

	function click_duration_distance( ) {
		if ( ++show_duration == 4 )
			show_duration = 1;
        show_route_distance_duration( dist_route, duration_secs );
	}
	
    function cb_map_click( evt ) {
    	console.log( "cb_map_click" );
        document.getElementById("div_map_canvas").style.display = "None";
        document.getElementById("div_panorama").style.display = "";
        google.maps.event.trigger( panorama, 'resize' );
    }
    
    function cb_panorama_click( evt ) {
		if ( evt.handled != true ) {
			console.log( "cb_panorama_click" );
            document.getElementById("div_map_canvas").style.display = "";
            document.getElementById("div_panorama").style.display = "None";
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

        if ( switch_to_panorama ) {
        	document.getElementById("div_map_canvas").style.display = "None"; 
        	document.getElementById("div_panorama").style.display = "";
        	switch_to_panorama = false;
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

    	require(["dojo/dom"], function( dom ) {

    		if ( show_duration  == 1 ) {
        	    var nb_hours   = Math.floor( duration_secs / 3600 );
                var nb_minutes = Math.floor( (duration_secs - (nb_hours * 3600)) / 60 );
                var nb_seconds = Math.floor( duration_secs - (nb_hours * 3600) - (nb_minutes * 60) );
                if ( nb_hours == 0 ) {
                    if ( nb_minutes == 0 ) {
                	    dom.byId("td_controls_duration").innerHTML = nb_seconds + '"';
                    }
                    else {
                        if ( nb_seconds == 0 )
                    	    dom.byId("td_controls_duration").innerHTML = nb_minutes + "'";
                        else
                    	    dom.byId("td_controls_duration").innerHTML = nb_minutes + "'" + nb_seconds + '"';
                    }
                }
                else {
            	    dom.byId("td_controls_duration").innerHTML = nb_hours + "h" + nb_minutes + "'";
                }
    		}
    		else if ( show_duration  == 2 ) {
    			dom.byId("td_controls_duration").innerHTML = Math.round( dist_meters / 1000 ) + "km";
    		}
    		else if ( show_duration  == 3 ) {
    			dom.byId("td_controls_duration").innerHTML = Math.round( dist_meters * 0.000621371 ) + "m";
    		}

    	});

    }
    
    function do_start( ) {

       	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
       		ready( function() {
           		domStyle.set( "view_config", "display", "None" );
           		domStyle.set( "view_map", "display", "" );
           		domStyle.set( "div_controls", "display", "" );
        		set_size_objects( );
            });
    	});
    	
    	enter_full_screen( );
    	screen.orientation.lock('landscape').catch( function() {
    		console.log( "Orientation is not supported on this device." );
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
                    duration_secs = 0;
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

            		dijit.byId('id_input_route').set( 'max', dist_meters, false );
            		dijit.byId('id_input_route').set( 'value', 0, false );

                }

                polyline.setMap( map );
                map.fitBounds( bounds );
                start_driving( );  
                show_route_distance_duration( dist_route, duration_secs );

            }

        } // cb_make_route

		document.getElementById("div_map_canvas").style.display = "";

		switch_to_panorama = true;

		dijit.byId('id_btn_split').set( 'disabled', false );
		dijit.byId('id_btn_pause').set( 'disabled', false );
		dijit.byId('id_btn_stop').set( 'disabled',  false );
		
        curr_layout = 1;
		
    } // do_start
	
    function do_split( ) {

    	if ( curr_layout == 1 ) {

            document.getElementById("div_map_canvas").style.width = (w_body/2)+"px";
            document.getElementById("div_panorama").style.width  = (w_body/2)+"px";
            document.getElementById("div_panorama").style.left  = (w_body/2)+"px";
            document.getElementById("div_map_canvas").style.display = "";
            document.getElementById("div_panorama").style.display = "";

            curr_layout = 2;
        
    	}
    	else if ( curr_layout == 2 ) {

            document.getElementById("div_map_canvas").style.width = (w_body)+"px";
            document.getElementById("div_map_canvas").style.display = "";
            document.getElementById("div_panorama").style.display = "None";

            curr_layout = 1;

    	}

        google.maps.event.trigger( panorama, 'resize' );
        google.maps.event.trigger( map, 'resize' );
        
    }
    
    function do_pause( ) {

        if ( document.getElementById("id_label_pause").innerHTML == "Pause" ) {
            clearTimeout( timer_animate );
            timer_animate = undefined;
            document.getElementById("id_label_pause").innerHTML = "Continue";
            console.log( "curr_dist=" + curr_dist );
        }
        else if ( document.getElementById("id_label_pause").innerHTML == "Continue" ) {
            document.getElementById("id_label_pause").innerHTML = "Pause";
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(curr_dist)+',50); })', interval );
        }

    }

    function do_stop( ) {

    	exit_full_screen( );
    	
    	screen.orientation.unlock();

    	document.getElementById('id_body').style.MozTransform = "scale(1.0, 1.0)";
    	document.getElementById('id_body').style.zoom = "100%";
		document.getElementById('id_body').style.zoom = "1.0";
    	
    	clearTimeout( timer_animate );
        timer_animate = undefined;

        document.getElementById("id_label_pause").innerHTML = "Pause";
        
        document.getElementById("div_map_canvas").style.display = "None";
        document.getElementById("div_panorama").style.display = "None";
        google.maps.event.trigger( map, 'resize' );
        google.maps.event.trigger( panorama, 'resize' );

        require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
       		ready( function() {
           		domStyle.set( "view_config", "display", "" );
           		domStyle.set( "view_map", "display", "None" );
            });
    	});

//      map.setOptions({draggableCursor: 'hand'});
    }

    function set_size_objects( ) {

    	require(["dojo/dom", "dojo/dom-style", "dojo/dom-geometry", ], function( dom, domStyle, domGeom ) {

    		var node_body = dom.byId("id_body");
    		var output = domGeom.getContentBox(node_body);
    		w_body = output.w;
    		var h_body = output.h;
    		console.log( "w=" + w_body + " h=" + h_body );
    		
    		var node_controls = dom.byId("div_controls");
    		var computedStyle = domStyle.getComputedStyle(node_controls);
    		var output = domGeom.getMarginBox(node_controls, computedStyle);
    		var h_controls = output.h;

    		var margin = domGeom.getBorderExtents(node_controls, computedStyle);
    		console.log( margin );
    		
     		domStyle.set( "div_map_canvas", "width", w_body+"px" );
     		domStyle.set( "div_map_canvas", "height", (h_body-h_controls)+"px" );
//     		domGeom.setContentSize( dom.byId("div_map_canvas"), {w:w_body, h:h_body-h_controls} );
     		
     		domStyle.set( "div_panorama", "width", w_body+"px" );
     		domStyle.set( "div_panorama", "height", (h_body-h_controls)+"px" );
//     		domGeom.setContentSize( dom.byId("div_panorama"), {w:w_body, h:h_body-h_controls} );

       		domStyle.set( "div_controls", "top", (h_body-h_controls)+"px" );
       		domGeom.setContentSize( dom.byId("div_controls"), {w:w_body-10}, computedStyle );

			if ( map != undefined )
				google.maps.event.trigger( map, 'resize' );
			if ( panorama != undefined )
				google.maps.event.trigger( panorama, 'resize' );
    	});
		
    }
    
	function move_to_dist( new_pos ) {

		if ( timer_animate != undefined ) { 
            clearTimeout( timer_animate );
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(' + (new_pos) + '); })', interval );
		}
		
        var p = polyline.GetPointAtDistance( new_pos );
        if ( !map.getBounds().contains( p ) )
            map.panTo( p );

        var bearing = polyline.Bearing( polyline.GetIndexAtDistance( new_pos ) );
        panorama.setPosition( new google.maps.LatLng( p.G, p.K ) );
        panorama.setPov({
            heading: bearing,
            pitch: 10
        });

		cb_move_to_dist = undefined;

		curr_dist = new_pos;
	}

    function cb_route_input( ) {
		
        var new_pos = dijit.byId('id_input_route').get( 'value' );
		if ( cb_move_to_dist != undefined )
			clearTimeout( cb_move_to_dist );
		cb_move_to_dist = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.move_to_dist('+new_pos+'); })', 25 );
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

                var previous_orientation = window.orientation;
        		window.addEventListener("orientationchange", function() {
        			console.log( window.orientation );
       	            if (window.orientation !== previous_orientation ) {
       	            	previous_orientation = window.orientation;
       	                console.log( "Orientation changed" );
       	            	if ( (window.orientation == -90) || (window.orientation == 90) || (window.orientation == 270) ) {
       	            		console.log( "Window orientation=" + window.orientation );
       	            		if ( curr_layout == 2 )
       	            			do_split( );
       	            	}
       	            	else if ( (window.orientation == 0) || (window.orientation == 180) ) {
       	            		console.log( "Window orientation=" + window.orientation );
       	            	}
       	                google.maps.event.trigger( panorama, 'resize' );
       	            }
        		}, false);
        		
        		show_duration = true;
        		
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

        cb_meters_changed:   function( ) { cb_meters_changed( ); },
        cb_interval_changed: function( ) { cb_interval_changed( ); },
        
        do_start:  function( ) { do_start(); },
        do_split:  function( ) { do_split(); },
		do_pause:  function( ) { do_pause(); },
		do_stop:   function( ) { do_stop(); },

		cb_animate: function( d ) { cb_animate( d ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input: function( ) { cb_route_input( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_route_from_or_to_changed: function( ) { cb_route_from_or_to_changed(); },

		click_duration_distance:   function( ) { click_duration_distance(); },
		
    };
 
});
