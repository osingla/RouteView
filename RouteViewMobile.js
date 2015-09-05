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
    var marker = undefined;
    var sv;
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

    var isoCountries = [
        {'ccode' : 'AL', 'cname' : 'Albania'},
        {'ccode' : 'DZ', 'cname' : 'Algeria'},
        {'ccode' : 'AS', 'cname' : 'American Samoa'},
        {'ccode' : 'AD', 'cname' : 'Andorra'},
        {'ccode' : 'AO', 'cname' : 'Angola'},
        {'ccode' : 'AI', 'cname' : 'Anguilla'},
        {'ccode' : 'AG', 'cname' : 'Antigua and Barbuda'},
        {'ccode' : 'AR', 'cname' : 'Argentina'},
        {'ccode' : 'AM', 'cname' : 'Armenia'},
        {'ccode' : 'AW', 'cname' : 'Aruba'},
        {'ccode' : 'AU', 'cname' : 'Australia'},
        {'ccode' : 'AT', 'cname' : 'Austria'},
        {'ccode' : 'AZ', 'cname' : 'Azerbaijan'},
        {'ccode' : 'BS', 'cname' : 'Bahamas'},
        {'ccode' : 'BH', 'cname' : 'Bahrain'},
        {'ccode' : 'BD', 'cname' : 'Bangladesh'},
        {'ccode' : 'BB', 'cname' : 'Barbados'},
        {'ccode' : 'BY', 'cname' : 'Belarus'},
        {'ccode' : 'BE', 'cname' : 'Belgium'},
        {'ccode' : 'BZ', 'cname' : 'Belize'},
        {'ccode' : 'BJ', 'cname' : 'Benin'},
        {'ccode' : 'BM', 'cname' : 'Bermuda'},
        {'ccode' : 'BT', 'cname' : 'Bhutan'},
        {'ccode' : 'BO', 'cname' : 'Bolivia'},
        {'ccode' : 'BA', 'cname' : 'Bosnia'},
        {'ccode' : 'BW', 'cname' : 'Botswana'},
        {'ccode' : 'BR', 'cname' : 'Brazil'},
        {'ccode' : 'BN', 'cname' : 'Brunei'},
        {'ccode' : 'BG', 'cname' : 'Bulgaria'},
        {'ccode' : 'BF', 'cname' : 'Burkina Faso'},
        {'ccode' : 'BI', 'cname' : 'Burundi'},
        {'ccode' : 'KH', 'cname' : 'Cambodia'},
        {'ccode' : 'CM', 'cname' : 'Cameroon'},
        {'ccode' : 'CA', 'cname' : 'Canada'},
        {'ccode' : 'CV', 'cname' : 'Cape Verde'},
        {'ccode' : 'KY', 'cname' : 'Cayman Islands'},
        {'ccode' : 'CF', 'cname' : 'Central African Republic'},
        {'ccode' : 'TD', 'cname' : 'Chad'},
        {'ccode' : 'CL', 'cname' : 'Chile'},
        {'ccode' : 'CN', 'cname' : 'China'},
        {'ccode' : 'CO', 'cname' : 'Colombia'},
        {'ccode' : 'KM', 'cname' : 'Comoros'},
        {'ccode' : 'CG', 'cname' : 'Congo'},
        {'ccode' : 'CD', 'cname' : 'Congo, Democratic Republic'},
        {'ccode' : 'CK', 'cname' : 'Cook Islands'},
        {'ccode' : 'CR', 'cname' : 'Costa Rica'},
        {'ccode' : 'CI', 'cname' : 'Ivory Coast'},
        {'ccode' : 'HR', 'cname' : 'Croatia'},
        {'ccode' : 'CU', 'cname' : 'Cuba'},
        {'ccode' : 'CY', 'cname' : 'Cyprus'},
        {'ccode' : 'CZ', 'cname' : 'Czech Republic'},
        {'ccode' : 'DK', 'cname' : 'Denmark'},
        {'ccode' : 'DJ', 'cname' : 'Djibouti'},
        {'ccode' : 'DM', 'cname' : 'Dominica'},
        {'ccode' : 'DO', 'cname' : 'Dominican Republic'},
        {'ccode' : 'EC', 'cname' : 'Ecuador'},
        {'ccode' : 'EG', 'cname' : 'Egypt'},
        {'ccode' : 'SV', 'cname' : 'El Salvador'},
        {'ccode' : 'GQ', 'cname' : 'Equatorial Guinea'},
        {'ccode' : 'ER', 'cname' : 'Eritrea'},
        {'ccode' : 'EE', 'cname' : 'Estonia'},
        {'ccode' : 'ET', 'cname' : 'Ethiopia'},
        {'ccode' : 'FK', 'cname' : 'Falkland Islands (Malvinas)'},
        {'ccode' : 'FJ', 'cname' : 'Fiji'},
        {'ccode' : 'FI', 'cname' : 'Finland'},
        {'ccode' : 'FR', 'cname' : 'France'},
        {'ccode' : 'GF', 'cname' : 'French Guiana'},
        {'ccode' : 'PF', 'cname' : 'French Polynesia'},
        {'ccode' : 'GA', 'cname' : 'Gabon'},
        {'ccode' : 'GM', 'cname' : 'Gambia'},
        {'ccode' : 'GE', 'cname' : 'Georgia'},
        {'ccode' : 'DE', 'cname' : 'Germany'},
        {'ccode' : 'GH', 'cname' : 'Ghana'},
        {'ccode' : 'GI', 'cname' : 'Gibraltar'},
        {'ccode' : 'GR', 'cname' : 'Greece'},
        {'ccode' : 'GL', 'cname' : 'Greenland'},
        {'ccode' : 'GD', 'cname' : 'Grenada'},
        {'ccode' : 'GP', 'cname' : 'Guadeloupe'},
        {'ccode' : 'GU', 'cname' : 'Guam'},
        {'ccode' : 'GT', 'cname' : 'Guatemala'},
        {'ccode' : 'GG', 'cname' : 'Guernsey'},
        {'ccode' : 'GN', 'cname' : 'Guinea'},
        {'ccode' : 'GW', 'cname' : 'Guinea Bissau'},
        {'ccode' : 'GY', 'cname' : 'Guyana'},
        {'ccode' : 'HT', 'cname' : 'Haiti'},
        {'ccode' : 'HN', 'cname' : 'Honduras'},
        {'ccode' : 'HK', 'cname' : 'Hong Kong'},
        {'ccode' : 'HU', 'cname' : 'Hungary'},
        {'ccode' : 'IS', 'cname' : 'Iceland'},
        {'ccode' : 'IN', 'cname' : 'India'},
        {'ccode' : 'ID', 'cname' : 'Indonesia'},
        {'ccode' : 'IR', 'cname' : 'Iran'},
        {'ccode' : 'IQ', 'cname' : 'Iraq'},
        {'ccode' : 'IE', 'cname' : 'Ireland'},
        {'ccode' : 'IL', 'cname' : 'Israel'},
        {'ccode' : 'IT', 'cname' : 'Italy'},
        {'ccode' : 'JM', 'cname' : 'Jamaica'},
        {'ccode' : 'JP', 'cname' : 'Japan'},
        {'ccode' : 'JO', 'cname' : 'Jordan'},
        {'ccode' : 'KZ', 'cname' : 'Kazakhstan'},
        {'ccode' : 'KE', 'cname' : 'Kenya'},
        {'ccode' : 'KI', 'cname' : 'Kiribati'},
        {'ccode' : 'KR', 'cname' : 'Korea'},
        {'ccode' : 'KW', 'cname' : 'Kuwait'},
        {'ccode' : 'KG', 'cname' : 'Kyrgyzstan'},
        {'ccode' : 'LA', 'cname' : 'Laos'},
        {'ccode' : 'LV', 'cname' : 'Latvia'},
        {'ccode' : 'LB', 'cname' : 'Lebanon'},
        {'ccode' : 'LS', 'cname' : 'Lesotho'},
        {'ccode' : 'LR', 'cname' : 'Liberia'},
        {'ccode' : 'LY', 'cname' : 'Libya'},
        {'ccode' : 'LI', 'cname' : 'Liechtenstein'},
        {'ccode' : 'LT', 'cname' : 'Lithuania'},
        {'ccode' : 'LU', 'cname' : 'Luxembourg'},
        {'ccode' : 'MK', 'cname' : 'Macedonia'},
        {'ccode' : 'MG', 'cname' : 'Madagascar'},
        {'ccode' : 'MW', 'cname' : 'Malawi'},
        {'ccode' : 'MY', 'cname' : 'Malaysia'},
        {'ccode' : 'MV', 'cname' : 'Maldives'},
        {'ccode' : 'ML', 'cname' : 'Mali'},
        {'ccode' : 'MT', 'cname' : 'Malta'},
        {'ccode' : 'MH', 'cname' : 'Marshall Islands'},
        {'ccode' : 'MQ', 'cname' : 'Martinique'},
        {'ccode' : 'MU', 'cname' : 'Mauritius'},
        {'ccode' : 'YT', 'cname' : 'Mayotte'},
        {'ccode' : 'MX', 'cname' : 'Mexico'},
        {'ccode' : 'FM', 'cname' : 'Micronesia'},
        {'ccode' : 'MD', 'cname' : 'Moldova'},
        {'ccode' : 'MC', 'cname' : 'Monaco'},
        {'ccode' : 'MN', 'cname' : 'Mongolia'},
        {'ccode' : 'MS', 'cname' : 'Montserrat'},
        {'ccode' : 'MA', 'cname' : 'Morocco'},
        {'ccode' : 'MZ', 'cname' : 'Mozambique'},
        {'ccode' : 'MM', 'cname' : 'Myanmar'},
        {'ccode' : 'NA', 'cname' : 'Namibia'},
        {'ccode' : 'NR', 'cname' : 'Nauru'},
        {'ccode' : 'NP', 'cname' : 'Nepal'},
        {'ccode' : 'NL', 'cname' : 'Netherlands'},
        {'ccode' : 'AN', 'cname' : 'Netherlands Antilles'},
        {'ccode' : 'NC', 'cname' : 'New Caledonia'},
        {'ccode' : 'NZ', 'cname' : 'New Zealand'},
        {'ccode' : 'NI', 'cname' : 'Nicaragua'},
        {'ccode' : 'NE', 'cname' : 'Niger'},
        {'ccode' : 'NG', 'cname' : 'Nigeria'},
        {'ccode' : 'NU', 'cname' : 'Niue'},
        {'ccode' : 'NF', 'cname' : 'Norfolk Island'},
        {'ccode' : 'MP', 'cname' : 'Mariana Islands'},
        {'ccode' : 'NO', 'cname' : 'Norway'},
        {'ccode' : 'OM', 'cname' : 'Oman'},
        {'ccode' : 'PK', 'cname' : 'Pakistan'},
        {'ccode' : 'PW', 'cname' : 'Palau'},
        {'ccode' : 'PS', 'cname' : 'Palestinian Territory, Occupied'},
        {'ccode' : 'PA', 'cname' : 'Panama'},
        {'ccode' : 'PG', 'cname' : 'Papua New Guinea'},
        {'ccode' : 'PY', 'cname' : 'Paraguay'},
        {'ccode' : 'PE', 'cname' : 'Peru'},
        {'ccode' : 'PH', 'cname' : 'Philippines'},
        {'ccode' : 'PN', 'cname' : 'Pitcairn'},
        {'ccode' : 'PL', 'cname' : 'Poland'},
        {'ccode' : 'PT', 'cname' : 'Portugal'},
        {'ccode' : 'PR', 'cname' : 'Puerto Rico'},
        {'ccode' : 'QA', 'cname' : 'Qatar'},
        {'ccode' : 'RE', 'cname' : 'Reunion'},
        {'ccode' : 'RO', 'cname' : 'Romania'},
        {'ccode' : 'RU', 'cname' : 'Russian Federation'},
        {'ccode' : 'RW', 'cname' : 'Rwanda'},
        {'ccode' : 'BL', 'cname' : 'Saint Barthelemy'},
        {'ccode' : 'SH', 'cname' : 'Saint Helena'},
        {'ccode' : 'KN', 'cname' : 'Saint Kitts And Nevis'},
        {'ccode' : 'LC', 'cname' : 'Saint Lucia'},
        {'ccode' : 'MF', 'cname' : 'Saint Martin'},
        {'ccode' : 'PM', 'cname' : 'Saint Pierre And Miquelon'},
        {'ccode' : 'VC', 'cname' : 'Saint Vincent And Grenadines'},
        {'ccode' : 'WS', 'cname' : 'Samoa'},
        {'ccode' : 'SM', 'cname' : 'San Marino'},
        {'ccode' : 'ST', 'cname' : 'Sao Tome And Principe'},
        {'ccode' : 'SA', 'cname' : 'Saudi Arabia'},
        {'ccode' : 'SN', 'cname' : 'Senegal'},
        {'ccode' : 'RS', 'cname' : 'Serbia'},
        {'ccode' : 'SC', 'cname' : 'Seychelles'},
        {'ccode' : 'SL', 'cname' : 'Sierra Leone'},
        {'ccode' : 'SG', 'cname' : 'Singapore'},
        {'ccode' : 'SK', 'cname' : 'Slovakia'},
        {'ccode' : 'SI', 'cname' : 'Slovenia'},
        {'ccode' : 'SB', 'cname' : 'Solomon Islands'},
        {'ccode' : 'SO', 'cname' : 'Somalia'},
        {'ccode' : 'ZA', 'cname' : 'South Africa'},
        {'ccode' : 'ES', 'cname' : 'Spain'},
        {'ccode' : 'LK', 'cname' : 'Sri Lanka'},
        {'ccode' : 'SD', 'cname' : 'Sudan'},
        {'ccode' : 'SR', 'cname' : 'Suriname'},
        {'ccode' : 'SZ', 'cname' : 'Swaziland'},
        {'ccode' : 'SE', 'cname' : 'Sweden'},
        {'ccode' : 'CH', 'cname' : 'Switzerland'},
        {'ccode' : 'SY', 'cname' : 'Syrian Arab Republic'},
        {'ccode' : 'TW', 'cname' : 'Taiwan'},
        {'ccode' : 'TJ', 'cname' : 'Tajikistan'},
        {'ccode' : 'TZ', 'cname' : 'Tanzania'},
        {'ccode' : 'TH', 'cname' : 'Thailand'},
        {'ccode' : 'TL', 'cname' : 'Timor-Leste'},
        {'ccode' : 'TG', 'cname' : 'Togo'},
        {'ccode' : 'TK', 'cname' : 'Tokelau'},
        {'ccode' : 'TO', 'cname' : 'Tonga'},
        {'ccode' : 'TT', 'cname' : 'Trinidad And Tobago'},
        {'ccode' : 'TN', 'cname' : 'Tunisia'},
        {'ccode' : 'TR', 'cname' : 'Turkey'},
        {'ccode' : 'TM', 'cname' : 'Turkmenistan'},
        {'ccode' : 'TC', 'cname' : 'Turks And Caicos Islands'},
        {'ccode' : 'TV', 'cname' : 'Tuvalu'},
        {'ccode' : 'UG', 'cname' : 'Uganda'},
        {'ccode' : 'UA', 'cname' : 'Ukraine'},
        {'ccode' : 'AE', 'cname' : 'United Arab Emirates'},
        {'ccode' : 'GB', 'cname' : 'United Kingdom'},
        {'ccode' : 'US', 'cname' : 'United States'},
        {'ccode' : 'UM', 'cname' : 'United States Outlying Islands'},
        {'ccode' : 'UY', 'cname' : 'Uruguay'},
        {'ccode' : 'UZ', 'cname' : 'Uzbekistan'},
        {'ccode' : 'VU', 'cname' : 'Vanuatu'},
        {'ccode' : 'VE', 'cname' : 'Venezuela'},
        {'ccode' : 'VN', 'cname' : 'Viet Nam'},
        {'ccode' : 'VG', 'cname' : 'Virgin Islands, British'},
        {'ccode' : 'VI', 'cname' : 'Virgin Islands, U.S.'},
        {'ccode' : 'WF', 'cname' : 'Wallis And Futuna'},
        {'ccode' : 'EH', 'cname' : 'Western Sahara'},
        {'ccode' : 'YE', 'cname' : 'Yemen'},
        {'ccode' : 'ZM', 'cname' : 'Zambia'},
        {'ccode' : 'ZW', 'cname' : 'Zimbabwe'}
    ];
    
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
  	  	       	if ( dijit.byId('id_autocomplete_restrict_type').get( 'value' ) == "on" )
  	  	       		country = dijit.byId('id_autocomplete_restrict_list_country1').get( 'value' );
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

        sv = new google.maps.StreetViewService();

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
    
    function cb_animate( d ) {

        curr_dist = d;

        if ( d > dist_route ) {
            console.log( "Route is done" );
            return;
        }
        
        var bearing = polyline.Bearing( polyline.GetIndexAtDistance(d) );

        var p = polyline.GetPointAtDistance( d );
      console.log( "d=" + d + " - " + polyline.GetIndexAtDistance(d) + " / " + bearing + " - " + p.lat() + " , " + p.lng());

        dijit.byId('id_input_route').set( 'value', curr_dist, false );

        sv.getPanoramaByLocation( new google.maps.LatLng( p.lat(), p.lng() ), 0, function( data, status ) {

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
        	
            if ( step > 0 ) {
        		if ( timer_animate != undefined )
                    clearTimeout( timer_animate );
            	timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(d+step)+'); })', interval );
            }

        });
        
    }

    function start_driving( ) {
        
		if ( timer_animate != undefined )
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
    
    function do_start( init ) {

       	require(["dojo/ready"], function(ready) {
       		
       		ready( function() {
       			
           		if ( init ) {
           	       	require(["dojo/dom-style", "dojo/ready"], function(domStyle, ready) {
           	       		domStyle.set( "view_config", "display", "None" );
           	       		domStyle.set( "view_map", "display", "" );
           	       		do_start( false );
           	       		return;
           	       	});
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
        }
        else if ( document.getElementById("id_label_pause").innerHTML == "Continue" ) {
            document.getElementById("id_label_pause").innerHTML = "Pause";
    		if ( timer_animate != undefined )
                clearTimeout( timer_animate );
            timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate('+(curr_dist)+'); })', 50 );
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
        timer_animate = setTimeout( 'require(["RouteViewMobile.js"], function( s ) { s.cb_animate(' + (new_pos) + '); })', 25 );
	}

    function cb_route_input_changed( ) {
        var new_pos = dijit.byId('id_input_route').get( 'value' );
		if ( new_pos == 0 )
			new_pos = 50;
		move_to_dist( new_pos );
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

    function initialize() {
        
    	startup_done = false;

    	require(["dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-geometry", "dojo/ready"], function( dom, on, style, domGeom, ready ) {
    		
            ready( function() {
            	
            	var input_from = dom.byId('id_route1_from');
            	var autocomplete_options = {
            		componentRestrictions: { country: 'us' },
            		types: ['(cities)']		// geocode
            	};
            	autocomplete_from = new google.maps.places.Autocomplete(input_from);
            	autocomplete_from.setComponentRestrictions({country: 'us'});
            	autocomplete_from.setTypes(['(cities)']);
            	on( input_from, "change", function( evt ) {
        			cb_route_from_or_to_changed( evt );
       			});

            	var input_to = dom.byId('id_route1_to');
    	        autocomplete_to = new google.maps.places.Autocomplete(input_to);
        		on( input_to, "change", function( evt ) {
        			cb_route_from_or_to_changed( evt );
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

        		require(["dojo/store/Memory"], function( Memory ) {
        		    _list_countries = [
        		        {id: 0,    list:['Algeria','Burkina Faso','Faeroe Islands','Ghana','Guinea Republic','Iceland','Ireland','Ivory Coast','Liberia','Mali','Morocco','Sao Tome & Principe','Senegal','Sierra Leone','St Helena','Gambia','Togo','United Kingdom']},
        		        {id: 1,    list:['Albania','Andorra','Angola','Australia','Austria','Belgium','Benin','Bosnia','Cameroon','Central Africa Republic','Chad','Congo','Croatia','Czech Republic','Congo, Democratic Republic','Denmark','Equatorial Guinea','France','Gabon','Germany','Gibraltar','Guam','Hungary','Italy','Liechtenstein','Luxembourg','Macedonia (Fyrom)','Malta','Mariana Islands','Marshall Islands','Micronesia','Monaco','Netherlands','Niger','Nigeria','Norway','Papua New Guinea','Poland','Portugal','San Marino','Serbia','Slovak Republic','Slovenia','Spain','Sweden','Switzerland','Tunisia']},
        		        {id: -1,   list:['Cape Verde','Cook Islands','French Polynesia','Guinea Bissau','USA']},
        		        {id: 11,   list:['New Caledonia','Solomon Islands','Vanuatu']},
        		        {id: -11,  list:['Niue','American Samoa','Samoa','USA']},
        		        {id: 11.5, list:['Norfolk Island']},
        		        {id: 12,   list:['Fiji','Kiribati','Nauru','New Zealand','Tuvalu','Wallis & Futuna Islands']},
        		        {id: 2,    list:['Botswana','Bulgaria','Burundi','Cyprus','Congo, Democratic Republic','Egypt','Finland','Greece','Israel','Jordan','Lebanon','Lesotho','Libya','Lithuania','Malawi','Mozambique','Namibia','Palestine','Romania','Rwanda','South Africa','Sudan','Swaziland','Syria','Turkey','Zambia','Zimbabwe']},
        		        {id: 3,    list:['Bahrain','Belarus','Comoros','Djibouti','Eritrea','Estonia','Ethiopia','Iraq','Kenya','Kuwait','latvia','Madagascar','Mayotte','Moldova','Qatar','Russia','Saudi Arabia','Somalia','Tanzania','Uganda','Ukraine','Yemen Arab Republic']},
        		        {id: -3,   list:['Argentina','Brazil','Cuba','Greenland','Guyana','Uruguay']},
        		        {id: 3.5,  list:['Iran']},
        		        {id: -3.5, list:['Surinam']},
        		        {id: 4,    list:['Armenia','Azerbaijan','Georgia','Mauritius','Oman','Reunion Island','Seychelles','United Arab Emirates']},
        		        {id: -4,   list:['Anguilla','Antigua and Barbuda','Aruba','Barbados','Bermuda','Bolivia','Brazil','Canada','Chile','Dominica','Dominican Republic','Falkland Islands (Malvinas)','French Guiana ','Grenada','Guadeloupe','Martinique','Montserrat','Netherlands Antilles','Paraguay','Puerto Rico','St Kitts & Nevia','St Lucia','Trinidad & Tobago','Venezuela']},
        		        {id: 5,    list:['Diego Garcia','Maldives Republic','Pakistan','Turkmenistan']},
        		        {id: -5,   list:['Bahamas','Brazil','Canada','Cayman Islands','Colombia','Ecuador','Haiti','Jamaica','Panama','Peru','Turks & Caicos Islands','USA']},
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
        		});
        		
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

        		require(["dojo/store/Memory"], function(Memory){
        			var list_countries_store = new Memory({ idProperty: "name", data: [ ] });
        			var l = list_countries.get(timeOffset);
        			console.log( l );
        			l.list.forEach( function(entry) {
            			list_countries_store.add( { name: entry } );
            			if ( entry == "USA" )
                			dijit.byId('id_autocomplete_restrict_list_country1').set( 'value', entry );
        			});
        			dijit.byId('id_autocomplete_restrict_list_country1').set( 'store', list_countries_store );
        		});
        		
        		show_duration = true;
        		
            });

        });
        
    } // initialize
    
    
	// ---------
	// Externals
	// ---------

    return {

        initialize: function( ) { initialize( ); },

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

		cb_animate: function( d ) { cb_animate( d ); },

		move_to_dist: function( new_pos ) { move_to_dist( new_pos ); },

		cb_route_input_changed: function( ) { cb_route_input_changed( ); },
		cb_route_input_click:   function( ) { cb_route_input_click( ); },

		cb_step_changed:     function( ) { cb_step_changed(); },
		cb_interval_changed: function( ) { cb_interval_changed(); },
		
		cb_route_from_or_to_changed: function( ) { cb_route_from_or_to_changed(); },

		click_duration_distance:   function( ) { click_duration_distance(); },
		
    };
 
});
