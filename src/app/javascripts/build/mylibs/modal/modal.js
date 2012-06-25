(function() {

  define([], function() {
    var $window, pub;
    $window = {};
    return pub = {
      init: function() {
        return $window = $("<div id='modal'></div>").kendoWindow({
          visible: false,
          modal: true,
          title: "",
          open: function() {
            return $.publish("/app/pause");
          },
          close: function() {
            return $.publish("/app/resume");
          },
          animation: {
            open: {
              effects: "slideIn:up fadeIn",
              duration: 500
            },
            close: {
              effects: "slide:up fadeOut",
              duration: 500
            }
          }
        }).data("kendoWindow").center();
      },
      content: function(content) {
        return $window.content(content);
      },
      show: function() {
        return $window.center().open();
      },
      close: function() {
        return $window.close();
      }
    };
  });

}).call(this);
