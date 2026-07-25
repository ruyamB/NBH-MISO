import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles the animations of the floating emblem and platform
function EmblemGroup() {
  const groupRef = useRef<THREE.Group>(null);
  const platformRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Rotate the main emblem group slowly
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.15;
      // Soft floating bounce
      groupRef.current.position.y = Math.sin(time * 1.2) * 0.12;
    }

    // Platform rotates in the opposite direction
    if (platformRef.current) {
      platformRef.current.rotation.y = -time * 0.08;
    }

    // Rotate orbiting light rings at different axes and speeds
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.3;
      ring1Ref.current.rotation.y = time * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.2;
      ring2Ref.current.rotation.z = time * 0.1;
    }
  });

  // Custom rounded rectangle shape for the beveled emblem bars
  const barShape = React.useMemo(() => {
    const s = new THREE.Shape();
    const w = 1.45;
    const h = 0.24;
    const r = 0.04;
    
    // Draw rounded rectangle
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }, []);

  const extrudeSettings = React.useMemo(() => ({
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.015,
    bevelOffset: 0,
    bevelSegments: 4
  }), []);

  return (
    <group rotation={[0.22, -0.15, 0]} scale={[0.72, 0.72, 0.72]}>
      {/* 3D Solana-inspired Emblem Group */}
      <group ref={groupRef} position={[0, 0.25, 0]}>
        
        {/* Top Bar (Parallelogram box sloped right-to-left) */}
        <mesh position={[0.2, 0.55, -0.11]} rotation={[0, 0, -Math.PI / 6]}>
          <extrudeGeometry args={[barShape, extrudeSettings]} />
          <meshStandardMaterial 
            color="#FFFFFF" 
            metalness={1.0} 
            roughness={0.06} 
          />
        </mesh>

        {/* Middle Bar (Parallelogram box sloped right-to-left) */}
        <mesh position={[-0.2, 0, -0.11]} rotation={[0, 0, -Math.PI / 6]}>
          <extrudeGeometry args={[barShape, extrudeSettings]} />
          <meshStandardMaterial 
            color="#CCCCCC" 
            metalness={1.0} 
            roughness={0.08} 
          />
        </mesh>

        {/* Bottom Bar (Parallelogram box sloped right-to-left) */}
        <mesh position={[0.2, -0.55, -0.11]} rotation={[0, 0, -Math.PI / 6]}>
          <extrudeGeometry args={[barShape, extrudeSettings]} />
          <meshStandardMaterial 
            color="#999999" 
            metalness={1.0} 
            roughness={0.1} 
          />
        </mesh>
      </group>

      {/* Floating Metallic Platform Base (Multi-tiered group) */}
      <group ref={platformRef} position={[0, -1.3, 0]}>
        {/* Tier 1 (Base) */}
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[2.0, 2.1, 0.12, 64]} />
          <meshStandardMaterial color="#0A0A0A" metalness={0.95} roughness={0.25} />
        </mesh>

        {/* Tier 2 (Middle) */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[1.7, 1.8, 0.1, 64]} />
          <meshStandardMaterial color="#111111" metalness={0.95} roughness={0.22} />
        </mesh>

        {/* Tier 3 (Top) */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[1.4, 1.5, 0.1, 64]} />
          <meshStandardMaterial color="#1A1A1A" metalness={0.95} roughness={0.18} />
        </mesh>

        {/* Glowing circular grooves */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.81, 1.84, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
        
        <mesh position={[0, 0.102, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.25, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>

        <mesh position={[0, 0.103, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.8, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>

        {/* Point light in the center of platform casting light up onto the emblem */}
        <pointLight position={[0, 0.3, 0]} intensity={18} color="#ffffff" distance={3.0} decay={1.5} />
      </group>

      {/* Orbiting thin white light rings */}
      <mesh ref={ring1Ref} position={[0, 0, 0]}>
        <torusGeometry args={[2.1, 0.015, 8, 64]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.25} />
      </mesh>

      <mesh ref={ring2Ref} position={[0, 0, 0]}>
        <torusGeometry args={[2.4, 0.01, 8, 64]} />
        <meshBasicMaterial color="#888888" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// Fallback component in case WebGL is disabled or fails to initialize
function CanvasFallback() {
  return (
    <div className="relative w-full h-[360px] sm:h-[450px] md:h-[520px] flex items-center justify-center select-none overflow-hidden">
      {/* Outer Volumetric glow behind fallback logo */}
      <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-white/2 blur-[100px]" />
      
      {/* 2.5D SVG Logo representation with animation */}
      <svg 
        className="w-36 h-36 sm:w-48 sm:h-48 text-white relative z-10 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Animated gradients */}
        <defs>
          <linearGradient id="metalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#8E8E8E" />
            <stop offset="100%" stopColor="#2E2E2E" />
          </linearGradient>
          <linearGradient id="metalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4D4D4" />
            <stop offset="50%" stopColor="#4A4A4A" />
            <stop offset="100%" stopColor="#1A1A1A" />
          </linearGradient>
        </defs>

        <g className="animate-float">
          {/* Top Bar */}
          <path 
            d="M20 30 L65 30 L80 42 L35 42 Z" 
            fill="url(#metalGrad1)" 
            opacity="0.9"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          {/* Middle Bar */}
          <path 
            d="M80 48 L35 48 L20 60 L65 60 Z" 
            fill="url(#metalGrad2)" 
            opacity="0.8"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          {/* Bottom Bar */}
          <path 
            d="M20 66 L65 66 L80 78 L35 78 Z" 
            fill="url(#metalGrad1)" 
            opacity="0.7"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
        </g>
        
        {/* Orbital ring dots */}
        <circle cx="50" cy="54" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3, 3" />
        <circle cx="50" cy="54" r="44" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      </svg>

      {/* Orbiting particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-1.5 h-1.5 bg-white rounded-full opacity-30 top-1/4 left-1/3 animate-pulse" />
        <div className="absolute w-1 h-1 bg-white rounded-full opacity-20 top-2/3 right-1/4 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-2 h-2 bg-white rounded-full opacity-10 bottom-1/3 left-1/4 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
    </div>
  );
}

export default function ThreeEmblem() {
  const [webglSupported, setWebglSupported] = useState(true);

  // Check if WebGL is supported by current browser
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const supported = !!(
        window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setWebglSupported(supported);
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    return <CanvasFallback />;
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[450px] md:h-[520px] flex items-center justify-center select-none overflow-hidden">
      
      {/* Background Volumetric Spotlight Layer */}
      <div className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full bg-white/3 blur-[120px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Star field / orbit thin line behind emblem */}
      <div className="absolute w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] border border-white/3 rounded-full pointer-events-none z-0" />
      <div className="absolute w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] border border-white/2 rounded-full pointer-events-none z-0" />

      <Canvas 
        className="w-full h-full relative z-10"
        camera={{ position: [0, 0.2, 5.8], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.15} />
        
        {/* Volumetric Spotlight Beam Cone */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.01, 1.4, 3.8, 32, 1, true]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.06} 
            blending={THREE.AdditiveBlending} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
        
        {/* Spotlight forming aluminum reflections */}
        <spotLight 
          position={[4, 8, 4]} 
          angle={0.4} 
          penumbra={1} 
          intensity={80} 
          color="#ffffff"
          castShadow 
        />
        
        <directionalLight 
          position={[-4, 4, 3]} 
          intensity={12} 
          color="#ffffff" 
        />

        <directionalLight 
          position={[0, 4, -5]} 
          intensity={15} 
          color="#ffffff" 
        />

        {/* Brushed metallic emblem group */}
        <EmblemGroup />

        {/* Orbiting star dust particles */}
        <Sparkles 
          count={50} 
          scale={4.8} 
          size={1.6} 
          speed={0.2} 
          color="#ffffff" 
        />

        {/* Dynamic Studio Environment for premium metal reflections */}
        <Environment preset="studio" />
      </Canvas>

    </div>
  );
}
