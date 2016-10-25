import json
import time
import threading
from optparse import OptionParser
import os, re, os.path
from os.path import join
import urllib2
import requests
import socket
import fcntl
import datetime
import traceback
import struct
import sys
from random import randint

from naoqi import ALProxy
from naoqi import ALBroker
from naoqi import ALModule

#NAO_IP = "10.0.0.64"
NAO_IP = None
main_log_path = "/home/nao/main.log"
module_instance = None # Warning: Module instance must be a global variable

class WowModule(ALModule):

    def __init__(self, id):

        # Id passed to constructor must same as id provided during event subscription
        ALModule.__init__(self, id)

        self.logger = Logger()
        self.logger.logInfo('INFO', "Initializing module")

        # No need for IP and port here because
        # we have our Python broker connected to NAOqi broker
        self.id = id

        self.photo_counter = 0
        self.last_photo_taken = -1
        self.is_uploading_photo = False

        # Stop NAO from moving around
        self.awareness = ALProxy('ALBasicAwareness')
        self.motion = ALProxy('ALMotion')
        self.ttsProxy = ALProxy("ALTextToSpeech")

        self.photo_capture_proxy = ALProxy("ALPhotoCapture", NAO_IP, 9559)

        # 0: qqvga = 160 x 120
        # 1: qvga = 320 x 240
        # 2: vga = 640 x 480
        # 3: xvga = 1280 x 960
        self.photo_capture_proxy.setResolution(3)
        self.photo_capture_proxy.setPictureFormat("jpg")

        self.logger.logInfo('INFO', "Module initialized")

    def __del__(self):
        print("Module Deleted")

    def check_server_for_status(self):

        self.logger.logInfo('INFO', "Checking server status")

        # Lastly call unique url to ping that robot is alive
        data = {'ip_address': NAO_IP}
        r = requests.post("http://aps-robot-nao.mybluemix.net/robotPingAlive", data=data)
        self.logger.logInfo('INFO', str(r.status_code) + r.content)

        settings = urllib2.urlopen("http://aps-robot-nao.mybluemix.net/robotSettings")
        settings_json = json.load(settings)
        self.logger.logInfo('INFO', settings_json) #  Now it's a string
        settings_json = json.loads(settings_json) #  Oddly need to load() then loads() with an 's' to get actual json
        # {  "photo_status":{
        #      "last_photo_taken" : 1476325383745,
        #      "photo_requested":1476326165860
        #    },
        #    "is_alive" : false,
        #    "is_breathing" : false
        # }"

        if (settings_json["photo_status"]["photo_requested"] != -1 and self.last_photo_taken*1000 < settings_json["photo_status"]["photo_requested"] ) :
            try:
                self.send_photo_to_server()
                self.last_photo_taken = time.time()
                self.purge_temp_photo_files()
                self.logger.logInfo('INFO', "photo taken: " + str(self.last_photo_taken))
            except:  # catch *all* exceptions
                self.logger.logInfo('INFO', "Error occurred connecting to server")
                exc_type, exc_value, exc_traceback = sys.exc_info()
                lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
                self.logger.logInfo('INFO', ''.join('!! ' + line for line in lines))  # Log it or whatever here
                pass

        conserveBattery = not settings_json["is_alive"] or not settings_json["is_breathing"]
        self.motion.setBreathEnabled("Body", not conserveBattery)
        self.motion.setIdlePostureEnabled("Body", not conserveBattery)
        if (conserveBattery) :
            self.awareness.stopAwareness()
        else :
            self.awareness.startAwareness()

        self.logger.logInfo('INFO', "Server sync completed")


    def speak_about_taking_picture(self):

        phrases = ["Do you mind if I take your picture? \\pau=1000\\ 1, 2 \\pau=250\\ and \\pau=250\\ 3.",
                   "Hello.\\pau=1000\\  I'm ready to take your photo. \\pau=1000\\ Hold still.",
                   "Get ready for your photo. \\pau=1000\\ On the count of three. \\pau=1000\\ 1, 2 \\pau=250\\ and \\pau=250\\ 3.",
                   "I'd love to take your photo \\pau=500\\  if you don't mind. \\pau=1000\\ On the count of three. \\pau=1000\\ 1, 2 \\pau=250\\ and \\pau=250\\ 3.",
                   "I'm having a great time. \\pau=1000\\Can I take a photo to capture the memory? \\pau=1000\\ 1, 2 \\pau=250\\ and \\pau=250\\ 3.",
                   "Hold that pose while I take your photo. \\pau=1000\\ On the count of three. \\pau=1000\\  1, 2 \\pau=250\\ and \\pau=250\\ 3.",
                   "Get ready for your photo. \\pau=1000\\ Say cheese!",
                   "Can I take your photo? \\pau=1000\\  I want to share with my friends. Say \\pau=250\\  Robots are awesome!"]
        random = randint(0,7)
        self.ttsProxy.say(phrases[random])


    def send_photo_to_server(self):

        self.is_uploading_photo = True

        self.speak_about_taking_picture()
        self.logger.logInfo('INFO', "taking photo now")

        # Take photo
        self.photo_counter += 1

        photo_path = "/var/persistent/home/nao/nao_app/anthony"
        photo_name = "photo_capture_" + str(self.photo_counter) + ".jpg"

        self.photo_capture_proxy.takePictures(1, photo_path, photo_name)

        photo_path = join(photo_path,photo_name)
        photo_data = open(photo_path, "rb")

        files = {'photo': ('robot_nao_' + str(self.photo_counter) + '.jpg', photo_data)}
        r = requests.post("http://aps-robot-nao.mybluemix.net/photoUpload", files=files)
        self.logger.logInfo('INFO', "photo uploaded: " + str(r.status_code) + r.content)

        self.is_uploading_photo = False

    def purge_temp_photo_files(self):
        pattern = "^(photo_capture_\d+).jpg$"
        for f in os.listdir("."):
            if re.search(pattern, f):
                os.remove(os.path.join(".", f))

class Logger():

    def logInfo(self, *args):
        if False :
            log_string = self._args_to_log_string(*args)
            with open(main_log_path, 'a') as log:
                log.write('%s\n' % log_string)

    def _args_to_log_string(self, *args):
        log = str(datetime.datetime.utcnow())
        for arg in args:
            log += ' - %s' % arg

        return log

def determine_ip_address():

    global NAO_IP
    try:
        NAO_IP = socket.gethostbyname(socket.gethostname())
    except:
        pass

    print "socket ip: " + str(NAO_IP)
    if NAO_IP is None:
        NAO_IP = lookup_ip_address('eth0')
        print "eth0: " + str(NAO_IP)
        if NAO_IP is None :
            NAO_IP = lookup_ip_address('eth1')
            print "eth1: " + str(NAO_IP)
            if NAO_IP is None :
                NAO_IP = lookup_ip_address('eth2')
                print "eth2: " + str(NAO_IP)
                if NAO_IP is None :
                    NAO_IP = lookup_ip_address('wlan0')
                    print "wlan: " + str(NAO_IP)

def lookup_ip_address(ifname):

    address = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        address = socket.inet_ntoa(fcntl.ioctl(
            s.fileno(),
            0x8915,  # SIOCGIFADDR
            struct.pack('256s', ifname[:15])
        )[20:24])
    except:
        pass
    return address

def main():
    # Main entry point

    global NAO_IP
    determine_ip_address()

    parser = OptionParser()
    parser.add_option("--pip",
        help="Parent broker port. The IP address or your robot",
        dest="pip")
    parser.add_option("--pport",
        help="Parent broker port. The port NAOqi is listening to",
        dest="pport",
        type="int")
    parser.set_defaults(
        pip=NAO_IP,
        pport=9559)

    (opts, args_) = parser.parse_args()
    pip   = opts.pip
    pport = opts.pport

    myBroker = ALBroker("myBroker",
       "0.0.0.0",   # listen to anyone
       0,           # find a free port and use it
       pip,         # parent broker IP
       pport)       # parent broker port

    global module_instance
    module_instance = WowModule("module_instance")
    last_server_update = -1

    try:
        thread1 = None
        server_polling_delay = 10
        while True:
            # Analyze photo every server_polling_delay seconds if not already doing so
            if not module_instance.is_uploading_photo and time.time() - last_server_update > server_polling_delay:
                if thread1 is not None:
                    thread1.join()
                thread1 = threading.Thread(target=module_instance.check_server_for_status)
                thread1.start()
                last_server_update = time.time()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Interrupted by user, shutting down")
        myBroker.shutdown()
        sys.exit(0)

if __name__ == "__main__":
    main()