(function() {

  define([], function() {
    var pub;
    return pub = {
      init: function(controlsId) {
        var $buttons, $controls;
        $controls = $("#" + controlsId);
        $buttons = $controls.find("button");
        $controls.on("click", "button", function() {
          return $.publish($(this).data("event"));
        });
        $controls.on("change", "input", function(e) {
          return $.publish("/polaroid/change", [e]);
        });
        return $.subscribe("/controls/enable", function(enabled) {
          if (enabled) {
            return $buttons.removeAttr("disabled");
          } else {
            return $buttons.attr("disabled", "disabled");
          }
        });
      }
    };
  });

}).call(this);
