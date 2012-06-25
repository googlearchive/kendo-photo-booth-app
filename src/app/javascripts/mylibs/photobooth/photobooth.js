(function() {

  define([], function() {
    /* Photostrip
    
    	Handles creation of photostrips by stitching separate photos together
    */
    var canvas, createStrip, images, pub;
    images = [];
    canvas = {};
    createStrip = function(counter, images, ctx, width, height) {
      var image;
      image = new Image();
      image.src = images[counter];
      image.width = width;
      image.height = height;
      return image.onload = function() {
        var src, y;
        y = (counter * height) + ((counter * 20) + 20);
        ctx.drawImage(image, 20, y, image.width, image.height);
        if (counter === images.length - 1) {
          src = canvas.toDataURL();
          return $.publish("/pictures/create", [
            {
              image: src,
              name: null,
              strip: true,
              save: true
            }
          ]);
        } else {
          return createStrip(++counter, images, ctx, width, height);
        }
      };
    };
    return pub = {
      init: function(width, height) {
        canvas = $("<canvas style=color:fff></canvas>")[0];
        return $.subscribe("/photobooth/create", function(images) {
          var counter, ctx, img;
          counter = 0;
          canvas.width = width + 40;
          canvas.height = (height * images.length) + (images.length * 20) + 20;
          ctx = canvas.getContext("2d");
          ctx.fillStyle = "rgb(255,255,255)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          return img = createStrip(counter, images, ctx, width, height);
        });
      }
    };
  });

}).call(this);
