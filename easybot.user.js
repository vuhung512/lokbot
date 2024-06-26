// ==UserScript==
// @name         LOKBOT
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Example Tampermonkey script
// @author       HUNZU98
// @match        https://play.leagueofkingdoms.com/*
// @grant        none
// @downloadURL https://github.com/vuhung512/lokbot/raw/main/easybot.user.js
// @updateURL    https://github.com/vuhung512/lokbot/raw/main/easybot.user.js
// ==/UserScript==



(function() {
    'use strict';

//#region code

async function main(){
    let version=  12
    
let alliancedata = {};
let connection = null;
notifyMe("ver",version,false)
async function  delayseconds(seconds,toseconds=null) {
    if (toseconds)
    seconds = Math.floor(Math.random() * (toseconds - seconds + 1)) + seconds;

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
}
async function stop_visibilitychange(s){
    // visibilitychange events are captured and stopped 
  
    await delayseconds (s)
    // document.addEventListener("visibilitychange", function(e) {
    //     e.stopImmediatePropagation();
    // }, true);
    // document.visibilityState always returns false
    Object.defineProperty(Document.prototype, "hidden", {
        get: function hidden() {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    // document.visibilityState always returns "visible"
    Object.defineProperty(Document.prototype, "visibilityState", {
        get: function visibilityState() {
            return "visible";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Document.prototype, "isFocus", {
        get: function isFocus() {
            return true;
        },
        enumerable: true,
        configurable: true
    });
}
function notifyMe(title,mess,keep=false) {
    function thistime(){
        
        var currentTime = new Date();
        var hours = currentTime.getHours();
        var minutes = currentTime.getMinutes();
        var seconds = currentTime.getSeconds();
        
        return "["+hours + ":" + minutes + ":" + seconds+"]";
        
        }
    if (Notification.permission !== 'granted')
        Notification.requestPermission();
    else {
        if ( alliancedata.alliancedata)
        title =alliancedata.alliance_name
        var notification = new Notification(
            thistime()+title, {
            body: mess,
            requireInteraction: keep // Thêm thuộc tính requireInteraction để thông báo không tự đóng
        });
        notification.onclick = function() {
        window.open("","_blank");

        };
    }
}
async function matchserver(messjson){
    if (messjson.notification){
        notifyMe(messjson.notification.title,messjson.notification.mess,messjson.notification.iskeep)
    }
    if (messjson.apiPath){
        const rs = await postapilok(messjson.apiPath, messjson.postData);
        console.log(messjson.apiPath,rs);
        sendMessageWS({ matchtype: "xhr", apiPath: messjson.apiPath, requestData: rs });
    }
    
    if (messjson.reconnect){
        reconnect()
    }
    if (messjson.cmd=="focus"){
       // window.focus()

    }
    if (messjson.cmd=="update"){
        window.location.href ="https://github.com/vuhung512/lokbot/raw/main/easybot.user.js"
        window.focus()

    }

    if (messjson.cmd=="reload"){
        location.reload();
    }
}
function connectWebSocket() {
    if (!connection || connection.readyState === 3) {
        if (connection) {
            connection.onmessage = null;
            connection.onclose = null;
            connection.onopen = null;
        }

        connection = new WebSocket('wss://simple-polydactyl-brick.glitch.me:');
        var pingInterval =null
        connection.onopen = function() {
            console.log('WebSocket connected!');
            pingInterval = setInterval(function() {
                sendMessageWS({ text: "ping"});
            },  60 * 1000); // 2 phút
        

        };
        connection.onmessage =  function(message) {
            message = message.data;
            const messjson = JSON.parse(message);
            console.log('New message:', messjson);
            matchserver(messjson)
           

   
        };

        connection.onclose = function(event) {
        console.log("disconnected from glitch")

            if (pingInterval)
            clearInterval(pingInterval);
        try{
            //connectWebSocket(); //connect again

        }
        catch{

        }
            console.log("reconnecting");
        };
    }
}
connectWebSocket()
function sendMessageWS(data) {
    connectWebSocket();
    function sendWhenReady() {
        if (connection.readyState ==1) {
            data.from_id = alliancedata.user_id;
            if (data.from_id) {
                connection.send(JSON.stringify(data));
            }
        } else {
            console.log("not ready connect")

            setTimeout(sendWhenReady, 100); // Kiểm tra lại sau 100ms nếu kết nối chưa sẵn sàng
        }
    }

    sendWhenReady(); // Bắt đầu quá trình gửi khi WebSocket được sẵn sàng
}
async function postapilok(api_path, postData) {
    try {
        // has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
        const response = await fetch("https://lok-api-live.leagueofkingdoms.com/api/" + api_path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Access-Token': alliancedata.token,
            },
            body: postData,
        });
        if (!response.ok) {
            notifyMe("error","ERROR post",false)
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function matchxhr(apiPath, responsexhr) {

    switch (apiPath) {
        case "auth/connect":
            alliancedata.token = responsexhr.token;
            alliancedata.user_id = responsexhr.user._id;
            alliancedata.connect = responsexhr;
            break;
        case "kingdom/enter":
            alliancedata.kingdom_enter = responsexhr;
            alliancedata.alliance_name=responsexhr.kingdom.name;
            document.title= alliancedata.alliance_name

            alliancedata.alliance_id=responsexhr.kingdom._id
            window.focus()
            break;
        default:
            break;
    }
    console.log(apiPath, responsexhr);
    sendMessageWS({ matchtype: "xhr", apiPath: apiPath, requestData: responsexhr });
}

function startXHRListener() {
    let send = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function() {
        let xhr = this;
        this.addEventListener("readystatechange", function() {
            if (xhr.readyState === 4) {
                let url = xhr.responseURL;
                if (url.includes("leagueofkingdoms.com/api/")) {
                    let responsexhr;
                    if (xhr.response instanceof ArrayBuffer){
                        responsexhr = new TextDecoder().decode(xhr.response);
                    }
                    else
                    {
                        responsexhr = xhr.responseText;
                    }
                    const apiPath = url.split('/api/').pop();
                    try {
                        responsexhr = JSON.parse(responsexhr);
                    } catch {}
                    
                   matchxhr(apiPath, responsexhr);
                }
            }
        });

        send.apply(this, arguments);
    };
}
function matchws(endpoint,payload){
sendMessageWS({ matchtype: "ws", apiPath: endpoint, requestData: payload });

}
function startWebSocketListener() {
    let NativeWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        let socket = new NativeWebSocket(url, protocols);
        socket.send = function(data) {
            NativeWebSocket.prototype.send.apply(this, arguments);
        };
        socket.addEventListener('message', function(event) {
            try {
                let jsonData = JSON.parse(event.data.startsWith('42') ? event.data.slice(2) : event.data);
                if (Array.isArray(jsonData) && jsonData.length >= 2) {
                    let endpoint = jsonData[0];
                    let payload = jsonData[1];
                    console.log("WS",endpoint)
                    matchws(endpoint,payload)
                }
            } catch {
            }
            try{
               NativeWebSocket.prototype.dispatchEvent.apply(this, arguments);

            }catch{

            }
        });
        socket.addEventListener('open', function(event) {
        });

        socket.addEventListener('close', function(event) {
        });
        return socket;
    };
}
startXHRListener();

startWebSocketListener()
stop_visibilitychange(1)

function reconnect() {
    console.warn("RECONNECTING to AD")
    sendMessageWS({ matchtype: "xhr", apiPath: 'auth/connect', requestData: alliancedata.connect });
    sendMessageWS({ matchtype: "xhr", apiPath: 'kingdom/enter', requestData: alliancedata.kingdom_enter });
}
}
main()
//#endregion

})();
