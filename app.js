const express = require('express');
const expressWs = require('express-ws');
const app = express();
const OneSignal = require('@onesignal/node-onesignal');


const ONESIGNAL_APP_ID = "f8750b39-c115-4984-b8fa-b06a941503c8";

const app_key_provider = {
    getToken() {
        return 'NWEwY2Q0YTctNDA0YS00YjZmLWFhMWYtMjE2N2FmOTgxZGQw';
    }
};

const configuration = OneSignal.createConfiguration({
    authMethods: {
        app_key: {
        	tokenProvider: app_key_provider
        }
    }
});
const client = new OneSignal.DefaultApi(configuration);

let lightSwitch;
let doorMode;
let surveillanceMode;

expressWs(app);

const port = 8000;
const wsClients = [];
const espClient = [];

let access = 0;

app.get('/logout',(req, res)=>{
    access = 0;
    res.status(200).json({
      message: 'Logout Successful',
    });
});


app.ws('/esp', (ws) => {
console.log('ESP32 connected');
espClient.push(ws);

    wsClients.forEach((flutterSocket) => {
      flutterSocket.send(`Smart Home Connected`);
    });   
               
  ws.on('message', (message) => {
    console.log(`Received from ESP32: ${message}`);
        wsClients.forEach((flutterSocket) => {
          flutterSocket.send(message);
        });
   });

   ws.on('close', () => {
    console.log('ESP disconnected'); 
    espClient.splice(espClient.indexOf(ws), 1);
        wsClients.forEach((flutterSocket) => {
          flutterSocket.send(`Smart Home Disconnected`)
        }); 
  });


});


async function PushNotification(message){
  const notification = new OneSignal.Notification();
        notification.app_id = ONESIGNAL_APP_ID;
        notification.included_segments = ['Subscribed Users'];
        notification.headings = {
            en: "Smart Home"
          }
        notification.contents = {
            en: `$message`
        };
        const {id} = await client.createNotification(notification);
}


app.ws('/flutter', async(ws) => {
  console.log('Flutter app connected');

  PushNotification("Connection Established");

  wsClients.push(ws);

  wsClients.forEach((flutterSocket) => {
    flutterSocket.send(`Connected`)
  });
        

  ws.on('message', (newMessage) => {

    console.log(`Received from Flutter app: ${newMessage}`);
    const message = newMessage.toString();

    if(message.includes("Lights")){
       let value = message.split(" ");
       lightSwitch = value[1];       
       espClient.forEach((espSocket) => {
                 espSocket.send(`Light ${lightSwitch}`)
                   });

    }else if(message.includes("Door")){
       let value = message.split(" ");
       doorMode = value[1];
       espClient.forEach((espSocket) => {
                 espSocket.send(`Door ${doorMode}`) 
                   });

    }else{
       let value = message.split(" ");
       surveillanceMode = value[1];
       espClient.forEach((espSocket) => {
                 espSocket.send(`Surveillance ${surveillanceMode}`)   
                   });     
    }

  });

  ws.on('close', () => {
    console.log('Flutter app disconnected'); 
    wsClients.splice(wsClients.indexOf(ws), 1);
  });

});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
