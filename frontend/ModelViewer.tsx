import { useEffect, useRef } from "react";

import { BACKEND_BASE_URL } from "./lib/api";

import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function ModelViewer({ file_path }: { file_path: string }) {
    const mountRef = useRef<HTMLDivElement>(null);

    const file_type = file_path.split(".").pop()?.toLowerCase() || "";
    const renderer_lookup: { [key: string]: typeof STLLoader | typeof OBJLoader | typeof ThreeMFLoader } = {
        stl: STLLoader,
        obj: OBJLoader,
        "3mf": ThreeMFLoader,
    };
    const LoaderClass = renderer_lookup[file_type];

    useEffect(() => {
        if (LoaderClass === undefined) return;
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5).normalize();
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
        controls.enablePan = true;

        const axesHelper = new THREE.AxesHelper(100);
        scene.add(axesHelper);

        const loader = new LoaderClass();
        loader.load(BACKEND_BASE_URL + file_path, (data: THREE.Group | THREE.BufferGeometry) => {
            if (data instanceof THREE.BufferGeometry) {
                data.computeBoundingBox();
                const boundingBox = data.boundingBox;
                const center = new THREE.Vector3();
                boundingBox?.getCenter(center);

                // center mesh
                data.translate(-center.x, -center.y, -center.z);

                const material: THREE.Material = new THREE.MeshNormalMaterial({
                    flatShading: true,
                });
                const mesh: THREE.Mesh = new THREE.Mesh(data, material);
                scene.add(mesh);

                camera.position.set(0, 40, 80);
                camera.lookAt(0, 0, 0);

                // Animation Loop, this allows for pan and zoom
                const animate = () => {
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                };
                animate();
            } else {
                console.error("Loaded data is not of type BufferGeometry");
            }
        });
        return () => {
            mount.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} className="flex-1 w-full h-full" />;
}

export default ModelViewer;
