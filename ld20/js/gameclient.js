
//globals
cm = {};

tMCow.client.otherPlayers = [];
tMCow.client.zombies = [];

gunReloading =0;
showBang =0;

var teams = [];
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

var playerMoveSpeed = 6; // go on, change it if you dare!
var playerMoveSpeedDiag = Math.floor((Math.sqrt((playerMoveSpeed*playerMoveSpeed)/2))); // x and y lengths of diagonal move.

var playerFacing = 0;
var facingDirections = ['n','ne','e','se','s','sw','w','nw'];
var teamCols = ['r','b','g'];

var tile_dim_x = 32;
var tile_dim_y = 32;

var sprite_height = 32;
var sprite_width = 32;

var viewportTileWidth = 20;
var viewportTileHeight = 11;

var viewportHeight = 352;
var viewportWidth = 640;

function point2D(x,y){
    this.X = x;
    this.Y = y;
}

function gunfireTimeoutFunction(){
    gunReloading = 0;
}

function bangTimeoutFunction(){
    showBang = 0;
}

//HTML****************************************************************************************

function showPlayerLabel(name,x,y){

    //tMCow.client.logit('called show player label '+name+" : "+x+" : "+y);

    var l = getPlayerLabel(name);
    if(l == null){
        l = addPlayerLabel(name);
    }

    l.style.visibility = 'visible';
    l.style.marginLeft = x + 'px';
    l.style.marginTop = y + 'px';
}

function getPlayerLabel(name){
    var l = document.getElementById('namelabel_'+name);
    if(!l || l == null){
        return null;
    }else{
        return l;
    }
}

function hidePlayerLabel(name){
    var l = document.getElementById('namelabel_'+name);
    if(l && l != null){
        l.style.visibility = 'hidden';
    }
}

function addPlayerLabel(name){
    //style="position:absolute;left:200px;top:100px;color:#a52a2a;font-weight:bold;

    var l = document.createElement("div");
    l.style.position = 'absolute';
    l.style.left ='200px';
    l.style.top='100px';
    l.style.color= '#a52a2a';
    l.style.fontWeight = 'bold';
    l.id = 'namelabel_'+name;
    l.innerHTML = name;

    document.getElementById('playernamelabels').appendChild(l);
    return l;
}

//************************************************************************************************

function intersectRectWalls(rect){
    return(tMCow.client.worldMap.getTile(rect.topleft.getTileX(),rect.topleft.getTileY()) == tMCow.tiles.TILE_TYPE_WALL
            || tMCow.client.worldMap.getTile(rect.bottomleft.getTileX(),rect.bottomleft.getTileY()) == tMCow.tiles.TILE_TYPE_WALL
            || tMCow.client.worldMap.getTile(rect.topright.getTileX(),rect.topright.getTileY()) == tMCow.tiles.TILE_TYPE_WALL
            || tMCow.client.worldMap.getTile(rect.bottomright.getTileX(),rect.bottomright.getTileY()) == tMCow.tiles.TILE_TYPE_WALL);
}

// get bounding rectangle corner tile locations - hotspot is top left in world coords
function intersectCornerTiles(hotSpot,width,height){
    var retval = {};

    var trSpot = new point2D(hotSpot.X+width,hotSpot.Y);
    var brSpot = new point2D(hotSpot.X+width,hotSpot.Y+height);
    var blSpot = new point2D(hotSpot.X,hotSpot.Y+height);

    retval.topleft = new point2D(hotSpot.X,hotSpot.Y);
    retval.topright = new point2D(trSpot.X,trSpot.Y);
    retval.bottomright = new point2D(brSpot.X,brSpot.Y);
    retval.bottomleft = new point2D(blSpot.X,blSpot.Y);

    return retval;
}

point2D.prototype.getTileY = function(){
    return Math.floor(this.Y / tile_dim_y);    
}
point2D.prototype.getTileX = function(){
    return Math.floor(this.X / tile_dim_x);
}

var viewportOrigin = new point2D(0,0);

//Canvas Manager constructor
function canvasManager(id){
	this.canvas = document.getElementById(id);
	this.context2D = this.canvas.getContext('2d');
	this.images = new Array();
	this.imageCount =0;
	this.imageLoadedCount =0;
	this.updateInterval = null;
	this.lastTime = (new Date()).getTime();
	this.fps = 0;
	this.trackFPS = 0;
}

//blank the canvas
canvasManager.prototype.clearCanvas = function(){
	this.context2D.clearRect(0,0,this.canvas.width,this.canvas.height);
}

//draw a filled rectangle
canvasManager.prototype.fillRectangle = function(x1,y1,x2,y2,r,b,g,a) {
	this.context2D.fillStyle = "rgba("+r+", "+g+", "+b+", "+a+")";
	this.context2D.fillRect(x1,y1,x2,y2);
}

//draw an image from the collection 
canvasManager.prototype.renderImage = function(imageName, dx, dy){
	
	if(imageName.length >0){
		var img = this.images[imageName];
		 this.context2D.drawImage(img,0,0,img.width,img.height,dx,dy,img.width,img.height);
	}
}

canvasManager.prototype.renderImageSlice = function(imageName, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight){
	var img = this.images[imageName];
	this.context2D.drawImage(img,sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight);
}

//Load an image into the collection
canvasManager.prototype.setImage = function(imageName,imageURL){
	var img = new Image();
	img.canvas = this;
	img.loaded = 0;
	img.name = imageName;
	img.onload = function() {this.loaded =1;};
	this.images[imageName] = img;
	img.loadURL = imageURL;	
	img.preload = function(){this.loaded=0;this.src=this.loadURL;this.canvas.imagePreloaded(this);};
	this.imageCount ++;
}

//preload all images
canvasManager.prototype.preLoadImages = function(){		
	for(var img in this.images){
		this.images[img].preload();
	}
}

//Handle the event of an image preloading
canvasManager.prototype.imagePreloaded = function(img){

	//debug
	//alert(img.name + " LOADED "+img.src+" "+img.width+ " x " + img.height);

	this.imageLoadedCount ++;
	if(this.imageCount == this.imageLoadedCount)
		this.onPreload();		
}

//To be overrided as needed.
canvasManager.prototype.onPreload = function(){;}

//#######################################################################
//intervals

//Draw function - override me!
canvasManager.prototype.onRender = function(){
	
}

//Every Update
canvasManager.prototype.onUpdate = function(){
	if(this.trackFPS ==1)
	{
		var now = (new Date()).getTime();	
		this.fps = 1000 / (now - cm.lastTime);
		this.lastTime = now;	
	}
}

//every update 0 OVERRIDE ME!!
canvasManager.prototype.update = function(){
	this.onUpdate();
}

canvasManager.prototype.render = function(){
	this.onRender();
}

canvasManager.prototype.start = function(renderSpeed,updateSpeed){
	window.addEventListener('keydown',doKeyDown,true);
    window.addEventListener('keyup',doKeyUp,true);
	this.updateInterval = setInterval(this.update,updateSpeed);
    this.updateInterval = setInterval(this.render,renderSpeed);
}

//#######################################################################
// test functions
tMCow.canvasInit = function()
{
	cm = new canvasManager("canvy");
	cm.canvas.width= viewportWidth;
	cm.canvas.height=viewportHeight;
	//init
	cm.onPreload = function(){cm.start(30,60);};
	cm.update = function(){cm.onUpdate();};
    cm.render = function(){cm.onRender();};
	cm.onRender = draw;
    cm.onUpdate = update;

    //walls and floors
	cm.setImage('floor','./img/grass1.png');
	cm.setImage('wall','./img/hedge.png');

	//PC
    //red
    //not carrying
	cm.setImage('man_r_n_m_n','./img/man_r_n_m_n.png');
	cm.setImage('man_r_e_m_n','./img/man_r_e_m_n.png');
    cm.setImage('man_r_s_m_n','./img/man_r_s_m_n.png');
    cm.setImage('man_r_w_m_n','./img/man_r_w_m_n.png');
    cm.setImage('man_r_ne_m_n','./img/man_r_ne_m_n.png');
    cm.setImage('man_r_se_m_n','./img/man_r_se_m_n.png');
    cm.setImage('man_r_sw_m_n','./img/man_r_sw_m_n.png');
    cm.setImage('man_r_nw_m_n','./img/man_r_nw_m_n.png');

    //blue
    //not carrying
    cm.setImage('man_b_n_m_n','./img/man_b_n_m_n.png');
	cm.setImage('man_b_e_m_n','./img/man_b_e_m_n.png');
    cm.setImage('man_b_s_m_n','./img/man_b_s_m_n.png');
    cm.setImage('man_b_w_m_n','./img/man_b_w_m_n.png');
    cm.setImage('man_b_ne_m_n','./img/man_b_ne_m_n.png');
    cm.setImage('man_b_se_m_n','./img/man_b_se_m_n.png');
    cm.setImage('man_b_sw_m_n','./img/man_b_sw_m_n.png');
    cm.setImage('man_b_nw_m_n','./img/man_b_nw_m_n.png');

    //Zombie
    cm.setImage('zom_g_n_m_n','./img/zom_g_n_m_n.png');
    cm.setImage('zom_g_e_m_n','./img/zom_g_e_m_n.png');
    cm.setImage('zom_g_s_m_n','./img/zom_g_s_m_n.png');
    cm.setImage('zom_g_w_m_n','./img/zom_g_w_m_n.png');
    cm.setImage('zom_g_ne_m_n','./img/zom_g_ne_m_n.png');
    cm.setImage('zom_g_se_m_n','./img/zom_g_se_m_n.png');
    cm.setImage('zom_g_sw_m_n','./img/zom_g_sw_m_n.png');
    cm.setImage('zom_g_nw_m_n','./img/zom_g_nw_m_n.png');

    //jewels
    cm.setImage('jewel','./img/jewel.png');

    //teamflags
    cm.setImage('redflag','./img/redflag.png');
    cm.setImage('blueflag','./img/blueflag.png');

    //bangs - no, that is a fringe.
    cm.setImage('bangnorth','./img/bangnorth.png');
    cm.setImage('bangeast','./img/bangeast.png');
    cm.setImage('bangsouth','./img/bangsouth.png');
    cm.setImage('bangwest','./img/bangwest.png');

	cm.preLoadImages();	
	//cm.trackFPS = 1;

    // What team is player in
    var startx,starty;
    if(tMCow.client.player.team ==0){ // red
        startx =0;
        starty =79;
    }
    if(tMCow.client.player.team ==1){ // blue
        startx =70;
        starty =0;
    }

    viewportOrigin = new point2D(startx*tile_dim_x,starty*tile_dim_y);
    tMCow.client.logit(viewportOrigin);
}

keyState = {'UP':0,'DOWN':0,'LEFT':0,'RIGHT':0};

function setPlayerFacing(){
    if(keyState.UP==1 && keyState.LEFT==0 && keyState.RIGHT == 0){
        playerFacing = 0;
    }else if(keyState.UP==1 && keyState.RIGHT == 1){
        playerFacing = 1;
    }else if(keyState.UP==0 && keyState.DOWN ==0 && keyState.RIGHT == 1){
        playerFacing = 2;
    }else if(keyState.DOWN ==1 && keyState.RIGHT == 1){
        playerFacing = 3;
    }else if(keyState.DOWN ==1 && keyState.RIGHT == 0 && keyState.LEFT ==0){
        playerFacing = 4;
    }else if(keyState.DOWN ==1 && keyState.LEFT ==1){
        playerFacing = 5;
    }else if(keyState.DOWN ==0 && keyState.LEFT ==1 && keyState.UP ==0){
        playerFacing = 6;
    }else if(keyState.LEFT ==1 && keyState.UP ==1){
        playerFacing = 7;
    }

    tMCow.client.player.facing = playerFacing;
}

function getPlayerMovement(){
    if(keyState.UP==1 && keyState.LEFT==0 && keyState.RIGHT == 0){
        return 0;
    }else if(keyState.UP==1 && keyState.RIGHT == 1){
        return 1;
    }else if(keyState.UP==0 && keyState.DOWN ==0 && keyState.RIGHT == 1){
        return 2;
    }else if(keyState.DOWN ==1 && keyState.RIGHT == 1){
        return 3;
    }else if(keyState.DOWN ==1 && keyState.RIGHT == 0 && keyState.LEFT ==0){
        return 4;
    }else if(keyState.DOWN ==1 && keyState.LEFT ==1){
        return 5;
    }else if(keyState.DOWN ==0 && keyState.LEFT ==1 && keyState.UP ==0){
        return 6;
    }else if(keyState.LEFT ==1 && keyState.UP ==1){
        return 7;
    }else{
        return -1;
    }
}

function doKeyDown(evt){

    if(evt.keyCode == 32 && tMCow.client.player.carryingJewel ==0) {
		gunFire();
	}

	if(evt.keyCode == 38 || evt.keyCode == 87) {
		keyState.UP = 1;
	}
	if(evt.keyCode == 40 || evt.keyCode == 83) {
		keyState.DOWN =1;
	}
	if (evt.keyCode == 37 || evt.keyCode == 65){
		keyState.LEFT = 1;
	}
	if (evt.keyCode == 39 || evt.keyCode == 68){
		keyState.RIGHT = 1;
	}

    setPlayerFacing();
}

function doKeyUp(evt){

	if(evt.keyCode == 38 || evt.keyCode == 87) {
		keyState.UP = 0;
	}
	if(evt.keyCode == 40 || evt.keyCode == 83) {
		keyState.DOWN =0;
	}
	if (evt.keyCode == 37 || evt.keyCode == 65){
		keyState.LEFT = 0;
	}
	if (evt.keyCode == 39 || evt.keyCode == 68){
		keyState.RIGHT = 0;
	}

    setPlayerFacing();
}

function update()
{
    //updates from server
    for(name in tMCow.client.otherPlayers){
        if(tMCow.client.otherPlayers[name] != null
                && tMCow.client.otherPlayers[name].length>1)
        tMCow.client.otherPlayers[name].shift(); // remove the oldest update
    }
    for(name in tMCow.client.zombies){
        if(tMCow.client.zombies[name] != null
                && tMCow.client.zombies[name].length>1)
        tMCow.client.zombies[name].shift(); // remove the oldest update
    }

    //Did I hit a zombie?
    for(name in tMCow.client.zombies){
        if(tMCow.client.zombies[name] != null
                && tMCow.client.zombies[name].length>0){
            var z = tMCow.client.zombies[name][0];

            //is z in viewport?
            if(z.tileX >= viewportOrigin.getTileX()
                && z.tileX <= viewportOrigin.getTileX() +20
                && z.tileY >= viewportOrigin.getTileY()
                && z.tileY <= viewportOrigin.getTileY()+11){

                var myAbsX = tMCow.client.player.tileX*32 + tMCow.client.player.offsetX + 16;
                var myAbsY = tMCow.client.player.tileY*32 + tMCow.client.player.offsetY + 16;

                var zomAbsX = z.tileX*32 + z.offsetX +16;
                var zomAbsY = z.tileY*32 + z.offsetY +16;

                if(distPythag(myAbsX,myAbsY,zomAbsX,zomAbsY) < 16){
                    tMCow.client.iDied();
                    dead=1;

                    tMCow.client.player.offsetX =0;
                    tMCow.client.player.offsetY =0;

                    tMCow.client.player.carryingJewel =0;

                    if(tMCow.client.player.team == 0){
                        tMCow.client.player.tileX = teams[0].startX;
                        tMCow.client.player.tileY = teams[0].startY;

                        viewportOrigin.X = teams[0].startViewX*32;
                        viewportOrigin.Y = teams[0].startViewY*32;
                    }else{
                        tMCow.client.player.tileX = teams[1].startX;
                        tMCow.client.player.tileY = teams[1].startY;

                        viewportOrigin.X = teams[1].startViewX*32;
                        viewportOrigin.Y = teams[1].startViewY*32;
                    }
                }
            }
        }
    }

    //update the player
    var move = getPlayerMovement();
    if(move <0) return;

    var xmove=0,ymove=0;

    if(move ==0){
        ymove -= playerMoveSpeed;
    }else if(move ==1){
        ymove -= playerMoveSpeedDiag;
        xmove += playerMoveSpeedDiag;
    }else if(move ==2){
        xmove += playerMoveSpeed;
    }else if(move ==3){
        ymove += playerMoveSpeedDiag;
        xmove += playerMoveSpeedDiag;
    }else if(move ==4){
        ymove += playerMoveSpeed;
    }else if(move ==5){
        ymove += playerMoveSpeedDiag;
        xmove -= playerMoveSpeedDiag;
    }else if(move ==6){
        xmove -= playerMoveSpeed;
    }else if(move ==7){
        ymove -= playerMoveSpeedDiag;
        xmove -= playerMoveSpeedDiag;
    }

    var diag =0;
    var yfailed =0;
    var xfailed=0;

    if(xmove !=0 && ymove!=0){
        diag =1;
    }

    var xtest = intersectCornerTiles(
            new point2D(
                    tMCow.client.player.tileX*32 + tMCow.client.player.offsetX + xmove + 6,
                    tMCow.client.player.tileY*32 + tMCow.client.player.offsetY + 6),20,20);

    var ytest = intersectCornerTiles(
            new point2D(
                    tMCow.client.player.tileX*32 + tMCow.client.player.offsetX + 6,
                    tMCow.client.player.tileY*32 + tMCow.client.player.offsetY + ymove + 6),20,20);

    if(intersectRectWalls(ytest)){
        yfailed =1;
        if(ymove<0){//hit some tiles going up, by how much?
            var over = (tMCow.client.player.tileY*32 + tMCow.client.player.offsetY +ymove+6) % 32;
            ymove += 32-over;
        }else if(ymove>0){//hit tiles going down
            var over = (tMCow.client.player.tileY*32 + tMCow.client.player.offsetY +ymove+26) % 32;
            ymove -= (over+1);
        }
    }
    if(intersectRectWalls(xtest)){
        xfailed =1;
        if(xmove<0){//hit some tiles going left, by how much?
            var over = (tMCow.client.player.tileX*32 + tMCow.client.player.offsetX +xmove+6) % 32;
            xmove += 32-over;
        }else if(xmove>0){//hit tiles going right
            var over = (tMCow.client.player.tileX*32 + tMCow.client.player.offsetX +xmove+26) % 32;
            xmove -= (over+1);
        }
    }

    if(yfailed==1 && xfailed ==0 && diag==1){
        if(xmove>0) xmove = playerMoveSpeed; else xmove = 0-playerMoveSpeed;
    }else if (yfailed==0 && xfailed ==1 && diag==1){
        if(ymove>0) ymove = playerMoveSpeed; else ymove = 0-playerMoveSpeed;
    }

    tMCow.client.player.offsetY += ymove;
    tMCow.client.player.offsetX += xmove;

    if(tMCow.client.player.offsetX <= -32){
        tMCow.client.player.tileX --;
        tMCow.client.player.offsetX +=32;
    }
    if(tMCow.client.player.offsetX >= 32){
        tMCow.client.player.tileX ++;
        tMCow.client.player.offsetX -=32;
    }
    if(tMCow.client.player.offsetY <= -32){
        tMCow.client.player.tileY --;
        tMCow.client.player.offsetY +=32;
    }
    if(tMCow.client.player.offsetY >= 32){
        tMCow.client.player.tileY ++;
        tMCow.client.player.offsetY -=32;
    }

    //if the player is moving outside the middle rect of the viewport and the viewport is able to move in the player's
    //direction, the viewport moves.

    if(tMCow.client.player.tileY < viewportOrigin.getTileY() +4
            && viewportOrigin.Y >0
            && ymove<0){
        viewportOrigin.Y +=ymove;
        if(viewportOrigin.Y<0){
            viewportOrigin.Y =0;
        }
    }else if(tMCow.client.player.tileY > viewportOrigin.getTileY() +6
            && viewportOrigin.Y < (tile_dim_y*90) - viewportHeight
            && ymove>0){
        viewportOrigin.Y +=ymove;
        if(viewportOrigin.Y>(tile_dim_y*90) - viewportHeight){
            viewportOrigin.Y =(tile_dim_y*90) - viewportHeight;
        }
    }

    if(tMCow.client.player.tileX < viewportOrigin.getTileX() +6
            && viewportOrigin.X >0
            && xmove<0){
        viewportOrigin.X += xmove;
        if(viewportOrigin.X<0){
            viewportOrigin.X =0;
        }
    }else if(tMCow.client.player.tileX > viewportOrigin.getTileX() +13
            && viewportOrigin.X < (tile_dim_x*90) - viewportWidth
            && xmove >0){
        viewportOrigin.X += xmove;
        if(viewportOrigin.X>(tile_dim_x*90) - viewportWidth){
            viewportOrigin.X =(tile_dim_y*90) - viewportWidth;
        }
    }

    var dead = 0;

    //Did I hit a zombie?
    for(name in tMCow.client.zombies){
        if(tMCow.client.zombies[name] != null
                && tMCow.client.zombies[name].length>0){
            z = tMCow.client.zombies[name][0];

            //is z in viewport?
            if(z.tileX >= viewportOrigin.getTileX()
                && z.tileX <= viewportOrigin.getTileX() +20
                && z.tileY >= viewportOrigin.getTileY()
                && z.tileY <= viewportOrigin.getTileY()+11){

                myAbsX = tMCow.client.player.tileX*32 + tMCow.client.player.offsetX + 16;
                myAbsY = tMCow.client.player.tileY*32 + tMCow.client.player.offsetY + 16;

                zomAbsX = z.tileX*32 + z.offsetX +16;
                zomAbsY = z.tileY*32 + z.offsetY +16;

                if(distPythag(myAbsX,myAbsY,zomAbsX,zomAbsY) < 16){
                    tMCow.client.iDied();
                    dead=1;

                    tMCow.client.player.offsetX =0;
                    tMCow.client.player.offsetY =0;

                    tMCow.client.player.carryingJewel =0;

                    if(tMCow.client.player.team == 0){
                        tMCow.client.player.tileX = teams[0].startX;
                        tMCow.client.player.tileY = teams[0].startY;

                        viewportOrigin.X = teams[0].startViewX*32;
                        viewportOrigin.Y = teams[0].startViewY*32;
                    }else{
                        tMCow.client.player.tileX = teams[1].startX;
                        tMCow.client.player.tileY = teams[1].startY;

                        viewportOrigin.X = teams[1].startViewX*32;
                        viewportOrigin.Y = teams[1].startViewY*32;
                    }
                }
            }
        }
    }

    //finally tell server where we think we should be
    tMCow.client.playerSendLocation();


}

function distPythag(x1,y1,x2,y2){
    var opp = Math.abs(x1-x2);
    var adj = Math.abs(y1-y2);
    return Math.sqrt((opp*opp) + (adj*adj));
}

function draw()
{
   
    cm.clearCanvas();

    var tx = viewportOrigin.getTileX();
    var ty = viewportOrigin.getTileY();
    var offx = viewportOrigin.X % tile_dim_x;
    var offy = viewportOrigin.Y % tile_dim_y;

    var renderX =0 - offx; // the scrolling offset
    var renderY =0 - offy;

    var im = 'wall';

    for(var y =ty;y<ty+viewportTileHeight+1;y++){
        for(var x = tx;x<tx+viewportTileWidth+1;x++){
            if(x<90 && y<90){
                if(tMCow.client.worldMap.getTile(x,y) == tMCow.tiles.TILE_TYPE_FLOOR){
                    im = 'floor'
                }else if(tMCow.client.worldMap.getTile(x,y) == tMCow.tiles.TILE_TYPE_WALL){
                    im = 'wall'
                }

                //draw tiles
                //tMCow.client.logit("about to draw "+x+" : "+y+" at "+renderX+" : "+renderY);
                cm.renderImage(im,renderX,renderY);
                renderX += tile_dim_x;
            }
        }
        renderY += tile_dim_y;
        renderX =0 - offx;
    }

    //just draw team flags anyway - let canvas cull
    cm.renderImage('redflag',
            (teams[0].startX*tile_dim_x) - viewportOrigin.X,
            (teams[0].startY*tile_dim_y) - viewportOrigin.Y);

    cm.renderImage('blueflag',
            (teams[1].startX*tile_dim_x) - viewportOrigin.X,
            (teams[1].startY*tile_dim_y) - viewportOrigin.Y);


    //draw player
    cm.renderImage('man_'+teamCols[tMCow.client.player.team]
            +'_'+facingDirections[playerFacing]
            +'_m_n',
            (tMCow.client.player.tileX*tile_dim_x) +tMCow.client.player.offsetX - viewportOrigin.X,
            (tMCow.client.player.tileY*tile_dim_y) +tMCow.client.player.offsetY - viewportOrigin.Y);

    // is player carrying jewel?
    if(tMCow.client.player.carryingJewel ==1){
        cm.renderImage('jewel',
            (tMCow.client.player.tileX*tile_dim_x) +tMCow.client.player.offsetX - viewportOrigin.X,
            (tMCow.client.player.tileY*tile_dim_y) +tMCow.client.player.offsetY - viewportOrigin.Y);
    }

    //is player banging?
    if(showBang ==1){
        var bangimg ='';
        if(tMCow.client.player.facing == 0){
            bangimg = 'bangnorth';
        }
        if(tMCow.client.player.facing == 1){
            bangimg = 'bangnorth';
        }
        if(tMCow.client.player.facing == 2){
            bangimg = 'bangeast';
        }
        if(tMCow.client.player.facing == 3){
            bangimg = 'bangeast';
        }
        if(tMCow.client.player.facing == 4){
            bangimg = 'bangsouth';
        }
        if(tMCow.client.player.facing == 5){
            bangimg = 'bangsouth';
        }
        if(tMCow.client.player.facing == 6){
            bangimg = 'bangwest';
        }
        if(tMCow.client.player.facing == 7){
            bangimg = 'bangwest';
        }

         cm.renderImage(bangimg,
            (tMCow.client.player.tileX*tile_dim_x) +tMCow.client.player.offsetX - viewportOrigin.X,
            (tMCow.client.player.tileY*tile_dim_y) +tMCow.client.player.offsetY - viewportOrigin.Y);
    }

    //player name label
    var myNameLabel = document.getElementById('myNameLabel');
    myNameLabel.innerHTML = tMCow.client.player.displayName;
    myNameLabel.style.marginTop = ((tMCow.client.player.tileY*tile_dim_y) +tMCow.client.player.offsetY - viewportOrigin.Y +32) + 'px';
    myNameLabel.style.marginLeft = ((tMCow.client.player.tileX*tile_dim_x) +tMCow.client.player.offsetX - viewportOrigin.X -8) + 'px';


    //draw other players
    for(name in tMCow.client.otherPlayers){
        if(tMCow.client.otherPlayers[name] != null
                && tMCow.client.otherPlayers[name].length>0){
            var p = tMCow.client.otherPlayers[name][0];

            //is p in viewport?
            if(p.tileX >= viewportOrigin.getTileX()
                && p.tileX <= viewportOrigin.getTileX() +20
                && p.tileY >= viewportOrigin.getTileY()
                && p.tileY <= viewportOrigin.getTileY()+11){

                cm.renderImage('man_'+teamCols[p.team]
                    +'_'+facingDirections[p.facing]
                    +'_m_n',
                    (p.tileX*tile_dim_x) +p.offsetX - viewportOrigin.X,
                    (p.tileY*tile_dim_y) +p.offsetY - viewportOrigin.Y);

                showPlayerLabel(p.displayName,(p.tileX*tile_dim_x) +p.offsetX - viewportOrigin.X -8,
                    (p.tileY*tile_dim_y) +p.offsetY - viewportOrigin.Y +32);

                //is player carrying jewel
                if(p.carryingJewel ==1){
                    cm.renderImage('jewel',
                    (p.tileX*tile_dim_x) +p.offsetX - viewportOrigin.X,
                    (p.tileY*tile_dim_y) +p.offsetY - viewportOrigin.Y);
                }

            }else{
                //make sure we're not showing his label
                hidePlayerLabel(p.displayName);
            }
        }
    }

    //draw zombies
    for(name in tMCow.client.zombies){
        if(tMCow.client.zombies[name] != null
                && tMCow.client.zombies[name].length>0){
            var z = tMCow.client.zombies[name][0];

            //is z in viewport?
            if(z.tileX >= viewportOrigin.getTileX()
                && z.tileX <= viewportOrigin.getTileX() +20
                && z.tileY >= viewportOrigin.getTileY()
                && z.tileY <= viewportOrigin.getTileY()+11){

                cm.renderImage('zom_'+teamCols[z.team]
                    +'_'+facingDirections[z.facing]
                    +'_m_n',
                    (z.tileX*tile_dim_x) +z.offsetX - viewportOrigin.X,
                    (z.tileY*tile_dim_y) +z.offsetY - viewportOrigin.Y);
            }
        }
    }

    //draw jewels
    for(var index in tMCow.client.jewels){
        if(tMCow.client.jewels[index] != null){
            if(tMCow.client.jewels[index].tileX >= viewportOrigin.getTileX()
                    && tMCow.client.jewels[index].tileX <= viewportOrigin.getTileX() +20
                    && tMCow.client.jewels[index].tileY >= viewportOrigin.getTileY()
                    && tMCow.client.jewels[index].tileY <= viewportOrigin.getTileY()+11){


                cm.renderImage('jewel',
                        (tMCow.client.jewels[index].tileX*tile_dim_x) - viewportOrigin.X,
                        (tMCow.client.jewels[index].tileY*tile_dim_y) - viewportOrigin.Y);
            }
        }
    }
}

function length2D(x1,y1,x2,y2)
{
	var opp = y2-y1;
	var adj = x2-x1;
	var hypsqr = (opp*opp) + (adj*adj);
	var hyp = Math.sqrt(hypsqr);
		
	return hyp;
}



//hacky stuff


function gunFire(){

    //alert("fire!");

    if(gunReloading ==1)
        return;

    gunReloading=1;
    showBang =1;

    setTimeout(gunfireTimeoutFunction,1000);
    setTimeout(bangTimeoutFunction,500);

    //what squares did I hit?
    var squares = [];

    if(tMCow.client.player.facing ==0){
        for(i =0;i<20;i++){
            if(tMCow.client.worldMap.getTile(tMCow.client.player.tileX,tMCow.client.player.tileY -i) != 2){
                squares.push(new point2D(tMCow.client.player.tileX,tMCow.client.player.tileY -i));
                //alert("addsquare");
            }else{break;}
        }
    }
    if(tMCow.client.player.facing ==2){
        for(i =0;i<20;i++){
            if(tMCow.client.worldMap.getTile(tMCow.client.player.tileX+i,tMCow.client.player.tileY) != 2){
                squares.push(new point2D(tMCow.client.player.tileX+i,tMCow.client.player.tileY));
                //alert("addsquare");
            }else{break;}
        }
    }
    if(tMCow.client.player.facing ==4){
        for(i =0;i<20;i++){
            if(tMCow.client.worldMap.getTile(tMCow.client.player.tileX,tMCow.client.player.tileY+i) != 2){
                squares.push(new point2D(tMCow.client.player.tileX,tMCow.client.player.tileY+i));
                //alert("addsquare");
            }else{break;}
        }
    }
    if(tMCow.client.player.facing ==6){
        for(i =0;i<20;i++){
            if(tMCow.client.worldMap.getTile(tMCow.client.player.tileX-i,tMCow.client.player.tileY) != 2){
                squares.push(new point2D(tMCow.client.player.tileX-i,tMCow.client.player.tileY));
                //alert("addsquare");
            }else{break;}
        }
    }

    var gotone =0;
    //check to see if we got any zombies
     //Did I hit a zombie?
    for(name in tMCow.client.zombies){
        if(tMCow.client.zombies[name] != null
                && tMCow.client.zombies[name].length>0){
            var z = tMCow.client.zombies[name][0];

            //is z in viewport?
            if(z.tileX >= viewportOrigin.getTileX()
                && z.tileX <= viewportOrigin.getTileX() +20
                && z.tileY >= viewportOrigin.getTileY()
                && z.tileY <= viewportOrigin.getTileY()+11){

                //is zombie in one of our tiles?
                for(square in squares){
                    if(z.tileX == squares[square].X && z.tileY == squares[square].Y){
                        gotone =1;
                        tMCow.client.iGotOne(name);
                        break;
                    }
                }
            }
            if(gotone==1){
                delete tMCow.client.zombies[name];
                break;
            }
        }
    }
}
















