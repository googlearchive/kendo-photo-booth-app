(function() {

  define(['mylibs/utils/utils', 'libs/webgl/effects', 'libs/webgl/glfx.min'], function(utils, effects) {
    /*     Preview
    
    Shows the large video with selected effect giving the user the chance to take 
    a snapshot or a photostrip
    */
    var $container, canvas, click, ctx, currentCanvas, draw, frame, height, paused, preview, pub, webgl, width;
    $container = {};
    canvas = {};
    ctx = {};
    webgl = {};
    paused = true;
    preview = {};
    width = 460;
    height = 340;
    frame = 0;
    currentCanvas = {};
    click = document.createElement("audio");
    draw = function() {
      if (!paused) {
        ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height);
        frame++;
        if (preview.kind === "face") {
          preview.filter(canvas, window.HTML5CAMERA.canvas);
        } else {
          preview.filter(webgl, canvas, frame);
        }
      }
      return utils.getAnimationFrame()(draw);
    };
    return pub = {
      init: function(container) {
        var $footer, $header, $mask, $preview;
        click.src = "sounds/click.mp3";
        click.buffer = "auto";
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
        $container = $("#" + container);
        $header = $container.find(".header");
        $preview = $container.find(".body");
        $mask = $container.find(".mask");
        $footer = $container.find(".footer");
        webgl = fx.canvas();
        $preview.append(canvas);
        $preview.append(webgl);
        $.subscribe("/preview/show", function(e) {
          effects.isPreview = false;
          effects.clearBuffer();
          $.extend(preview, e);
          if (preview.kind === "face") {
            $(webgl).hide();
            $(canvas).show();
            currentCanvas = canvas;
          } else {
            $(webgl).show();
            $(canvas).hide();
            currentCanvas = webgl;
          }
          paused = false;
          canvas.width = width;
          canvas.height = height;
          $header.kendoStop(true).kendoAnimate({
            effects: "fadeIn",
            show: true,
            duration: 500
          });
          $preview.kendoStop(true).kendoAnimate({
            effects: "zoomIn fadeIn",
            show: true,
            duration: 500
          });
          return $footer.kendoStop(true).kendoAnimate({
            effects: "slideIn:up fadeIn",
            show: true,
            duration: 500,
            complete: function() {
              return $("footer").kendoStop(true).kendoAnimate({
                effects: "fadeIn",
                show: true,
                duration: 200
              });
            }
          });
        });
        $container.find("#effects").click(function() {
          paused = true;
          $("footer").kendoStop(true).kendoAnimate({
            effects: "fadeOut",
            hide: true,
            duration: 200
          });
          $header.kendoStop(true).kendoAnimate({
            effects: "fadeOut",
            hide: true,
            duration: 500
          });
          $preview.kendoStop(true).kendoAnimate({
            effects: "zoomOut fadeOut",
            hide: true,
            duration: 500
          });
          $footer.kendoStop(true).kendoAnimate({
            effects: "slide:down fadeOut",
            hide: true,
            duration: 500
          });
          return $.publish("/selectPreview/show");
        });
        $.subscribe("/preview/snapshot", function() {
          var callback;
          $.publish("/controls/enable", [false]);
          callback = function() {
            click.play();
            return $mask.fadeIn(50, function() {
              $mask.fadeOut(900);
              $.publish("/pictures/create", [
                {
                  image: currentCanvas.toDataURL(),
                  name: null,
                  photoStrip: false,
                  save: true
                }
              ]);
              return $.publish("/controls/enable", [true]);
            });
          };
          return $.publish("/camera/countdown", [3, callback]);
        });
        $.subscribe("/preview/photobooth", function() {
          var callback, images, photoNumber;
          $.publish("/controls/enable", [false]);
          images = [];
          photoNumber = 4;
          callback = function() {
            click.play();
            --photoNumber;
            return $mask.fadeIn(50, function() {
              return $mask.fadeOut(900, function() {
                images.push(currentCanvas.toDataURL());
                if (photoNumber > 0) {
                  return $.publish("/camera/countdown", [3, callback]);
                } else {
                  $.publish("/photobooth/create", [images]);
                  return $.publish("/controls/enable", [true]);
                }
              });
            });
          };
          return $.publish("/camera/countdown", [3, callback]);
        });
        return draw();
      }
    };
  });

}).call(this);
