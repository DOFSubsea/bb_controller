#!/bin/bash
#service should have its working directory set to /home/debian/bb_controller
cd /home/debian/bb_controller
echo "*** Begin Startup $(date) ***" > startup.log
/usr/bin/tmux new-session -d -s server "/usr/local/bin/nodemon server"
echo "Started nodemon: $(date)" >> startup.log
sleep 10
/usr/bin/tmux new-session -d -s update "/usr/bin/watch -n1800 git pull origin master"
echo "Started watch for GitHub updates: $(date)" >> startup.log
echo "*** End Startup: $(date) *** " >> startup.log
