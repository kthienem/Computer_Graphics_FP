"use strict";

if(!Detector.webgl) {
	Detector.addGetWebGLMessage();
}

var chunkSize = 7500;//size of a single chunk
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

var worldWidth = 256, worldDepth = 256;
var worldHalfWidth = worldWidth/2, worldHalfDepth = worldDepth/2;

var clock = new THREE.Clock();
var gui, params;//variables needed to create options menu
var wireframe = false;//determines if the mesh should be shown as wireframe
var directionalLight, angle;//light for scene and the angle it is rotated

init();
animate();

function init() {
	//get container div
	container = document.getElementById('container');

	//create a new camera and set postion
	camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 20000);
	
	//create a new scene
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0xbfcbd0, 0.003);//add fog to scene

	//create new FlyControls and initialize some variables
	controls = new THREE.FlyControls(camera);
	controls.movementSpeed = 1000;
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
	directionalLight.position.set(3000, 3000, 0);
	directionalLight.castShadow = true;
	directionalLight.shadow.camera.left = -10000;
	directionalLight.shadow.camera.right = 10000;
	directionalLight.shadow.camera.top = 10000;
	directionalLight.shadow.camera.bottom = -10000;
	directionalLight.shadow.camera.near = 10;
	directionalLight.shadow.camera.far = 10000;
	scene.add(directionalLight);
}
