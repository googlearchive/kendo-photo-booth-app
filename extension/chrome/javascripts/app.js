(function() {

  define(['mylibs/postman/postman', 'mylibs/utils/utils', 'mylibs/file/file', 'mylibs/intents/intents', 'mylibs/share/share', 'mylibs/notify/notify', 'mylibs/assets/assets'], function(postman, utils, file, intents, share, notify, assets) {
    'use strict';
    var canvas, ctx, draw, errback, hollaback, iframe, pub, update;
    iframe = iframe = document.getElementById("iframe");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    draw = function() {
      utils.getAnimationFrame()(draw);
      return update();
    };
    update = function() {
      var buffer, img;
      ctx.drawImage(video, 0, 0, video.width, video.height);
      img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      buffer = img.data.buffer;
      return $.publish("/postman/deliver", [
        {
          message: {
            image: img.data.buffer
          }
        }, "/camera/update", [buffer]
      ]);
    };
    hollaback = function(stream) {
      var e, video;
      e = window.URL || window.webkitURL;
      video = document.getElementById("video");
      video.src = e ? e.createObjectURL(stream) : stream;
      video.play();
      return draw();
    };
    errback = function() {
      return console.log("Couldn't Get The Video");
    };
    return pub = {
      init: function() {
        notify.init();
        share.init();
        utils.init();
        intents.init();
        file.init();
        postman.init(iframe.contentWindow);
        $.publish("/file/read", []);
        assets.init();
        return navigator.webkitGetUserMedia({
          video: true
        }, hollaback, errback);
      }
    };
  });

}).call(this);
