var tileArray = new Array();
var probabilityModifier = 0;
var mapWidth=135;
var mapheight=65;
var tileSize=10;

var landMassAmount=2; // scale of 1 to 5
var landMassSize=3; // scale of 1 to 5


$('#stage').css('width',(mapWidth*tileSize)+'px');


for (var i = 0; i < mapWidth*mapheight; i++) {

    var probability = 0;
    var probabilityModifier = 0;

    if (i<(mapWidth*2)||i%mapWidth<2||i%mapWidth>(mapWidth-3)||i>(mapWidth*mapheight)-((mapWidth*2)+1)){

        // make the edges of the map water
        probability=0;
    }
    else {

        probability = 15 + landMassAmount;

        if (i>(mapWidth*2)+2){

            // Conform the tile upwards and to the left to its surroundings 
            var conformity =
				(tileArray[i-mapWidth-1]==(tileArray[i-(mapWidth*2)-1]))+
				(tileArray[i-mapWidth-1]==(tileArray[i-mapWidth]))+
				(tileArray[i-mapWidth-1]==(tileArray[i-1]))+
				(tileArray[i-mapWidth-1]==(tileArray[i-mapWidth-2]));

            if (conformity<2)
            {
                tileArray[i-mapWidth-1]=!tileArray[i-mapWidth-1];
            }
        }

        // get the probability of what type of tile this would be based on its surroundings 
        probabilityModifier = (tileArray[i-1]+tileArray[i-mapWidth]+tileArray[i-mapWidth+1])*(19+(landMassSize*1.4));
    }

    rndm=(Math.random()*101);
    tileArray[i]=(rndm<(probability+probabilityModifier));
	
}

for (var i = 0; i < tileArray.length; i++) {
    if (tileArray[i]) {
        $('#stage').append('<div class="tile earth ' + i + '"> </div>');
    }
    else {
        $('#stage').append('<div class="tile water ' + i + '"> </div>');
    }
}