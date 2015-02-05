$(function(){
		
	var manifest, preload, cpuShipData, p1ShipData, cpuGrid, p1Grid, cpuShipsRemaining, p1ShipsRemaining, successfulHit, cpuHitMemory, canHit;
	var CURR_CPU_SHIPS, CURR_P1_SHIPS, CANVAS_EXPLOSION_WIDTH, CANVAS_EXPLOSION_HEIGHT, GRID_SIZE;
		
	var killFlag;
	var cpuLastSuccessfulHitX;
	var cpuLastSuccessfulHitY;
	var _cpuLastSuccessfulHitX
	var _cpuLastSuccessfulHitY;
	var cpuTryThisDirection;
	var lastCPUHitAt;
	
	BATT.pageHelper = new BATT.PageHelper();
	BATT.pageHelper.initialize();
	
});

window.BATT = {};

BATT.PageHelper = function() {};

BATT.PageHelper.prototype = {
	
	initialize: function(){
			
		//Make life easier. Set up some constants.
		CURR_CPU_SHIPS = 3;
		CURR_P1_SHIPS  = 3;
		CANVAS_EXPLOSION_WIDTH = 30;
		CANVAS_EXPLOSION_HEIGHT = 25;
		GRID_SIZE = 10;
						
		canHit = 1;
		cpuShipsPlaced = 0;
		cpuHitMemory = [];
		killFlag = 0;
		cpuLastSuccessfulHitX = 0;
		cpuLastSuccessfulHitY = 0;
		_cpuLastSuccessfulHitX = 0;
		_cpuLastSuccessfulHitY = 0;
		cpuTryThisDirection = 1; //north
		
		cpuGrid = p1Grid = new Array(10);
				
		cpuShipsRemaining =	CURR_CPU_SHIPS;
		p1ShipsRemaining = CURR_P1_SHIPS;
		
		//Add some assets into our manifest.
		manifest = [{src:"img/spritesheet.png", id:"sprite"},
					{src:"sounds/background.ogg", id:"background"},
					{src:"sounds/hit.ogg", id:"hit"},
					{src:"sounds/shipdestroyed.ogg", id:"shipdestroyed"},
					{src:"sounds/victory.ogg", id:"victory"},
					{src:"sounds/splash.ogg", id:"splash"}];
		
		preload = new createjs.LoadQueue();
		
		preload.installPlugin(createjs.Sound);
		preload.addEventListener("progress", this.handleProgress);
		preload.addEventListener("complete",this.startGame);
		preload.loadManifest(manifest);
		
		mainmenu = document.getElementById('main-menu');
		stage = new createjs.Stage(mainmenu);
		
		//Time constraint: Possible improvement would be to use a templating framework for chunks of text.
		howToText = new createjs.Text("Morning sir,\n\nA series of enemy ships are heading our way.\nWe must destroy them at once.\n\Click on a tile to fire at them.\n\nI believe in you Captain.", "17px Verdana", "#cceeff");
		howToText.x = 481;
		howToText.y = 44;
		howToText.textAlign = "center";
		
		playbutton = new createjs.Shape();
		playbutton.graphics.beginFill("#cceeff").drawRect(25,25,200,50);
		
		playbutton.x = 356;
		playbutton.y = 168;
		
		buttonText = new createjs.Text("Click to Play!", "22px Verdana", "#222");
		buttonText.x = 411;
		buttonText.y = 204;
				
		stage.addChild(howToText, playbutton, buttonText);
		stage.update();
		
		BATT.pageHelper.updateText("#cpu-brain","CPU is waiting");
		BATT.pageHelper.updateText("#p1-feedback","Your turn");
		
	},
	
	/*
	** Function to handle progress of the loading of files from our manifest and to customise the preload text.
	*/
	handleProgress: function(event){
		
		var progress = Math.ceil(preload.progress*100);
		
		if (progress < 18) {	  $('#preloader').text("Grabbing uniform ("+progress+"%)");}
		else if (progress < 35){  $('#preloader').text("Quick snack ("+progress+"%)");}
		else if (progress < 70){  $('#preloader').text("Readying missiles ("+progress+"%)");}
		else if (progress < 100){ $('#preloader').text("All systems go ("+progress+"%)");}
			
	},
	
	removeMainMenu: function(elem){
		$(elem).animate({ left: "-1000px", opacity:0.8 },1000,function(){ });	
	},
	
	returnMainMenu: function(elem, victoryText){
		
		$(elem).animate({ left: "0px", opacity:1 },1000,function(){ });	
		
		mainmenu = document.getElementById('main-menu');
		stage = new createjs.Stage(mainmenu);
		
		victoryText = new createjs.Text(victoryText, "22px Verdana", "#cceeff");
		victoryText.x = 481;
		victoryText.y = 44;
		victoryText.textAlign = "center";
				
		stage.addChild(victoryText);
		stage.update();
		
	},
	
	startGame: function(){
		
		$('#wrap').fadeIn(250);
		$('#preloader').hide();
		
		//start background music
		BATT.pageHelper.playSound('background');
		
		cpuShipData = [], p1ShipData = [];
			
		//create the grids
		BATT.pageHelper.createGrid("#cpu",cpuGrid);  
		BATT.pageHelper.createGrid("#p1",p1Grid);
		
		//create some ships
		BATT.pageHelper.proposeShip(cpuShipData.length, 'cpu');
		BATT.pageHelper.proposeShip(p1ShipData.length, 'p1');
				
		//Deploy some ships
		BATT.pageHelper.deployShips("#cpu",cpuShipData,0);
		BATT.pageHelper.deployShips("#p1",p1ShipData,1);
        
		//Set some click handlers
        $("canvas#main-menu").click(function(){ BATT.pageHelper.removeMainMenu(this); });
        $("#cpu .tile").click(function(){ BATT.pageHelper.processHits(this); });
           
    },
    
    /*
    ** Here I've written a function to propose a ship on the grid. The main purpose of this function is to ensure that no ship overlaps the grid bounds.
    ** Firstly I've grab an initial set of coordinates to work with.
    ** Then I've checked to see which direction the rest of the ship could go without falling off the grid. In most cases this will yield two directions.
    ** (However there are two cases in which 4 directions are valid) - this function will handle all cases.
    ** I've then popped these in an array so I can randomly select a valid direction.
    */
    
    proposeShip: function(shipsPlaced, gridId){
	    	    
	    initCoordX = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);
		initCoordY = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);
	    
	    possibleDirections = [];
	    
	    if((initCoordX-5)>=-1) { possibleDirections.push('N'); }
		else { possibleDirections.push('S'); }
		
		if((initCoordY-5)>=-1) { possibleDirections.push('W'); }
		else { possibleDirections.push('E'); }
		
		key = BATT.pageHelper.getRandomNum(0, possibleDirections.length);
	    
	    proposedShip = [];
	    
	    //Here I've created an array to temporarily hold the proposed ship data. We'll pass this to the overlap function.   
	    if(shipsPlaced==0){
			switch(possibleDirections[key]){
				case 'N': proposedShip.push([initCoordX,initCoordY],[initCoordX-1,initCoordY],[initCoordX-2,initCoordY],[initCoordX-3,initCoordY],[initCoordX-4,initCoordY]); break;	
				case 'S': proposedShip.push([initCoordX,initCoordY],[initCoordX+1,initCoordY],[initCoordX+2,initCoordY],[initCoordX+3,initCoordY],[initCoordX+4,initCoordY]);  break;	
				case 'E': proposedShip.push([initCoordX,initCoordY],[initCoordX,initCoordY+1],[initCoordX,initCoordY+2],[initCoordX,initCoordY+3],[initCoordX,initCoordY+4]);  break;	
				case 'W': proposedShip.push([initCoordX,initCoordY],[initCoordX,initCoordY-1],[initCoordX,initCoordY-2],[initCoordX,initCoordY-3],[initCoordX,initCoordY-4]); break;	
			} 
	    }
	    else{
		    switch(possibleDirections[key]){
				case 'N': proposedShip.push([initCoordX,initCoordY],[initCoordX-1,initCoordY],[initCoordX-2,initCoordY],[initCoordX-3,initCoordY]); break;	
				case 'S': proposedShip.push([initCoordX,initCoordY],[initCoordX+1,initCoordY],[initCoordX+2,initCoordY],[initCoordX+3,initCoordY]);  break;	
				case 'E': proposedShip.push([initCoordX,initCoordY],[initCoordX,initCoordY+1],[initCoordX,initCoordY+2],[initCoordX,initCoordY+3]);  break;	
				case 'W': proposedShip.push([initCoordX,initCoordY],[initCoordX,initCoordY-1],[initCoordX,initCoordY-2],[initCoordX,initCoordY-3]); break;	
			}
	    }
	    
		//Run overlap function
		gridId == 'cpu'?
			BATT.pageHelper.checkForOverlap(proposedShip, cpuShipData, 'cpu'):
			BATT.pageHelper.checkForOverlap(proposedShip, p1ShipData, 'p1');
		
    },
    
    /*
    ** There is a chance of one ship overlapping another - therefore we'll check for overlaps.
    ** We pass the proposed ship and the existing ship data (which is already on the grid) into this function.
    ** We then loop around each ship currently on the grid and compare each coordinate against the proposed ship coordinates.
    ** If we get a duplicate coordinate we will simply propose a new ship and check for overlaps. Rinse and repeat until we have a ship which doesn't overlap.
    ** I'm pretty sure there'll be a better way of doing this works nicely.
    */
    
    checkForOverlap: function(proposedArray, currArray, gridId){
	    	    
	    overlap = false;
	    
	    for(var a = 0; a < currArray.length; a++){
			for(var b = 0; b < currArray[a].length; b++){
								
				//check if any of these coords are in the proposed ship array
				for(var c = 0; c < proposedArray.length; c++){
					if((proposedArray[c][0]==currArray[a][b][0])&&proposedArray[c][1]==currArray[a][b][1]){
						overlap = true;	
					}
				}			
			}
		}
		
		//if we have an overlap, propose another ship. Otherwise, push this ship to the cpu ship array.
		if(overlap==true){
			BATT.pageHelper.proposeShip(currArray.length, gridId);
		}
		else{
			currArray.push(proposedArray); 
									
			if(currArray.length < 3){
				BATT.pageHelper.proposeShip(currArray.length, gridId);
			}
		}
	  
    },
    
    /*
	** This function allows us to creates a 10x10 grid by appending elements to the DOM
	*/
    createGrid: function(gridId, gridArray){
	    
	    for(var i = 0; i < 10; i++){
			gridArray[i] = new Array(10);
	
			for(var j = 0; j < 10; j++){
				$(gridId).append("<div id='"+gridId.substring(1)+""+i+"-"+j+"' class='tile'></div>");
			}
		}
			    
    },
    
    //Function to deploy P1 and CPU ships.
    deployShips: function(gridId,_shipData,display){
	    
	    for(var k = 0; k < _shipData.length; k++){		
			for(var l = 0; l < _shipData[k].length; l++){
				$(gridId+_shipData[k][l][0]+"-"+_shipData[k][l][1]).addClass("shipPart"+display);
				
				if(l==0){
					$(gridId+_shipData[k][l][0]+"-"+_shipData[k][l][1]).append("<div class='light'></div>");
				}	
			}
		}
				
    },
    
    processHits: function(elemId){
	    
	    coords = $(elemId).attr("id").substring(3).split("-");
			
		coordX = coords[0];
		coordY = coords[1];
		
		//Check if the player has taken their hit too early // Check if player has hit this tile already
		if(canHit==0){
			BATT.pageHelper.updateText('#p1-feedback','Please wait for the CPU');	
		}
		
		else if(BATT.pageHelper.checkIfAlreadyHit("#cpu", coordX, coordY) == true){
			BATT.pageHelper.updateText('#p1-feedback','Already hit here!');	
		}
		
		else{
		
			canHit = 0;
											
			BATT.pageHelper.checkHit(coordX, coordY, cpuShipData, '#cpu', cpuShipsRemaining, '#p1-feedback');
			
			BATT.pageHelper.updateText('#cpu-brain', 'Hmmm');
			
			/*
			** I decided to knock up a VERY basic intelligence for the CPU.
			** I didn't have too much time to get this spot on and the code is a bit spaghetti-like.
			** Ideally I'd have liked to work on this a bit more. However, the CPU is "clever enough" to eventually destroy your ships.
			** Basically, once the CPU hits one of your ships he goes into "Kill mode".
			** In this mode the CPU will alternate around that spot to find the rest of your ship.
			*/
			
			var cpuHitDelay = setTimeout(function(){
				
				cpuCoordX = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);
				cpuCoordY = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);
				
				while(BATT.pageHelper.checkIfAlreadyHit('#p1', cpuCoordX, cpuCoordY) == true){
					cpuCoordX = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);
					cpuCoordY = BATT.pageHelper.getRandomNum(0, GRID_SIZE-1);	
				}
							
				if(killFlag==1){
										
					//This code needs tidying up.
					if(cpuTryThisDirection==1){
						_cpuLastSuccessfulHitY = cpuLastSuccessfulHitY - 1;
						_cpuLastSuccessfulHitX = cpuLastSuccessfulHitX;
						
						if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("destroyed")==true){
							_cpuLastSuccessfulHitY--;
						}
						else if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("missed")==true){
							cpuTryThisDirection = 3;
						}
					}//try north
					
					else if(cpuTryThisDirection==2){
						_cpuLastSuccessfulHitX = cpuLastSuccessfulHitX - 1;
						_cpuLastSuccessfulHitY = cpuLastSuccessfulHitY;
						
						if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("destroyed")==true){
							_cpuLastSuccessfulHitX--;
						}
						else if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("missed")==true){
							cpuTryThisDirection = 4;
						}
					}//try east
					
					else if(cpuTryThisDirection==3){
						_cpuLastSuccessfulHitY = cpuLastSuccessfulHitY + 1;
						_cpuLastSuccessfulHitX = cpuLastSuccessfulHitX;
						
						if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("destroyed")==true){
							_cpuLastSuccessfulHitY++;
						}
						else if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("missed")==true){
							cpuTryThisDirection = 1;
						}
					}//try south
					
					else {
						_cpuLastSuccessfulHitX = cpuLastSuccessfulHitX + 1;
						_cpuLastSuccessfulHitY = cpuLastSuccessfulHitY;
						
						if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("destroyed")==true){
							_cpuLastSuccessfulHitX++;
						}
						else if($("#p1"+_cpuLastSuccessfulHitX+"-"+_cpuLastSuccessfulHitY).hasClass("missed")==true){
							cpuTryThisDirection = 2;
						}
					}//try west
										
					cpuCoordX = _cpuLastSuccessfulHitX;
					cpuCoordY = _cpuLastSuccessfulHitY;
				}
				
				BATT.pageHelper.checkHit(cpuCoordX, cpuCoordY, p1ShipData, '#p1', p1ShipsRemaining, '#cpu-brain');
																
				cpuHitMemory.push([cpuCoordX,cpuCoordY]);
				
				canHit = 1;
				BATT.pageHelper.updateText('#cpu-brain','* Waiting for you *');
				BATT.pageHelper.updateText("#p1-feedback","Your turn");
				
				$("#wrap").removeClass('chaos');
				
			}, 1750);
		}
	    
    },
    
    checkHit: function(x, y, shipArray, gridId, shipsRemaining, textBox){
	  
	    successfulHit = false;
	    
		for(var k = 0; k < shipArray.length; k++){
						
			//Then loop through each part of these ships
			for(var l = 0; l < shipArray[k].length; l++){
								
				//Check to see if we have a match
				if(x==shipArray[k][l][0]&&y==shipArray[k][l][1]){
					
					//Play a hit sound and create an explosion!
					BATT.pageHelper.playSound('hit');
					BATT.pageHelper.explosion(gridId, x, y);
					BATT.pageHelper.updateText(textBox,'Nice shot!');
										
					//Add a "destroyed" class to this tile. This will allow us to check for repeat hits a little easier.
					$(gridId+x+"-"+y).addClass("destroyed destroyed"+k);
					
					/*
					CPU case-only:
					If the CPU gets a successful hit he will go into kill mode (fire at spots around where he's just hit).
					*/
					
					if(gridId=='#p1'){
						killFlag=1;
						cpuLastSuccessfulHitX = x;
						cpuLastSuccessfulHitY = y;
					}
										
					if(BATT.pageHelper.numberOfPartsDestroyed(gridId, k)==shipArray[k].length){
						
						//A ship has been destroyed - distinguish this with a different sound.
						BATT.pageHelper.playSound('shipdestroyed');
						
						shipsRemaining--;
						BATT.pageHelper.updateText(gridId+"board span",shipsRemaining);
						
						//Add a keyframe animation class to create a shaking effect on screen
						$("#wrap").addClass('chaos');
						
						//check if either p1 or cpu is victorious
						BATT.pageHelper.isVictorius(shipsRemaining, gridId);
						
						gridId=='#cpu'?
							cpuShipsRemaining = shipsRemaining:
							p1ShipsRemaining = shipsRemaining;
							
						if(gridId=='#p1' && killFlag == 1){
							killFlag = 0;
						}
					}
					
					successfulHit = true;
				}
			}
		}
		
		if(successfulHit!==true){
					
			BATT.pageHelper.playSound('splash');
			BATT.pageHelper.updateText(gridId+x+"-"+y,"<div class='splash'></div>");
			BATT.pageHelper.updateText(textBox,'Awkward.');
			$(gridId+x+"-"+y).addClass("missed");
			
			if(gridId=='#p1' && killFlag==1){
				cpuTryThisDirection += 1;
				
				if(cpuTryThisDirection>4){
					cpuTryThisDirection = 1;
				}
			}
		}
	      
    },
    
    /*
    ** Function purpose: checks to see if a given tile has already been hit.
    */
    checkIfAlreadyHit: function(elem, x, y){
	    return $(elem+""+x+"-"+y).is('.destroyed, .missed');
    },
    
    /*
    ** Function purpose: returns how many parts of the previously hit ship have been destroyed.
    */
    numberOfPartsDestroyed: function(elem, shipId){
	    return $(elem+" .destroyed"+shipId).size();
    },
    
    //A function to display a canvas explosion with the help of a spritesheet
    explosion: function(elem, x, y){
	  
		var canvas;
		var stage;
		var bmpAnimation;
		
		$(elem+""+x+"-"+y).html("<canvas id='canvas"+x+"-"+y+"' width='"+CANVAS_EXPLOSION_WIDTH+"' height='"+CANVAS_EXPLOSION_HEIGHT+"'></canvas>");
		
		canvas = document.getElementById("canvas"+x+"-"+y);
		
		stage = new createjs.Stage(canvas);
		
		var spritesheet = new createjs.SpriteSheet({
			images: ['img/spritesheet.png'],
			frames: {width: 32, height: 32, regX: 16, regY: 16},
			animations: { walk: [0, 24, 'walk']	}
		});
		
		bmpAnimation = new createjs.BitmapAnimation(spritesheet);
		bmpAnimation.gotoAndPlay('walk');
		
		bmpAnimation.vX = 10;
		bmpAnimation.x = 13;
		bmpAnimation.y = 10;
		
		stage.addChild(bmpAnimation);
		createjs.Ticker.addListener(stage);
		createjs.Ticker.setFPS(60);
	      
    },
	
	playSound: function(soundId){
		createjs.Sound.play(soundId, createjs.Sound.INTERRUPT_ANY, 0, 0, 0, 1);	
	},
	
	/**
	@function updateText allows you update an element on the page.
	@param {String} id - The ID of an element. Could also be an element path such as #example span
	@param {String} value - The new value of the element
	*/
	updateText: function(id,value){
        $(id).html(value);
    },
    
    isVictorius: function(shipsRemaining, gridId)
    {
        if(shipsRemaining===0){
	        
	        if(gridId=='#cpu'){
		        BATT.pageHelper.playSound('victory');
		        BATT.pageHelper.returnMainMenu("canvas#main-menu", 'Great work sir!');
	        }
	        else{
		        BATT.pageHelper.returnMainMenu("canvas#main-menu", 'Better luck next time...');
	        }
	        
	        var startOver = setTimeout(function(){
		      	  location.reload();
		    },3000);
        }
    },
    
    getRandomNum: function(minnum, maxnum){
	    return Math.floor(Math.random()*(maxnum)) + minnum;
    }
	
};