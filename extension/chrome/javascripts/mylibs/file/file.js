(function() {

  define(['mylibs/utils/utils'], function(utils) {
    /*   File
    
    The file module takes care of all the reading and writing to and from the file system
    */
    var blobBuiler, compare, destroy, download, errorHandler, fileSystem, myPicturesDir, pub, read, save;
    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    fileSystem = {};
    myPicturesDir = {};
    blobBuiler = {};
    compare = function(a, b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    };
    errorHandler = function(e) {
      var msg;
      msg = '';
      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          msg = 'QUOTA_EXCEEDED_ERR';
          break;
        case FileError.NOT_FOUND_ERR:
          msg = 'NOT_FOUND_ERR';
          break;
        case FileError.SECURITY_ERR:
          msg = 'SECURITY_ERR';
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          msg = 'INVALID_MODIFICATION_ERR';
          break;
        case FileError.INVALID_STATE_ERR:
          msg = 'INVALID_STATE_ERR';
          break;
        default:
          msg = 'Unknown Error';
      }
      $.publish("/notify/show", ["File Error", msg, true]);
      return $.publish("/notify/show", ["File Access Denied", "Access to the file system could not be obtained.", false]);
    };
    save = function(name, dataURL) {
      var blob;
      blob = utils.toBlob(dataURL);
      return fileSystem.root.getFile(name, {
        create: true
      }, function(fileEntry) {
        return fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function(e) {
            return $.publish("/share/gdrive/upload", [blob]);
          };
          fileWriter.onerror = function(e) {
            return errorHandler(e);
          };
          return fileWriter.write(blob);
        });
      }, errorHandler);
    };
    destroy = function(name) {
      return fileSystem.root.getFile(name, {
        create: false
      }, function(fileEntry) {
        return fileEntry.remove(function() {
          $.publish("/notify/show", ["File Deleted!", "The picture was deleted successfully", false]);
          return $.publish("/postman/deliver", [
            {
              message: ""
            }, "/file/deleted/" + name
          ]);
        }, errorHandler);
      }, errorHandler);
    };
    download = function(name, dataURL) {
      var blob;
      blob = utils.toBlob(dataURL);
      return chrome.fileSystem.chooseFile({
        type: "saveFile"
      }, function(fileEntry) {
        return fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function(e) {
            return $.publish("/notify/show", ["File Saved", "The picture was saved succesfully", false]);
          };
          fileWriter.onerror = function(e) {
            return errorHandler(e);
          };
          return fileWriter.write(blob);
        });
      });
    };
    read = function() {
      var success;
      window.webkitStorageInfo.requestQuota(PERSISTENT, 5000 * 1024, function(grantedBytes) {
        return window.requestFileSystem(PERSISTENT, grantedBytes, success, errorHandler);
      });
      return success = function(fs) {
        fs.root.getDirectory("MyPictures", {
          create: true
        }, function(dirEntry) {
          var dirReader, entries, files;
          myPicturesDir = dirEntry;
          entries = [];
          files = [];
          dirReader = fs.root.createReader();
          read = function() {
            return dirReader.readEntries(function(results) {
              var entry, readFile, _i, _len;
              for (_i = 0, _len = results.length; _i < _len; _i++) {
                entry = results[_i];
                if (entry.isFile) entries.push(entry);
              }
              readFile = function(i) {
                var name;
                entry = entries[i];
                if (entry.isFile) {
                  name = entry.name;
                  return entry.file(function(file) {
                    var reader;
                    reader = new FileReader();
                    reader.onloadend = function(e) {
                      files.push({
                        name: name,
                        image: this.result,
                        strip: false
                      });
                      if (files.length === entries.length) {
                        files.sort(compare);
                        return $.publish("/postman/deliver", [
                          {
                            message: files
                          }, "/pictures/bulk", []
                        ]);
                      } else {
                        return readFile(++i);
                      }
                    };
                    return reader.readAsDataURL(file);
                  });
                }
              };
              if (entries.length > 0) return readFile(0);
            });
          };
          return read();
        }, errorHandler);
        return fileSystem = fs;
      };
    };
    return pub = {
      init: function(kb) {
        $.subscribe("/file/save", function(message) {
          return save(message.name, message.image);
        });
        $.subscribe("/file/delete", function(message) {
          return destroy(message.name);
        });
        $.subscribe("/file/read", function(message) {
          return read();
        });
        return $.subscribe("/file/download", function(message) {
          return download(message.name, message.image);
        });
      }
    };
  });

}).call(this);
