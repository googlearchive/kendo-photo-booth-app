(function() {

  define([], function() {
    'strict mode';
    var KEY, URL, pub, success;
    URL = "http://api.imgur.com/2/upload.json";
    KEY = "c86d236c329f59e6143f010c7356983e";
    success = function() {
      return $.publish("/postman/deliver", [
        {
          message: {
            success: true,
            message: ""
          }
        }, "/share/success"
      ]);
    };
    return pub = {
      upload: function(dataURL, callback) {
        var img;
        img = dataURL.split(',')[1];
        return $.ajax({
          url: URL,
          type: "POST",
          data: {
            key: KEY,
            image: img,
            title: "HTML5 Camera Photo",
            type: "base64"
          },
          dataType: "json",
          error: function() {
            return $.publish("/postman/deliver", [
              {
                message: {
                  success: false,
                  message: "imgur failed"
                }
              }, "/pictures/share/imgur"
            ]);
          },
          success: function(data) {
            var link;
            link = data.upload.links.imgur_page;
            return callback(link);
          }
        });
      }
    };
  });

}).call(this);
