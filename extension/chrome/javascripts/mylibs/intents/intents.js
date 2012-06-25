(function() {

  define([], function() {
    /*		Intents
    
    	Invokes and responds to web intents
    
    	NOT CURRENTLY IMPLEMENTED
    */
    var pub;
    return pub = {
      init: function() {
        return $.subscribe("/intents/share", function(message) {
          var intent;
          intent = new window.WebKitIntent("http://webintents.org/share", "image/*", message.image);
          return window.navigator.webkitStartActivity(intent, function(data) {});
        });
      }
    };
  });

}).call(this);
