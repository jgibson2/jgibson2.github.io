import * as THREE from 'https://unpkg.com/three@0.121.0/build/three.module.js';
import { GLTFExporter } from 'https://unpkg.com/three@0.121.0/examples/jsm/exporters/GLTFExporter.js'
import { PDBLoader } from './three/loaders/PDBLoader.js'
class ARPDBRenderer {
        constructor(id, params) {
            /* Open when someone clicks on the span element */

            //////////////////////////////////////////////////////////////////////////////////
            //          Init
            //////////////////////////////////////////////////////////////////////////////////

            // init renderer
            this.renderer       = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            let w = window.innerWidth;
            let h = window.innerHeight;
            this.renderer.setClearColor(new THREE.Color('lightgrey'), 0)
            this.renderer.setSize( h, w );
            this.renderer.domElement.style.position = 'absolute'
            this.renderer.domElement.style.top = '0px'
            this.renderer.domElement.style.left = '0px'
            document.body.appendChild( this.renderer.domElement );

            // array of functions for the rendering loop
            this.onRenderFcts= [];

            // init scene and camera
            this.scene  = new THREE.Scene();

            //////////////////////////////////////////////////////////////////////////////////
            //          Initialize a basic camera
            //////////////////////////////////////////////////////////////////////////////////

            // Create a camera
            this.camera = new THREE.Camera();
            this.scene.add(this.camera);

            ////////////////////////////////////////////////////////////////////////////////
            //          handle arToolkitSource
            ////////////////////////////////////////////////////////////////////////////////
            this.arToolkitSource = new THREEx.ArToolkitSource({
                // to read from the webcam
                sourceType : 'webcam',
		sourceWidth: this.renderer.getSize().y,
		sourceHeight: this.renderer.getSize().x,
                displayWidth: this.renderer.getSize().y,
                displayHeight: this.renderer.getSize().x
            })


            let ar = this;

            ////////////////////////////////////////////////////////////////////////////////
            //          initialize arToolkitContext
            ////////////////////////////////////////////////////////////////////////////////


            // create atToolkitContext
            this.arToolkitContext = new THREEx.ArToolkitContext({
                cameraParametersUrl: THREEx.ArToolkitContext.baseURL + '../data/data/camera_para.dat',
                detectionMode: 'mono',
                canvasHeight: this.renderer.getSize().x,
                canvasWidth: this.renderer.getSize().y
            })
            // initialize it
            this.arToolkitContext.init(function onCompleted(){
                // copy projection matrix to camera
                ar.camera.projectionMatrix.copy( ar.arToolkitContext.getProjectionMatrix() );
            })

            // update artoolkit on every frame
            this.onRenderFcts.push(function() {
                if( ar.arToolkitSource.ready === false ) {return;}

                ar.arToolkitContext.update( ar.arToolkitSource.domElement )

                // update scene.visible if the marker is seen
                ar.scene.visible = ar.camera.visible
            });

            ////////////////////////////////////////////////////////////////////////////////
            //          Create a ArMarkerControls
            ////////////////////////////////////////////////////////////////////////////////

            // init controls for camera
            var markerControls = new THREEx.ArMarkerControls(this.arToolkitContext, this.camera, {
                type : 'pattern',
                patternUrl : THREEx.ArToolkitContext.baseURL + '../data/data/patt.hiro',
                // patternUrl : THREEx.ArToolkitContext.baseURL + '../data/data/patt.kanji',
                // as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
                changeMatrixMode: 'cameraTransformMatrix'
            })
            // as we do changeMatrixMode: 'cameraTransformMatrix', start with invisible scene
            this.scene.visible = false;
            
            this.id = id;
            this.params = params;
            
            this.arToolkitSource.init(function onReady(){
                ar.resize();
            })
            
	    // handle resize
            window.addEventListener('resize', function(){
                ar.resize();
            })

        }

        clearThree(){
            this.scene = new THREE.Scene();
            this.scene.add(this.camera);
            this.onRenderFcts = [];
            let ar = this;
            this.onRenderFcts.push(function(){
                if( ar.arToolkitSource.ready === false ) { return; }

                ar.arToolkitContext.update( ar.arToolkitSource.domElement )

                // update scene.visible if the marker is seen
                ar.scene.visible = ar.camera.visible
            });
            this.onRenderFcts.push(function(){
                ar.renderer.render( ar.scene, ar.camera );
            });
        }


            //////////////////////////////////////////////////////////////////////////////////
            //          add an object in the scene
            //////////////////////////////////////////////////////////////////////////////////

        makeScene(id, params) {
            // instantiate a loader
            this.id = id;
            this.params = params;
            var loader = new PDBLoader(id.substr(4), this.scene, params);
            function download(query) {
                let uri = "";
                if (query.substr(0, 4) == 'pdb:') {
                    query = query.substr(4).toUpperCase();
                    if (!query.match(/^[1-9][A-Za-z0-9]{3}$/)) {
                        alert("Wrong PDB ID"); return;
                    }
                    // uri = "https://www.pdb.org/pdb/files/" + query + ".pdb";
                    uri = "https://files.rcsb.org/download/" + query + ".pdb";
                } else if (query.substr(0, 4) == 'cid:') {
                    query = query.substr(4);
                    if (!query.match(/^[1-9]+$/)) {
                        alert("Wrong Compound ID"); return;
                    }
                    uri = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + query +
                        "/SDF?record_type=3d";
                }
                $.get(uri, function(ret) {
                    console.log("URI: " + uri);
                    loader.loadMolecule(ret);
                });
            }

            download(id);
            
	    //////////////////////////////////////////////////////////////////////////////////
            //          render the whole thing on the page
            //////////////////////////////////////////////////////////////////////////////////
	    let ar = this;
            // render the scene
            this.onRenderFcts.push(function(){
                ar.renderer.render( ar.scene, ar.camera );
            });


            // run the rendering loop
            var lastTimeMsec = null;
            requestAnimationFrame(function animate(nowMsec){
                // keep looping
                requestAnimationFrame( animate );
                // measure time
                lastTimeMsec    = lastTimeMsec || nowMsec-1000/60
                var deltaMsec   = Math.min(200, nowMsec - lastTimeMsec)
                lastTimeMsec    = nowMsec
                // call each update function
                ar.onRenderFcts.forEach(function(onRenderFct){
                    onRenderFct(deltaMsec/1000, nowMsec/1000)
                });
		// HOLY HACK BATMAN (but I can't figure out why this breaks????)
		ar.resize();
            });
        }

        downloadGLTF() {
                // Instantiate a exporter
                var exporter = new GLTFExporter();

                var link = document.createElement( 'a' );
                link.style.display = 'none';
                document.body.appendChild( link ); // Firefox workaround, see #6594
                function save( blob, filename ) {
                        link.href = URL.createObjectURL( blob );
                        link.download = filename;
                        link.click();
                        // URL.revokeObjectURL( url ); breaks Firefox...
                }

                function saveString( text, filename ) {
                        save( new Blob( [ text ], { type: 'text/plain' } ), filename );
                }

                function saveArrayBuffer( buffer, filename ) {
                        save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
                }

                // Parse the input and generate the glTF output
                let id = this.id;
                exporter.parse( this.scene, function ( result ) {
                        if ( result instanceof ArrayBuffer ) {
                                saveArrayBuffer( result, id + '.glb' );
                        } else {
                                var output = JSON.stringify( result, null, 2 );
                                console.log( output );
                                saveString( output, id + '.gltf' );
                        }
                }, {} );
        }

    resize() {
        this.arToolkitSource.onResizeElement();
        this.arToolkitSource.copyElementSizeTo(this.renderer.domElement)
        if( this.arToolkitContext.arController !== null ){
            this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas)
        }
    }
}

export { ARPDBRenderer };
