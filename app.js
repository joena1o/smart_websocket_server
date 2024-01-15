const express = require('express');
const expressWs = require('express-ws');
const app = express();
const OneSignal = require('@onesignal/node-onesignal');
const axios = require("axios");


const ONESIGNAL_APP_ID = "f8750b39-c115-4984-b8fa-b06a941503c8";

const app_key_provider = {
    getToken() {
        return 'NWEwY2Q0YTctNDA0YS00YjZmLWFhMWYtMjE2N2FmOTgxZGQw';
    }
};

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

app.get('/push/:message', async (req, res) => {
  const {message} = req.params; 
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Basic " + app_key_provider
  };
  const url = "https://onesignal.com/api/v1/notifications";
  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: `Smart Home` },
    contents: { en: message, },
    include_external_user_ids: ["100011"],
    channel_for_external_user_ids: "push",
    content_available: true,
    isAndriod: true,
  };
  try {
    const data  = await axios.post(url, body, { headers });
    console.log(data);
  } catch (err) {
    console.log(err);
  }
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



app.ws('/flutter', async(ws) => {

  console.log('Flutter app connected');
  wsClients.push(ws);

  wsClients.forEach((flutterSocket) => {
    flutterSocket.send(`Connected`);
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
