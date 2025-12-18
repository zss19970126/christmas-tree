import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, PhotoCard } from '@/types/christmas';

// Generate local placeholder images (avoid external CDN for China users)
const generatePlaceholder = (index: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Create festive gradient backgrounds
    const gradients = [
      ['#c41e3a', '#8b0000'], // Christmas red
      ['#228b22', '#006400'], // Forest green
      ['#ffd700', '#daa520'], // Gold
      ['#1e90ff', '#0066cc'], // Blue
      ['#ff69b4', '#ff1493'], // Pink
      ['#9932cc', '#663399'], // Purple
      ['#ff6347', '#ff4500'], // Coral
      ['#20b2aa', '#008b8b'], // Teal
    ];
    const [color1, color2] = gradients[index % gradients.length];
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    
    // Add festive emoji
    const emojis = ['🎄', '⭐', '🎁', '❄️', '🔔', '🎅', '🦌', '🕯️', '🍪', '🧦'];
    ctx.font = '120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[index % emojis.length], 200, 200);
  }
  return canvas.toDataURL('image/png');
};

// Pre-generate placeholders (only generate once)
let cachedPlaceholders: string[] | null = null;
const getDefaultPhotos = (): string[] => {
  if (!cachedPlaceholders) {
    cachedPlaceholders = Array.from({ length: 12 }, (_, i) => generatePlaceholder(i));
  }
  return cachedPlaceholders;
};

interface PhotoCardsProps {
  state: TreeState;
  photos?: string[];
  focusedIndex: number | null;
  onFocusChange?: (index: number | null) => void;
}

function generateTreePhotoPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 2.8;
  const t = (index + 0.5) / total;
  const y = t * height - height / 2 + 0.5;
  const radius = maxRadius * (1 - t * 0.85);
  const angle = t * Math.PI * 10 + index * Math.PI * 0.5;
  
  return [
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  ];
}

function generateGalaxyPhotoPosition(): [number, number, number] {
  const radius = 4 + Math.random() * 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

// Spring physics system for smooth, inertia-based animations
interface SpringState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  scaleVelocity: number;
}

function PhotoCardMesh({ 
  url, 
  treePosition, 
  galaxyPosition,
  state,
  isFocused,
  index,
}: { 
  url: string; 
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  state: TreeState;
  isFocused: boolean;
  index: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera } = useThree();
  const timeRef = useRef(Math.random() * Math.PI * 2);
  
  // Spring physics state
  const springRef = useRef<SpringState>({
    position: new THREE.Vector3(...treePosition),
    velocity: new THREE.Vector3(0, 0, 0),
    scale: 0.4,
    scaleVelocity: 0,
  });
  
  // Spring physics constants - softer, slower for silky smooth motion
  const SPRING_STIFFNESS = 25;    // Lower = slower, gentler movement
  const SPRING_DAMPING = 8;       // Higher ratio = less bouncing, more fluid
  const SCALE_STIFFNESS = 30;
  const SCALE_DAMPING = 10;

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      url,
      (tex) => {
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 16;
        tex.generateMipmaps = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const hue = (index * 30) % 360;
          ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = 'white';
          ctx.font = '96px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎄', 200, 200);
        }
        const placeholderTex = new THREE.CanvasTexture(canvas);
        placeholderTex.colorSpace = THREE.SRGBColorSpace;
        setTexture(placeholderTex);
      }
    );
  }, [url, index]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const spring = springRef.current;
    const dt = Math.min(delta, 0.033); // Cap delta to prevent instability
    
    timeRef.current += dt;
    
    // Calculate target position based on state
    const targetPos = isFocused 
      ? new THREE.Vector3(0, 0, 0.8)
      : state === 'tree' 
        ? new THREE.Vector3(...treePosition)
        : new THREE.Vector3(...galaxyPosition);
    
    const targetScale = isFocused ? 5 : 0.4;
    
    // Spring physics for position (F = -k*x - d*v)
    const displacement = new THREE.Vector3().subVectors(spring.position, targetPos);
    const springForce = displacement.clone().multiplyScalar(-SPRING_STIFFNESS);
    const dampingForce = spring.velocity.clone().multiplyScalar(-SPRING_DAMPING);
    const acceleration = springForce.add(dampingForce);
    
    // Update velocity and position using semi-implicit Euler
    spring.velocity.add(acceleration.multiplyScalar(dt));
    spring.position.add(spring.velocity.clone().multiplyScalar(dt));
    
    // Spring physics for scale
    const scaleDisplacement = spring.scale - targetScale;
    const scaleSpringForce = -SCALE_STIFFNESS * scaleDisplacement;
    const scaleDampingForce = -SCALE_DAMPING * spring.scaleVelocity;
    const scaleAcceleration = scaleSpringForce + scaleDampingForce;
    
    spring.scaleVelocity += scaleAcceleration * dt;
    spring.scale += spring.scaleVelocity * dt;
    
    // Apply to mesh
    meshRef.current.position.copy(spring.position);
    
    // Add subtle floating motion when not focused
    if (!isFocused) {
      meshRef.current.position.y += Math.sin(timeRef.current * 0.5) * 0.005;
    }
    
    meshRef.current.scale.set(spring.scale, spring.scale, 1);
    
    // Make card face camera
    meshRef.current.lookAt(camera.position);
  });

  // 拍立得卡片尺寸 (模拟 Instax Mini 比例)
  const cardWidth = 1;
  const cardHeight = 1.25; // 拍立得比例更高
  const photoWidth = 0.85;
  const photoHeight = 0.75;
  const borderRadius = 0.03;
  const photoOffsetY = 0.12; // 照片向上偏移，底部留白更大

  // 创建拍立得卡片背景几何体
  const cardGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-cardWidth/2 + borderRadius, -cardHeight/2);
    shape.lineTo(cardWidth/2 - borderRadius, -cardHeight/2);
    shape.quadraticCurveTo(cardWidth/2, -cardHeight/2, cardWidth/2, -cardHeight/2 + borderRadius);
    shape.lineTo(cardWidth/2, cardHeight/2 - borderRadius);
    shape.quadraticCurveTo(cardWidth/2, cardHeight/2, cardWidth/2 - borderRadius, cardHeight/2);
    shape.lineTo(-cardWidth/2 + borderRadius, cardHeight/2);
    shape.quadraticCurveTo(-cardWidth/2, cardHeight/2, -cardWidth/2, cardHeight/2 - borderRadius);
    shape.lineTo(-cardWidth/2, -cardHeight/2 + borderRadius);
    shape.quadraticCurveTo(-cardWidth/2, -cardHeight/2, -cardWidth/2 + borderRadius, -cardHeight/2);
    return new THREE.ShapeGeometry(shape);
  }, []);

  // 创建照片区域几何体
  const photoGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(photoWidth, photoHeight);
  }, []);

  if (!texture) return null;

  return (
    <group ref={meshRef} position={treePosition} scale={[0.5, 0.5, 1]}>
      {/* 拍立得白色卡片背景 */}
      <mesh geometry={cardGeometry} renderOrder={1}>
        <meshBasicMaterial 
          color="#e5e0d5"
          side={THREE.DoubleSide}
          toneMapped={true}
          opacity={0.95}
          transparent={true}
        />
      </mesh>
      {/* 照片 */}
      <mesh geometry={photoGeometry} position={[0, photoOffsetY, 0.001]} renderOrder={2}>
        <meshBasicMaterial 
          map={texture} 
          side={THREE.DoubleSide}
          toneMapped={true}
        />
      </mesh>
    </group>
  );
}

export function PhotoCards({ state, photos, focusedIndex, onFocusChange }: PhotoCardsProps) {
  const photoUrls = photos && photos.length > 0 ? photos : getDefaultPhotos();
  
  const photoData = useMemo(() => {
    return photoUrls.slice(0, 12).map((url, i) => ({
      url,
      treePosition: generateTreePhotoPosition(i, Math.min(photoUrls.length, 12)),
      galaxyPosition: generateGalaxyPhotoPosition(),
    }));
  }, [photoUrls]);

  return (
    <group>
      {photoData.map((photo, i) => (
        <PhotoCardMesh
          key={i}
          url={photo.url}
          treePosition={photo.treePosition}
          galaxyPosition={photo.galaxyPosition}
          state={state}
          isFocused={focusedIndex === i}
          index={i}
        />
      ))}
    </group>
  );
}
