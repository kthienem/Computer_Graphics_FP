"use strict";

if(!Detector.webgl) {
	Detector.addGetWebGLMessage();
	document.getElementById('container').innerHTML = "";
}

var chunkSize = 2500;//size of a single chunk
var container, stats;
var camera, controls, scene, renderer;
var mesh, texture;
var maxHeight = 150;
var indexArray = [];//3x3 array corresponding to unit offset from origin
	//0, 1, 2
	//3, 4, 5					//4 is current area
	//6, 7, 8

var worldGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var dataGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var textureGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var materialGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// var worldWidth = 256, worldDepth = 256;
var worldWidth = 192, worldDepth = 192;
var worldHalfWidth = worldWidth/2, worldHalfDepth = worldDepth/2;

var clock = new THREE.Clock();
var gui, params;//variables needed to create options menu
var wireframe = false;//determines if the mesh should be shown as wireframe
var directionalLight, angle = 0;//light for scene and the angle it is rotated
var data, geometry;
var fogColor = new THREE.Color(0xf2f4f4);

init();
animate();

function init() {
	//get container div
	container = document.getElementById('container');

	//create a new camera and set postion
	camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 20000);

	//create a new scene
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.0005);//add fog to scene

	//create new FlyControls and initialize some variables
	controls = new THREE.FlyControls(camera);
	controls.movementSpeed = 500;
	controls.domElement = container;
	controls.rollSpeed = Math.PI/6;
	controls.autoForward = false;
	controls.dragToLook = true;

	//create the options menu
	addGUI();

	resetWorldDataStructures();

	camera.position.y = data[worldHalfWidth + worldHalfDepth*worldWidth] * 10 + 500;

	//create a directional light and add it to the scene
	directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(0, 3000, 0);
	directionalLight.castShadow = true;
	directionalLight.shadow.camera.left = -5000;
	directionalLight.shadow.camera.right = 5000;
	directionalLight.shadow.camera.top = 5000;
	directionalLight.shadow.camera.bottom = -5000;
	directionalLight.shadow.camera.near = 10;
	directionalLight.shadow.camera.far = 10000;
	scene.add(directionalLight);

	/*Add axis line to help see the direction and location of orthographic camera for light shadow
	directionalLight.shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
	scene.add(directionalLight.shadowCameraHelper);
	//*/

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(0xbfd1e5);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	//Remove Generating World... text
	container.innerHTML = "";
	container.appendChild(renderer.domElement);

	//Add stats object to track FPS
	stats = new Stats();
	container.appendChild(stats.dom);

	window.addEventListener('resize', onWindowResize, false);
}

function addGUI() {
	//Parameters to be used in GUI
	var gui_controls = function() {
		this.Brown = true;
		this.Rainbow = false;
		this.Grayscale = false;
		this.Normal_Map = false;
	};

	gui = new dat.GUI({
		resizable:false
	});

	params = new gui_controls();

	//Create listeners to update texture when a GUI item is clicked
	gui.add(params, 'Brown').listen().onChange(function(value) {
		params.Brown = value;
		params.Rainbow = false;
		params.Grayscale = false;
		params.Normal_Map = false;

		if(!value) {
			wireframe = true;
		} else {
			wireframe = false;
		}

		for(var i = 0; i < 9; i++) {
			materialGrid[i].wireframe = wireframe;
		}

		renderer.shadowMap.enabled = params.Brown;
		//Re-apply texture
		regenTextures();
		for(var i = 0; i < 9; i++) {
			materialGrid[i].needsUpdate = true;
		}
	});

	gui.add(params, 'Rainbow').listen().onChange(function(value) {
		params.Brown = false;
		params.Rainbow = value;
		params.Grayscale = false;
		params.Normal_Map = false;

		if(!value) {
			wireframe = true;
		} else {
			wireframe = false;
		}

		for(var i = 0; i < 9; i++) {
			materialGrid[i].wireframe = wireframe;
		}

		renderer.shadowMap.enabled = params.Brown;
		//Re-apply textures
		regenTextures();
		for(var i = 0; i < 9; i++) {
			materialGrid[i].needsUpdate = true;
		}
	});

	gui.add(params, 'Grayscale').listen().onChange(function(value) {
		params.Brown = false;
		params.Rainbow = false;
		params.Grayscale = value;
		params.Normal_Map = false;

		if(!value) {
			wireframe = true;
		} else {
			wireframe = false;
		}

		for(var i = 0; i < 9; i++) {
			materialGrid[i].wireframe = wireframe;
		}

		renderer.shadowMap.enabled = params.Brown;
		//Re-apply textures
		regenTextures();
		for(var i = 0; i < 9; i++) {
			materialGrid[i].needsUpdate = true;
		}
	});

	gui.add(params, 'Normal_Map').listen().onChange(function(value) {
		params.Brown = false
		params.Rainbow = false;
		params.Grayscale = false;
		params.Normal_Map = value;

		if(!value) {
			wireframe = true;
		} else {
			wireframe = false;
		}

		for(var i = 0; i < 9; i++) {
			materialGrid[i].wireframe = wireframe;
		}

		renderer.shadowMap.enabled = params.Brown;
		//Re-apply textures
		regenTextures();
		for(var i = 0; i < 9; i++) {
			materialGrid[i].needsUpdate = true;
		}
	});
}

function resetWorldDataStructures() {
	indexArray = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	indexArray[0] = new THREE.Vector2(-1, 1);
	indexArray[1] = new THREE.Vector2(0, 1);
	indexArray[2] = new THREE.Vector2(1, 1);

	indexArray[3] = new THREE.Vector2(-1, 0);
	indexArray[4] = new THREE.Vector2(0, 0);
	indexArray[5] = new THREE.Vector2(1, 0);

	indexArray[6] = new THREE.Vector2(-1, -1);
	indexArray[7] = new THREE.Vector2(0, -1);
	indexArray[8] = new THREE.Vector2(1, -1);

	dataGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	textureGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	worldGrid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	// Row 1
	initializeChunkMesh(-1, 1, -1, 1);
	initializeChunkMesh(0, 1, 0, 1);
	initializeChunkMesh(1, 1, 1, 1);

	// Row 2
	initializeChunkMesh(-1, 0, -1, 0);
	initializeChunkMesh(0, 0, 0, 0);
	initializeChunkMesh(1, 0, 1, 0);

	// Row 3
	initializeChunkMesh(-1, -1, -1, -1);
	initializeChunkMesh(0, -1, 0, -1);
	initializeChunkMesh(1, -1, 1, -1);
}

function initializeChunkMesh(xoff, yoff, xdest, ydest) {
	generateChunkHeightMap(xoff, yoff, xdest, ydest);
	generateChunkTexture(xoff, yoff, xdest, ydest);
	generateChunkMesh(xoff, yoff, xdest, ydest);
}

function generateChunkHeightMap(xoff, yoff, xdest, ydest) {
	var arrayIndex = 4 - 3*ydest + xdest;

	geometry = new THREE.PlaneBufferGeometry( chunkSize, chunkSize, worldWidth - 1, worldDepth - 1 );
	geometry.rotateX( -Math.PI/2 );
	geometry.computeFaceNormals();
	geometry.computeVertexNormals();

	data = generateHeight( worldWidth, worldDepth, xoff, yoff );

	dataGrid[arrayIndex] = data;
}

function generateChunkTexture(xoff, yoff, xdest, ydest) {
	var arrayIndex = 4 - 3*ydest + xdest;

	texture = new THREE.CanvasTexture( generateTexture( dataGrid[arrayIndex], worldWidth, worldDepth) );
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;

	textureGrid[arrayIndex] = texture;
}

function generateChunkMesh(xoff, yoff, xdest, ydest) {
	var arrayIndex = 4 - 3*ydest + xdest;
	var vertices = geometry.attributes.position.array;

	for(var i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
		vertices[j+1] = dataGrid[arrayIndex][i]*10;
	}

	materialGrid[arrayIndex] = new THREE.MeshPhongMaterial({map:textureGrid[arrayIndex], wireframe:wireframe});
	mesh = new THREE.Mesh(geometry, materialGrid[arrayIndex]);
	mesh.position.set(chunkSize*xoff, 0, chunkSize*yoff);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	scene.add( mesh );

	worldGrid[arrayIndex] = mesh;
}

function regenTextures() {
	for (var i = 0; i < 9; i++) {
			texture = new THREE.CanvasTexture( generateTexture( dataGrid[i], worldWidth, worldDepth ) );
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;

			textureGrid[i] = texture;
			materialGrid[i].map = texture;
	}
}

function removeChunk(xoff, yoff) {
	var arrayIndex = 4 - 3*yoff + xoff;

	scene.remove(worldGrid[arrayIndex]);
}

function shiftChunksUp() {
	// Remove Bottom Row
	removeChunk(-1, -1);
	removeChunk(0, -1);
	removeChunk(1, -1);

	// Middle Row Down
	relocateChunkData(1, 0, 1, -1);
	relocateChunkData(0, 0, 0, -1);
	relocateChunkData(-1, 0, -1, -1);

	// Top Row Down
	relocateChunkData(1, 1, 1, 0);
	relocateChunkData(0, 1, 0, 0);
	relocateChunkData(-1, 1, -1, 0);

	// Generate Top Row
	indexArray[0] = new THREE.Vector2(indexArray[3].x, indexArray[3].y + 1);
	indexArray[1] = new THREE.Vector2(indexArray[4].x, indexArray[4].y + 1);
	indexArray[2] = new THREE.Vector2(indexArray[5].x, indexArray[5].y + 1);
	initializeChunkMesh(indexArray[0].x, indexArray[0].y, -1, 1);
	initializeChunkMesh(indexArray[1].x, indexArray[1].y, 0, 1);
	initializeChunkMesh(indexArray[2].x, indexArray[2].y, 1, 1);
}

function shiftChunksDown() {
	// Remove Top Row
	removeChunk(-1, 1);
	removeChunk(0, 1);
	removeChunk(1, 1);

	// Middle Row Up
	relocateChunkData(1, 0, 1, 1);
	relocateChunkData(0, 0, 0, 1);
	relocateChunkData(-1, 0, -1, 1);

	// Bottom Row Up
	relocateChunkData(1, -1, 1, 0);
	relocateChunkData(0, -1, 0, 0);
	relocateChunkData(-1, -1, -1, 0);

	// Generate Bottom Row
	indexArray[6] = new THREE.Vector2(indexArray[3].x, indexArray[3].y - 1);
	indexArray[7] = new THREE.Vector2(indexArray[4].x, indexArray[4].y - 1);
	indexArray[8] = new THREE.Vector2(indexArray[5].x, indexArray[5].y - 1);
	initializeChunkMesh(indexArray[6].x, indexArray[6].y, -1, -1);
	initializeChunkMesh(indexArray[7].x, indexArray[7].y, 0, -1);
	initializeChunkMesh(indexArray[8].x, indexArray[8].y, 1, -1);
}

function shiftChunksLeft() {
	// Remove Right Column
	removeChunk(1, -1);
	removeChunk(1, 0);
	removeChunk(1, 1);

	// Middle Column Right
	relocateChunkData(0, -1, 1, -1);
	relocateChunkData(0, 0, 1, 0);
	relocateChunkData(0, 1, 1, 1);

	// Left Column Right
	relocateChunkData(-1, -1, 0, -1);
	relocateChunkData(-1, 0, 0, 0);
	relocateChunkData(-1, 1, 0, 1);

	// Generate Left Column
	indexArray[0] = new THREE.Vector2(indexArray[1].x - 1, indexArray[1].y);
	indexArray[3] = new THREE.Vector2(indexArray[4].x - 1, indexArray[4].y);
	indexArray[6] = new THREE.Vector2(indexArray[7].x - 1, indexArray[7].y);
	initializeChunkMesh(indexArray[0].x, indexArray[0].y, -1, 1);
	initializeChunkMesh(indexArray[3].x, indexArray[3].y, -1, 0);
	initializeChunkMesh(indexArray[6].x, indexArray[6].y, -1, -1);
}

function shiftChunksRight() {
	// Remove Left Column
	removeChunk(-1, -1);
	removeChunk(-1, 0);
	removeChunk(-1, 1);

	// Middle Column Left
	relocateChunkData(0, -1, -1, -1);
	relocateChunkData(0, 0, -1, 0);
	relocateChunkData(0, 1, -1, 1);

	// Right Column Left
	relocateChunkData(1, -1, 0, -1);
	relocateChunkData(1, 0, 0, 0);
	relocateChunkData(1, 1, 0, 1);

	// Generate Right Column
	indexArray[2] = new THREE.Vector2(indexArray[1].x + 1, indexArray[1].y);
	indexArray[5] = new THREE.Vector2(indexArray[4].x + 1, indexArray[4].y);
	indexArray[8] = new THREE.Vector2(indexArray[7].x + 1, indexArray[7].y);
	initializeChunkMesh(indexArray[2].x, indexArray[2].y, 1, 1);
	initializeChunkMesh(indexArray[5].x, indexArray[5].y, 1, 0);
	initializeChunkMesh(indexArray[8].x, indexArray[8].y, 1, -1);
}

function relocateChunkData(xsrc, ysrc, xdest, ydest) {
	var arrayIndexSrc = 4 - 3*ysrc + xsrc;
	var arrayIndexDest = 4 - 3*ydest + xdest;

	indexArray[arrayIndexDest] = indexArray[arrayIndexSrc];
	dataGrid[arrayIndexDest] = dataGrid[arrayIndexSrc];
	textureGrid[arrayIndexDest] = textureGrid[arrayIndexSrc];
	materialGrid[arrayIndexDest] = materialGrid[arrayIndexSrc];
	worldGrid[arrayIndexDest] = worldGrid[arrayIndexSrc];
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function generateHeight(width, height, xoff, yoff) {
	var size = width * height, data = new Uint8Array( size ),
	perlin = new ImprovedNoise(), quality = 1, z = 50;

	for ( var j = 0; j < 4; j ++ ) {

		for ( var i = 0; i < size; i ++ ) {

			var x = (i % width), y = ~~ ( i / width );
			data[ i ] += Math.abs( perlin.noise( (x + xoff*(worldWidth-1)) / quality, (y + yoff*(worldDepth-1)) / quality, z ) * quality * 1.75 );

		}

		quality *= 5;

	}

	return data;
}

function generateTexture(data, width, height) {
	var canvas, canvasScaled, context, image, imageData, level, diff, vector3;

	// var slope, slopevec;
	// slopevec = new THREE.Vector3(0, 1, 0);

	vector3 = new THREE.Vector3(0, 0, 0);

	canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	context = canvas.getContext('2d');
	context.fillStyle = '#000';
	context.fillRect(0, 0, width, height);

	image = context.getImageData(0, 0, canvas.width, canvas.height);
	imageData = image.data;

	if(params.Brown) {
		scene.fog.density = 0.0005;
	} else {
		scene.fog.density = 0.0
	}

	for(var i = 0, j = 0; i < imageData.length; i += 4, j++) {
		var dxpre = data[j-2];
		var dxpost = data[j+2];
		var dzpre = data[j-width*2];
		var dzpost = data[j+width*2];

		vector3.x = dxpre - dxpost;
		vector3.y = 2;
		vector3.z = dzpre - dzpost;
		vector3.normalize();

		// slope = vector3.dot(slopevec);

		if(params.Brown) {//Brown color
			imageData[i] = 204;
			imageData[i+1] = 102;
			imageData[i+2] = 0;
		} else if(params.Rainbow) {
			var f = data[j]/maxHeight;
			var a = (1-f)/0.25;
			var X = Math.floor(a);
			var Y = Math.floor(255*(a-X));

			switch (X) {
					case 0:
							imageData[i] = 255;
							imageData[i+1] = Y;
							imageData[i+2] = 0;
							break;
					case 1:
							imageData[i] = 255-Y;
							imageData[i+1] = 255;
							imageData[i+2] = 0;
							break;
					case 2:
							imageData[i] = 0;
							imageData[i+1] = 255;
							imageData[i+2] = Y;
							break;
					case 3:
							imageData[i] = 0;
							imageData[i+1] = 255-Y;
							imageData[i+2] = 255;
							break;
					case 4:
							imageData[i] = 0;
							imageData[i+1] = 0;
							imageData[i+2] = 255;
							break;
					default:
							imageData[i] = 255;
							imageData[i+1] = 0;
							imageData[i+2] = 0;
							break;
			};
		} else if(params.Grayscale) {
			var f = data[j]/maxHeight;
			var g = Math.round(f*255);
			imageData[i] = g;
			imageData[i+1] = g;
			imageData[i+2] = g;
		} else if(params.Normal_Map) {
			imageData[i] = 255*vector3.x;
			imageData[i+1] = 255*vector3.y;
			imageData[i+2] = 255*vector3.z;
		} else {
			imageData[i] = 0;
			imageData[i+1] = 0;
			imageData[i+2] = 0;
		}
	}

	context.putImageData(image, 0, 0);

	/*
	canvasScaled = document.createElement( 'canvas' );
	canvasScaled.width = width * 4;
	canvasScaled.height = height * 4;

	context = canvasScaled.getContext( '2d' );
	context.scale( 4, 4 );
	context.drawImage( canvas, 0, 0 );

	image = context.getImageData( 0, 0, canvasScaled.width, canvasScaled.height );
	imageData = image.data;


	for ( var i = 0, l = imageData.length; i < l; i += 4 ) {

		var v = ~~ ( Math.random() * 5 );

		imageData[ i ] += v;
		imageData[ i + 1 ] += v;
		imageData[ i + 2 ] += v;

	}

	context.putImageData( image, 0, 0 );

	return canvasScaled;
	//*/
	return canvas;
}

function animate() {
	requestAnimationFrame(animate);

	//Check if camera exits current chunk
	var currentChunkMaxX = indexArray[4].x * chunkSize + (0.5 * chunkSize);
	var currentChunkMinX = indexArray[4].x * chunkSize - (0.5 * chunkSize);

	var currentChunkMaxY = indexArray[4].y * chunkSize + (0.5 * chunkSize);
	var currentChunkMinY = indexArray[4].y * chunkSize - (0.5 * chunkSize);

	if(camera.position.x < currentChunkMinX) {
			shiftChunksLeft();
	}

	if(camera.position.x > currentChunkMaxX) {
			shiftChunksRight();
	}

	if(camera.position.z < currentChunkMinY) {
			shiftChunksDown();
	}

	if(camera.position.z > currentChunkMaxY) {
			shiftChunksUp();
	}

	// /*
	var x = 0;
	var y = 3000;
	var z = 0;
	var pos = new THREE.Vector3(x, y, z);
	if(params.Brown) {
		if(directionalLight.position.y > 0)
		{
			angle = (angle+(Math.PI / 1000))%(2*Math.PI);
		}
		else
		{
			angle = (angle+(Math.PI / 100))%(2*Math.PI);
		}

		//Rotate
		pos.applyAxisAngle(new THREE.Vector3(0, 0, 1).normalize(), angle);

		//Update fog color
		var f = pos.y/3000;
		var g = Math.round(f*255);
		if(pos.y < 0)
			g = 0;
		fogColor.setRGB(g/255, g/255, g/255);//setRGB expects values between 0 and 1
		scene.fog.color.set(fogColor.getHex());
		renderer.setClearColor(fogColor.getHex());
	} else {//if not using shading, i.e. not using the Brown texture, set the clear color to a blue background
		renderer.setClearColor(0xbfd1e5);
	}
	directionalLight.position.set(pos.x+chunkSize*indexArray[4].x, pos.y, pos.z+chunkSize*indexArray[4].y);
	directionalLight.target = worldGrid[4];
	//*/

	render();
	stats.update();
}

function render() {
	controls.update(clock.getDelta());
	renderer.render(scene, camera);
}
