var fs = require('fs')
var path = require('path')
var join = path.join
var strip_json_comments = require('strip-json-comments')
var mkdirp = require('mkdirp');
var multer = require('multer')
var Q = require('q');

// Service utils classes
var RobotNaoSettings = require('../javascript/robot_nao_settings');
var PhotoStore = require('../javascript/photo_store');
var VisualRecognitionUtils = require('../javascript/vr_utils');

//************ Constructor **************//
function WatsonUtils(app,config) {

    // Load local config including credentials for running app locally (but services remotely)
    var configFPath = "./config/watson_config.json"
    if (fs.existsSync(configFPath)) {
        try {
            var data = fs.readFileSync(configFPath, "utf8")
            data = strip_json_comments(data)
            this.config = JSON.parse(data)
        } catch (err) {
            console.log("Unable to load local credentials.json:\n" + JSON.stringify(err))
            throw err
        }
    }

    // Init utils
    this.settingsStore = new RobotNaoSettings(config)
    this.photoStore = new PhotoStore(config)
    this.vrUtils = new VisualRecognitionUtils(this,config)

    //************ Supported URL paths **************//
    var internalThis = this;

    // Ask robot to take a photo
    app.get("/takePhoto", function(req,res) {
        internalThis.settingsStore.requestPhoto()
        res.status(200).json("Photo requested")
    });

    app.get("/setAlive/:isAlive", function(req,res) {
        res.end(internalThis.settingsStore.setAlive(req.params.isAlive))
    });

    app.get("/setBreathing/:isBreathing", function(req,res) {
        res.end(internalThis.settingsStore.setBreathing(isBreathing))
    });

    app.get("/photo/:photoId", function(req,res) {
        res.end(internalThis.photoStore.getPhotoData())
    });

    app.get("/photoInfo", function(req,res) {
        var info = internalThis.photoStore.getPhotoInfo()
        res.status(200).json(JSON.stringify(info))
    });

    app.get("/robotSettings", function(req,res) {
        var settings = internalThis.settingsStore.getSettings()
        res.status(200).json(JSON.stringify(settings))
    });

    app.post("/robotPingAlive", function(req,res) {
        internalThis.settingsStore.setRobotPinged(req.body.ip_address);
        console.log("ping received: " + req.body.ip_address)
        res.status(200).end("ping received: " + req.body.ip_address)
    });

    // Multer file upload
    var storage = multer.diskStorage({
        destination: function (request, file, callback) {
            dir = join(__dirname, "../tmp")
            mkdirp(dir, function (err) {
                if (err) console.error(err)
            });
            callback(null,dir)
        },
        filename: function (request, file, callback) {
            callback(null,new Date().getTime() + "_" + file.originalname)
        }
    });

    // Accept single file as "photo" parameter
    this.uploadPhoto = multer({storage: storage}).single('photo')

    app.post("/photoUpload", function(req,res) {
        internalThis.uploadPhoto(req, res, function(err) {
            if(err) {
                console.log('Error occured during photo file upload: ' + err);
                return;
            }
            internalThis.storePhoto(req,res);
        })
    });
}

WatsonUtils.prototype.analyzePhoto = function(photoFilePath) {

    var deferred = Q.defer();
    var internalThis = this
    this.vrUtils.poker(photoFilePath)
      .then(function(pokerJson) {
        internalThis.vrUtils.classify(photoFilePath)
          .then(function(classifyJson) {
              internalThis.vrUtils.detectFaces(photoFilePath)
                  .then(function(facesJson) {
                      internalThis.vrUtils.findSimilarImages(photoFilePath)
                          .then(function(similarImagesJson) {
                              var vr_results = {}
                              vr_results.classify = classifyJson
                              vr_results.detect_faces = facesJson
                              vr_results.similar_images = similarImagesJson
                              vr_results.poker = pokerJson
                              deferred.resolve(vr_results );
                            }, function(err) {
                              deferred.reject(err);
                          });
                      }, function(err) {
                      deferred.reject(err);
                    });
                }, function(err) {
                deferred.reject(err);
            });
        }, function(err) {
        deferred.reject(err);
    });
    return deferred.promise;
}

WatsonUtils.prototype.storePhoto = function(req,res) {

    if (req.file && req.file.size > 0) {
        var internalThis = this;
        fs.exists(req.file.path, function(exists) {
            if(exists) {
                fs.readFile(req.file.path, function (err, data) {
                    if (err) {
                        res.end("Error reading file: " + err);
                    }else{
                        internalThis.analyzePhoto(req.file.path)
                            .then(function(vr_results) {
                                internalThis.photoStore.storePhoto(data,vr_results)
                                internalThis.settingsStore.photoTaken()
                                internalThis.deleteAfterUpload(req.file.path);
                                res.end("Photo successfully processed");
                            }, function(err) {
                                internalThis.handleError(res,"Error storing photo into database. " + JSON.stringify(err));
                            });
                    }
                });
            } else {
                res.status(200).send("Photo file did not upload properly.");
            }
        });
    }else{
        res.status(200).send('Photo parameter was not provided.');
    }
}

WatsonUtils.prototype.deleteAfterUpload = function(path) {
    fs.unlink(path, function(err) {
        if (err) console.log(err);
        console.log('file successfully deleted');
    });
};

WatsonUtils.prototype.handleError = function(res, errMessage) {
    var response = {
        status : 500,
        message : errMessage
    };
    console.log("Error occurred processing request:\n" + JSON.stringify(response));
    res.status(500).json(response);
}

// Exported class
module.exports = WatsonUtils;
