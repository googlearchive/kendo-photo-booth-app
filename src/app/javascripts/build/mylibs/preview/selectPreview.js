(function() {

  define(['libs/webgl/effects', 'mylibs/utils/utils', 'text!mylibs/preview/views/selectPreview.html'], function(effects, utils, template) {
    /*     Select Preview
    
    Select preview shows pages of 6 live previews using webgl effects
    */
    var $container, canvas, ctx, direction, draw, frame, height, pageAnimation, paused, previews, pub, webgl, width;
    paused = false;
    canvas = {};
    ctx = {};
    previews = [];
    $container = {};
    webgl = fx.canvas();
    frame = 0;
    width = 200;
    height = 150;
    direction = "left";
    pageAnimation = function() {
      return {
        pageOut: "slide:" + direction + " fadeOut",
        pageIn: "slideIn:" + direction + " fadeIn"
      };
    };
    draw = function() {
      var preview, _i, _len;
      if (!paused) {
        ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height);
        for (_i = 0, _len = previews.length; _i < _len; _i++) {
          preview = previews[_i];
          frame++;
          if (preview.kind === "face") {
            preview.filter(preview.canvas, canvas);
          } else {
            preview.filter(preview.canvas, canvas, frame);
          }
        }
      }
      return utils.getAnimationFrame()(draw);
    };
    return pub = {
      draw: function() {
        return draw();
      },
      init: function(containerId) {
        var $buttons, $currentPage, $nextPage, ds;
        effects.init();
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
        $.subscribe("/selectPreview/show", function() {
          canvas.width = width;
          canvas.height = height;
          return $container.kendoStop(true).kendoAnimate({
            effects: "zoomIn fadeIn",
            show: true,
            duration: 500,
            complete: function() {
              $("footer").kendoStop(true).kendoAnimate({
                effects: "fadeIn",
                show: true,
                duration: 200
              });
              paused = false;
              return effects.isPreview = true;
            }
          });
        });
        $container = $("#" + containerId);
        $buttons = $container.find("button");
        canvas.width = width;
        canvas.height = height;
        $currentPage = {};
        $nextPage = {};
        ds = new kendo.data.DataSource({
          data: effects.data,
          pageSize: 6,
          change: function() {
            var item, _i, _len, _ref, _results;
            $currentPage = $container.find(".current-page");
            $nextPage = $container.find(".next-page");
            paused = true;
            previews = [];
            _ref = this.view();
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              item = _ref[_i];
              _results.push((function() {
                var $content, $template, content, preview;
                $template = kendo.template(template);
                preview = {};
                $.extend(preview, item);
                if (item.kind === "face") {
                  preview.canvas = document.createElement("canvas");
                  preview.canvas.width = 200;
                  preview.canvas.height = 150;
                } else {
                  preview.canvas = fx.canvas();
                }
                content = $template({
                  name: preview.name,
                  width: width,
                  height: height
                });
                $content = $(content);
                previews.push(preview);
                $content.find("a").append(preview.canvas).click(function() {
                  paused = true;
                  $("footer").kendoStop(true).kendoAnimate({
                    effects: "fadeOut",
                    hide: true,
                    duration: 200
                  });
                  $container.kendoStop(true).kendoAnimate({
                    effects: "zoomOut fadeOut",
                    hide: true,
                    duration: 500
                  });
                  return $.publish("/preview/show", [preview]);
                });
                $nextPage.append($content);
                $currentPage.kendoStop(true).kendoAnimate({
                  effects: "" + (pageAnimation().pageOut),
                  duration: 500,
                  hide: true,
                  complete: function() {
                    $currentPage.removeClass("current-page").addClass("next-page");
                    return $currentPage.find(".preview").remove();
                  }
                });
                return $nextPage.kendoStop(true).kendoAnimate({
                  effects: "" + (pageAnimation().pageIn),
                  duration: 500,
                  show: true,
                  complete: function() {
                    $nextPage.removeClass("next-page").addClass("current-page");
                    effects.clearBuffer();
                    paused = false;
                    return $buttons.removeAttr("disabled");
                  }
                });
              })());
            }
            return _results;
          }
        });
        /* Pager Actions
        */
        $container.on("click", ".more", function() {
          $buttons.attr("disabled", "disabled");
          paused = true;
          direction = "left";
          if (ds.page() < ds.totalPages()) {
            return ds.page(ds.page() + 1);
          } else {
            return ds.page(1);
          }
        });
        $container.on("click", ".back", function() {
          $buttons.attr("disabled", "disabled");
          paused = true;
          direction = "right";
          if (ds.page() === 1) {
            return ds.page(ds.totalPages());
          } else {
            return ds.page(ds.page() - 1);
          }
        });
        return ds.read();
      }
    };
  });

}).call(this);
