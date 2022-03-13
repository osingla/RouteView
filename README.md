# RouteView (StreeViewPlayer)
### (C) Olivier Singla 2015-2022

#### Use GoogleMaps and StreetView to simulate a route.

I ride a 2021 Indian Chief Vintage, and to prepare my next week-end ride, I often use Google Maps and StreetView to figure out how cool the road is. Or I just like to travel 'virtually' to places which are far away from home...

Is it a two lanes or a four lanes road? Is it curvy? How nice is the scenery? etc. So basically, I create a route, create waypoints, and then move the StreeView icon along some random points on the route to look at the road. I found this manual process kind of tedious.

I thought that using StreetView to allow a kind of 'Virtual Drive' would be easier and more fun...  So using Google Maps v3, and 'some' javascript code in an html page, I wrote a tool I could use for myself. I hope this tool might be useful to other people.

#### How to install it

There is no server hosting this application, so there is some setup you will need to do in order to use this web-based application. I describe below the few steps needed in Windows. If you use Linux, no big deal, use something like Apache, and configure it to serve the pages.

##### Steps by Steps setup instructions ino Windows 10

- First download the application.
  Use the link below with your web browser (Chrome)
  https://github.com/osingla/RouteView/archive/refs/heads/master.zip
- Save this file somewhere on your PC/laptop
- Un-compress this archive
  Right-click on the zip file, and select "Extrac All"
- You will need a web server. We'll keep things as simple as possible and will use the web server for Windows 10 (IIS) provided for free by Microsoft .
  https://helpdeskgeek.com/windows-10/install-and-setup-a-website-in-iis-on-windows-10/
-


#### How to use the application

The <a href="http://routeview.org/VirtualRide/" target="target">web application</a> allows you to create a route using Google Maps, and then do a 'virtual travel' through this route using Google Street View.
 - Create an origin point (for instance: Apex, NC)
 - Create a destination point (for instance: Chesterfield, SC)
 - Create optionally a waypoint (for instance: Troy, NC)
 - Then click the Play button ![](icons/btn-drive.png) to see all Street View images along the route!

The default step is 150 meters (492 feet), and the default interval beteen two steps is 750 millisecons.These values can be changed interactively using a slider.

You can play this 10 minutes video <a href="http://streetviewplayer.org/VirtualRide/about" target="target">here</a> to see StreetViewPlayer in action!

Very important: this aplication requires that you use your own Google MAPS API key.

The code is created with Google Maps API v3, and use the <a href="http://econym.org.uk/gmap/epoly.htm" target="target">EPolys extension</a> (just FYI).

I am using the <a href="https://dojotoolkit.org/" target="target">Dojo javacript framework</a>  (just FYI).
;

In case you are interested to see the code, the latest version of this web application is hosted here:
http://routeview.org/

Feedback and comments are welcome - olivier dot singla at gmail dot com
