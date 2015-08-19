#
# RouteView
# (C) Olivier Singla 2015
#

Use GoogleMaps / StreetView to simulate a route

I ride a motorcycle, and to prepare my next Saturday ride, I often use GoogleMaps and StreetView to figure out how cool the road is.

Is it a two lanes or a four lanes road? Is it curvy? How nice is the scenery? etc. So basically, 

I create a route, and then move the StreeView icon along some random points on the route to look at the road.

I found this manual process kind of tedious. 

I thought that using StreetView to allow a kind of 'Virtual Drive' would be easier and more fun... 
So I use Google Maps v3, some existent code floating around to do this, and wrote the javascript code in an html page.
I hope this tool might be useful to other people. 

The web page allows you to create a route using Google Maps, and then do a 'virtual travel' through this route using Google Street View. 
 - Create an origin point (for instance: Raleigh, NC)
 - Create a destination point (for instance: Troy, NC)
 - Create optionally a waypoint (for instance: Asheboro, NC)
 - Then click the Start button to see all Street View image along the route!
 
The default step is 250 meters, and the default interval beteen two stepa is 800 millisecons.
These values can be changed interactively using a slider.

Code is created with Google Maps API v3, and use the EPolys extension:

The code is using Dojo.

The latest version of this web application is hosted on github:
https://rawgit.com/osingla/RouteView/master/RouteView.html
or also:
https://osingla.github.io/RouteView/

Feedback and comments are welcome - olivier dot singla at gmail dot com
