#========================================================================
# This python script created by frederic Macabiau allow to start the back and the front of the OpenApi project
# for launch this script you need to have npm, python3.10 and pip installed
# to run the script in Linux or MacOS you can run the following command
# python3.10 start-server.py
# or in windows you can run the following command
# py -3 start-server.py
#========================================================================
#libraries
import os
import subprocess
import platform

# commands and folders
commands = [
    ("lancement de l'api", "npm run start", "my_memo_master_api"),
    # ("lancement du front", "ng serve", "my_memo_master_front")
]

# Exécution des commandes
for instance, command, directory in commands:
    print(instance)
    if platform.system() == "Windows":
        subprocess.Popen(["start", "cmd", "/c", command], cwd=directory, shell=True)
    else:
        subprocess.Popen(["open", "-a", "Terminal"], cwd=directory)
