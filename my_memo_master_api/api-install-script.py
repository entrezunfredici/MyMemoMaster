#========================================================================
# This python script created by frederic Macabiau can to help you to create and update your api
# for launch this script you need to have npm, python3.10 and pip installed
# to run the script in Linux or MacOS you can run the following command
# python3.10 api-install-script.py
# or in windows you can run the following command
# py -3 api-install-script.py
#========================================================================
#libraries
import os
import platform
try:
    import inquirer
except:
    if(platform.system()=="Windows"):
        os.system("py -3 -m pip install inquirer")
    else:
        os.system("python3.10 -m pip install inquirer")
    import inquirer
print("========================================================================")
print("bienvennue dans le script de creation et d'update d'api")
#this dictionary contains all the choises you can make in this script
choises= {
    "create api",
    "update api"
}
#this dictionary contains all the commands to install the necessary packages
commands= {
    "npm install express",
    "npm install nodemon --save-dev",
    "npm install sequelize",
    "npm install mysql2",
    "npm install sqlite3",
    "npm install --save-dev jest supertest",
    "npm install bcrypt",
    "npm install http-errors",
    "npm install jsonwebtoken",
    "npm install express-openapi-validator",
    "npm install cors",
    "npm install dotenv"
    "npm install serve-favicon",
}
#inquirer is a library that allows you to ask questions to the user
questions = [inquirer.List("choise", message="que voulez vous faire", choices=choises)]
answers = inquirer.prompt(questions)
#this condition allows you to execute the command according to the choice of the user
if(answers["choise"]=="update api"):
    command="npm update"
else:
    command="npm init"
print("execution de la commande ⇒  "+command)
os.system(command)
#this loop allows you to execute all the commands in the commands dictionary
for command in commands:
    print("execution de la commande ⇒  "+command)
    os.system(command)
print("========================================================================")