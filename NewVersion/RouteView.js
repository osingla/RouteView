var autocompletes = [];
var map;

function cb_btn_add_waypoint( index ) {
    console.log( "Add waypoint: index="+index );
}

function cb_btn_remove_waypoint( index ) {
    console.log( "Remove waypoint: index="+index );
}

function start() {

    var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';
    $('#layout').w2layout({
        name: 'layout',
        panels: [
            { type: 'top',  size: 32, resizable: false, style: pstyle, content: 'top' },
            { type: 'left', size: 400, resizable: true, style: pstyle, content: '' },
            { type: 'main', size: '50%', style: pstyle, content: 'main' },
            { type: 'right', size: '50%', hidden: true, style: pstyle, content: 'right' },
            { type: 'bottom', size: 50, resizable: false, style: pstyle, content: 'bottom' }
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
		'<table cellspacing="0" cellpadding="0" style="white-space: nowrap" style="width:100%">' +
		'   <tr style="width:100%">' +
		'   	<td>' +
		'   		<table cellspacing="2" cellpadding="2" style="white-space: nowrap" id="id_table_route">' +
		'   		</table>' +
		'   	</td>' +
		'   	<td>' +
		'   		<table cellspacing="0" cellpadding="0" style="height:100%; white-space: nowrap" id="id_table_drive_0">' +
		'   		</table>' +
		'   	</td>' +
		'   </tr>' +
		'</table>'
    );

    w2ui['layout'].content('main', 
        '<div style="width:100%; height:100%" id="map"></div>'
    );

	for (var n = 0; n < 4; n++) { 
        (function ( n ) {
        
            $( "#id_table_route" ).append( "<tr id='id_route_wp"+n+"_tr' bgcolor='#FF0000'></tr>" );

            $( "#id_route_wp"+n+"_tr" ).append( "<td id='id_route_wp"+n+"_td1' valign='middle'></td>" );

            $( "#id_route_wp"+n+"_td1" ).append( String.fromCharCode(n+65)+"&nbsp;" );

            $( "#id_route_wp"+n+"_tr" ).append( "<td id='id_route_wp"+n+"_td2' valign='middle'></td>" );

            $( "#id_route_wp"+n+"_td2" ).append( 
                "<input name='field_text' type='text' maxlength='100' id='id_route_wp"+n+"_where' style='width: 250px !important;'>" );

            $( "#id_route_wp"+n+"_tr" ).append( "<td id='id_route_wp"+n+"_td3' valign='middle'></td>" );

            $( "#id_route_wp"+n+"_td3" ).append( 
                "<button class='icon_btn_add' id='btn_add_waypoint_"+n+"' ></button" );
            $('#btn_add_waypoint_'+n).on('click', function () {
                cb_btn_add_waypoint( n );
            });            

            $( "#id_route_wp"+n+"_tr" ).append( "<td id='id_route_wp"+n+"_td4' valign='middle'></td>" );

            $( "#id_route_wp"+n+"_td4" ).append( 
                "<button class='icon_btn_remove' id='btn_remove_waypoint_"+n+"' ></button" );
            $('#btn_remove_waypoint_'+n).on('click', function () {
                cb_btn_remove_waypoint( n );
            });            

            autocompletes[n] = new google.maps.places.Autocomplete( document.getElementById("id_route_wp"+n+"_where") );

        })( n );
    }

return;
	map = new google.maps.Map(document.getElementById('map'), {
	  center: {lat: 35.720149, lng: -79.172462},
	  zoom: 8
	});

}

$(function () {

    console.log( "jquery version " + $.fn.jquery );

    var google_api="3.26";
    var rq = "//maps.google.com/maps/api/js?v="+google_api+"&sensor=false&libraries=places,geometry";

    $.getScript(rq, function(){
        console.log("Google Maps API version: " + google.maps.version);
        $.getScript("v3_epoly.js", function(){
            start();
        });
    });

});
