/**
    "Class" library for a 2D tile engine.
 */
// depends on json2.js

tMCow = {};
tMCow.tiles = {};

//world attributes
tMCow.tiles.DEFAULT_TILE_HEIGHT = 32;
tMCow.tiles.DEFAULT_TILE_WIDTH = 32;
tMCow.tiles.DEFAULT_WORLD_HEIGHT = 90;
tMCow.tiles.DEFAULT_WORLD_WIDTH = 90;

//tile types
tMCow.tiles.TILE_TYPE_NONE = 0;
tMCow.tiles.TILE_TYPE_FLOOR = 1;
tMCow.tiles.TILE_TYPE_WALL = 2;

//main world class
tMCow.tiles.World = function(th,tw,wh,ww){
    //init globals
    this.tileHeight = th || tMCow.tiles.DEFAULT_TILE_HEIGHT;
    this.tileWidth = tw || tMCow.tiles.DEFAULT_TILE_WIDTH;
    this.worldHeight = wh || tMCow.tiles.DEFAULT_WORLD_HEIGHT;
    this.worldWidth = ww || tMCow.tiles.DEFAULT_WORLD_WIDTH;

    // init tile array
    this.tileArray = [];
    for(var i=0;i<this.worldHeight*this.worldWidth;i++){
        this.tileArray[i] = new tMCow.tiles.tile(i%this.worldWidth,Math.floor(i/this.worldHeight),tMCow.tiles.TILE_TYPE_NONE);
    }

    //member functions
    //insert new ones at the TOP! DUH!!!

    this.loadMap = function(filepath){
        require(filepath);
        this.tileArray = loadedMap;
    }

    this.getTile = function(x,y){
        return this.tileArray[(y*this.worldWidth)+x];
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


