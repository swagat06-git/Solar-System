import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Info, Pause, Play, RotateCcw, ZoomIn } from 'lucide-react';

const SolarSystemExplorer = () => {
  const mountRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [speed, setSpeed] = useState(1);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const planetsRef = useRef([]);

  const planetData = {
    sun: { name: 'Sun', size: 3, color: 0xFDB813, info: 'The star at the center of our solar system', distance: 0 },
    mercury: { name: 'Mercury', size: 0.4, color: 0x8C7853, info: 'Smallest planet, closest to the Sun', distance: 8, speed: 4.74 },
    venus: { name: 'Venus', size: 0.9, color: 0xFFC649, info: 'Hottest planet with thick atmosphere', distance: 12, speed: 3.50 },
    earth: { name: 'Earth', size: 1, color: 0x4A90E2, info: 'Our home planet, the only known world with life', distance: 16, speed: 2.98 },
    mars: { name: 'Mars', size: 0.5, color: 0xE27B58, info: 'The Red Planet with polar ice caps', distance: 20, speed: 2.41 },
    jupiter: { name: 'Jupiter', size: 2.2, color: 0xC88B3A, info: 'Largest planet with a giant storm', distance: 28, speed: 1.31 },
    saturn: { name: 'Saturn', size: 1.8, color: 0xFAD5A5, info: 'Famous for its spectacular ring system', distance: 38, speed: 0.97, hasRings: true },
    uranus: { name: 'Uranus', size: 1.3, color: 0x4FD0E7, info: 'Ice giant that rotates on its side', distance: 48, speed: 0.68 },
    neptune: { name: 'Neptune', size: 1.2, color: 0x4166F5, info: 'Farthest planet with supersonic winds', distance: 58, speed: 0.54 }
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 50);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Stars background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.3 });
    const starsVertices = [];
    for (let i = 0; i < 3000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xFFFFFF, 2, 200);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Create Sun
    const sunGeometry = new THREE.SphereGeometry(planetData.sun.size, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: planetData.sun.color,
      emissive: planetData.sun.color,
      emissiveIntensity: 1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = { name: 'sun', info: planetData.sun };
    scene.add(sun);

    const planets = [];

    // Create planets
    Object.entries(planetData).forEach(([key, data]) => {
      if (key === 'sun') return;

      const orbitGeometry = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 64);
      const orbitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);

      const planetGeometry = new THREE.SphereGeometry(data.size, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({ 
        color: data.color,
        roughness: 0.7,
        metalness: 0.3
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.userData = { name: key, info: data, angle: Math.random() * Math.PI * 2 };
      scene.add(planet);

      if (data.hasRings) {
        const ringGeometry = new THREE.RingGeometry(data.size * 1.5, data.size * 2.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xC9B18A, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);
      }

      planets.push(planet);
    });

    planetsRef.current = planets;

    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([sun, ...planets]);

      if (intersects.length > 0) {
        const selected = intersects[0].object;
        setSelectedPlanet(selected.userData);
      }
    };

    window.addEventListener('click', onMouseClick);

    // Animation
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!isPaused) {
        sun.rotation.y += 0.001;

        planets.forEach((planet) => {
          const data = planet.userData.info;
          planet.userData.angle += (0.001 * speed) / data.speed;
          
          planet.position.x = Math.cos(planet.userData.angle) * data.distance;
          planet.position.z = Math.sin(planet.userData.angle) * data.distance;
          
          planet.rotation.y += 0.01;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [isPaused, speed]);

  const resetView = () => {
    setSelectedPlanet(null);
    setSpeed(1);
    setIsPaused(false);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Title */}
      <div className="absolute top-6 left-6 text-white">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Solar System Explorer
        </h1>
        <p className="text-gray-400 mt-2">Click on any planet to learn more</p>
      </div>

      {/* Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-lg transition-all flex items-center gap-2"
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
          {isPaused ? 'Play' : 'Pause'}
        </button>
        <button
          onClick={resetView}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-lg transition-all flex items-center gap-2"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      {/* Speed Control */}
      <div className="absolute bottom-6 left-6 bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-lg">
        <label className="text-white text-sm mb-2 block">Orbit Speed: {speed}x</label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-48"
        />
      </div>

      {/* Planet Info Panel */}
      {selectedPlanet && (
        <div className="absolute bottom-6 right-6 bg-gray-800 bg-opacity-95 p-6 rounded-lg shadow-2xl max-w-sm border-2 border-blue-500">
          <div className="flex items-start gap-3 mb-3">
            <div 
              className="w-12 h-12 rounded-full" 
              style={{ backgroundColor: `#${selectedPlanet.info.color.toString(16).padStart(6, '0')}` }}
            />
            <div>
              <h3 className="text-2xl font-bold text-white">{selectedPlanet.info.name}</h3>
              <p className="text-blue-400 text-sm">
                {selectedPlanet.name === 'sun' ? 'Star' : 'Planet'}
              </p>
            </div>
          </div>
          <p className="text-gray-300 mb-3">{selectedPlanet.info.info}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {selectedPlanet.info.distance > 0 && (
              <>
                <div className="text-gray-400">Distance from Sun:</div>
                <div className="text-white">{selectedPlanet.info.distance} AU</div>
                <div className="text-gray-400">Orbital Speed:</div>
                <div className="text-white">{selectedPlanet.info.speed} km/s</div>
              </>
            )}
            {selectedPlanet.name === 'sun' && (
              <>
                <div className="text-gray-400">Type:</div>
                <div className="text-white">G-type Star</div>
                <div className="text-gray-400">Age:</div>
                <div className="text-white">4.6 billion years</div>
              </>
            )}
          </div>
          <button
            onClick={() => setSelectedPlanet(null)}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-all"
          >
            Close
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <Info size={16} />
          <span>Use mouse wheel to zoom • Click planets for information</span>
        </div>
      </div>
    </div>
  );
};

export default SolarSystemExplorer;
