## Softbank NAO Robot + Watson Visual Recognition
This repository contains two packages (python and NodeJS) that connect a [Softbank NAO robot](https://www.ald.softbankrobotics.com/en/cool-robots/nao) to the Watson [Visual Recognition Service](https://www.ibm.com/watson/developercloud/visual-recognition.html).

[![](wiki/media/nao_robot.jpg)](https://developer.softbankrobotics.com/us-en/showcase)

### Python Package
The [./python](python directory) contains a module that pings a NodeJS server for commands.  In this case, the server asks the robot to take a picture and upload it to the server. 

### NodeJS Package
The [./nodejs](nodejs directory) provides a UI that shows the results when a photos taken by the NAO robot are classified by the [Watson Visual Recognition Service](https://www.ibm.com/watson/developercloud/visual-recognition.html).  



