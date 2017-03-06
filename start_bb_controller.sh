#!/bin/bash
#service should have its working directory set to /home/debian/bb_controller
cd /home/debian/bb_controller
echo "$(date)" > startup.log
echo "Waiting to ensure all resources are available..."
sleep 15
echo "Starting nodemon..." >> startup.log
/usr/bin/tmux new-session -d -s server "/usr/local/bin/nodemon server"
sleep 15
echo "Starting watch for GitHub updates..." >> startup.log
/usr/bin/tmux new-session -d -s update "/usr/bin/watch -n10 git pull origin master"
