import { useEffect, useRef, useState } from "react";

import { BACKEND_BASE_URL } from "./lib/api";

import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Loader2 } from "lucide-react";

function ModelViewer({ file_path }: { file_path: string }) {
    const [loading, setLoading] = useState(true);
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

        const material: THREE.Material = new THREE.MeshNormalMaterial({
            flatShading: true,
        });

        loader.load(BACKEND_BASE_URL + file_path, (data: THREE.Group | THREE.BufferGeometry) => {
            setLoading(false);
            let object: THREE.Mesh | THREE.Group | null = null;

            if (data instanceof THREE.BufferGeometry) {
                data.computeBoundingBox();
                const boundingBox = data.boundingBox;
                const center = new THREE.Vector3();
                boundingBox?.getCenter(center);

                data.translate(-center.x, -center.y, -center.z);
                object = new THREE.Mesh(data, material);
            } else if (data instanceof THREE.Group) {
                const box = new THREE.Box3().setFromObject(data);
                const center = box.getCenter(new THREE.Vector3());
                data.position.sub(center);
                object = data;
            }

            if (object == null) {
                return;
            }

            object.traverse(function (node: THREE.Object3D) {
                const mesh = node as THREE.Mesh;
                if (mesh.isMesh === true) {
                    mesh.material = material;
                }
            });

            scene.add(object);

            camera.position.set(0, 40, 80);
            camera.lookAt(0, 0, 0);

            // Animation Loop, this allows for pan and zoom
            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();
        });
        return () => {
            mount.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div ref={mountRef} className="flex-1 w-full h-full">
            {loading && (
                <div className="flex items-center justify-center fixed inset-0">
                    <Loader2 className="animate-spin" size={64} />
                </div>
            )}
        </div>
    );
}

export default ModelViewer;
