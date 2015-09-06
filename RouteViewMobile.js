/* ***                                                                                       *** */ 
/* *** RouteView - Olivier Singla                                                            *** */
/* ***                                                                                       *** */ 
/* *** StreetView Player - Virtual Drive or Virtual Ride, using Google Maps and Street View  *** */
/* ***                                                                                       *** */ 
/* ********************************************************************************************* */

define( function( m ) {

	var startup_done;
	var small_map = undefined;
    var map;
    var panorama;
    var marker = undefined;
    var street_view_service;
    var polyline = undefined;
    var location_from;
	var autocomplete_from;
    var location_to;
	var autocomplete_to;
    var timer_animate;
    var dist_route;
    var duration_secs;
    var step;               // metres
    var interval;           // milliseconds
    var curr_dist;
	var directions_display = undefined;
	var show_duration;		// 1:time 2:km 3:miles
	var map_or_panorama_full_screen;
	var cb_route_from_or_to_changed_handle = undefined;
    
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
    
    function is_in_full_screen( ) {
    	if ( document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement )
    		return true;
    	return false;
    }
    
    function toggle_full_screen( ) {
    	if ( !is_in_full_screen( ) )
    		enter_full_screen( );
    	else
    		exit_full_screen( );
    	
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
    
    function hide_main( ) {
       	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
       		domStyle.set( "id_main_heading", "display", "None" );
  	       	domStyle.set( "id_org_dest_pane", "display", "None" );
  	       	domStyle.set( "btn_start", "display", "None" );
       	});
    }
    
    function show_main( ) {

    	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
    		
       		domStyle.set( "id_main_heading", "display", "" );
  	       	domStyle.set( "id_org_dest_pane", "display", "" );
  	       	domStyle.set( "btn_start", "display", "" );

  	       	if ( dijit.byId('id_autocomplete_restrict_type').get( 'value' ) == "on" ) {
  	       		var v = dijit.byId('id_autocomplete_restrict_cb').get( 'value' );
            	autocomplete_from.setTypes([ v ]);
            	autocomplete_to.setTypes([ v ]);
  	       	}
  	       	else {
            	autocomplete_from.setTypes([]);
            	autocomplete_to.setTypes([]);
  	       	}
  	       	
  	       	if ( dijit.byId('id_autocomplete_restrict_country').get( 'value' ) == "on" ) {
  	       		var country = "";
  	  	       	if ( dijit.byId('id_autocomplete_restrict_country_use_loc').get( 'value' ) == "on" )
  	  	       		country = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
  	  	       	else
  	  	       		country = dijit.byId('id_autocomplete_restrict_list_country2').get( 'value' );
  	  	       	console.log( "country = [" + country  + "]" );
  	  	       	if ( (country != '') && (country != undefined) ) {
  	  	  	       	var code_country = iso_countries.get( country );
  	  	  	       	console.log( "code_country = [" + code_country.code + "]" );
  	            	autocomplete_from.setComponentRestrictions({country: code_country.code});
  	            	autocomplete_to.setComponentRestrictions({country: code_country.code});
  	  	       	}
  	       	}
  	       	else {
            	autocomplete_from.setComponentRestrictions();
            	autocomplete_to.setComponentRestrictions();
  	       	}
  	       	
       	});
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
	
	function cb_route_from_or_to_changed( ) {
		
		console.log( "cb_route_from_or_to_changed" );

        start_location = dijit.byId('id_route1_from').get( 'value' );
        end_location   = dijit.byId('id_route1_to').get( 'value' );
        console.log( "from = " + start_location );
        console.log( "to   = " + end_location );

        var start_disabled = (start_location == "") || (end_location == "");
		dijit.byId('btn_start').set( 'disabled', start_disabled );
		
		if ( !start_disabled ) {

            var no_hwy  = (dijit.byId('id_check_no_hwy').get( 'value' ) == "on") ? true : false;
            var no_toll = (dijit.byId('id_check_no_toll').get( 'value' ) == "on") ? true : false;

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
            directions_service.route( request, function(response, status) {
            	
            	if ( status == google.maps.DirectionsStatus.OK ) {
            		
            		console.log( ">>>>>>>>>>>" );
            		console.log( response );
            		console.log( ">>>>>>>>>>>" );
                    var legs = response.routes[0].legs;
                    var leg = legs[0];
                    var distance = leg.distance.text;
                    var meters = leg.distance.value;
                    var duration = leg.duration.text;
                    console.log( "distance = " + distance );
                    console.log( "duration = " + duration );
            		dijit.byId('btn_start').set( 'label', distance + " , " + duration );
            		
                   	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
                   			
                   		domStyle.set( "td_small_map_canvas", "display", "" );
                   		ready( function() {
                           	var home = new google.maps.LatLng( 35.733435, -78.907684 );
                            var small_map_options = {
                            	center: home,
                                zoom: 14,
                                overviewMapControl: false,
                                disableDoubleClickZoom: true,
                                rotateControl: false,
                                streetView: panorama
                            };
                            small_map = new google.maps.Map( document.getElementById('div_small_map_canvas'), small_map_options );

                            var bounds = response.routes[0].bounds;
                            small_map.fitBounds( bounds );
                            
                            var rendererOptions = {
                                map: map,
                                suppressMarkers : true,
                                preserveViewport: true
                            };
                            var directions_display = new google.maps.DirectionsRenderer( rendererOptions );     
                            directions_display.setMap( small_map );
                            directions_display.setDirections( response );
                            
                   		});
                   		
                   	});

            	}
            	
            });
            
		}
		else {

    		dijit.byId('btn_start').set( 'label', "Virtual Drive with StreetView" );
    		
    		if ( small_map != undefined ) {
               	require(["dojo/dom-style"], function(domStyle) {
               		domStyle.set( "td_small_map_canvas", "display", "None" );
               	});
        		small_map = undefined;
    		}
		
		}
		
	}

	function click_duration_distance( ) {
		if ( ++show_duration == 4 )
			show_duration = 1;
        show_route_distance_duration( dist_route, duration_secs );
	}
	
    function cb_map_dblclick( evt ) {
    	console.log( "cb_map_dblclick" );

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

    function cb_panorama_dblclick( evt ) {
		if ( evt.handled != true ) {
			console.log( "cb_panorama_dblclick" );

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
			});
			
          google.maps.event.trigger( map, 'resize' );
          google.maps.event.trigger( panorama, 'resize' );
		}
    }
    
    function startup( ) {

    	var home = new google.maps.LatLng( 35.733435, -78.907684 );

    	street_view_service = new google.maps.StreetViewService();

        var panorama_options = {
            position: home,
            pov: {
                heading: 34,
                pitch: 1
            },
            addressControl: false,
            clickToGo: false,
            disableDoubleClickZoom: true,
            enableCloseButton: false,
            imageDateControl: false,
            linksControl: false,
            panControl: false,
            zoomControl: false,
            scrollwheel: false,
            disableDefaultUI: true
        };
        panorama = new google.maps.StreetViewPanorama( document.getElementById('div_panorama'), panorama_options );

        var map_options = {
           center: home,
           zoom: 14,
           overviewMapControl: false,
           disableDoubleClickZoom: true,
           rotateControl: false,
           streetView: panorama
        };
        map = new google.maps.Map( document.getElementById('div_map_canvas'), map_options );
        
		google.maps.event.addListener( map, "click", function( evt ) { 
			if ( evt.handled != true )
				cb_map_dblclick( evt ); 
		});
		document.getElementById('div_panorama').onclick = cb_panorama_dblclick;
		
		map_or_panorama_full_screen = false;
		
/*
        var myLatLng = {lat: 35.733435, lng: -78.907684};;
        marker = new google.maps.Marker({
            position: home,
            map: map
        });
*/
        
    } // startup
    
    function cb_animate( d, restart ) {

        curr_dist = d;

        if ( d > dist_route ) {
            console.log( "Route is done" );
            return;
        }
        
        var bearing = polyline.Bearing( polyline.GetIndexAtDistance(d) );

        var p = polyline.GetPointAtDistance( d );
//      console.log( "d=" + d + " - " + polyline.GetIndexAtDistance(d) + " / " + bearing + " - " + p.lat() + " , " + p.lng());

        dijit.byId('id_input_route').set( 'value', curr_dist, false );

        street_view_service.getPanoramaByLocation( new google.maps.LatLng( p.lat(), p.lng() ), 0, function( data, status ) {

            if ( !map.getBounds().contains( p ) )
               	map.panTo( p );

        	if ( status === google.maps.StreetViewStatus.OK ) {
                if ( marker != undefined ) {
                	marker.setMap( null );
                	delete marker;
                    marker = undefined;
                }
                panorama.setPosition( new google.maps.LatLng( p.lat(), p.lng() ) );
                panorama.setPov({
                    heading: bearing,
                    pitch: 1
                });
                map.setStreetView(panorama); 
                panorama.setVisible( true );
        	}
        	else if ( status === google.maps.StreetViewStatus.UNKNOWN_ERROR ) {
        		console.log( "Unknown Error! - d=" + d + " - " + polyline.GetIndexAtDistance(d) + " / " + bearing + " - " + p.lat() + " , " + p.lng());
        	}
        	else if ( status === google.maps.StreetViewStatus.ZERO_RESULTS ) {
        		console.log( "Zero Results! - d=" + d + " - " + polyline.GetIndexAtDistance(d) + " / " + bearing + " - " + p.lat() + " , " + p.lng());
                var myLatLng = {lat: 35.733435, lng: -78.907684};
                if ( marker != undefined )
                	marker.setPosition( {lat:p.lat(), lng:p.lng()} );
                else
                	marker = new google.maps.Marker({
                		position: {lat:p.lat(), lng:p.lng()},
                		map: map
                	});
        	}
        	
       		if ( timer_animate != undefined )
                   clearTimeout( timer_animate );
       		if ( restart )
       			timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(d+step)+', true); })', interval );

        });
        
    }

    function start_driving( ) {
        
       	require(["dojo/ready"], function(ready) {
       		ready( function() {
       			
       			if ( timer_animate != undefined )
       	            clearTimeout( timer_animate );
       	            
       	        dist_route = polyline.Distance();
       	        map.setCenter( polyline.getPath().getAt(0) );
       	        var p = polyline.GetPointAtDistance( 50 );
       	        if ( map.getBounds() == undefined ) {
       	        }
       	        else {
           	        if ( !map.getBounds().contains( p ) )
           	           	map.panTo( p );
       	        }
       	        timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(50, true); })', 250 );

       		});
       	});
       			
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
    
    function do_start( init ) {

       	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
       		
       		ready( function() {
       			
           		if ( init ) {
       	       		domStyle.set( "view_config", "display", "None" );
       	       		domStyle.set( "view_map", "display", "" );
       	       		do_start( false );
       	       		return;
           		}
           		
            	enter_full_screen( );
            	
/*
            	try {
            		screen.orientation.lock('landscape').catch( function() {
            			console.log( "Orientation is not supported on this device." );
            		});
            	}
            	catch( e ) {
            		console.log( e );
            	}
*/

        /*
            	require(["dojo/on"], function( on ) {
            		on( window, "fullscreenchange", function( evt ) {
            			alert( "Full Screen!!!" );
            			console.log( evt );
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

            	dijit.byId('id_input_route').set( 'intermediateChanges', false );
            	
                step      = parseInt( dijit.byId('id_input_meters').get( 'value' ) );
                interval  = parseInt(dijit.byId('id_input_interval').get( 'value' ) );
                console.log( "step=" + step + " interval=" + interval );

                start_location = dijit.byId('id_route1_from').get( 'value' );
                end_location   = dijit.byId('id_route1_to').get( 'value' );
                console.log( "from = " + start_location );
                console.log( "to   = " + end_location );

                var no_hwy  = (dijit.byId('id_check_no_hwy').get( 'value' ) == "on") ? true : false;
                var no_toll = (dijit.byId('id_check_no_toll').get( 'value' ) == "on") ? true : false;

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

                            polyline.setMap( map );
                            map.fitBounds( bounds );
                            start_driving( );  
                            show_route_distance_duration( dist_route, duration_secs );

                    		document.getElementById("div_map_canvas").style.display = "";
                    		document.getElementById("div_panorama").style.display = "";

                    		dijit.byId('id_btn_pause').set( 'disabled', false );
                    		dijit.byId('id_btn_stop').set( 'disabled',  false );
                    		
                        }
                        else {
                        	
                        	exit_full_screen( );
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
                            console.log( message );

                        }

                    }

                } // cb_make_route

       		});
       		
       	});
    	
    } // do_start
	
    function do_pause( ) {

        if ( document.getElementById("id_label_pause").innerHTML == "Pause" ) {
    		if ( timer_animate != undefined )
                clearTimeout( timer_animate );
            timer_animate = undefined;
            document.getElementById("id_label_pause").innerHTML = "Continue";
            console.log( "curr_dist=" + curr_dist );
        	dijit.byId('id_input_route').set( 'intermediateChanges', true );
        }
        else if ( document.getElementById("id_label_pause").innerHTML == "Continue" ) {
            document.getElementById("id_label_pause").innerHTML = "Pause";
    		if ( timer_animate != undefined )
                clearTimeout( timer_animate );
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(curr_dist)+', true); })', 50 );
        	dijit.byId('id_input_route').set( 'intermediateChanges', false );
        }

    }

    function do_stop( ) {

    	exit_full_screen( );
		map_or_panorama_full_screen = false;

        if ( marker != undefined ) {
        	marker.setMap( null );
        	delete marker;
            marker = undefined;
        }
		
    	try {
    		screen.orientation.unlock();
    	}
    	catch( e ) {
    		console.log( e );
    	}

/*
    	document.getElementById('id_body').style.MozTransform = "scale(1.0, 1.0)";
    	document.getElementById('id_body').style.zoom = "100%";
		document.getElementById('id_body').style.zoom = "1.0";
*/
    	
    	clearTimeout( timer_animate );
        timer_animate = undefined;

        document.getElementById("id_label_pause").innerHTML = "Pause";

        require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
       		ready( function() {
           		domStyle.set( "view_config", "display", "" );
           		domStyle.set( "view_map", "display", "None" );
            });
    	});

    }

	function move_to_dist( new_pos ) {

		console.log( "move_to_dist: " + new_pos );
		
		if ( timer_animate != undefined )
            clearTimeout( timer_animate );
        timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(' + (new_pos) + ', true ); })', 25 );
	}

    function cb_route_input_changed( ) {
//    	console.log( "cb_route_input_changed" );
        var new_pos = dijit.byId('id_input_route').get( 'value' );
		if ( new_pos == 0 )
			new_pos = 50;
//		move_to_dist( new_pos );
		if ( timer_animate != undefined )
            clearTimeout( timer_animate );
        var paused = (document.getElementById("id_label_pause").innerHTML == "Continue");
        if ( paused )
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(' + (new_pos) + ', false ); })', 25 );
        else
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(' + (new_pos) + ', true ); })', 25 );
    }

    function cb_route_input_click( ) {
/*
    	console.log( "Click!" );
		if ( timer_animate != undefined ) {
            clearTimeout( timer_animate );
            timer_animate = undefined;
		}
*/
    }

    function save_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}
    	
        var no_hwy = dijit.byId('id_check_no_hwy').get( 'value' );
    	localStorage.setItem( "no_highway", no_hwy );
    	console.log( "no_hwy= " + no_hwy );

    	var no_toll = dijit.byId('id_check_no_toll').get( 'value' );
    	localStorage.setItem( "no_toll", no_toll );
    	console.log( "no_toll= " + no_toll );

        var step = dijit.byId('id_input_meters').get( 'value' );
    	localStorage.setItem( "step", step );
    	console.log( "step= " + step );
    	
        var interval = dijit.byId('id_input_interval').get( 'value' );
    	localStorage.setItem( "interval", interval );
    	console.log( "no_toll= " + no_toll );
    	
        var use_curr_pos_for_org = dijit.byId('id_use_curr_position_for_org').get( 'value' );
    	localStorage.setItem( "use_curr_position_for_org", use_curr_pos_for_org );
    	console.log( "use_curr_pos_for_org= " + use_curr_pos_for_org );
    		
        var use_curr_pos_for_dest = dijit.byId('id_use_curr_position_for_dest').get( 'value' );
    	localStorage.setItem( "use_curr_position_for_dest", use_curr_pos_for_dest );
    	console.log( "use_curr_pos_for_dest= " + use_curr_pos_for_dest );
    	
	    var autocomplete_restrict_type = dijit.byId('id_autocomplete_restrict_type').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_type", autocomplete_restrict_type );
    	console.log( "autocomplete_restrict_type= " + autocomplete_restrict_type );
    		
	    var autocomplete_restrict_cb = dijit.byId('id_autocomplete_restrict_cb').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_cb", autocomplete_restrict_cb );
    	console.log( "autocomplete_restrict_cb= " + autocomplete_restrict_cb );
    		
	    var autocomplete_restrict_country = dijit.byId('id_autocomplete_restrict_country').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_country", autocomplete_restrict_country );
    	console.log( "autocomplete_restrict_country= " + autocomplete_restrict_country );
    		
	    var autocomplete_restrict_country_use_loc = dijit.byId('id_autocomplete_restrict_country_use_loc').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_country_use_loc", autocomplete_restrict_country_use_loc );
    	console.log( "autocomplete_restrict_country_use_loc= " + autocomplete_restrict_country_use_loc );
    		
	    var autocomplete_restrict_list_country1 = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_list_country1", autocomplete_restrict_list_country1 );
    	console.log( "autocomplete_restrict_list_country1= " + autocomplete_restrict_list_country1 );
    		
	    var autocomplete_restrict_list_country2 = dijit.byId('id_autocomplete_restrict_list_country2').get( 'value' );
    	localStorage.setItem( "autocomplete_restrict_list_country2", autocomplete_restrict_list_country2 );
    	console.log( "autocomplete_restrict_list_country2= " + autocomplete_restrict_list_country2 );
    	
	    var view = dijit.byId('view_advanced_settings');
	    view.performTransition( "view_config", -1, "scaleOut", this, show_main );
    	
    } // save_settings
    
    function load_settings( ) {

    	if ( typeof(Storage) == "undefined" ) {
    		console.log( "No local storage!" );
    		return;
    	}
    	
    	var no_hwy = localStorage.getItem("no_highway");
    	console.log( "Restored no_hwy= " + no_hwy );
    	if ( no_hwy )
            dijit.byId('id_check_no_hwy').set( 'value', no_hwy );
    	
    	var no_toll = localStorage.getItem("no_toll");
    	console.log( "Restored no_toll= " + no_toll );
    	if ( no_toll )
            dijit.byId('id_check_no_toll').set( 'value', no_toll );

    	var step = localStorage.getItem("step");
    	console.log( "Restored step= " + step );
    	if ( step )
            dijit.byId('id_input_meters').set( 'value', step );
    	
    	var interval = localStorage.getItem("interval");
    	console.log( "Restored interval= " + interval );
    	if ( interval )
            dijit.byId('id_input_interval').set( 'value', interval );
    	
    	var use_curr_pos_for_org = localStorage.getItem("use_curr_position_for_org");
    	console.log( "Restored use_curr_position_for_org= " + use_curr_pos_for_org );
    	if ( use_curr_pos_for_org )
            dijit.byId('id_use_curr_position_for_org').set( 'value', use_curr_pos_for_org );
    	
    	var use_curr_pos_for_dest = localStorage.getItem("use_curr_position_for_dest");
    	console.log( "Restored use_curr_position_for_dest= " + use_curr_pos_for_dest );
    	if ( use_curr_pos_for_dest )
            dijit.byId('id_use_curr_position_for_dest').set( 'value', use_curr_pos_for_dest );
    	
    	var autocomplete_restrict_type = localStorage.getItem("autocomplete_restrict_type");
    	console.log( "Restored autocomplete_restrict_type= " + autocomplete_restrict_type );
    	if ( autocomplete_restrict_type )
            dijit.byId('id_autocomplete_restrict_type').set( 'value', autocomplete_restrict_type );
    	
    	var autocomplete_restrict_cb = localStorage.getItem("autocomplete_restrict_cb");
    	console.log( "Restored autocomplete_restrict_cb= " + autocomplete_restrict_cb );
    	if ( autocomplete_restrict_cb )
            dijit.byId('id_autocomplete_restrict_cb').set( 'value', autocomplete_restrict_cb );
    	
    	var autocomplete_restrict_country = localStorage.getItem("autocomplete_restrict_country");
    	console.log( "Restored autocomplete_restrict_country= " + autocomplete_restrict_country );
    	if ( autocomplete_restrict_country )
            dijit.byId('id_autocomplete_restrict_country').set( 'value', autocomplete_restrict_country );
    	
    	var autocomplete_restrict_country_use_loc = localStorage.getItem("autocomplete_restrict_country_use_loc");
    	console.log( "Restored autocomplete_restrict_country_use_loc= " + autocomplete_restrict_country_use_loc );
    	if ( autocomplete_restrict_country_use_loc )
            dijit.byId('id_autocomplete_restrict_country_use_loc').set( 'value', autocomplete_restrict_country_use_loc );
    	
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
    	
	    var view = dijit.byId('view_advanced_settings');
	    view.performTransition( "view_config", -1, "scaleOut", this, show_main );
    	
    }
    
    function initialize() {
        
    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/dom-style", "dojo/store/Memory", "dojo/ready"], function( dom, on, style, domGeom, domStyle, Memory, ready ) {
    		
            ready( function() {
            	
            	startup_done = false;

            	var input_from = dom.byId('id_route1_from');
            	var autocomplete_options = {
            		componentRestrictions: { country: 'us' },
            		types: ['(cities)']		// geocode
            	};
            	autocomplete_from = new google.maps.places.Autocomplete(input_from);
            	autocomplete_from.setComponentRestrictions({country: 'us'});
            	autocomplete_from.setTypes(['(cities)']);
            	on( input_from, "change", function( evt ) {
            		console.log( "Change" );
            		if ( cb_route_from_or_to_changed_handle != undefined )
            			clearTimeout( cb_route_from_or_to_changed_handle );
            		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
       			});
            	autocomplete_from.addListener('place_changed', function() {
            		console.log( "Place changed" );
            		if ( cb_route_from_or_to_changed_handle != undefined )
            			clearTimeout( cb_route_from_or_to_changed_handle );
            		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
            	});

            	var input_to = dom.byId('id_route1_to');
    	        autocomplete_to = new google.maps.places.Autocomplete(input_to);
        		on( input_to, "change", function( evt ) {
            		console.log( "Change" );
            		if ( cb_route_from_or_to_changed_handle != undefined )
            			clearTimeout( cb_route_from_or_to_changed_handle );
            		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
       			});
        		autocomplete_to.addListener('place_changed', function() {
            		console.log( "Place changed" );
            		if ( cb_route_from_or_to_changed_handle != undefined )
            			clearTimeout( cb_route_from_or_to_changed_handle );
            		cb_route_from_or_to_changed_handle = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_route_from_or_to_changed(); })', 250 );
            	});

                var previous_orientation = window.orientation;
        		window.addEventListener("orientationchange", function() {
        			console.log( window.orientation );
       	            if (window.orientation !== previous_orientation ) {
       	            	previous_orientation = window.orientation;
       	                console.log( "Orientation changed" );
       	            	if ( (window.orientation == -90) || (window.orientation == 90) || (window.orientation == 270) ) {
       	            		console.log( "Window orientation=" + window.orientation );
       	            	}
       	            	else if ( (window.orientation == 0) || (window.orientation == 180) ) {
       	            		console.log( "Window orientation=" + window.orientation );
       	            	}
       	                google.maps.event.trigger( panorama, 'resize' );
       	            }
        		}, false);

/*
        		on( dom.byId('id_autocomplete_restrict_types'), "click", function( evt ) {
        	        var v = dijit.byId('id_autocomplete_restrict_types').get( 'checked' );
        			console.log( "Autocomplete restrict type changed : " + v );
        			dijit.byId('id_autocomplete_restrict_cb').set( 'disabled', (v) ? false : true );
       			});
*/

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
//            		console.log( entry.id );
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
        		
        		show_duration = true;
        		
        	    dijit.byId('id_autocomplete_restrict_type').watch( function( name, oldValue, value ) {
           		    domStyle.set( "id_autocomplete_restrict_li", "display", (value == "on") ? "" : "None" );
                });

        	    dijit.byId('id_autocomplete_restrict_country').watch( function( name, oldValue, value ) {
        		    if ( value == "off" ) {
               		    domStyle.set( "id_autocomplete_restrict_country_use_loc_li", "display", "None" );
               		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", "None" );
        		    }
        		    else {
               		    domStyle.set( "id_autocomplete_restrict_country_use_loc_li", "display", "" );
      	  	       	    var use_loc = dijit.byId('id_autocomplete_restrict_type').get( 'value' );
               		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", (use_loc == "on") ? "" : "None" );
               		    domStyle.set( "id_autocomplete_restrict_country2_li", "display", (use_loc == "on") ? "None" : "" );
        		    }
                });

        	    dijit.byId('id_autocomplete_restrict_country_use_loc').watch( function( name, oldValue, value ) {
           		    domStyle.set( "id_autocomplete_restrict_country1_li", "display", (value == "on") ? "" : "None" );
           		    domStyle.set( "id_autocomplete_restrict_country2_li", "display", (value == "on") ? "None" : "" );
        	    });
        	
        	    dijit.byId('id_use_curr_position_for_org').watch( function( name, oldValue, value ) {
        		    if ( value == "on" )
               			dijit.byId('id_use_curr_position_for_dest').set( 'value', "off" );
        	    });
        	    
        	    dijit.byId('id_use_curr_position_for_dest').watch( function( name, oldValue, value ) {
        		    if ( value == "on" )
               			dijit.byId('id_use_curr_position_for_org').set( 'value', "off" );
        	    });

   				if ( navigator.geolocation )
   					if ( (dijit.byId('id_use_curr_position_for_org').get( 'value' ) == "on") || (dijit.byId('id_use_curr_position_for_dest').get( 'value' ) == "on") )
       					navigator.geolocation.getCurrentPosition( got_current_position );
        	    
   				load_settings( );
   				
            }); // ready
            
    	});
        
    } // initialize
    
    function got_current_position( pos ) {
    	var latlng = {lat: pos.coords.latitude, lng: pos.coords.longitude};
    	var geocoder = new google.maps.Geocoder;
    	geocoder.geocode({'location': latlng}, function(results, status) {
    	    if ( status === google.maps.GeocoderStatus.OK ) {
    	    	if ( results[0] ) {
    	    		var addr = results[0].formatted_address;
        	    	console.log( "current location: " + addr );
   					if ( dijit.byId('id_use_curr_position_for_org').get( 'value' ) == "on" ) {
   	   					if ( dijit.byId('id_route1_from').get( 'value' ) == "" )
   	   	   					dijit.byId('id_route1_from').set( 'value', addr );
   					}
   					else if ( dijit.byId('id_use_curr_position_for_dest').get( 'value' ) == "on" ) {
   	   					if ( dijit.byId('id_route1_to').get( 'value' ) == "" )
   	   	   					dijit.byId('id_route1_to').set( 'value', addr );
   					}
    	    	}
    	    }
    	});
    }
    
    
	// ---------
	// Externals
	// ---------

    return {

        initialize: function( ) { initialize( ); },

        toggle_full_screen: function( ) { toggle_full_screen( ); },
        
        show_about: function( dlg ) { show_about( dlg ); },
        
        hide_main: function( dlg ) { hide_main( dlg ); },
        show_main: function( dlg ) { show_main( dlg ); },

        show_dialog: function( dlg ) { show_dialog( dlg ); },
        hide_dialog: function( dlg ) { hide_dialog( dlg ); },

        cb_meters_changed:   function( ) { cb_meters_changed( ); },
        cb_interval_changed: function( ) { cb_interval_changed( ); },
        
        do_start:  			function( ) { do_start( true ); },
		do_pause:  			function( ) { do_pause(); },
		do_stop:   			function( ) { do_stop(); },

		cb_animate: function( d, restart ) { cb_animate( d, restart ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input_changed: function( ) { cb_route_input_changed( ); },
		cb_route_input_click:   function( ) { cb_route_input_click( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_route_from_or_to_changed: function( ) { cb_route_from_or_to_changed(); },

		click_duration_distance:   function( ) { click_duration_distance(); },

		save_settings: 		function( ) { save_settings(); },
		clear_settings: 	function( ) { clear_settings(); },
		
    };
 
});
