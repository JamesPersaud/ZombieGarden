// zombies don't understand A*, or even diagonal movement!
// They just want to eat your BRAINS!
//
// node server for a horrible LD#20 entry by goffmog

var http = require('http');
var io = require('socket.io') // for npm, otherwise use require('./path/to/socket.io');

require('../commonjs/json2.js');
require('../commonjs/tileworld.js');

//hey, less than 4 hours to go, I can hack as much as I like.
rednames = [];
bluenames = [];

jewels = [];
jewelCarriers = [];
clients = []; //indexed by sessionId
players = []; //indexed by sessionId
zombies = []; //indexed by int
playercount = 0;
numteams = 2;
nextzombie=0;
maxzombies=100;
maxjewels = 50;
var serverRPC = {};

zombieMoveSpeed = 4;

function Jewel(x,y){
    this.tileX = x;
    this.tileY = y;
}

function Player(n,t,x,y){
    this.name = n;
    this.team = t;
    this.tileX =x;
    this.tileY =y;
    this.offsetX =0;
    this.offsetY =0;
    this.facing =0;
    this.lastFacing=0;
    this.displayName='';
    this.carryingJewel = 0;
    this.score =0;
}

teams = [];
teams[0] = {
    "startX":2,
    "startY":84,
    "startViewX":0,
    "startViewY":79,
    "name":"Red",
    "score":0
};
teams[1] = {
    "startX":82,
    "startY":2,
    "startViewX":70,
    "startViewY":0,
    "name":"Blue",
    "score":0
};

worldMap = new tMCow.tiles.World();
worldMap.loadMap('../commondata/map1.tilemap');

console.log("loaded worldmap");

var server = http.createServer(function(req, res){
 res.writeHead(200, {'Content-Type': 'text/html'});
 res.end('<h1>Hello world</h1>'); 
});
server.listen(666);
console.log("waiting for some clients");

zombieSpawnInterval = setInterval(spawnZombie,2000);
zombieUpdateInterval = setInterval(updateZombies,60);

//ZOMBIE FUNCTIONS*************************

function moveZombie(zombie,facing){
    zombies[zombie].facing = facing;

    //console.log("zomebie "+zombie+" move facing "+facing+ "at tile: "+worldMap.getTile(
      //          zombies[zombie].offsetX + zombies[zombie].tileX*32,
        //        zombies[zombie].offsetY + zombies[zombie].tileY*32));

    var absX = zombies[zombie].offsetX + zombies[zombie].tileX*32;
    var absY = zombies[zombie].offsetY + zombies[zombie].tileY*32;

    if(facing==0){ // UP
        absY -= zombieMoveSpeed;
        if (worldMap.getTile(Math.floor(absX/32),Math.floor(absY/32)) == tMCow.tiles.TILE_TYPE_WALL // up left will hit a wall
                || worldMap.getTile(Math.floor((absX+31)/32),Math.floor(absY/32)) == tMCow.tiles.TILE_TYPE_WALL){ // up right will hit a wall
            return 0;
        }else{
            zombies[zombie].offsetY -= zombieMoveSpeed;
            return 1;
        }
    }else if (facing ==2){ // RIGHT
        absX += zombieMoveSpeed;
        if (worldMap.getTile(Math.floor((absX+31)/32),Math.floor(absY/32)) == tMCow.tiles.TILE_TYPE_WALL // up right
                || worldMap.getTile(Math.floor((absX+31)/32),Math.floor((absY+31)/32)) == tMCow.tiles.TILE_TYPE_WALL){ // down right will hit a wall
            return 0;
        }else{
            zombies[zombie].offsetX += zombieMoveSpeed;
            return 1;
        }
    }else if(facing ==4){ // DOWN
        absY += zombieMoveSpeed;
        if (worldMap.getTile(Math.floor(absX/32),Math.floor((absY+31)/32)) == tMCow.tiles.TILE_TYPE_WALL // down left
                || worldMap.getTile(Math.floor((absX+31)/32),Math.floor((absY+31)/32)) == tMCow.tiles.TILE_TYPE_WALL){ // down right will hit a wall
            return 0;
        }else{
            zombies[zombie].offsetY += zombieMoveSpeed;
            return 1;
        }
    }else if(facing ==6){ // LEFT
        absX -= zombieMoveSpeed;
        if (worldMap.getTile(Math.floor(absX/32),Math.floor(absY/32)) == tMCow.tiles.TILE_TYPE_WALL // up left
                || worldMap.getTile(Math.floor(absX/32),Math.floor((absY+31)/32)) == tMCow.tiles.TILE_TYPE_WALL){ // down left
            return 0;
        }else{
            zombies[zombie].offsetX -= zombieMoveSpeed;
            return 1;
        }
    }

    return 0;
}

function updateZombies(){
    var movers = [];
    for(zombie in zombies){
        zombies[zombie].target = null;
        for(var player in players){
            if(Math.abs(players[player].tileX - zombies[zombie].tileX) <=20
                && Math.abs(players[player].tileY - zombies[zombie].tileY) <=11){

                //zombie targets this player
                if(zombies[zombie].target == null){
                    zombies[zombie].target = player;
                    movers.push(zombie);
                }
                
                //tell player where the zombie is
                clients[player].send('{"func":"zombieUpdate","args":'+JSON.stringify(zombies[zombie])+'}');
            }
        }
    }

    for(mover in movers){

        var z = zombies[movers[mover]];

        if(z.target != null){

            var p = players[z.target];

            var playerAbX = p.tileX*32 + p.offsetX;
            var playerAbY = p.tileY*32 + p.offsetY;

            var zomAbX = z.tileX*32 + z.offsetX;
            var zomAbY = z.tileY*32 + z.offsetY;

            var xdiff = playerAbX - zomAbX; // if pos then right
            var ydiff = playerAbY - zomAbY; // if pos then down

            //console.log("mover diffs "+xdiff+" : "+ydiff);

            var moved = moveZombie(movers[mover],zombies[movers[mover]].facing);

            if(moved ==0) // must have hit a wall, pick a new direction preference
            {
                var moveprefs = [];

                if(Math.abs(ydiff) >= Math.abs(xdiff)){
                    if(ydiff <=0){// want to go up
                        moveprefs.push(0);
                        if(xdiff<0) moveprefs.push(6); else moveprefs.push(2);
                        if(xdiff>0) moveprefs.push(2); else moveprefs.push(6);
                        moveprefs.push(4);
                    }else if(ydiff>0){// want to go down
                        moveprefs.push(4);
                        if(xdiff<0) moveprefs.push(6); else moveprefs.push(2);
                        if(xdiff>0) moveprefs.push(2); else moveprefs.push(6);
                        moveprefs.push(0);
                    }
                }else{
                    if(xdiff <=0){// want to go left
                        moveprefs.push(6);
                        if(ydiff<0) moveprefs.push(0); else moveprefs.push(4);
                        if(ydiff>0) moveprefs.push(4); else moveprefs.push(0);
                        moveprefs.push(2);
                    }else if(xdiff>0){// want to go right
                        moveprefs.push(2);
                        if(ydiff<0) moveprefs.push(0); else moveprefs.push(4);
                        if(ydiff>0) moveprefs.push(4); else moveprefs.push(0);
                        moveprefs.push(6);
                    }
                }

                for(pref in moveprefs){
                    if(!(moveprefs[pref] == 0 && zombies[movers[mover]].lastFacing == 4)  // the pacman non-reversal trick
                            && !(moveprefs[pref] == 4 && zombies[movers[mover]].lastFacing == 0)
                            && !(moveprefs[pref] == 2 && zombies[movers[mover]].lastFacing == 6)
                            && !(moveprefs[pref] == 6 && zombies[movers[mover]].lastFacing == 2)){

                        moved = moveZombie(movers[mover],moveprefs[pref]);
                        if(moved == 1){
                            zombies[movers[mover]].lastFacing = moveprefs[pref];
                            break;
                        }
                    }
                }
            }

            if(moved==0){
                //must be stuck
                zombies[movers[mover]].lastFacing = -1;
            }

            if(zombies[movers[mover]].offsetX >=32){
                zombies[movers[mover]].tileX++;
                zombies[movers[mover]].offsetX -= 32;
            }else if(zombies[movers[mover]].offsetX <0){
                zombies[movers[mover]].tileX--;
                zombies[movers[mover]].offsetX += 32;
            }else if(zombies[movers[mover]].offsetY <0){
                zombies[movers[mover]].tileY--;
                zombies[movers[mover]].offsetY += 32;
            }else if(zombies[movers[mover]].offsetY >=32){
                zombies[movers[mover]].tileY++;
                zombies[movers[mover]].offsetY -= 32;
            }
        }
    }
}

function spawnZombie(){
    console.log("time to spawn");
    if(zombies.length <maxzombies){
        var i = Math.floor(Math.random()*worldMap.viableZombieLocations.length);
        var x = worldMap.viableZombieLocations[i] % 90;
        var y = Math.floor(worldMap.viableZombieLocations[i] / 90);

        if(worldMap.getTile(x,y) == tMCow.tiles.TILE_TYPE_WALL){
            console.log("zombie does not want :( "+x+" : "+y+" : "+worldMap.tileArray+" : "+tMCow.tiles.TILE_TYPE_WALL);
            return;
        }
        nextzombie++;
        zombies.push(new Player(nextzombie,2,x,y));
        console.log("spawned zombie "+x+" : "+y);
    }else {console.log("hit max zombies");}

    if(jewels.length < maxjewels){
        var ji = Math.floor(Math.random()*worldMap.viableZombieLocations.length);
        var jx = worldMap.viableZombieLocations[ji] % 90;
        var jy = Math.floor(worldMap.viableZombieLocations[ji] / 90);

        if(worldMap.getTile(jx,jy) == tMCow.tiles.TILE_TYPE_WALL){
            console.log("jewels in the walls are for Dwarf games "+jx+" : "+jy+" : "+worldMap.tileArray+" : "+tMCow.tiles.TILE_TYPE_WALL);
            return;
        }

        jewels.push(new Jewel(jx,jy));
        console.log("spawned jewel "+jx+" : "+jy);

        for(p in players){
            clients[p].send('{"func":"updateJewels","args":'+JSON.stringify(jewels)+'}');
        }

    }else {console.log("hit max jewels");}
}

//RPC********************************

serverRPC.iGotOne = function(args,client){

    var really =0;

    for(var zom in zombies){
        if(zombies[zom] != null && zombies[zom].name == args){
            really =1;
            delete zombies[zom];
            break;
        }
    }

    if(really ==1){
        console.log("GOT ONE");
        sendServerMessage(players[client].displayName+" shot a Zombie!");

        teams[players[client].team].score += 25;

        for(var sess in players){
            if(players[sess] !=null){
                clients[sess].send('{"func":"killZombie","args":"'+args+'"}');
                clients[sess].send('{"func":"updateScores","args":'+JSON.stringify(teams)+'}');
            }
        }
    }
}

serverRPC.iDied = function(args,client){
    var index = jewelCarriers.indexOf(client);
    if(index>-1){
        delete jewelCarriers[index];
    }
    sendServerMessage("On noes! "+players[client].displayName+" was zombified :(");
}

// player has sent his location, update and send to other players
serverRPC.playerSendLocation = function(args,client){

    // did the player pick up a jewel?
    //get the absolute centre of the player
    var absX = (args.tileX*32) + args.offsetX + 16;
    var absY = (args.tileY*32) + args.offsetY + 16;

    var score =0;

    //Is this a player getting a jewel?
    for(var j in jewels){
        if(distPythag(absX,absY,jewels[j].tileX*32 +16,jewels[j].tileY*32 +16) < 16 && args.carryingJewel ==0){
            args.carryingJewel = 1;
            delete jewels[j];

            jewelCarriers.push(client);

            console.log('Player got jewel!');
            for(p in players){
                if(clients[p] != null)
                    clients[p].send('{"func":"updateJewels","args":'+JSON.stringify(jewels)+'}');
            }

            clients[client].send('{"func":"gotJewel","args":1}');
            sendServerMessage(args.displayName + " picked up a jewel... It's BIG!");

            teams[args.team].score += 100;
            score=1;
            clients[client].send('{"func":"updateScores","args":'+JSON.stringify(teams)+'}');
            break;
        }
    }

    var carrying = jewelCarriers.indexOf(client);

    //Is this a player taking a jewel home?
    if(args.carryingJewel && carrying > -1){
        var distanceToHome = distPythag(absX,absY,teams[args.team].startX*32+16,teams[args.team].startY*32+16);
        if(distanceToHome <=64){
        args.carryingJewel = 0;
            var teamname;
            if(args.team == 0)
                teamname = "RED";
            else
                teamname = "BLUE";

            clients[client].send('{"func":"gotJewelHome","args":1}');
            sendServerMessage(args.displayName + " returned a jewel for the "+teamname+" team, yay!");

            var index = jewelCarriers.indexOf(client);
            delete jewelCarriers[index];

            teams[args.team].score += 1000;
            score=1;
            clients[client].send('{"func":"updateScores","args":'+JSON.stringify(teams)+'}');
        }
    }

    players[client] = args;
    console.log("got update from "+client+" "+args.name);

    for(otherPlayer in players){
        if(Math.abs(players[otherPlayer].tileX - args.tileX) <=20
                && Math.abs(players[otherPlayer].tileY - args.tileY) <=11
                && otherPlayer != client){
            clients[otherPlayer].send('{"func":"playerUpdate","args":'+JSON.stringify(args)+'}');
        }

        //this player scored so tell all players about it
        if(score ==1){
            clients[otherPlayer].send('{"func":"updateScores","args":'+JSON.stringify(teams)+'}');
        }
    }

    console.log(jewelCarriers);
}

function distPythag(x1,y1,x2,y2){
    var opp = Math.abs(x1-x2);
    var adj = Math.abs(y1-y2);
    return Math.sqrt((opp*opp) + (adj*adj));   
}

serverRPC.playerSetName = function(args,client){

    var teamcol,teamname;
    if(players[client].team == 0){
        teamcol = "red";
        teamname = "RED";
    }else{
        teamcol = "blue";
        teamname = "BLUE";
    }

    if(args == ''){
        clients[client].send('{"func":"setNameResponse","args":"'+players[client].name+'"}');
        if(players[client].team == 0) rednames.push(players[client].name); else bluenames.push(players[client].name);
        sendServerMessage(players[client].name+" has joined the "+teamname+" team.");
        sendNames();
        return;
    }

    for(var sess in players){
        if(players[sess] !=null){
            if(players[sess].displayName == args && sess != client){
                clients[client].send('{"func":"setNameResponse","args":"'+players[client].name+'"}');
                if(players[client].team == 0) rednames.push(players[client].name); else bluenames.push(players[client].name);
                sendServerMessage(players[client].name+" has joined the "+teamname+" team.");
                sendNames();
                return;
            }
        }
    }

    players[client].displayName = args;
    clients[client].send('{"func":"setNameResponse","args":"'+args+'"}');
    if(players[client].team == 0) rednames.push(args); else bluenames.push(args);
    sendServerMessage(args+" has joined the "+teamname+" team.");
    sendNames();
}

serverRPC.playerShout = function(args,client){
    args = args.replace("'","");
    args = args.replace('"','');
    args = args.replace('\\','');

    var teamcol;
    if(players[client].team == 0){
        teamcol = "red;";
    }else{
        teamcol = "blue;";
    }

    var message = "<br/>"+players[client].displayName+ " : " + args;

    for(var sess in players){
        if(players[sess] !=null){
            console.log("Messaging" + sess);
            clients[sess].send('{"func":"showMessage","args":"'+message+'"}');
        }
    }
}

function sendNames(){

    var names = {};
    names.red = rednames;
    names.blue = bluenames;

    for(var sess in players){
        if(players[sess] !=null){
            console.log("Messaging" + sess);
            clients[sess].send('{"func":"getNames","args":'+JSON.stringify(names)+'}');
        }
    }
}

function sendServerMessage(message){
    //&#34;
    console.log("Message function called");
    message = message.replace('"','&#34;');

    message = "<br/><span style=&#34;color:green;&#34;>"+message+"</span>";


    for(var sess in players){
        if(players[sess] !=null){
            console.log("Messaging" + sess);
            clients[sess].send('{"func":"showMessage","args":"'+message+'"}');
        }
    }
}

// socket.io ****************************
var socket = io.listen(server); 
console.log("socket object made");
socket.on('connection', function(client){
  // new client is here! 
 console.log("Client is here, yay!");

 //ADDING A NEW PLAYER TO GAME************************

 clients[client.sessionId] = client;
 client.send('{"func":"getWorldMap","args":'+worldMap.serializeTiles()+'}');
 playercount++;
 var team =numteams - 1 - (playercount % numteams);
 console.log("assigning team "+team);
 var startx = Math.floor(Math.random()*5) + teams[team].startX;
 var starty = Math.floor(Math.random()*5) + teams[team].startY;
 players[client.sessionId] = new Player(client.sessionId,team,startx,starty);
 client.send('{"func":"getPlayerInfo","args":'+JSON.stringify(players[client.sessionId])+'}');
 client.send('{"func":"updateJewels","args":'+JSON.stringify(jewels)+'}');
 client.send('{"func":"updateScores","args":'+JSON.stringify(teams)+'}');

 //END ADDING*******************************************


  client.on('message', function(data){
	console.log("Client message? "+data);
	data = JSON.parse(data);
	var args = data.args;
	serverRPC[data.func](args,client.sessionId);
  });

  //console.log(client);
  client.on('disconnect', function(){

    console.log("client disconnect (ohnoes)");
    sendServerMessage(players[client.sessionId].displayName+" has disconnected.. Bye!");

    var redname = rednames.indexOf(players[client.sessionId].displayName);
    if(redname > -1){
        delete rednames[redname];
    }
    var bluename = bluenames.indexOf(players[client.sessionId].displayName);
    if(bluename > -1){
        delete bluenames[bluename];
    }

    delete players[client.sessionId];
    delete clients[client.sessionId];
    var carrying = jewelCarriers.indexOf(client.sessionId);
    if(carrying >-1){
        delete jewelCarriers[carrying];
    }
    sendNames();

  });
  console.log('sessid: '+client.sessionId);
}); 
console.log("serving now");


