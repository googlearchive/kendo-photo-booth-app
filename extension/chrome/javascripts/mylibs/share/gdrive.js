(function() {

  define([], function() {
    var GDRIVE_API, accessToken, pub;
    GDRIVE_API = "https://www.googleapis.com/drive/v1/files";
    accessToken = "";
    return pub = {
      init: function() {
        var token;
        return token = chrome.experimental.identity.getAuthToken(function(token) {
          var formdata;
          accessToken = token;
          console.log(accessToken);
          formdata = new FormData();
          formdata.append("title", "HTML5");
          formdata.append("mimeType", "application/vnd.google-app.folder");
          return $.ajax({
            url: GDRIVE_API,
            beforeSend: function(xhr) {
              xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
              return xhr.setRequestHeader("Content-Type", "application/json");
            },
            type: "POST",
            data: {
              "title": "HTML5",
              "mimeType": "application/vnd/google-app.folder"
            }
          });
        });
      }
    };
  });

}).call(this);
