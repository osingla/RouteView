

$(document).ready(function () {

	// this layout could be created with NO OPTIONS - but showing some here just as a sample...
	// myLayout = $('body').layout(); -- syntax with No Options

	myLayout = $('body').layout({

	//	reference only - these options are NOT required because 'true' is the default
		closable:					true	// pane can open & close
	,	resizable:					false	// when open, pane can be resized 
	,	slidable:					false	// when closed, pane can 'slide' open over other panes - closes on mouse-out
	,	livePaneResizing:			true

	//	some resizing/toggling settings
	,   west__livePaneResizing:     false
	,   east__resizeable:           false
	,	north__slidable:			false	// OVERRIDE the pane-default of 'slidable=true'
	,   north__resizeable:          false
	,	north__togglerLength_closed: '100%'	// toggle-button is full-width of resizer-bar
	,	north__spacing_closed:		20		// big resizer-bar when open (zero height)
	,	south__resizable:			false	// OVERRIDE the pane-default of 'resizable=true'
	,	south__spacing_open:		0		// no resizer-bar when open (zero height)
	,	south__spacing_closed:		20		// big resizer-bar when open (zero height)

	//	some pane-size settings
	,	west__minSize:				100
	,	east__size:					300
	,	east__minSize:				200
	,	east__maxSize:				.5 // 50% of layout width
	,	center__minWidth:			100

	//	some pane animation settings
	,	west__animatePaneSizing:	false
	,	west__fxSpeed_size:			"fast"	// 'fast' animation when resizing west-pane
	,	west__fxSpeed_open:			1000	// 1-second animation when opening west-pane
	,	west__fxSettings_open:		{ easing: "easeOutBounce" } // 'bounce' effect when opening
	,	west__fxName_close:			"none"	// NO animation when closing west-pane

	//	enable showOverflow on west-pane so CSS popups will overlap north pane
	,	west__showOverflowOnHover:	true

	//	enable state management
	,	stateManagement__enabled:	false // automatic cookie load & save enabled by default

	,	showDebugMessages:			true // log and/or display messages from debugging & testing code
	});

	// if there is no state-cookie, then DISABLE state management initially
	var cookieExists = !$.isEmptyObject( myLayout.readCookie() );
//	if (!cookieExists) toggleStateManagement( true, false );

	myLayout
		// add event to the 'Close' button in the East pane dynamically...
		.bindButton('#btnCloseEast', 'close', 'east')

		// add event to the 'Toggle South' buttons in Center AND South panes dynamically...
		.bindButton('.south-toggler', 'toggle', 'south')
		
		// add MULTIPLE events to the 'Open All Panes' button in the Center pane dynamically...
		.bindButton('#openAllPanes', 'open', 'north')
		.bindButton('#openAllPanes', 'open', 'south')
		.bindButton('#openAllPanes', 'open', 'west')
		.bindButton('#openAllPanes', 'open', 'east')

		// add MULTIPLE events to the 'Close All Panes' button in the Center pane dynamically...
		.bindButton('#closeAllPanes', 'close', 'north')
		.bindButton('#closeAllPanes', 'close', 'south')
		.bindButton('#closeAllPanes', 'close', 'west')
		.bindButton('#closeAllPanes', 'close', 'east')

		// add MULTIPLE events to the 'Toggle All Panes' button in the Center pane dynamically...
		.bindButton('#toggleAllPanes', 'toggle', 'north')
		.bindButton('#toggleAllPanes', 'toggle', 'south')
		.bindButton('#toggleAllPanes', 'toggle', 'west')
		.bindButton('#toggleAllPanes', 'toggle', 'east')
	;


	/*
	 *	DISABLE TEXT-SELECTION WHEN DRAGGING (or even _trying_ to drag!)
	 *	this functionality will be included in RC30.80
	 */
	$.layout.disableTextSelection = function(){
		var $d	= $(document)
		,	s	= 'textSelectionDisabled'
		,	x	= 'textSelectionInitialized'
		;
		if ($.fn.disableSelection) {
			if (!$d.data(x)) // document hasn't been initialized yet
				$d.on('mouseup', $.layout.enableTextSelection ).data(x, true);
			if (!$d.data(s))
				$d.disableSelection().data(s, true);
		}
		//console.log('$.layout.disableTextSelection');
	};
	$.layout.enableTextSelection = function(){
		var $d	= $(document)
		,	s	= 'textSelectionDisabled';
		if ($.fn.enableSelection && $d.data(s))
			$d.enableSelection().data(s, false);
		//console.log('$.layout.enableTextSelection');
	};
	$(".ui-layout-resizer")
		.disableSelection() // affects only the resizer element
		.on('mousedown', $.layout.disableTextSelection ); // affects entire document

});
