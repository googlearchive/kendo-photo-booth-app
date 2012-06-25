(function() {

  define(['mylibs/share/share', 'text!mylibs/pictures/views/picture.html'], function(share, picture) {
    /*		Pictures
    
    	The pictures module handles the creation of the actual images and adding them
    	to the right-hand side of the app.  It also responds to all actions taken on images
    	by either clicking on the image itself, or on the action bar below each pic
    */
    var $container, create, pub;
    $container = {};
    create = function(message) {
      var $div, $img, callback, html, template;
      template = kendo.template(picture);
      html = template({
        image: message.image
      });
      $div = $(html);
      $img = $div.find(".picture");
      message.name = message.name || new Date().getTime() + ".png";
      callback = function() {
        $img.attr("src", arguments[0]);
        return $.publish("/postman/deliver", [
          {
            message: {
              name: message.name,
              image: arguments[0]
            }
          }, "/file/save"
        ]);
      };
      if (message.strip) {
        message.name = "p_" + message.name;
      } else {
        $img.addClass("pointer");
        $img.on("click", function() {
          return $.publish("/customize", [this, callback]);
        });
      }
      if (message.save) {
        $.publish("/postman/deliver", [
          {
            message: {
              name: message.name,
              image: message.image
            }
          }, "/file/save"
        ]);
      }
      $img.load(function() {
        return $container.masonry("reload");
      });
      $div.on("click", ".download", function() {
        return $.publish("/postman/deliver", [
          {
            message: {
              name: name,
              image: $img.attr("src")
            }
          }, "/file/download"
        ]);
      });
      $div.on("click", ".intent", function() {
        return $.publish("/share/show", [$img.attr("src"), message.name]);
      });
      $div.on("click", ".trash", function() {
        $.subscribe("/file/deleted/" + message.name, function() {
          $div.remove();
          $container.masonry("reload");
          return $.unsubscribe("file/deleted/" + message.name);
        });
        return $.publish("/postman/deliver", [
          {
            message: {
              name: message.name
            }
          }, "/file/delete"
        ]);
      });
      $div.on("click", ".stamp", function() {
        return $.publish("/stamp/show", [$img.attr("src"), callback]);
      });
      return $container.append($div);
    };
    return pub = {
      init: function(containerId) {
        $container = $("#" + containerId);
        $container.masonry({
          itemSelector: ".box"
        });
        $.subscribe("/pictures/reload", function() {
          return pub.reload();
        });
        $.subscribe("/pictures/create", function(message) {
          return create(message);
        });
        return $.subscribe("/pictures/bulk", function(message) {
          var file, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = message.length; _i < _len; _i++) {
            file = message[_i];
            _results.push(create(file));
          }
          return _results;
        });
      }
    };
  });

}).call(this);
