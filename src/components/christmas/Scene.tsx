import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSystem, GiftBoxes, GemOrnaments, TetrahedronSpiral } from './ParticleSystem';
import { PhotoCards } from './PhotoCards';
import { TreeStar } from './TreeStar';
import { TreeState } from '@/types/christmas';

interface SceneContentProps {
  state: TreeState;
  photos: string[];
  focusedPhotoIndex: number | null;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  starGlowIntensity: number;
}

// Shared ref for glow intensity (allows CameraController to communicate with parent)
const glowIntensityRef = { current: 0 };

function CameraController({ 
  state, 
  orbitRotation,
  handPosition,
  onGlowChange,
}: { 
  state: TreeState;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  onGlowChange?: (intensity: number) => void;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(0, 2, 12));
  const ribbonTimeRef = useRef(0);
  const prevStateRef = useRef<TreeState>(state);
  const transitionDelayRef = useRef(0);

  useFrame((_, delta) => {
    // Detect state change to tree (pinch gesture completed)
    if (state === 'tree' && prevStateRef.current !== 'tree') {
      transitionDelayRef.current = 2.0;
      ribbonTimeRef.current = 0;
    }
    prevStateRef.current = state;

    if (transitionDelayRef.current > 0) {
      transitionDelayRef.current -= delta;
    }

    const baseDistance = state === 'tree' ? 12 : 18;
    
    let targetX = 0;
    let targetY = 2;
    let targetZ = baseDistance;
    let lookAtY = 0;
    let glowIntensity = 0;
    
    if (state === 'tree' && transitionDelayRef.current <= 0) {
      ribbonTimeRef.current += delta * 0.15;
      const t = (ribbonTimeRef.current % 1);
      
      // Calculate glow intensity based on proximity to top (t approaching 1)
      // Glow starts at 0.7 and peaks at 1.0
      glowIntensity = t > 0.7 ? Math.pow((t - 0.7) / 0.3, 2) : 0;
      
      const height = 7;
      const maxRadius = 3.0;
      const ribbonY = t * height - height / 2 + 0.3;
      const layerRadius = maxRadius * (1 - t * 0.88) + 0.15;
      const angle = t * Math.PI * 6;
      
      const cameraDistance = 5 + layerRadius * 1.5;
      const cameraAngle = angle + Math.PI * 0.3;
      
      targetX = Math.cos(cameraAngle) * cameraDistance;
      targetY = ribbonY + 1.5;
      targetZ = Math.sin(cameraAngle) * cameraDistance;
      
      // When near top, focus on the star
      if (t > 0.85) {
        lookAtY = 4.4; // Star position
      } else {
        lookAtY = ribbonY;
      }
    } else if (handPosition && state === 'galaxy') {
      targetX = (handPosition.x - 0.5) * 20;
      targetY = (0.5 - handPosition.y) * 10 + 2;
      targetZ = Math.cos(orbitRotation.y) * baseDistance;
    } else {
      targetX = Math.sin(orbitRotation.y) * baseDistance;
      targetY = Math.sin(orbitRotation.x) * 5 + 2;
      targetZ = Math.cos(orbitRotation.y) * baseDistance;
    }
    
    // Update shared glow ref
    glowIntensityRef.current = glowIntensity;
    onGlowChange?.(glowIntensity);
    
    const smoothFactor = 1 - Math.exp(-3 * delta);
    
    positionRef.current.x += (targetX - positionRef.current.x) * smoothFactor;
    positionRef.current.y += (targetY - positionRef.current.y) * smoothFactor;
    positionRef.current.z += (targetZ - positionRef.current.z) * smoothFactor;
    
    targetRef.current.y += (lookAtY - targetRef.current.y) * smoothFactor;
    
    camera.position.copy(positionRef.current);
    camera.lookAt(targetRef.current);
  });

  return null;
}

function SceneContent({ 
  state, 
  photos, 
  focusedPhotoIndex,
  orbitRotation,
  handPosition,
  starGlowIntensity,
}: SceneContentProps) {
  const [glow, setGlow] = useState(0);
  
  return (
    <>
      <CameraController 
        state={state} 
        orbitRotation={orbitRotation}
        handPosition={handPosition}
        onGlowChange={setGlow}
      />
      
      {/* Simplified lighting */}
      <ambientLight intensity={0.2} />
      
      <spotLight 
        position={[0, 12, 5]} 
        angle={0.6}
        penumbra={0.8}
        intensity={2.5}
        color="#fff8e8"
      />
      
      <pointLight position={[0, -2, 0]} intensity={1.2} color="#ff6633" distance={12} />
      
      <Stars 
        radius={100} 
        depth={50} 
        count={2000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.3}
      />
      
      <ParticleSystem state={state} particleCount={4000} />
      <GiftBoxes state={state} />
      <GemOrnaments state={state} />
      <TetrahedronSpiral state={state} />
      
      <PhotoCards 
        state={state} 
        photos={photos}
        focusedIndex={focusedPhotoIndex}
      />
      
      <TreeStar state={state} glowIntensity={glow} />
      
      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
          intensity={1.5}
          mipmapBlur
        />
        <Vignette
          offset={0.2}
          darkness={0.6}
        />
      </EffectComposer>
    </>
  );
}

interface ChristmasSceneProps {
  state: TreeState;
  photos: string[];
  focusedPhotoIndex: number | null;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  onReady?: () => void;
}

export function ChristmasScene({ 
  state, 
  photos, 
  focusedPhotoIndex,
  orbitRotation,
  handPosition,
  onReady,
}: ChristmasSceneProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReady?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [onReady]);
  
  return (
    <Canvas
      camera={{ position: [0, 2, 12], fov: 60 }}
      gl={{ 
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      dpr={[1, 1.5]}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a0a28 50%, #0a1628 100%)' }}
    >
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 15, 35]} />
      
      <SceneContent 
        state={state}
        photos={photos}
        focusedPhotoIndex={focusedPhotoIndex}
        orbitRotation={orbitRotation}
        handPosition={handPosition}
        starGlowIntensity={0}
      />
    </Canvas>
  );
}
