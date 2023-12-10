const express = require('express');
const expressWs = require('express-ws');
const app = express();

let lightSwitch;
let doorMode;
let surveillanceMode;

expressWs(app);

const port = 8000;
const wsClients = [];
const espClient = [];

let access = 0;


app.post('/',(req, res)=>{
  const {username, password} = req.body;
  if(username == "Hyefur" && password == "password"){
    access = 1;
    res.status(200).json({
      message: 'Access Granted',
    });
  }else{
    access = 0;
    res.status(200).json({
      message: 'Access Denied',
    });
  }
});


app.get('/logout',(req, res)=>{
    access = 0;
    res.status(200).json({
      message: 'Logout Successful',
    });
});


app.ws('/esp', (ws) => {
console.log('ESP32 connected');
espClient.push(ws);
               
ws.on('message', (message) => {
 console.log(`Received from ESP32: ${message}`);
   wsClients.forEach((flutterSocket) => {
   flutterSocket.send(message);
     });
   });
});

app.ws('/flutter', (ws) => {
  console.log('Flutter app connected');
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
