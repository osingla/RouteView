/* ********************************************************************************************* */
/* ***                                                                                       *** */ 
/* *** RouteView - Olivier Singla                                                            *** */
/* ***                                                                                       *** */ 
/* *** StreetView Player - Virtual Drive or Virtual Ride, using Google Maps and Street View  *** */
/* ***                                                                                       *** */ 
/* ********************************************************************************************* */

define( function( m ) {

	var MAX_NB_WAYPOINTS = 8;

	var autocompletes = [];
    var map;
    var geocoder;
    var service;
    var panorama;
	var map_or_panorama_full_screen;
    var panorama_full_screen;
    var polyline;
    var timer_animate;
    var eol;
    var step;               			// meters
    var interval;           			// milliseconds
	var is_force_panto = true;
    var curr_dist;
	var cb_move_to_dist = undefined;
	var directions_service;
	var directions_display;
	var route;
	var cb_route_from_or_to_changed_handle = undefined;
	var got_location;
   	var streetViewLayer = undefined;

    function show_route_distance_duration( dist_meters, duration_secs ) {

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
    
    function cb_animate( d ) {
        
        curr_dist = d;
        if ( d > eol ) {
            console.log( "Route is done" );
            return;
        }
        
        var p = polyline.GetPointAtDistance(d);
        if ( !map.getBounds().contains( p ) )
			if ( is_force_panto )
            	map.panTo( p );

        var iad = polyline.GetIndexAtDistance(d);
        console.log("iad = " + iad);
        
        var bearing = polyline.Bearing(iad);
        console.log("bearing = " + bearing);
        
        panorama.setPosition(p);
        panorama.setPov({
            heading: bearing,
            pitch: 1
        });

        if ( step > 0 )
            timer_animate = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate('+(d+step)+',50); })', interval );

        // Update route slider
		dijit.byId('id_input_route').set( 'value', d, false );
    }

    function start_driving( ) {
        
        if ( timer_animate ) 
            clearTimeout( timer_animate );
            
        eol = polyline.Distance();
        map.setCenter( polyline.getPath().getAt(0) );

        timer_animate = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate(50); })', 250 );
    }

    function find_first_hidden( ) {

        var first_hidden = MAX_NB_WAYPOINTS + 2;
    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_route1_tr' + n;
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
    
    function do_street_view( ) {
		is_street_view = dijit.byId('id_btn_street_view').get( 'checked' );
    	console.log("Street View! " + is_street_view);
    	if (is_street_view) {
    		if (streetViewLayer == undefined)
    			streetViewLayer = new google.maps.StreetViewCoverageLayer();
			streetViewLayer.setMap(map);
		}
		else {
			streetViewLayer.setMap(null);
		}
    }
    
    function do_route( ) {

    	if ( directions_display != undefined ) {
    		console.log( "Delete current route" )
    		var num_route = 0;
    		directions_display.setMap( null );
        	directions_display = undefined;
        	if ( polyline != undefined ) {
        		polyline.setMap( null );
        		polyline = undefined;
        	}
    	}

        var no_hwy  = dijit.byId('id_check_no_hwy').get( 'checked' );
        var no_toll = dijit.byId('id_check_no_toll').get( 'checked' );
        console.log( "no_hwy=" + no_hwy + " no_toll=" + no_toll );
        
    	step     = dijit.byId('id_input_meters').get( 'value' );
    	interval = dijit.byId('id_input_interval').get( 'value' );
        console.log( "step=" + step + " interval=" + interval );

        var num_route = 0;
        var first_hidden = find_first_hidden();
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

        for ( var num_route = 0; num_route < start_location.length; num_route++ ) {

            directions_service = new google.maps.DirectionsService( );
            
            directions_display = new google.maps.DirectionsRenderer({
                draggable: true,
                map: map,
                hideRouteList: false,
                preserveViewport: true,
                suppressMarkers: false,
                ['index']: 123456
            });

           	var old_nb_waypoints = way_points.length + 2;
            directions_display.addListener('directions_changed', function() {
            	var num_route = 0;
            	var new_dir = directions_display.getDirections();
            	console.log("XXXXX");
                console.log( new_dir );
                var index_waypoint = (new_dir.request.Xc != undefined) ? new_dir.request.Xc : new_dir.request.Yc;
                console.log( index_waypoint );
                if ( index_waypoint != undefined ) {

					console.log("ZZZZ");                	
                	console.log( directions_display );
                	var new_nb_waypoints = new_dir.geocoded_waypoints.length;
                	console.log( old_nb_waypoints );
                	console.log( new_nb_waypoints );
                	console.log( index_waypoint );
                    var place_id = new_dir.geocoded_waypoints[index_waypoint].place_id;

                	service.getDetails({
                	    placeId: place_id
                	  }, function ( place, status ) {
                	    if ( status === google.maps.places.PlacesServiceStatus.OK ) {
                	    	console.log("YYYYY");
		                	console.log( old_nb_waypoints );
                			console.log( new_nb_waypoints );
		                	console.log( index_waypoint );
                	    	console.log( place.formatted_address );
                	    	if (new_nb_waypoints == old_nb_waypoints) {
                	    		change_waypoint( index_waypoint, place.formatted_address );
                	    	}
                	    	else {
                	    		cb_click_btn_add(0, new_nb_waypoints)
                	    		for (var n = old_nb_waypoints - 1; n >= index_waypoint; n--) {
						            var w = dijit.byId('id_route1_wp'+n).get( 'value' );
						            dijit.byId('id_route1_wp'+(n+1)).set( 'value', w );
                	    		}
                	    		change_waypoint( index_waypoint, place.formatted_address );
                	    	}
                	    }
                	  });
                	
//                 	show_error( "Sorry, this feature is not yet implemented!" );
                }

            });

            var request = {
                origin: start_location[num_route],
                destination: end_location[num_route],
                travelMode: google.maps.DirectionsTravelMode.DRIVING,
                waypoints: way_points,
                optimizeWaypoints: false,
                avoidHighways: no_hwy,
                avoidTolls: no_toll
            };  

            directions_service.route( request, cb_make_route( ) );
            
			dijit.byId('id_btn_street_view').set( 'disabled', false );

        }
        
        function cb_make_route( num_route ) {

            return function( response, status ) {

                if ( status == google.maps.DirectionsStatus.OK ) {

                	directions_display.setMap( map );
                	directions_display.setDirections( response );

                    var bounds = new google.maps.LatLngBounds();
                    route = response.routes[0];
                    var location_from = new Object();
                    var location_to = new Object();

                    polyline = new google.maps.Polyline({
                        path: [],
                        strokeColor: '#FFFF00',
                        strokeWeight: 3
                    });

                    // For each route, display summary information.
                    var path = route.overview_path;
                    var legs = route.legs;

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

                    polyline.setMap( map );
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
//      set_labels_from_wp_to( );
    
        map.setOptions({draggableCursor: 'crosshair'});

		dijit.byId('id_btn_save_gpx').set( 'disabled', false );
        
    } // do_route
    
    function do_play( ) {

		var left_layout = dijit.byId('id_left_layout');
		if ( left_layout._showing ) {
			left_layout.toggle();
            setTimeout( 'require(["RouteView.js"], function( s ) { s.do_play(); })', 400 );
            return;
		}

        google.maps.event.trigger( map, 'resize' );
        google.maps.event.trigger( panorama, 'resize' );

        start_driving( );  

		dijit.byId('id_btn_street_view').set( 'checked', false );
		do_street_view();
		dijit.byId('id_btn_street_view').set( 'disabled', true );
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
       	directions_display.setOptions( renderer_options );
    		
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

    	console.log( "PAUSE!" );
        console.log( dijit.byId('id_btn_pause').get( 'label' ) );
        if ( dijit.byId('id_btn_pause').get( 'label' ) == "Pause" ) {
            clearTimeout( timer_animate );
        	dijit.byId('id_btn_pause').set( 'label', "Continue" );
            console.log( "curr_dist=" + curr_dist );
        }
        else if ( dijit.byId('id_btn_pause').get( 'label' ) == "Continue" ) {
        	dijit.byId('id_btn_pause').set( 'label', "Pause" );
            timer_animate = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate('+(curr_dist)+'); })', 250 );
        }

		dijit.byId('id_input_route').set( 'disabled', false );
		dijit.byId('id_input_route').set( 'intermediateChanges', true );

        var renderer_options = { draggable: false };
       	directions_display.setOptions( renderer_options );
    
        map.setOptions({draggableCursor: 'hand'});
        
    }

    function do_stop( ) {

		var left_layout = dijit.byId('id_left_layout');
		if ( !left_layout._showing ) {
			left_layout.toggle();
            setTimeout( 'require(["RouteView.js"], function( s ) { s.do_stop(); })', 400 );
            return;
		}
    	
        google.maps.event.trigger( map, 'resize' );
        google.maps.event.trigger( panorama, 'resize' );

        clearTimeout( timer_animate );

		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) 
			dijit.byId('id_route1_wp'+n).set( 'disabled', false );

		dijit.byId('id_check_no_hwy').set( 'disabled', false );
		dijit.byId('id_check_no_toll').set( 'disabled', false );

		dijit.byId('id_btn_street_view').set( 'disabled', false );
		dijit.byId('id_btn_route').set( 'disabled', false );
		dijit.byId('id_btn_play').set( 'disabled', true );
		dijit.byId('id_btn_pause').set( 'disabled', true );
    	dijit.byId('id_btn_pause').set( 'label', "Pause" );
		dijit.byId('id_btn_stop').set( 'disabled', true );
		
		dijit.byId('id_input_route').set( 'disabled', true );
		dijit.byId('id_input_route').set( 'intermediateChanges', false );
		
        var renderer_options = { draggable: false };
       	directions_display.setOptions( renderer_options );

    	update_btns_remove_up_down( false );
    	map.setOptions({draggableCursor: 'hand'});
        
    }

    function initialize( ) {

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/store/Memory", "dojo/ready"], function( dom, on, domStyle, domGeom, Memory, ready ) {
    		
            ready( function() {
            	
            	var map_options = {
                   zoom: 14
                };
                map = new google.maps.Map( document.getElementById('id_map_canvas'), map_options );

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

                geocoder = new google.maps.Geocoder;
                
                service = new google.maps.places.PlacesService( map );

                panorama = new google.maps.StreetViewPanorama( document.getElementById('id_panorama'), panorama_options );
                map.setStreetView( panorama );

            	map_or_panorama_full_screen = false;

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
//        		            		console.log( entry.id );
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
        		        		
        		on( dijit.byId('id_use_curr_position_for_org'), "change", function( checked ) {
        		    if ( checked )
               			dijit.byId('id_use_curr_position_for_dest').set( 'checked', false );
        	    });
        	    
        		on( dijit.byId('id_use_curr_position_for_dest'), "change", function( checked ) {
        		    if ( checked )
               			dijit.byId('id_use_curr_position_for_org').set( 'checked', false );
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
                    	aspect.after(registry.byId("id_left_layout"), "resize", function() {
                    		console.log( "XXXXXXXXXXXXXXX" );
                            google.maps.event.trigger( map, 'resize' );
                            google.maps.event.trigger( panorama, 'resize' );
                        });
                    });
                });
                
        /*
                require(["dojo/dnd/Moveable", "dojo/dom", "dojo/on", "dojo/domReady!"], function(Moveable, dom, on){
                	var dnd = new Moveable( dom.byId("id_route1_mark1") );
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

                myDialog = dijit.byId('myDialog');
                
        		for ( var n = 0; n < MAX_NB_WAYPOINTS+2; n++ ) { 
            		on( dom.byId('id_route1_wp'+n), "change", function( evt ) {
                		console.log( "Change" );
                		if ( cb_route_from_or_to_changed_handle != undefined )
                			clearTimeout( cb_route_from_or_to_changed_handle );
                		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
           			});
        		}

           		for ( var num_route = 0; num_route < 1; num_route++ ) {
           			autocompletes[num_route] = [];
           			for ( var n = 0; n < MAX_NB_WAYPOINTS+2 - 1; n++ ) { 
           				autocompletes[num_route][n] = new google.maps.places.Autocomplete( dom.byId('id_route'+(num_route+1)+'_wp'+n) );
           				autocompletes[num_route][n].addListener('place_changed', function() {
                    		console.log( "Place changed" );
                    		if ( cb_route_from_or_to_changed_handle != undefined )
                    			clearTimeout( cb_route_from_or_to_changed_handle );
                    		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
                    	});
           			}
           		}

   				load_settings( );

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
   				
   				if ( navigator.geolocation )
   					if ( dijit.byId('id_use_curr_position_for_org').get( 'checked' ) || dijit.byId('id_use_curr_position_for_dest').get( 'checked' ) )
       					navigator.geolocation.getCurrentPosition( got_current_position );
        	    
            });
            
    	});
            	
    } // initialize
    
    function got_current_position( pos ) {
    	var latlng = {lat: pos.coords.latitude, lng: pos.coords.longitude};
    	console.log( "Got current position" );
    	got_location = true;
		map.setCenter( latlng );
        panorama.setPosition( latlng );
    	var geocoder = new google.maps.Geocoder;
    	geocoder.geocode({'location': latlng}, function(results, status) {
    	    if ( status === google.maps.GeocoderStatus.OK ) {
    	    	if ( results[0] ) {
    	    		var addr = results[0].formatted_address;
        	    	console.log( "current location: " + addr );
   					if ( dijit.byId('id_use_curr_position_for_org').get( 'checked' ) ) {
   	   					if ( dijit.byId('id_route1_wp0').get( 'value' ) == "" )
   	   	   					dijit.byId('id_route1_wp0').set( 'value', addr );
   					}
   					else if ( dijit.byId('id_use_curr_position_for_dest').get( 'checked' ) ) {
   	   					if ( dijit.byId('id_route1_wp1').get( 'value' ) == "" )
   	   	   					dijit.byId('id_route1_wp1').set( 'value', addr );
   					}
    	    	}
    	    }
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

  	           	for ( var num_route = 0; num_route < 1; num_route++ ) {
  	           		for ( var n = 0; n < MAX_NB_WAYPOINTS+2 - 1; n++ ) {
  	            	    if ( restrict_type )
  	            	       	autocompletes[num_route][n].setTypes([ restrict_value ]);
  	            	    else
  	            	       	autocompletes[num_route][n].setTypes([]);

  	            	    if ( restrict_country && ((country != '') && (country != undefined)) )
            	  	    	autocompletes[num_route][n].setComponentRestrictions({country: code_country.code});
  	            	    else
  	            	    	autocompletes[num_route][n].setComponentRestrictions();
  	           		}
  	           	}
  	  	  	       	
            });
            	
       	});
    }
    
	function move_to_dist( new_pos, go_timer ) {

		if ( go_timer) {
			if ( timer_animate != undefined ) 
				clearTimeout( timer_animate );
			timer_animate = setTimeout( 'require(["RouteView.js"], function( s ) { s.cb_animate(' + (new_pos) + '); })', interval );
		}
		
        var p = polyline.GetPointAtDistance( new_pos );
        if ( !map.getBounds().contains( p ) )
            map.panTo( p );

        var bearing = polyline.Bearing( polyline.GetIndexAtDistance( new_pos ) );
        panorama.setPosition(p);
        panorama.setPov({
            heading: bearing,
            pitch: 1
        });

		cb_move_to_dist = undefined;

		curr_dist = new_pos;
	}

    function cb_route_input( ) {
		var new_pos = dijit.byId('id_input_route').get( 'value' );
		new_pos = Math.round( new_pos );
		if ( cb_move_to_dist != undefined )
			clearTimeout( cb_move_to_dist );
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
    	
    	// xmllint --noout --schema http://www.topografix.com/GPX/1/0/gpx.xsd testfile.gpx
    	
    	console.log( "XXXXXXXXXXXXXXXXXXXXXXXX" );
    	console.log( route.summary );
    	console.log( route );

    	var crlf = String.fromCharCode(13) + String.fromCharCode(10);
    	
        var gpx = '';
        
        gpx += '<?xml version="1.0" encoding="UTF-8"?>' + crlf +
        	'<gpx version="1.0" creator="" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/0" xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd">' + crlf + 
        	'<time>2015-06-12T21:36:34Z</time>' +crlf;

    	var op = route.overview_path;
        for ( n = 0; n < op.length; n++ ) {
        	gpx += '<wpt lat="'+op[n].G+'" lon="'+op[n].K+'">' + ' </wpt>' + crlf;
        }
        
        gpx += '<rte>' + crlf;
        gpx += '<name>' + route.summary + '</name>' + crlf;
//        for ( n = 0; n < op.length; n++ ) {
//        	gpx += '<rtept lat="'+op[n].G+'" lon="'+op[n].K+'">' + ' </rtept>' + crlf;
//        }
    	var legs = route.legs;
        for ( n = 0; n < legs.length; n++)
        	gpx += '<rtept lat="'+legs[n].start_location.G+'" lon="'+legs[n].start_location.K+'">' + ' </rtept>' + crlf;
    	gpx += '<rtept lat="'+legs[legs.length-1].end_location.G+'" lon="'+legs[legs.length-1].end_location.K+'">' + ' </rtept>' + crlf;
        gpx += '</rte>' + crlf;
        gpx += '</gpx>' + crlf;
        	
    	download_file( gpx, "test.gpx", "application/gpx+xml" );

    }
    
    function cb_route_from_or_to_changed( ) {
    	
		var origin = dijit.byId('id_route1_wp0').get( 'value' );
		var waypoint1 = dijit.byId('id_route1_wp1').get( 'value' );
		var destination = dijit.byId('id_route1_wp2').get( 'value' );
		console.log( "origin= [" + origin + "]" );
		console.log( "destination= [" + destination + "]" );
		console.log( "waypoint1= [" + waypoint1 + "]" );

		var nok_route = ((origin == "") || ((waypoint1 == "") && (destination == ""))) ? true : false;
//		dijit.byId('id_btn_street_view').set( 'disabled', nok_route );
		dijit.byId('id_btn_route').set( 'disabled', nok_route );
//		dijit.byId('id_btn_play').set( 'disabled', true );
        
    	update_btns_remove_up_down( );
    	
    	if ( !dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		do_route();
    }
    
    function cb_map_click( ) {
    	
    	console.log( "cb_map_click" );
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
    
    function show_waypoint( index ) {
    	require(["dojo/dom-style"], function( domStyle) {
    		var id = 'id_route_tr' + index;
    		domStyle.set( id, "display", "" );
    	});
    }
    
    function set_labels_from_wp_to( ) {

    	require(["dojo/dom-style"], function( domStyle) {
            for ( var n = 1; n < MAX_NB_WAYPOINTS+2; n++ ) {
            	var id = 'id_route_tr' + n;
        		var display = domStyle.get( id, "display" );
            	if ( display == "none" ) {
                	var id_label = 'id_route_label' + (n-1);
                    document.getElementById(id_label).innerHTML = "To&nbsp;";
            		break;
            	}
            	else {
                	var id_label = 'id_route_label' + n;
                    document.getElementById(id_label).innerHTML = "Through&nbsp;";
            	}
            }
 		});

    }
    
    function cb_map_rightclick( evt ) {
    	
    	console.log( "Right click: " + evt.latLng );

    	if ( !dijit.byId( "id_btn_route" ).get( "disabled" ) || dijit.byId( "id_btn_play" ).get( "disabled" ) )
    		return;
    	
    	var latlng = {lat: evt.latLng.lat, lng: evt.latLng.lng};
    	geocoder.geocode( {'location': latlng}, function( results, status ) {
    	    if (status === google.maps.GeocoderStatus.OK) {

    	    	console.log( results[0].formatted_address );

    	        var num_route = 0;
    	        var first_hidden = find_first_hidden();
    	        console.log( "first_hidden=" + first_hidden );
    	        if ( first_hidden != (MAX_NB_WAYPOINTS + 2) ) {
    	        	show_waypoint( first_hidden );
    	    		var id = 'id_route' + (num_route+1) + '_wp' + first_hidden;
   	        		dijit.byId( id ).set( "value", results[0].formatted_address );
//    	            set_labels_from_wp_to( num_route );
//    	            update_btns_remove_up_down( );
    	        }
    	        
    	        do_route( );
    	    	
    	    }
    	});
    	
    }
    
    function change_waypoint( index_wp, place_name ) {
    
    	console.log( index_wp + " -> " + place_name );
    	var id_label_wp = "id_route1_wp" + index_wp;
		dijit.byId(id_label_wp).set( 'value', place_name );

		do_route( );
    }

    function reset_panorama( ) {
    	
    	
    }

	function cb_click_btn_add( num_route, index ) {
		
		console.log( "*** Add: num_route=" + num_route + " index=" + index );

        var first_hidden = find_first_hidden();
    	console.log( "first_hidden=" + first_hidden );

    	for ( var n = first_hidden - 1; n >= index; n-- ) {
			var wp = dijit.byId('id_route'+(num_route+1)+'_wp'+(n)).get( 'value' );
			console.log( n + " -> " + wp );
			dijit.byId('id_route'+(num_route+1)+'_wp'+(n+1)).set( 'value', wp );
    	}
		dijit.byId('id_route'+(num_route+1)+'_wp'+(index)).set( 'value', "" );

    	require(["dojo/dom-style"], function( domStyle) {
    		domStyle.set( 'id_route'+(num_route+1)+'_tr'+(first_hidden), "display", "" );
    	});
    	
		dijit.byId('id_btn_play').set( 'disabled', true );
		
		require([ "dijit/focus", "dojo/dom", "dojo/domReady!" ], function(focusUtil, dom){
			focusUtil.focus(dom.byId('id_route'+(num_route+1)+'_wp'+(index)));
		});
		
		update_btns_remove_up_down( );		
	}
		
	function cb_click_btn_remove( num_route, index ) {
		
		console.log( "*** Remove: num_route=" + num_route + " index=" + index );

        var first_hidden = find_first_hidden();
    	console.log( "first_hidden=" + first_hidden );

		for ( var n = index; n < first_hidden - 1; n++ ) {
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
           		dijit.byId('id_btn_add_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
		   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
		   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
		   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+n).set( 'disabled', true ); 
			}
			return;
		}
		
    	var num_route = 0;
    	
        var first_hidden = find_first_hidden();
    	console.log( "first_hidden=" + first_hidden );

		var origin = dijit.byId('id_route'+(num_route+1)+'_wp0').get( 'value' );
   		dijit.byId('id_btn_add_'+(num_route+1)+'_0').set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_btn_remove_'+(num_route+1)+'_0').set( 'disabled', (first_hidden > 2) ? false : true );
   		dijit.byId('id_btn_down_'+(num_route+1)+'_0').set( 'disabled', (origin == '') ? true : false ); 
    	
		for ( var n = 1; n < first_hidden - 1; n++ ) {
			var waypoint = dijit.byId('id_route'+(num_route+1)+'_wp'+n).get( 'value' );
	   		dijit.byId('id_btn_add_'+(num_route+1)+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+n).set( 'disabled', false ); 
	   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
	   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+n).set( 'disabled', (waypoint == '') ? true : false ); 
		}
		
   		dijit.byId('id_btn_add_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', (first_hidden < (MAX_NB_WAYPOINTS+2)) ? false : true );
   		dijit.byId('id_btn_remove_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', (first_hidden > 2) ? false : true );
		var destination = dijit.byId('id_route'+(num_route+1)+'_wp'+(first_hidden-1)).get( 'value' );
   		dijit.byId('id_btn_up_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', (destination == '') ? true : false );
   		dijit.byId('id_btn_down_'+(num_route+1)+'_'+(first_hidden-1)).set( 'disabled', true );
    	
	} // update_btns_remove_up_down
	
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

    function parse( type ) {
    	return typeof type == 'string' ? JSON.parse(type) : type;
    }
    
    function save_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}
    	
        var no_hwy  = dijit.byId('id_check_no_hwy').get( 'checked' );
    	localStorage.setItem( "no_highway", no_hwy );
    	console.log( "no_hwy= " + no_hwy );

        var no_toll = dijit.byId('id_check_no_toll').get( 'checked' );
    	localStorage.setItem( "no_toll", no_toll );
    	console.log( "no_toll= " + no_toll );

    	var step = dijit.byId('id_input_meters').get( 'value' );
    	localStorage.setItem( "step", step );
    	console.log( "step= " + step );
    	
    	var interval = dijit.byId('id_input_interval').get( 'value' );
    	localStorage.setItem( "interval", interval );
    	console.log( "no_toll= " + no_toll );
    	
        var use_curr_pos_for_org = dijit.byId('id_use_curr_position_for_org').get( 'checked' );
    	localStorage.setItem( "use_curr_position_for_org", use_curr_pos_for_org );
    	console.log( "use_curr_pos_for_org= " + use_curr_pos_for_org );
    		
        var use_curr_pos_for_dest = dijit.byId('id_use_curr_position_for_dest').get( 'checked' );
    	localStorage.setItem( "use_curr_position_for_dest", use_curr_pos_for_dest );
    	console.log( "use_curr_pos_for_dest= " + use_curr_pos_for_dest );
    	
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
    	
    } // save_settings
    
    function load_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}
    	
    	var no_hwy = localStorage.getItem("no_highway");
    	console.log( "Restored no_hwy= " + no_hwy );
    	if ( no_hwy != null )
            dijit.byId('id_check_no_hwy').set( 'checked', parse(no_hwy), false );
    	
    	var no_toll = localStorage.getItem("no_toll");
    	console.log( "Restored no_toll= " + no_toll );
    	if ( no_toll != null )
            dijit.byId('id_check_no_toll').set( 'checked', parse(no_toll), false );

    	var step = localStorage.getItem("step");
    	console.log( "Restored step= " + step );
    	if ( step != null )
            dijit.byId('id_input_meters').set( 'value', parse(step) );
    	
    	var interval = localStorage.getItem("interval");
    	console.log( "Restored interval= " + interval );
    	if ( interval != null )
            dijit.byId('id_input_interval').set( 'value', parse(interval) );
    	
    	var use_curr_pos_for_org = localStorage.getItem("use_curr_position_for_org");
    	console.log( "Restored use_curr_position_for_org= " + use_curr_pos_for_org );
    	if ( use_curr_pos_for_org )
            dijit.byId('id_use_curr_position_for_org').set( 'checked', parse(use_curr_pos_for_org) );
    	
    	var use_curr_pos_for_dest = localStorage.getItem("use_curr_position_for_dest");
    	console.log( "Restored use_curr_position_for_dest= " + use_curr_pos_for_dest );
    	if ( use_curr_pos_for_dest )
            dijit.byId('id_use_curr_position_for_dest').set( 'checked', parse(use_curr_pos_for_dest) );
    	
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

        initialize: function( ) { initialize( ); },
		
        do_street_view: function( ) { do_street_view(); },
        do_route: function( ) { do_route(); },
        do_play:  function( ) { do_play(); },
		do_pause: function( ) { do_pause(); },
		do_stop:  function( ) { do_stop(); },

		do_save_gpx: function( ) { do_save_gpx(); },
		
		cb_animate: function( d ) { cb_animate( d ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input: function( ) { cb_route_input( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_click_no_hwy:  function( ) { cb_click_no_hwy(); },
		cb_click_no_toll: function( ) { cb_click_no_toll(); },

		cb_click_force_panto:  function( ) { cb_click_force_panto(); },

		cb_route_from_or_to_changed: function( ) { cb_route_from_or_to_changed(); },

		cb_click_btn_add:    function( num_route, index ) { cb_click_btn_add( num_route, index ); },
		cb_click_btn_remove: function( num_route, index ) { cb_click_btn_remove( num_route, index ); },
		cb_click_btn_up:     function( num_route, index ) { cb_click_btn_up( num_route, index ); },
		cb_click_btn_down:   function( num_route, index ) { cb_click_btn_down( num_route, index ); },

		cb_open_settings: function( ) { cb_open_settings( ); },
		
		save_settings: 		function( ) { save_settings(); },
		clear_settings: 	function( ) { clear_settings(); },
		
    };
 
});
