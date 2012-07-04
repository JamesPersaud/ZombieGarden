/**
 // general stuff to connect to a node server and do a crude json rpc
 */

gotPlayerInfo =0;
gotWorldMap =0;
joinedGame =0;

myPlayerName = '';

tMCow.client = {};
tMCow.client.RPC = {};
tMCow.serverAddress = "ec2-50-17-110-166.compute-1.amazonaws.com";
tMCow.serverPort = 666;
tMCow.logging = 1;

tMCow.client.worldMap = new tMCow.tiles.World();

tMCow.client.jewels = [];

tMCow.client.player = {};
tMCow.client.player.name = "";
tMCow.client.player.team = "";
tMCow.client.player.sessionId = "";
tMCow.client.player.tileX =0;
tMCow.client.player.tileY =0;
tMCow.client.player.facing =0;
tMCow.client.player.displayName ='';
tMCow.client.player.carryingJewel = 0;

tMCow.client.logit = function(s){
    if(tMCow.logging == 1 && console !== undefined && console !== null && console && console.log){
	    console.log(s);
    }
}

//RPC********************************

tMCow.client.RPC.killZombie = function(args){
    if(tMCow.client.zombies[args] !=null){
        delete tMCow.client.zombies[args];
    }
}

//someone left or joined
tMCow.client.RPC.getNames = function(args){
    var red = args.red;
    var blue = args.blue;

    var redstring = "";
    var bluestring= "";

    for(redname in red){
        if(red[redname] != null)
            redstring += red[redname]+"<br/>";
        document.getElementById('redplayers').innerHTML = redstring;
    }
    for(bluename in blue){
        if(blue[bluename] != null)
            bluestring += blue[bluename]+"<br/>";
        document.getElementById('blueplayers').innerHTML = bluestring;
    }
}

//Someone scored
tMCow.client.RPC.updateScores = function(args){
    document.getElementById('redscore').innerHTML = args[0].score;
    document.getElementById('bluescore').innerHTML = args[1].score;
}

//touchdown!
tMCow.client.RPC.gotJewelHome = function(args){

    //alert('got jewelHome called ' + args);

    if(args ==1)
        tMCow.client.player.carryingJewel = 0;
}

//get got a jewel!
tMCow.client.RPC.gotJewel = function(args){

    //alert('got jewel called ' + args);

    if(args ==1)
        tMCow.client.player.carryingJewel = 1;
}

//get jewel locations
tMCow.client.RPC.updateJewels = function(args){
    tMCow.client.logit("getting jewels "+args);
    tMCow.client.jewels = args;
}

//show messages
tMCow.client.RPC.showMessage = function(args){
    document.getElementById('eventbox').innerHTML += args;
    document.getElementById('eventbox').scrollTop =document.getElementById('eventbox').scrollHeight;
}

//update positions of zombies
tMCow.client.RPC.zombieUpdate = function(args){
    if(tMCow.client.zombies[args.name] == null)
        tMCow.client.zombies[args.name] = [];

    tMCow.client.zombies[args.name].push(args);

    //tMCow.client.logit('pushing '+args.name+' counting '+ tMCow.client.otherPlayers[args.name].length);
}

//update positions of other players
tMCow.client.RPC.playerUpdate = function(args){
    if(tMCow.client.otherPlayers[args.name] == null)
        tMCow.client.otherPlayers[args.name] = [];

    tMCow.client.otherPlayers[args.name].push(args);

    //tMCow.client.logit('pushing '+args.name+' counting '+ tMCow.client.otherPlayers[args.name].length);
}

// Get map and session id and team at the same time.
tMCow.client.RPC.getPlayerInfo = function(args){
    tMCow.client.logit(args);
    tMCow.client.player = args;

    tMCow.client.player.offsetX =0;
    tMCow.client.player.offsetY =0;

    tMCow.client.logit('got player info');
    gotPlayerInfo = 1;

    if(gotPlayerInfo ==1 && gotWorldMap ==1 && joinedGame == 0){
        joinedGame=1;
        tMCow.canvasInit();
    }
}

tMCow.client.RPC.setNameResponse = function(args){
    if(args == 0){
        alert('Sorry, your name was taken, you will be known as '+args);
    }else
    {
        tMCow.client.player.displayName = args;
    }
}

// Get map and session id and team at the same time.
tMCow.client.RPC.getWorldMap = function(args){
    tMCow.client.logit(args);
    tMCow.client.worldMap.tileArray = args.tiles;

    tMCow.client.logit('got world map');
    gotWorldMap =1;    

    if(gotPlayerInfo ==1 && gotWorldMap ==1 && joinedGame == 0){
        joinedGame=1;
        tMCow.canvasInit();
    }
}

// message the server ******************

//Very very honest client
tMCow.client.iGotOne = function(zomb){
    tMCow.socket.send('{"func":"iGotOne","args":"'+zomb+'"}');
}

//Very honest client
tMCow.client.iDied = function(){
    tMCow.socket.send('{"func":"iDied","args":1}');
}

tMCow.client.playerShout = function(){

    var speakbox = document.getElementById('speakbox');
    var message = speakbox.value;
    speakbox.value = '';

    tMCow.socket.send('{"func":"playerShout","args":"'+message+'"}');
}

tMCow.client.playerSetName = function(name){
     tMCow.socket.send('{"func":"playerSetName","args":"'+name+'"}');
     if(name.toLowerCase() == 'lea' 
	|| name.toLowerCase() == 'leo'
        || name.toLowerCase() == 'leona'
        || name.toLowerCase() == 'leonecka'){
       
       tMCow.client.RPC.showMessage('Someone loves you... ');
       tMCow.client.RPC.showMessage("And it's me! I don't care if it's too late - I can't fix the past but I can make damn sure I never miss another opportunity to tell you or show you. I hope you like my game. Wherever you were and whatever you were doing when I was making this, I was thinking of you and missing you terribly.");
     }
}

tMCow.client.playerSendLocation = function(){
     tMCow.socket.send('{"func":"playerSendLocation","args":'+JSON.stringify(tMCow.client.player)+'}');
}


// CONNECTION FUNCTIONS**************

tMCow.client.connect = function(){

    if( typeof(io) == 'undefined' ||!io || io === undefined || io === null){
        tMCow.client.logit("Server not found");
        return false;
    }

    tMCow.socket = new io.Socket(tMCow.serverAddress,{port:tMCow.serverPort});

    //Client is connected
    tMCow.socket.on('connect', function(){
        tMCow.client.logit("mooo, connected!");
    });

    //A message is sent (always means an RPC)
    tMCow.socket.on('message', function(data){
	    //tMCow.client.logit("incoming moo:  "+data);
		data = JSON.parse(data);
        //tMCow.client.logit("parsed it");
		var args = data.args;
		tMCow.client.RPC[data.func](args);
	});

    //Client is disconnected
    tMCow.socket.on('disconnect', function(){
        tMCow.client.logit("oh noes, disconnected :(");
    });

    tMCow.client.logit("Server found connecting... ");
    tMCow.socket.connect();

    return true;
}

tMCow.client.disconnect = function(){
    tMCow.client.logit("Time to disconnect");
    tMCow.socket.disconnect();
}
