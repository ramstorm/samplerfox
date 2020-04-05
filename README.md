# SamplerFox
SamplerFox is a web page and backend software for Raspberry Pi to simplify sample file management for a drum track version of SamplerBox - see https://github.com/ramstorm/SamplerBox for more info.

**Functions:**
* Web page accessible via wifi access point. Connect to the `SamplerFox` wifi and open `samplerfox.com` in a browser.
* Upload/download samples or other files to/from the Raspberry Pi via the web page.
* Browse sample directories, rename/remove/zip/unzip files and directories.
* Each sample has a volume slider to easily set levels.
* Automatically format all sample filenames in a directory to match the SamplerBox drum track naming scheme and assign each sample to its own MIDI note.
* Responsive web design - the page works well on phones, tablets and computers.
* System functions: start/stop sampler, set rw/ro filesystem, disable WiFi and web server, restart and shutdown.
* The filesystem is read-only to avoid data loss on power off. Toggle rw/ro via web page. NOTE: many functions require the filesystem to be in rw mode.

**Parts needed:**
* Raspberry Pi 3 Model B+ (earlier models lack built in wifi but will probably work with some customizations).
* SD card (at least 8 GB is recommended).
* USB MIDI interface, keyboard, drum pad controller or any combination (configurable in startup script, default setup: 1 MIDI interface + 1 keyboard).
* 1 or 2 USB sound cards (2 if you want a separate output for kick drums, cheap thumb drive-like sound cards tend to work well).
* Reliable power source for the Raspberry Pi, a bad one can cause a sound card to suddenly go offline or other problems.

## Installation
#### Prepare SD card
Flash Raspbian Buster Lite to SD card.

#### Enable SSH
Before unmounting the SD card after flashing, create an empty file named `ssh` on the first partition.
Unmount the SD card and put it in the pi, connect the pi to your network with a cable, start pi and login via ssh.

#### Update packages

```
sudo apt update
sudo apt-get update
sudo apt-get -y upgrade
```

#### Install tools

`sudo apt-get install -y git vim zip`

#### Install nginx

`sudo apt install -y nginx`

#### Install SamplerBox dependencies

`sudo apt-get install -y python-dev python-numpy cython python-smbus portaudio19-dev`

#### (Optional) Install M-Audio Midisport Drivers

`sudo apt-get install -y midisport-firmware`

#### Install node

```
wget https://nodejs.org/dist/v13.2.0/node-v13.2.0-linux-armv7l.tar.xz
tar -xvf node-v13.2.0-linux-armv7l.tar.xz
sudo cp -R node-v13.2.0-linux-armv7l/* /usr/local/   ### could be done more elegantly...

npm -v  ### should now be installed and show correct version
```

#### Install wifi access point dependencies

```
sudo apt install -y dnsmasq hostapd
sudo systemctl stop dnsmasq
sudo systemctl stop hostapd
```

#### SamplerFox

```
cd
mkdir -p sounds/kicks
mkdir -p sounds/samples
git clone https://github.com/ramstorm/samplerfox.git

## INSTALLATION:
cd ~/samplerfox/backend
npm install
cd ~/samplerfox/frontend
npm install

## (optional, do this to work with changes to the web page) DEVELOPMENT:
cd ~/samplerfox/backend
npm start
cd ~/samplerfox/frontend
npm start
# Then open a browser and surf to the IP of the raspberry pi to view the page

## BUILD AND DEPLOY PRODUCTION FRONTEND:
cd ~/samplerfox/frontend
npm run build
sudo cp -r build /var/www/

## INSTALL BACKEND AS A SERVICE:
sudo vim /etc/systemd/system/samplerfox-be.service

# Add the following content (without the -----):
# --------------------------
[Unit]
Description=SamplerFox Backend

[Service]
ExecStart=/usr/local/bin/node /home/pi/samplerfox/backend/server.js
Restart=no
User=root
Group=root
StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target
# --------------------------

## ENABLE AUTOSTART:
sudo systemctl enable samplerfox-be
# Expected output:
# Created symlink /etc/systemd/system/multi-user.target.wants/samplerfox-be.service → /etc/systemd/system/samplerfox-be.service.
```

#### SamplerBox

```
cd
git clone https://github.com/superquadratic/rtmidi-python.git ; cd rtmidi-python ; sudo python setup.py install ; cd ..
git clone http://people.csail.mit.edu/hubert/git/pyaudio.git ; cd pyaudio ; sudo python setup.py install ; cd ..
git clone https://github.com/ramstorm/SamplerBox.git

cd SamplerBox
make

cp startm.sh ~
(edit if needed)

## SERVICE
sudo vim /etc/systemd/system/samplerbox-starter.service

# Add the following content (without the -----):
# --------------------------
[Unit]
Description=SamplerBox Starter

[Service]
Type=oneshot
KillMode=process
WorkingDirectory=/home/pi/SamplerBox
ExecStart=/home/pi/startm.sh
Restart=no
User=root
Group=root
StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target
# --------------------------
# Don't enable this service, it's only used for manual start via web page.

## AUTOSTART
sudo vim /etc/rc.local
# Add the following before the exit line:
/home/pi/startm.sh > /dev/null 2>&1 &
```

#### Configure nginx

```
sudo vim /etc/nginx/nginx.conf

## Change this line as follows:
        access_log off;

## Change and MOVE this line to the TOP OF THE FILE (IMPORTANT):
        error_log /dev/null;

## Add the following lines at the end of the "http" block.
## IP must match the static IP configured for the Raspberry PI (see "Setup raspberry pi as wifi access point"):
        upstream backend-server {
          server 192.168.4.1:3001;
        }

        server {
          listen 80;
          server_name samplerfox.com;
          client_max_body_size 5G;
          root /var/www/build;
          index index.html;

          location /api/ {
            proxy_pass http://backend-server;
          }

          location / {
            try_files $uri /index.html;
          }
        }

## Point error log to /dev/null:
sudo rm /var/log/nginx/error.log
sudo ln -s /dev/null /var/log/nginx/error.log
```

#### (Optional and not recommended) Connect pi to EXISTING wifi
(Instead of this, it is recommended to follow "Setup Raspberry Pi as wifi access point")

```
sudo vim /etc/wpa_supplicant/wpa_supplicant.conf
# Add the following lines to the bottom of the file (use applicable country code and ssid/psk of your choice):

country=SE
network={
    ssid="ssidname"
    psk="password"
}
```

#### Setup Raspberry Pi as wifi access point

```
sudo vim /etc/dhcpcd.conf
# Add/edit this to the end of the file:
interface wlan0
    static ip_address=192.168.4.1/24
    nohook wpa_supplicant

sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
sudo vim /etc/dnsmasq.conf
# Add this (use the required wireless interface - usually wlan0):
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h

sudo vim /etc/hostapd/hostapd.conf
# Add the following (use desired wifi ssid and password):
interface=wlan0
driver=nl80211
ssid=SamplerFox
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=raspberry
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

sudo vim /etc/default/hostapd
# Replace line with #DAEMON_CONF with:
DAEMON_CONF="/etc/hostapd/hostapd.conf"

# The following is needed to make dnsmasq work with a read-only filesystem:
sudo vim /etc/dnsmasq.conf
# Add this to the end of the file:
dhcp-leasefile=/tmp/dnsmasq.leases

# Add hostname for access point (to be able to use samplerfox.com in a browser instead of IP):
sudo vim /etc/hosts
# Add this to the end of the file:
192.168.4.1     samplerfox.com

sudo systemctl unmask hostapd
sudo systemctl enable hostapd
```

#### Read-only Filesystem

```
sudo apt-get remove -y --purge triggerhappy logrotate dphys-swapfile
sudo apt-get autoremove -y --purge

sudo vim /boot/cmdline.txt
# Add this to the end of the line:
fastboot noswap ro

sudo apt-get install -y busybox-syslogd
sudo apt-get remove -y --purge rsyslog

sudo vim /etc/fstab
# Add ",ro" to all block devices and append tmpfs lines, example:
proc                  /proc     proc    defaults             0     0
PARTUUID=fb0d460e-01  /boot     vfat    defaults,ro          0     2
PARTUUID=fb0d460e-02  /         ext4    defaults,noatime,ro  0     1
tmpfs        /tmp            tmpfs   nosuid,nodev         0       0
tmpfs        /var/log        tmpfs   nosuid,nodev         0       0
tmpfs        /var/tmp        tmpfs   nosuid,nodev         0       0

sudo rm -rf /var/lib/dhcp /var/lib/dhcpcd5 /var/spool /etc/resolv.conf
sudo ln -s /tmp /var/lib/dhcp
sudo ln -s /tmp /var/lib/dhcpcd5
sudo ln -s /tmp /var/spool
sudo touch /tmp/dhcpcd.resolv.conf
sudo ln -s /tmp/dhcpcd.resolv.conf /etc/resolv.conf
sudo rm /var/lib/systemd/random-seed
sudo ln -s /tmp/random-seed /var/lib/systemd/random-seed

sudo vim /lib/systemd/system/systemd-random-seed.service
# Add the following line under the [Service] section:
ExecStartPre=/bin/echo "" > /tmp/random-seed

sudo vim /etc/bash.bash_logout
# Add:
mount -o remount,ro /
mount -o remount,ro /boot
```

#### Optional: add useful aliases to ~/.bashrc

```
vim ~/.bashrc
# Add the following lines to the end of the file:

alias ll='ls -la'
alias psall='ps aux | grep -v grep | grep "sampler\|startm\|nginx" ; sudo rfkill list all'
alias rsall="ps aux | grep -v grep | grep samplerbox | awk '{print \$2}' | xargs sudo kill ; sudo systemctl start samplerbox-starter ; sudo systemctl restart samplerfox-be ; sudo /etc/init.d/nginx restart ; sudo rfkill unblock wifi"
alias killall="ps aux | grep -v grep | grep samplerbox | awk '{print \$2}' | xargs sudo kill ; sudo systemctl stop samplerfox-be ; sudo /etc/init.d/nginx stop"
alias ro='sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot'
alias rw='sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot'
set_bash_prompt() {
    fs_mode=$(mount | sed -n -e "s/^\/dev\/.* on \/ .*(\(r[w|o]\).*/\1/p")
    PS1='\[\033[01;32m\]\u@\h${fs_mode:+($fs_mode)}\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
}
PROMPT_COMMAND=set_bash_prompt
```

#### Reboot to activate services and read only filesystem
NOTE: After rebooting you must run the command `rw` when logged in via ssh to be able to create/change files.
Keep this in mind if you need to make additional changes. Run `ro` when done to lock the filesystem again.
