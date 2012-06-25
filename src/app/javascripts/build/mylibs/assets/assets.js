(function() {

  define([], function() {
    /*		Asset Pipline		
    
    	The asset pipeline recieves base 64 encoded images from the extension and exposes them 
    	locally as images. This is because the sandbox treats any local resources as tainted 
    	and won't allow reading them from a canvas as image data
    */
    var assets, pub;
    assets = {};
    return pub = {
      images: assets,
      init: function() {
        return $.subscribe("/assets/add", function(message) {
          var img;
          img = new Image;
          img.src = message.image;
          return assets[message.name] = img;
        });
      }
    };
  });

}).call(this);
