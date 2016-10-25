/*global $:false */ // Fixes "'$' is not defined." error caused by JSHint
var PhotoUtils = {};

var analysis_result_counter = 0
var similar_result_counter = 0

// Global CSS IDs
var _img_id = null
var _img_wrapper_id = null

PhotoUtils.App = function() {

    function refreshPhotos() {

        // POST the question request to the Node.js REST service
        $.ajax({
            type: 'GET',
            url: '/photoInfo',
            success: function (res, msg) {
                if (res.length > 0) {
                    var photoJson = JSON.parse(res)
                    // Only refresh is new photo available
                    _img_id = "img_" + photoJson.photo_taken_time
                    if (photoJson.photo_taken_time != -1 && $("#" + _img_id).length == 0) {
                        $('#main_wrapper').empty()
                        // Clone the analysis template from the .jade file
                        var template = $("#analysis_template").clone()
                        template.attr("id", photoJson.photo_taken_time);
                        template.removeClass("hidden")
                        $('#main_wrapper').append(template)

                        // Clone the analysis template from the .jade file
                        updatePhotoHtml(photoJson, template)
                        updateFacesHtml(photoJson, template)
                        updateClassifierHtml(photoJson, template)
                        updatePokerHtml(photoJson, template)
                        updateSimilarImagesHtml(photoJson, template)
                    }
                } else {
                    $('#main_wrapper').empty()
                    $('#main_wrapper').append("<div class='no_photo'>No Photo Available</div>")
                }
            }
        });
    }

    function updatePhotoHtml(photoJson,template) {

        _img_wrapper_id = "photo_wrapper_" + photoJson.photo_taken_time
        _img_id = "img_" + photoJson.photo_taken_time

        var img = template.find('.photo')
        img.attr("src", "photo/" + photoJson.photo_taken_time);
        img.attr("id", _img_id); // used by showFacesRegion()

        var img = template.find('.photo_wrapper')
        img.attr("id", _img_wrapper_id); // used by showFacesRegion()
    }

    function getFacesDetected(facesResults) {
        var faces = null
        if (facesResults.images.length > 0 && facesResults.images[0].faces.length > 0) {
            faces = facesResults.images[0].faces
        }
        return faces
    }

    function updateFacesHtml(photoJson,analysisHtml) {

        var facesResults = photoJson.vr_results.detect_faces
        var faces = getFacesDetected(facesResults)
        if (faces) {
            var faceResults = analysisHtml.find('.face_results')

            var results = []
            for (var i in faces) {
                var face = faces[i]
                var result = {}
                if (face.gender) {
                    result.description = "Gender: "  + face.gender.gender
                    result.confidence = Number(face.gender.score).toFixed(2)
                    results.push(result)
                }
                if (face.age) {
                    result.description = "Age: "  + face.age.min + "-" + face.age.max
                    result.confidence = Number(face.age.score).toFixed(2)
                    results.push(result)
                }
                if (face.identity) {
                    result.description = face.identity.name
                    result.confidence = Number(face.identity.score).toFixed(2)
                    results.push(result)
                }
            }

            showAnalysisResults(faceResults,results)

            // Store face regions in image for use if user resizes screen
            $("#" + _img_id).data("vr_faces",faces)

            // Update image once loaded
            $("#" + _img_id).load(function() {
                updateFacesRegion()
            });
        }
    }

    function updateFacesRegion() {

        var faces = $("#" +_img_id).data("vr_faces")
        if (faces) {
            $("div").remove(".face_region")

            // Need to do this to get <img> that is unscaled so we can have the real/unscaled width
            //  Oddly HTML5's img.naturalWidth wasn't working for me
            $("<img/>") // Make in memory copy of image to avoid css issues
                .attr("src", $("#" + _img_id).attr("src"))
                .load(function () {
                    // Now we have real and displayed width
                    var imageReduction = $("#" + _img_id).width() / this.width
                    var parent_offset_left = $("#" + _img_id).position().left;

                    for (var i in faces) {
                        var face = faces[i]
                        if (face.face_location) {
                            var faceRegion = $('<div />', {"class": 'face_region'})
                            faceRegion.css('left', (face.face_location.left * imageReduction + parent_offset_left) + "px");
                            faceRegion.css('top', (face.face_location.top * imageReduction) + "px");
                            faceRegion.css('height', (face.face_location.height * imageReduction) + "px");
                            faceRegion.css('width', (face.face_location.width * imageReduction) + "px");
                            $("#" + _img_wrapper_id).append(faceRegion)
                        }
                    }
                });
        }
    }

    function getClassesFound(classifyResults) {
        var classes = null
        if (classifyResults.images.length > 0 && classifyResults.images[0].classifiers.length > 0
            && classifyResults.images[0].classifiers[0].classes.length > 0) {
            classes = classifyResults.images[0].classifiers[0].classes
        }
        return classes
    }

    function updateClassifierHtml(photoJson,analysisHtml) {

        var classifyResults = photoJson.vr_results.classify
        var classes = getClassesFound(classifyResults)
        if (classes) {
            var classifierResults = analysisHtml.find('.classifier_results')

            var results = []
            for (var i in classes) {
                var result = {}
                result.description = classes[i].class
                result.confidence = Number(classes[i].score).toFixed(2)
                results.push(result)
            }
            showAnalysisResults(classifierResults, results);
        }
    }

    function getPokerClassesFound1(classifyResults) {
        var classes = null
        if (classifyResults.images.length > 0 && classifyResults.images[0].classifiers.length > 0
            && classifyResults.images[0].classifiers[0].classes.length > 0) {
            classes = classifyResults.images[0].classifiers[0].classes
        }
        return classes
    }

    function getPokerClassesFound2(classifyResults) {
        var classes = null
        if (classifyResults.images.length > 0 && classifyResults.images[0].classifiers.length > 1
            && classifyResults.images[0].classifiers[1].classes.length > 0) {
            classes = classifyResults.images[0].classifiers[1].classes
        }
        return classes
    }

    function updatePokerHtml(photoJson,analysisHtml) {
        var classifyResults = photoJson.vr_results.poker
        var pokerResults = analysisHtml.find('.poker_results')
        var results = []
        var classes1 = getPokerClassesFound1(classifyResults)
        if (classes1) {
            for (var i in classes1) {
                var result = {}
                result.description = classes1[i].class
                result.confidence = Number(classes1[i].score).toFixed(2)
                results.push(result)
            }
        }

        var classes2 = getPokerClassesFound2(classifyResults)
        if (classes2) {
            for (var j in classes2) {
                result = {}
                result.description = classes2[j].class
                result.confidence = Number(classes2[j].score).toFixed(2)
                results.push(result)
            }
        }
        showAnalysisResults(pokerResults,results)
    }

    function updateSimilarImagesHtml(photoJson,analysisHtml) {
        var similars = photoJson.vr_results.similar_images.similar_images
        if (similars && similars.length > 0) {
            var similarImagesDiv = analysisHtml.find('.similar_images')

            var results = []
            for (var i in similars) {
                var result = {}
                result.link = similars[i].metadata.image_link
                result.category = similars[i].metadata.category
                result.product_type = similars[i].metadata.product_type
                result.confidence = Number(similars[i].score).toFixed(2)
                results.push(result)
            }
            showSimilarImageResults(similarImagesDiv, results);
        }
    }

    function showSimilarImageResults(parent,results) {

        var div = $("<div class='analysis_results'>")
        parent.append(div);

        var counter = 0
        for (var i in results) {
            similar_result_counter+=1
            var template = $("#similar_image_result").clone()
            template.attr("id", "similar_image_result_" + similar_result_counter)
            template.removeClass("hidden")

            var image_div = template.find('#similar_image_result_image')
            image_div.attr("id", "similar_image_result_image" + similar_result_counter)
            image_div.attr("src", results[i].link);
            var confidence_div = template.find('#similar_image_result_confidence')
            confidence_div.attr("id", "similar_image_result_confidence_" + similar_result_counter)
            confidence_div.html(results[i].confidence)

            div.append(template);
            counter+=1
            if (counter % 4 == 0 || counter == results.length) {
                $('<div>', { 'class': 'clearBoth' }).appendTo(div);
            }
        }
    }

    function showAnalysisResults(parent,results) {

        var div = $("<div class='analysis_results'>")
        parent.append(div);

        var counter = 0
        for (var i in results) {
            analysis_result_counter+=1
            var template = $("#analysis_result").clone()
            template.attr("id", "analysis_result_" + analysis_result_counter)
            template.removeClass("hidden")

            var description_div = template.find('#analysis_result_description')
            description_div.attr("id", "analysis_result_description_" + analysis_result_counter)
            description_div.html(results[i].description)
            var confidence_div = template.find('#analysis_result_confidence')
            confidence_div.attr("id", "analysis_result_confidence_" + analysis_result_counter)
            confidence_div.html(results[i].confidence)

            div.append(template);
            counter+=1
            if (counter % 4 == 0 || counter == results.length) {
                $('<div>', { 'class': 'clearBoth' }).appendTo(div);
            }
        }
    }

    function setTakePhotoButtonEnabled(isEnabled) {
        button = $("#requestPhotoButton")
        button.disabled = !isEnabled

        var enabled_div = $("#request_photo_button_enabled")
        var loading_div = $("#request_photo_button_loading")
        if (button.disabled) {
            enabled_div.addClass("hidden")
            loading_div.removeClass("hidden")
        }else  {
            enabled_div.removeClass("hidden")
            loading_div.addClass("hidden")
        }
    }

    // Initialize the application
    var init = function() {

        $("#requestPhotoButton").click(function(){
            // Prevent multiple clicks
            setTakePhotoButtonEnabled(false)
            setTimeout(function() {
                setTakePhotoButtonEnabled(true)
            }, 30000);
            $.ajax({
                type: 'GET',
                url: '/takePhoto',
                success: function (res, msg) {
                    // Nothing to do for now
                },
                error: function (res, msg, err) {
                    alert("Error communicating with server");
                }
            });
        });

        $("#settings_image").click(function(){
            window.location = location.href + "settings"
        });

        refreshPhotos()
        window.setInterval(function(){
            refreshPhotos()
        }, 6000);

        $( window ).resize(function() {
            updateFacesRegion()
        });
    };

    // Expose privileged methods
    return {
        init : init
    };
}(); // Don't delete the circle brackets...required!

PhotoUtils.App.init()
