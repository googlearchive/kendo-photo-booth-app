(function() {

  define(['mylibs/share/gdrive', 'mylibs/share/imgur', 'mylibs/share/resumableupload', 'mylibs/share/util', 'mylibs/share/gdocs'], function(gdrive, imgur) {
    var pub;
    return pub = {
      init: function() {
        var gdocs;
        $.subscribe("/share/twitter", function(message) {
          var callback;
          callback = function() {
            var link;
            link = arguments[0];
            window.open("https://twitter.com/intent/tweet?url=" + link + "&hashtags=h5c");
            return $.publish("/postman/deliver", [
              {
                message: {
                  success: true,
                  link: link
                }
              }, "/share/success"
            ]);
          };
          if (!message.link) {
            return imgur.upload(message.image, callback);
          } else {
            return callback(message.link);
          }
        });
        $.subscribe("/share/google", function(message) {
          var callback;
          callback = function() {
            var link;
            link = arguments[0];
            window.open("https://plus.google.com/share?url=" + link);
            return $.publish("/postman/deliver", [
              {
                message: {
                  success: true,
                  link: link
                }
              }, "/share/success"
            ]);
          };
          if (!message.link) {
            return imgur.upload(message.image, callback);
          } else {
            return callback(message.link);
          }
        });
        gdocs = new GDocs();
        return gdocs.auth(function() {
          return console.log(gdocs.accessToken);
        });
      }
    };
  });

}).call(this);
