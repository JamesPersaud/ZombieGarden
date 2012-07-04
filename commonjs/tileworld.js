/**
    "Class" library for a 2D tile engine.
 */
// depends on json2.js

tMCow = {};
tMCow.tiles = {};

//world attributes
tMCow.tiles.DEFAULT_TILE_HEIGHT = 32;
tMCow.tiles.DEFAULT_TILE_WIDTH = 32;
tMCow.tiles.DEFAULT_WORLD_HEIGHT = 25;
tMCow.tiles.DEFAULT_WORLD_WIDTH = 25;

//tile types
tMCow.tiles.TILE_TYPE_NONE = 0;
tMCow.tiles.TILE_TYPE_FLOOR = 1;
tMCow.tiles.TILE_TYPE_WALL = 2;
tMCow.tiles.TILE_TYPE_VILLAGEWALL = 3;
tMCow.tiles.TILE_TYPE_THATCH = 4;
tMCow.tiles.TILE_TYPE_DOOR = 5;
tMCow.tiles.TILE_TYPE_DUNFLOOR = 6;
tMCow.tiles.TILE_TYPE_DUNWALL = 7;
tMCow.tiles.TILE_TYPE_STAIRDOWN = 8;
tMCow.tiles.TILE_TYPE_STAIRUP = 9;

//main world class
tMCow.tiles.World = function(th,tw,wh,ww){
    //init globals
    this.tileHeight = th || tMCow.tiles.DEFAULT_TILE_HEIGHT;
    this.tileWidth = tw || tMCow.tiles.DEFAULT_TILE_WIDTH;
    this.worldHeight = wh || tMCow.tiles.DEFAULT_WORLD_HEIGHT;
    this.worldWidth = ww || tMCow.tiles.DEFAULT_WORLD_WIDTH;

    this.viableMonsterLocations = [];

    // init tile array
    this.tileArray = [];
    for(var i=0;i<this.worldHeight*this.worldWidth;i++){
        this.tileArray[i] = new tMCow.tiles.tile(i%this.worldWidth,Math.floor(i/this.worldHeight),tMCow.tiles.TILE_TYPE_NONE);
    }

    //member functions
    //insert new ones at the TOP! DUH!!!

    this.loadMap = function(filepath){
        console.log(filepath)
        require(filepath);
        this.tileArray = loadedMap;

        //console.log("going to push viables");

        for(y =0; y<tMCow.tiles.DEFAULT_WORLD_HEIGHT;y++){
            for(x = 0;x< tMCow.tiles.DEFAULT_WORLD_WIDTH;x++){
                var t = this.getTile(x,y);
                if(t == tMCow.tiles.TILE_TYPE_DUNFLOOR){
                    this.viableMonsterLocations.push(new tMCow.tiles.tile(x,y,t));
                    //console.log("pushed viable");
                }
            }
        }
    }

    this.getTile = function(x,y){
        return this.tileArray.tiles[(y*this.worldWidth)+x];
    };

    this.serializeTiles = function(){
        return JSON.stringify(this.tileArray);
    };

    this.deserializeTiles = function(json){
        this.tileArray = JSON.parse(json);
    }
}

//main tile class
tMCow.tiles.tile = function(xc,yc,ty){
    this.x = xc;
    this.y = yc;
    this.type = ty || tMCow.tiles.TILE_TYPE_NONE;
}


