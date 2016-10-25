function PhotoStore(config) {

    config.photoStore = this;
    this.storage = {}
    this.storage.photo = {
        photo_taken_time: -1,
    }
}

PhotoStore.prototype.storePhoto = function(photoData,vr_results) {

    this.storage.photo = {
        photo_taken_time: new Date().getTime(),
        data: photoData,
        vr_results : vr_results
    }
}

PhotoStore.prototype.getPhotoInfo = function() {
    return this.storage.photo
}

PhotoStore.prototype.getPhotoData = function(photoId) {
    return this.storage.photo.data
}

module.exports = PhotoStore;
