# bb_controller
Provides a Node server with routes that allow users to monitor and configure the Beaglebone for use with ThingSpeak and/or SeaState APIs.

<h4>Setup</h4>
<ul>
  <li>
    Download the latest IoT Debian OS image from <a href='http://beagleboard.org/latest-images'>here</a>. Do not download from the <em>Recommended Debian Images</em> section because these images include a GUI and require more space (and time to boot). Instead, download from the <b>Alternate Debian Images</b> section. The name should be similar to <em>Debian 8.6 2016-12-09 4GB SD IoT</em>.
  </li>
  <li>
    Extract the image from the archive using 7-zip or any other archiving application.
  </li>
  <li>
    Write the extracted <em>.img</em> file to a micro SD card using <em>Win32 Disk Imager (Windows)</em> or <em>Etcher (Mac)</em>.
  </li>
  <li>
    Put the micro SD card into the Beaglebone and power it with the USB cable or an appropriate power supply. <em>If you are planning to communicate with the device through the USB cable, make sure the drivers are installed.</em>
  </li>
  <li>
    Using <em>PuTTY (Windows)</em> or <em>Terminal (Mac)</em>, <code>ssh debian@device-ip-address</code>. You may need to enter <code>y</code> if prompted to trust the device connection. When prompted for a password, use the default <code>temppwd</code>.
  </li>
  <li>
    Enable UART Ports
    <ul>
      <li>
        Enter the following command to begin editing the uEvt file. <code>sudo nano /boot/uEvt.txt</code>
      </li>
      <li>
        Use the arrow keys to navigate to the bottom of the file and add the following line: <code>cape_enable=bone_capemgr.enable_partno=BB-UART2,BB-UART4</code>. Press <code>Ctrl-o</code> and then press <code>Enter</code> to save the changes.
      </li>
    </ul>
  </li>
  <li>
    Free up port 80 which is, by default, used to host the built-in Beagleboard startup web page
    <ul>
      <li>
        <code>sudo nano /lib/systemd/system/bonescript.socket</code>
      </li>
      <li>
        Change the line that reads <code>ListenStream=80</code> to <code>ListenStream=8080</code> - it doesn't <em>really</em> matter what you change it to as long is it's not 22, 23, 80, or 443.
      </li>
      <li>
        Press <code>Ctrl-o</code> and then press <code>Enter</code> to save the changes.
      </li>
    </ul>
  <li>
    Install bb_controller from GitHub and configure using the following commands
    <ul>
      <li>
        <code>cd ~/</code> - this will ensure you are in the <code>/home/debian</code> directory.
      </li>
      <li>
        <code>git clone https://github.com/DOFSubsea/bb_controller</code> - this will pull the program files from GitHub.
      </li>
      <li>
        <code>cd bb_controller</code> - go into the bb_controller directory created by the previous command.
      </li>
      <li>
        <code>npm install</code> - this installs all the dependencies required for bb_controller to run.
      </li>
      <li>
        <code>ln -s bb_controller.service /etc/systemd/system/multi-user.target.wants/bb_controller.service</code> - this creates a symbolic link to the bb_controller.service file so that it will be started when the device boots. This also ensures that any updates to this file on GitHub will take effect the next time the service is started.
      </li>
    </ul>
  </li>
  <li>
    Restart the device with <code>sudo reboot now</code>
  </li>
  <li>
    After the device reboots, open a web browser and type the IP address of the device into the address bar. You should see the device status page that shows some basic information about the device. Click the <em>Configure</em> button, edit the device configuration, and click <em>Save</em>. The changes take effect immediately and do not require the device to be restarted.
  </li>
</ul>
