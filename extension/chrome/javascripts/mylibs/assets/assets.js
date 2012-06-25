(function() {

  define(['mylibs/utils/utils'], function(utils) {
    /*		Assets
    
    	The assets object defines the pipeline that sends images down to the
    	application. this is because the sandbox treats local resources as suspect.
    	this way, the sandbox will trust these images and let us draw and read them from canvas's
    */
    'use strict';
    var assets, pub;
    assets = [
      {
        name: "glasses",
        src: "chrome/images/glasses.png"
      }, {
        name: "horns",
        src: "chrome/images/horns.png"
      }, {
        name: "hipster",
        src: "chrome/images/hipster.png"
      }, {
        name: "google",
        src: "chrome/images/glasses.png"
      }
    ];
    return pub = {
      init: function() {
        var asset, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = assets.length; _i < _len; _i++) {
          asset = assets[_i];
          _results.push((function(asset) {
            var img;
            img = new Image();
            img.src = asset.src;
            return img.onload = function() {
              return $.publish("/postman/deliver", [
                {
                  message: {
                    name: asset.name,
                    image: img.toDataURL()
                  }
                }, "/assets/add"
              ]);
            };
          })(asset));
        }
        return _results;
      }
    };
  });

}).call(this);
