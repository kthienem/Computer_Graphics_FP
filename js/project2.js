"use strict";

var container, stats;
var camera, controls, scene, renderer;
var mesh, texture, material = null;
var worldWidth = 256, worldDepth = 256;
var worldHalfWidth = worldWidth/2, worldHalfDepth = worldDepth/2;
var clock = new THREE.Clock();
var data;
var gui, params;
var directionalLight, ambientLight, sun;

init();
animate();

function init() {
  if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
  }

  container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 20000);
  camera.position.set( -1200, 800, 1200 );

  scene = new THREE.Scene();
  // scene.fog = new THREE.FogExp2(0xbfcbd0, 0.0003);
  scene.fog = new THREE.FogExp2(0xbfcbd0, 0);
  addGUI();

  /*
  controls = new THREE.OrbitControls(camera);
  controls.target.set( 0, 0, 0 );
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  controls.keys = [ 65, 83, 68 ];
  */
  // /*
  controls = new THREE.FlyControls( camera );

	controls.movementSpeed = 1000;
	controls.domElement = container;
  // controls.rollSpeed = Math.PI / 24;
	controls.rollSpeed = Math.PI / 6;
	controls.autoForward = false;
	controls.dragToLook = true;
  // */

  data = generateHeight(worldWidth, worldDepth);

  camera.position.y = data[worldHalfWidth + worldHalfDepth] * 10 + 1000;

  var geometry = new THREE.PlaneBufferGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
  geometry.rotateX(-Math.PI/2);

  var vertices  = geometry.attributes.position.array;

  for (var i = 0, j = 0; i < vertices.length; i++, j += 3) {
    vertices[j+1] = data[i]*10;
  }

  sun = new THREE.Vector3(-1, 0, 0);
  texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // material = new THREE.MeshBasicMaterial({map:texture, wireframe:false});
  material = new THREE.MeshPhongMaterial({map:texture, wireframe:false});
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);


  // /*
  // scene.add( new THREE.AmbientLight( 0x110000 ) );
  ambientLight = new THREE.AmbientLight(0x000000);
  // scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight( 0xffffff, 1.15 );
	// var directionalLight = new THREE.DirectionalLight( 0xff0000, 1.15 );
	directionalLight.position.set( -100, 500, 100 );
	scene.add( directionalLight );
  //*/

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xbfd1e5);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addGUI() {
  var gui_controls = function() {
    this.rainbow = false;
    this.grayscale = false;
    this.normal = true;
  };
  gui = new dat.GUI({
    resizable: false
  });

  params = new gui_controls();
  gui.add(params, 'normal').listen().onChange(function(value) {
    params.normal = value;
    params.rainbow = false;
    params.grayscale = false;
    if(!value) {
      material.wireframe = true;
    } else {
      material.wireframe = false;
    }
    // /*
    texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    material.map = texture;
    material.needsUpdate = true;
    // */

  });
  gui.add(params, 'rainbow').listen().onChange(function(value) {
    params.normal = false;
    params.rainbow = value;
    params.grayscale = false;
    if(!value) {
      material.wireframe = true;
    } else {
      material.wireframe = false;
    }
    // /*
    texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    material.map = texture;
    material.needsUpdate = true;
    // */
  });
  gui.add(params, 'grayscale').listen().onChange(function(value) {
    params.normal = false;
    params.rainbow = false;
    params.grayscale = value;
    if(!value) {
      material.wireframe = true;
    } else {
      material.wireframe = false;
    }
    // /*
    texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    material.map = texture;
    material.needsUpdate = true;
    // */
  });

}

function generateHeight(width, height) {
  var size = width*height;
  var data = new Uint8Array(size);
  var perlin = new ImprovedNoise();
  var quality = 1;
  var z = 100;

  for (var j = 0; j < 4; j++) {
    for (var i=0; i < size; i++) {
      var x = i%width;
      var y = ~~(i/width);
      data[i] += Math.abs(perlin.noise(x/quality, y/quality, z)*quality*1.75);
    }
    quality *= 5;
  }

  return data;
}

function generateTexture(data, width, height) {
  var canvas, context, image, imageData, level, diff, vector3, shade;

  vector3 = new THREE.Vector3(0, 0, 0);

  sun.normalize();

  canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  context = canvas.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);

  image = context.getImageData(0, 0, canvas.width, canvas.height);
  imageData = image.data;

  var maxHeight = Math.max.apply(null, data);
  if(!params.normal) {
    scene.fog.density = 0.0;
  } else {
    // scene.fog.density = 0.0003;
  }

  for(var i=0, j=0; i <imageData.length; i += 4, j++) {
    vector3.x = data[j-2] - data[j+2];
    vector3.y = 2;
    vector3.z = data[j-width*2]-data[j+width*2];
    vector3.normalize();

    shade = vector3.dot(sun);

    ///*
    //*/

    //Full brown color
    // /*
    if(params.normal) {
      // imageData[i] = (96 + shade*128) * (0.5 + data[j] * 0.007);
      imageData[i] = (0.5 + data[j] * 0.007);
      // imageData[i+1] = (32 + shade*96) * (0.5 + data[j] * 0.007);
      imageData[i+1] = (0.5 + data[j] * 0.007);
      // imageData[i+2] = (shade*96) * (0.5 + data[j] * 0.007);
      imageData[i+2] = (0.5 + data[j] * 0.007);
    }
    // */

    //Color only based on height. Gives varying range of green
    /*
    imageData[i] = 0;
    imageData[i+1] = (32 + shade*96) * data[j];
    imageData[i+2] = 0;
    */

    //Long rainbow
    // /*
    if(params.rainbow) {
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
      };
    }
    //*/

    //GrayScale
    // /*
    if(params.grayscale){
      var f = data[j]/maxHeight;
      var g = Math.round(f*255);
      imageData[i] = g;
      imageData[i+1] = g;
      imageData[i+2] = g;
    }
    //*/

    //Black for wireframe
    ///*
    if (material != null)
      if(material.wireframe) {
        imageData[i] = 0;
        imageData[i+1] = 0;
        imageData[i+2] = 0;
      }
    //*/

  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function animate() {
  requestAnimationFrame(animate);

  // console.log(sun.x);
  // sun = new THREE.Vector3(sun.x+1, sun.y, sun.z);
  // sun.setX((sun.x+0.1));
  // sun.setY((sun.y-0.01));
  /*
  texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  material.map = texture;
  material.needsUpdate = true;
  //*/

  render();
  stats.update();
}

function render() {
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
}
