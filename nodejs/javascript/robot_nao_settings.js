function RobotNaoSettings(config) {

    config.settingsStore = this
    this.settings = this.getDefaultSettings()
}

RobotNaoSettings.prototype.getDefaultSettings = function() {

    var settings = {}
    settings.photo_status = {}
    settings.photo_status.last_photo_taken = -1
    settings.photo_status.photo_requested = -1
    settings.is_alive = false
    settings.is_breathing = false
    settings.ip_address = null
    settings.last_communication = -1
    return settings
}

RobotNaoSettings.prototype.setRobotPinged = function(ip_address) {
    this.settings.ip_address = ip_address
    this.settings.last_communication = new Date().getTime()
}

RobotNaoSettings.prototype.getSettings = function() {
    return this.settings
}

RobotNaoSettings.prototype.photoTaken = function() {
    this.settings.photo_status.last_photo_taken = new Date().getTime()
}

RobotNaoSettings.prototype.requestPhoto = function() {
    this.settings.photo_status.photo_requested = new Date().getTime()
}

RobotNaoSettings.prototype.setAlive = function(isAlive) {
    this.settings.photo_status.is_alive = isAlive
}

RobotNaoSettings.prototype.setBreathing = function(isBreathing) {
    this.settings.photo_status.photo_requested = isBreathing
}

// Exported class
module.exports = RobotNaoSettings;
