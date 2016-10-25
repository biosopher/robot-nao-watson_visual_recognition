var bluemix  = require('../config/bluemix');
var extend      = require('util')._extend;
var fs = require('fs');
var Q = require('q');
var wdc = require('watson-developer-cloud');

function VisualRecognitionUtils(watson,callback) {

    // If bluemix credentials (VCAP_SERVICES) are present then override the local credentials
    this.watson = watson
    watson.config.visual_recognition = extend(watson.config.visual_recognition, bluemix.getServiceCreds('visual_recognition')); // VCAP_SERVICES

    if (watson.config.visual_recognition) {
        this.vrService = wdc.visual_recognition({
            api_key: watson.config.visual_recognition.api_key,
            version: 'v3',
            version_date: '2016-05-19'
        });
    }else{
        callback({errMessage : "Visual Recognition key not found"});
    }

    if (watson.config.visual_recognition_similar) {
        this.vrServiceSimilar = wdc.visual_recognition({
            api_key: watson.config.visual_recognition_similar.api_key,
            version: 'v3',
            version_date: '2016-05-19'
        });
    }else{
        callback({errMessage : "Visual Recognition key not found"});
    }
}
VisualRecognitionUtils.prototype.poker = function(filePath){
  var deferred = Q.defer();
  var params = {
      images_file: fs.createReadStream(filePath),
      classifier_ids: this.watson.config.visual_recognition.poker_classifier_ids
  };
  this.vrService.classify(params, function(err, res) {
      if (err)
          deferred.reject(err);
      else
      {
          deferred.resolve(res);
      }
  });
  return deferred.promise;
}

VisualRecognitionUtils.prototype.classify = function(filePath) {

    var deferred = Q.defer();
    var params = {
        images_file: fs.createReadStream(filePath)
    };

    this.vrService.classify(params, function(err, res) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(res);
            //deferred.resolve(JSON.stringify(res));
    });
    return deferred.promise;
}

VisualRecognitionUtils.prototype.detectFaces = function(filePath) {

    var deferred = Q.defer();
    var params = {
        images_file: fs.createReadStream(filePath)
    };

    this.vrService.detectFaces(params, function(err, res) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(res);
            //deferred.resolve(JSON.stringify(res));
    });
    return deferred.promise;
}

VisualRecognitionUtils.prototype.findSimilarImages = function(filePath,collectionId) {

    var deferred = Q.defer();
    var params = {
        image_file: fs.createReadStream(filePath),
        collection_id: this.watson.config.visual_recognition_similar.collection_id
    };

    this.vrServiceSimilar.findSimilar(params, function(err, res) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(res);
        //deferred.resolve(JSON.stringify(res));
    });
    return deferred.promise;
}

// Exported class
module.exports = VisualRecognitionUtils;
