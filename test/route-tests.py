# Stress test, pentest and functionality test for the dpl backend (assuming only xnode-related backend code makes it into production)
import requests
import dotenv
import os

xnodeFunctionsPath = "http://localhost:3003/xnodes/functions/"
xnodeFunctions =    {   "createXnode":"POST",
                        "pushXnodeHeartbeat":"POST",
                        "getXnodeServices":"GET",
                        "storeXnodeSigningMessage":"POST",
                        "updateXnode":"PUT",
                        "getXnode":"GET",
                        "getNodesValidatorsStats":"GET",
                        "getXnodesWithNodesValidatorsStats":"POST",
                        "getXnodes":"GET"
                    }
dotenv.load_dotenv('test/.env')

sessionToken = os.getenv('SESSIONTOKEN')
appId = os.getenv('APPID')

header = {
    'x-parse-application-id': appId,
    'x-parse-session-token': sessionToken,
    'Content-Type': 'application/json',
}

createXnode = {
    "name": "config.name",
    "location": "config.location",
    "description": "config.desc",
    "provider": "config.provider",
    "isUnit": True,
    "deployment_auth": "001124",
    "services": "{}"
}
print(header)

response = requests.post(xnodeFunctionsPath + 'createXnode', headers=header, json=createXnode)
print(response.text)


def forAllFunctions():
    for function in xnodeFunctions:
        print(xnodeFunctionsPath + function)

        if xnodeFunctions[function] == 'POST':
            response = requests.post(xnodeFunctionsPath + function, headers=header)
            print(response.text)

        elif xnodeFunctions[function] == 'GET':
            response = requests.get(xnodeFunctionsPath + function, headers=header)
            print(response.text)

        elif xnodeFunctions[function] == 'PUT':
            response = requests.put(xnodeFunctionsPath + function, headers=header)
            print(response.text)
