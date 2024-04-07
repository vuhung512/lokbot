// ==UserScript==
// @name         LOKBOT
// @namespace    http://tampermonkey.net/
// @version      0.6
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
    let version=  6
    notifyMe("ver",version,false)
    
var alliancedata = {};
let connection = null;


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
        var notification = new Notification(
            thistime()+title, {
            body: mess,
            requireInteraction: keep // Thêm thuộc tính requireInteraction để thông báo không tự đóng
        });
        notification.onclick = function() {
            window.location.href = window.location.href; 
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
        window.focus()

    }
    if (messjson.cmd=="update"){
        window.open("https://github.com/vuhung512/lokbot/raw/main/easybot.user.js", "_blank");

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
        const response = await fetch("https://lok-api-live.leagueofkingdoms.com/api/" + api_path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Access-Token': alliancedata.token,
            },
            body: postData,
        });
        if (!response.ok) {
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
            document.title=responsexhr.kingdom.name;
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
        return socket;
    };
}
startXHRListener();

startWebSocketListener()

function reconnect() {
    console.warn("RECONNECTING to AD")
    sendMessageWS({ matchtype: "xhr", apiPath: 'auth/connect', requestData: alliancedata.connect });
    sendMessageWS({ matchtype: "xhr", apiPath: 'kingdom/enter', requestData: alliancedata.kingdom_enter });
}
function thistime_sting(){
    var currentTime = new Date();
    var hours = currentTime.getHours();
    var minutes = currentTime.getMinutes();
    var seconds = currentTime.getSeconds();
    
    return "["+hours + ":" + minutes + ":" + seconds+"]";
    
    }
function newNotification(title,contain,keep=false) {
    if (Notification.permission !== 'granted')
        Notification.requestPermission();
    else {
        var notification = new Notification(
            thistime_sting+title, {
            body: contain,
            requireInteraction: keep // Thêm thuộc tính requireInteraction để thông báo không tự đóng
        });
        notification.onclick = function() {
            window.focus(); // Focus vào cửa sổ hiện tại khi nhấp vào thông báo
        };
    }
}

}
main()
//#endregion

})();
