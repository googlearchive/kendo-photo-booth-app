(function() {

  define(['mylibs/preview/selectPreview', 'mylibs/preview/preview'], function(selectPreview, preview) {
    /*     Camera
    
    The camera module takes care of getting the users media and drawing it to a canvas.
    It also handles the coutdown that is intitiated
    */
    var $counter, beep, canvas, countdown, ctx, paused, pub, turnOn, utils;
    $counter = {};
    utils = {};
    canvas = {};
    ctx = {};
    beep = document.createElement("audio");
    paused = false;
    turnOn = function(callback, testing) {
      window.HTML5CAMERA.canvas = canvas;
      $.subscribe("/camera/update", function(message) {
        var imgData, videoData;
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        videoData = new Uint8ClampedArray(message.image);
        imgData.data.set(videoData);
        return ctx.putImageData(imgData, 0, 0);
      });
      return callback();
    };
    countdown = function(num, callback) {
      var counters, index;
      beep.play();
      counters = $counter.find("span");
      index = counters.length - num;
      return $(counters[index]).css("opacity", "1").animate({
        opacity: .1
      }, 1000, function() {
        if (num > 1) {
          num--;
          return countdown(num, callback);
        } else {
          return callback();
        }
      });
    };
    return pub = {
      init: function(counter, callback) {
        $counter = $("#" + counter);
        beep.src = "sounds/beep.mp3";
        beep.buffer = "auto";
        canvas = document.createElement("canvas");
        canvas.width = 460;
        canvas.height = 340;
        ctx = canvas.getContext("2d");
        turnOn(callback, true);
        return $.subscribe("/camera/countdown", function(num, hollaback) {
          return countdown(num, hollaback);
        });
      }
    };
  });

}).call(this);
