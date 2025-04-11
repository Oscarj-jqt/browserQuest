BrowserQuest [updated & with Socket.IO]
============

[![Node.js CI](https://github.com/nenuadrian/BrowserQuest/actions/workflows/node.js.yml/badge.svg)](https://github.com/nenuadrian/BrowserQuest/actions/workflows/node.js.yml)

![alt tag](https://raw.github.com/nenuadrian/BrowserQuest/master/screens/1.png)

Changes
============
  * Updated backend and frontend to use Socket.IO server and Client
  * Main changes were made to ws.js and gameclient.js.
  * Updated dependencies such as requirejs and jQuery to their latest versions
  * Fixed build script
  * Created a mini-dispatcher on the server side that provides the IP and Port in the configs as the ones for the game server.
  * Added a demo to http://browserquest.codevolution.com
  * A few minor edits to server side handling

TODO
============
  * Quest system and more awesome features
 

HOW TO RUN?
============

```
npm install
node server/js/main.js
```

Then go inside the Client folder and open index.html.

You might want to host a webserver and open index.html in that (e.g. 127.0.0.1/index.html).



Original README
============
BrowserQuest is a HTML5/JavaScript multiplayer game experiment.


Documentation
-------------

Documentation is located in client and server directories.


License
-------

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.


Credits
-------
Created by [Little Workshop](http://www.littleworkshop.fr):

* Franck Lecollinet - [@whatthefranck](http://twitter.com/whatthefranck)
* Guillaume Lecollinet - [@glecollinet](http://twitter.com/glecollinet)

* Oscar JACQUET
* Hugo DA ROCHA
* Alexis HU
* Aryles BEN CHABANE
* Issa ABDOULAYE