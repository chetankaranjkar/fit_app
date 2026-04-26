import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from 'gsap'

interface CameraPosition {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  distance?: number
}

interface Model3DViewerProps {
  onBodyPartClick?: (bodyPartName: string, position: THREE.Vector3, meshName: string) => void
  selectedBodyPart?: string | null
  bodyParts?: Array<{ 
    id: number
    name: string
    cameraPositionJson?: string
  }>
  onCameraChange?: (cameraPosition: THREE.Vector3, cameraRotation: THREE.Euler) => void
  onCaptureCoordinates?: (coordinates: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    distance: number
    zoomLevel: number
    json: string
  }) => void
}

// Body part to camera position mappings
const BODY_PART_CAMERA_POSITIONS: { [key: string]: CameraPosition } = {
  'Arms': {
    position: { x: 6.65, y: 2.66, z: -0.92 },
    rotation: { x: -109.19, y: 67.06, z: 110.70 },
    distance: 7.22
  },
  'Biceps': {
    position: { x: 6.65, y: 2.66, z: -0.92 },
    rotation: { x: -109.19, y: 67.06, z: 110.70 },
    distance: 7.22
  },
  'Triceps': {
    position: { x: 6.65, y: 2.66, z: -0.92 },
    rotation: { x: -109.19, y: 67.06, z: 110.70 },
    distance: 7.22
  },
  // Add more body part positions as needed
}

interface MeshMapping {
  [meshName: string]: string // Maps mesh name to body part name
}

// Manual mapping for generic mesh names (Mesh 0, Mesh 1, etc.)
// 
// INSTRUCTIONS:
// 1. Open browser console when viewing the 3D model
// 2. Look for "=== 3D Model Body Parts ===" section
// 3. Check "Detailed Mesh Information" to see which mesh corresponds to which body part
// 4. Hover over different body parts and check the console to see which "Mesh X" corresponds to which body part
// 5. Update this mapping below with the correct mesh-to-body-part relationships
//
// Example:
// If hovering over the chest shows "Mesh 0", and hovering over the back shows "Mesh 1",
// then add: 'Mesh 0': 'Chest', 'Mesh 1': 'Back', etc.
//
const MANUAL_MESH_MAPPING: { [meshName: string]: string } = {
  // Uncomment and update these based on your actual GLB file structure:
  // 'Mesh 0': 'Chest',
  // 'Mesh 1': 'Back',
  // 'Mesh 2': 'Shoulders',
  // 'Mesh 3': 'Biceps',
  // 'Mesh 4': 'Triceps',
  // 'Mesh 5': 'Legs',
  // 'Mesh 6': 'Abs',
  // Add more mappings as needed based on console output
}

// Comprehensive body part mapping function
// Maps common mesh name variations to standard body part names
// Also handles generic mesh names by using position-based detection
const mapMeshNameToBodyPart = (
  meshName: string, 
  bodyParts: Array<{ id: number; name: string }>,
  mesh?: THREE.Mesh
): string => {
  const normalizedMeshName = meshName.toLowerCase().trim()
  
  // Map to database body part names (matching exact names in database)
  const databaseBodyPartMappings: { [dbName: string]: string[] } = {
    'Shoulders': ['shoulder', 'shoulders', 'deltoid', 'deltoids', 'delt', 'delts', 'upperarm', 'upper_arm', 'arm_upper', 'lshoulder', 'rshoulder', 'leftshoulder', 'rightshoulder', 'shoulder_l', 'shoulder_r'],
    'Back': ['back', 'lats', 'latissimus', 'upperback', 'upper_back', 'midback', 'mid_back', 'lowerback', 'lower_back', 'spine', 'trapezius', 'traps', 'rhomboid', 'rhomboids', 'dorsal', 'lat', 'posterior'],
    'Chest': ['chest', 'pectoral', 'pecs', 'pec', 'upperchest', 'upper_chest', 'lowerchest', 'lower_chest', 'thorax', 'breast'],
    'Biceps': ['bicep', 'biceps', 'biceps_brachii', 'bicepsbrachii', 'lbicep', 'rbicep', 'leftbicep', 'rightbicep', 'bicep_l', 'bicep_r'],
    'Triceps': ['tricep', 'triceps', 'triceps_brachii', 'tricepsbrachii', 'ltricep', 'rtricep', 'lefttricep', 'righttricep', 'tricep_l', 'tricep_r'],
    'Legs': ['leg', 'legs', 'thigh', 'thighs', 'quad', 'quads', 'quadriceps', 'hamstring', 'hamstrings', 'calf', 'calves', 'upperleg', 'upper_leg', 'lowerleg', 'lower_leg', 'frontthigh', 'front_thigh', 'backthigh', 'back_thigh', 'lthigh', 'rthigh', 'lleg', 'rleg'],
    'Abs': ['abs', 'abdominal', 'abdominals', 'core', 'stomach', 'sixpack', 'six_pack', 'rectus', 'abdomen', 'belly', 'oblique', 'obliques', 'sideabs', 'side_abs'],
    'Cardio': ['cardio', 'cardiovascular', 'heart', 'lungs'],
  }

  // Check if it's a generic mesh name (Mesh 0, Mesh 1, etc.)
  const isGenericMeshName = /^mesh\s*\d+$/i.test(normalizedMeshName)
  
  // First check manual mapping for generic mesh names
  if (isGenericMeshName && MANUAL_MESH_MAPPING[meshName]) {
    const mappedBodyPart = bodyParts.find(bp => bp.name.toLowerCase() === MANUAL_MESH_MAPPING[meshName].toLowerCase())
    if (mappedBodyPart) {
      return mappedBodyPart.name
    }
    // If manual mapping doesn't match DB, still use it
    return MANUAL_MESH_MAPPING[meshName]
  }
  
  // If it's a generic mesh name, try position-based detection
  if (isGenericMeshName && mesh) {
    // Calculate bounding box for accurate position
    const box = new THREE.Box3().setFromObject(mesh)
    const center = box.getCenter(new THREE.Vector3())
    const min = box.min
    const max = box.max
    
    // Position-based body part detection
    // Y axis: higher = upper body, lower = lower body
    // Z axis: forward = front (positive Z), backward = back (negative Z)
    // X axis: left (negative X) / right (positive X)
    
    const yPosition = center.y
    const zPosition = center.z
    const xPosition = center.x
    
    // Normalize Y position (assuming model center is around y=0 and height is ~2-3 units)
    // Calculate relative position on body (0 = feet, 1 = head)
    const normalizedY = (yPosition + 1.5) / 3.0 // Adjust based on actual model scale
    
    // Determine body part based on position
    let detectedBodyPart: string | null = null
    
    // Upper body (roughly top 40% of model)
    if (normalizedY > 0.6) {
      if (zPosition > 0.1) {
        // Front/upper body
        detectedBodyPart = 'Chest'
      } else if (zPosition < -0.1) {
        // Back/upper body
        if (Math.abs(xPosition) > 0.4) {
          detectedBodyPart = 'Shoulders' // Side/outer area
        } else {
          detectedBodyPart = 'Back'
        }
      } else {
        // Center/upper
        detectedBodyPart = 'Chest'
      }
    }
    // Mid-upper body (shoulders, arms, upper back/chest)
    else if (normalizedY > 0.4) {
      if (Math.abs(xPosition) > 0.5) {
        // Sides - arms
        if (zPosition > 0) {
          detectedBodyPart = 'Biceps' // Front of arm
        } else {
          detectedBodyPart = 'Triceps' // Back of arm
        }
      } else if (zPosition > 0.1) {
        detectedBodyPart = 'Chest'
      } else if (zPosition < -0.1) {
        detectedBodyPart = 'Back'
      } else {
        detectedBodyPart = 'Shoulders'
      }
    }
    // Mid body (arms, torso)
    else if (normalizedY > 0.15) {
      if (Math.abs(xPosition) > 0.4) {
        // Sides - arms
        detectedBodyPart = 'Biceps'
      } else if (zPosition > 0.05) {
        detectedBodyPart = 'Abs'
      } else if (zPosition < -0.05) {
        detectedBodyPart = 'Back'
        } else {
        detectedBodyPart = 'Abs'
      }
    }
    // Lower body (legs)
    else {
      detectedBodyPart = 'Legs'
    }
    
    // Try to find this body part in database and return exact name
    if (detectedBodyPart) {
      const dbBodyPart = bodyParts.find(bp => bp.name.toLowerCase() === detectedBodyPart!.toLowerCase())
      if (dbBodyPart) {
        // Store the detected body part in mesh userData for future use
        mesh.userData.detectedBodyPart = dbBodyPart.name
        mesh.userData.detectionMethod = 'position-based'
        return dbBodyPart.name
      }
      // If not found in DB, return the detected name anyway (will trigger add modal)
      return detectedBodyPart
    }
  }

  // First, try to match with database body parts (exact or partial match) - PRIORITY
  for (const bodyPart of bodyParts) {
    const normalizedBodyPart = bodyPart.name.toLowerCase()
    if (
      normalizedMeshName === normalizedBodyPart ||
      normalizedMeshName.includes(normalizedBodyPart) ||
      normalizedBodyPart.includes(normalizedMeshName)
    ) {
      return bodyPart.name // Return exact database name
    }
  }

  // Then try to match with database body part variations map
  for (const [dbBodyPartName, variations] of Object.entries(databaseBodyPartMappings)) {
    // First check if this DB body part exists
    const dbBodyPart = bodyParts.find(bp => bp.name.toLowerCase() === dbBodyPartName.toLowerCase())
    if (!dbBodyPart) continue // Skip if body part doesn't exist in DB

    // Check if mesh name matches any variation
    for (const variation of variations) {
      if (
        normalizedMeshName === variation ||
        normalizedMeshName.includes(variation) ||
        variation.includes(normalizedMeshName) ||
        normalizedMeshName.includes(dbBodyPartName.toLowerCase()) ||
        dbBodyPartName.toLowerCase().includes(normalizedMeshName)
      ) {
        return dbBodyPart.name // Return exact database name
      }
    }
  }

  // If no match found and it's a generic mesh name, return a default
  if (isGenericMeshName) {
    // Extract number from "Mesh 0", "Mesh 1", etc.
    const match = meshName.match(/\d+/)
    const meshIndex = match ? parseInt(match[0]) : 0
    
    // Return a placeholder - user might need to map these manually
    return `Body Part ${meshIndex + 1}`
  }

  // If no match found, try to format the mesh name nicely
  if (meshName && !meshName.match(/^mesh\s*\d+$/i)) {
    // Convert snake_case, camelCase, or PascalCase to Title Case
    const formatted = meshName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    // Remove common prefixes like "Left", "Right", "L_", "R_"
    const cleaned = formatted
      .replace(/^(Left|Right|L|R)\s+/i, '')
      .replace(/^([LR])\s*/i, '')
    
    return cleaned || formatted || meshName
  }

  return meshName || 'Body Part'
}

// Component to animate camera to specific positions
function CameraController({ 
  targetBodyPart, 
  onCameraChange,
  controlsRef,
  bodyParts = []
}: { 
  targetBodyPart: string | null
  onCameraChange?: (position: THREE.Vector3, rotation: THREE.Euler) => void
  controlsRef: React.MutableRefObject<any>
  bodyParts?: Array<{
    id: number
    name: string
    cameraPositionJson?: string
  }>
}) {
  const { camera } = useThree()
  const isAnimating = useRef(false)
  const lastTargetBodyPart = useRef<string | null>(null)
  const positionTweenRef = useRef<gsap.core.Tween | null>(null)
  const rotationTweenRef = useRef<gsap.core.Tween | null>(null)
  const lastPosition = useRef<THREE.Vector3>(new THREE.Vector3())
  const lastRotation = useRef<THREE.Euler>(new THREE.Euler())

  // Animate camera when body part is selected
  useEffect(() => {
    // Skip if no target body part
    if (!targetBodyPart) {
      // If targetBodyPart is null, reset state
      if (lastTargetBodyPart.current !== null) {
        console.log('🔄 CameraController: Resetting (targetBodyPart is null)')
        lastTargetBodyPart.current = null
        isAnimating.current = false
      }
      return
    }

    // Always allow animation when targetBodyPart changes (even if same value)
    // This ensures animation triggers on button click
    const shouldAnimate = lastTargetBodyPart.current !== targetBodyPart || !isAnimating.current
    
    console.log('🎬 CameraController: targetBodyPart changed to:', targetBodyPart, 'Previous:', lastTargetBodyPart.current, 'Should animate:', shouldAnimate)
    
    if (!shouldAnimate) {
      console.log('⏭️ Skipping animation - already animating to same target')
      return
    }
    
    // Stop any ongoing animations first
    if (positionTweenRef.current) {
      console.log('⏹️ Stopping existing position animation')
      positionTweenRef.current.kill()
      positionTweenRef.current = null
    }
    if (rotationTweenRef.current) {
      console.log('⏹️ Stopping existing rotation animation')
      rotationTweenRef.current.kill()
      rotationTweenRef.current = null
    }
    
    // Reset animation flag and update last target
    lastTargetBodyPart.current = targetBodyPart
    isAnimating.current = true
    
    // Execute animation immediately (no delay)
    console.log('▶️ Starting animation for:', targetBodyPart)
    
    // First try to get camera position from database (via bodyParts prop)
    console.log('🔍 Looking for body part:', targetBodyPart, 'Available body parts:', bodyParts.map(bp => ({ name: bp.name, hasJson: !!bp.cameraPositionJson })))
    
    const bodyPartData = bodyParts.find(
      bp => bp.name.toLowerCase() === targetBodyPart.toLowerCase()
    )
    
    console.log('📋 Found body part data:', bodyPartData ? { name: bodyPartData.name, hasJson: !!bodyPartData.cameraPositionJson, json: bodyPartData.cameraPositionJson } : 'NOT FOUND')
    
    let targetPosition: THREE.Vector3 | null = null
    let targetRotation: THREE.Euler | null = null
    
    if (bodyPartData && bodyPartData.cameraPositionJson && bodyPartData.cameraPositionJson.trim()) {
      // Parse JSON from database
      try {
        const cameraPos = JSON.parse(bodyPartData.cameraPositionJson)
        console.log('✅ Parsed camera position JSON:', cameraPos)
        targetPosition = new THREE.Vector3(
          cameraPos.cameraPositionX || 0,
          cameraPos.cameraPositionY || 0,
          cameraPos.cameraPositionZ || 0
        )
        targetRotation = new THREE.Euler(
          THREE.MathUtils.degToRad(cameraPos.cameraRotationX || 0),
          THREE.MathUtils.degToRad(cameraPos.cameraRotationY || 0),
          THREE.MathUtils.degToRad(cameraPos.cameraRotationZ || 0)
        )
        console.log('✅ Created target position:', targetPosition, 'and rotation:', targetRotation)
      } catch (error) {
        console.error('❌ Error parsing camera position JSON:', error, 'JSON string:', bodyPartData.cameraPositionJson)
        // Fall through to hardcoded positions
      }
    } else {
      console.log('⚠️ No camera position JSON found for body part:', targetBodyPart)
    }
    
    // Fallback to hardcoded positions if database position not available
    if (!targetPosition || !targetRotation) {
      console.log('⚠️ Database position not available, trying hardcoded positions for:', targetBodyPart)
      let cameraPos = BODY_PART_CAMERA_POSITIONS[targetBodyPart]
      if (!cameraPos) {
        // Try case-insensitive match
        const key = Object.keys(BODY_PART_CAMERA_POSITIONS).find(
          k => k.toLowerCase() === targetBodyPart.toLowerCase()
        )
        if (key) {
          console.log('✅ Found hardcoded position via case-insensitive match:', key)
          cameraPos = BODY_PART_CAMERA_POSITIONS[key]
        }
      }
      
      if (!cameraPos) {
        console.warn('❌ No camera position found (neither database nor hardcoded) for:', targetBodyPart)
        console.log('Available hardcoded positions:', Object.keys(BODY_PART_CAMERA_POSITIONS))
        isAnimating.current = false
        lastTargetBodyPart.current = null
        return // No position found, don't animate
      }
      
      targetPosition = new THREE.Vector3(
        cameraPos.position.x,
        cameraPos.position.y,
        cameraPos.position.z
      )
      targetRotation = new THREE.Euler(
        THREE.MathUtils.degToRad(cameraPos.rotation.x),
        THREE.MathUtils.degToRad(cameraPos.rotation.y),
        THREE.MathUtils.degToRad(cameraPos.rotation.z)
      )
      console.log('✅ Using hardcoded position for:', targetBodyPart)
    }

    // Animate camera position and rotation
    positionTweenRef.current = gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (controlsRef.current) {
          controlsRef.current.update()
        }
      },
      onComplete: () => {
        // Only reset if both animations are complete
        if (!rotationTweenRef.current?.isActive()) {
          isAnimating.current = false
        }
      }
    })

    rotationTweenRef.current = gsap.to(camera.rotation, {
      x: targetRotation.x,
      y: targetRotation.y,
      z: targetRotation.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => {
        // Only reset if both animations are complete
        if (!positionTweenRef.current?.isActive()) {
          isAnimating.current = false
        }
      }
    })

    console.log(`🎯 Animating camera to ${targetBodyPart} position:`, {
      position: { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
      rotation: { 
        x: THREE.MathUtils.radToDeg(targetRotation.x).toFixed(2) + '°', 
        y: THREE.MathUtils.radToDeg(targetRotation.y).toFixed(2) + '°', 
        z: THREE.MathUtils.radToDeg(targetRotation.z).toFixed(2) + '°' 
      },
      source: bodyPartData ? 'database' : 'hardcoded'
    })
  }, [targetBodyPart, camera, controlsRef, bodyParts])

  // Track camera changes
  useFrame(() => {
    const currentPosition = camera.position.clone()
    const currentRotation = camera.rotation.clone()

    // Check if camera has moved or rotated
    const positionChanged = !currentPosition.equals(lastPosition.current)
    const rotationChanged = !currentRotation.equals(lastRotation.current)

    if (positionChanged || rotationChanged) {
      lastPosition.current.copy(currentPosition)
      lastRotation.current.copy(currentRotation)

      if (onCameraChange) {
        onCameraChange(currentPosition, currentRotation)
      }
    }
  })

  return null
}

function Model({ onBodyPartClick, selectedBodyPart, bodyParts = [], onCameraChange, controlsRef, onCaptureCoordinates, modelGroupRef }: Model3DViewerProps & { controlsRef: React.MutableRefObject<any>, modelGroupRef: React.MutableRefObject<THREE.Group | null> }) {
  const { scene } = useGLTF('/images/model.glb')
  const { camera } = useThree()
  const modelRef = useRef<THREE.Group>(null)
  
  // No clicked mesh state needed - no visual highlight
  const [meshMapping, setMeshMapping] = useState<MeshMapping>({})

  // Create mapping from mesh names to body part names
  useEffect(() => {
    const mapping: MeshMapping = {}
    const allMeshes: Array<{ name: string; mesh: THREE.Mesh }> = []
    
    // Traverse scene and collect all meshes
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name || child.userData.name || `mesh_${child.uuid.substring(0, 8)}`
        
        // Store original name before mapping
        if (!child.name && !child.userData.originalName) {
          child.userData.originalName = meshName
        }
        
        allMeshes.push({ name: meshName, mesh: child })
      }
    })

    // Map each mesh to a body part name
    // If multiple meshes have same name (like "Mesh 0"), we need to differentiate them
    allMeshes.forEach(({ name, mesh }, index) => {
      // For meshes with same name, create unique identifier using index and position
      let uniqueName = name
      
      // Check if this name already exists (multiple meshes with same name)
      const existingWithSameName = allMeshes.filter(m => m.name === name)
      if (existingWithSameName.length > 1) {
        // Create unique name based on position
        const box = new THREE.Box3().setFromObject(mesh)
        const center = box.getCenter(new THREE.Vector3())
        uniqueName = `${name}_${index}_y${center.y.toFixed(2)}_z${center.z.toFixed(2)}`
        mesh.userData.uniqueMeshName = uniqueName
      }
      
      // Map mesh name to body part name using comprehensive mapping (with mesh for position-based detection)
      const bodyPartName = mapMeshNameToBodyPart(name, bodyParts, mesh)
      
      mapping[uniqueName] = bodyPartName
      mesh.userData.bodyPartName = bodyPartName
      mesh.userData.originalMeshName = name
      mesh.userData.meshIndex = index
      
      // Store mesh position for debugging and detection
      const worldPos = new THREE.Vector3()
      mesh.getWorldPosition(worldPos)
      mesh.userData.worldPosition = worldPos
      const box = new THREE.Box3().setFromObject(mesh)
      const bboxCenter = box.getCenter(new THREE.Vector3())
      mesh.userData.boundingBoxCenter = bboxCenter
      mesh.userData.boundingBoxSize = box.getSize(new THREE.Vector3())
    })

    setMeshMapping(mapping)
    
    // Log all mesh names for debugging - helps identify actual mesh names in GLB file
    const meshNames = Object.keys(mapping)
    console.log('=== 3D Model Body Parts ===')
    console.log('Total meshes found:', meshNames.length)
    console.log('Mesh names in GLB:', meshNames)
    console.log('Body part mappings:', mapping)
    
    // Log each mesh with its assigned body part and position
    console.log('\n=== Detailed Mesh Information ===')
    allMeshes.forEach(({ name, mesh }, index) => {
      const worldPos = mesh.userData.worldPosition || new THREE.Vector3()
      const bboxCenter = mesh.userData.boundingBoxCenter || new THREE.Vector3()
      console.log(`Mesh ${index}: "${name}"`)
      console.log(`  -> Body Part: "${mesh.userData.bodyPartName}"`)
      console.log(`  -> Position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`)
      console.log(`  -> BBox Center: (${bboxCenter.x.toFixed(2)}, ${bboxCenter.y.toFixed(2)}, ${bboxCenter.z.toFixed(2)})`)
    })
    
    // If we have generic mesh names, suggest manual mapping
    const genericMeshes = meshNames.filter(name => /^mesh\s*\d+$/i.test(name))
    if (genericMeshes.length > 0) {
      console.warn(`\n⚠️ Warning: Found ${genericMeshes.length} generic mesh names (Mesh 0, Mesh 1, etc.)`)
      console.warn('These meshes are using position-based detection which may not be accurate.')
      console.warn('Consider manually mapping these meshes to body parts.')
      console.warn('Generic meshes:', genericMeshes)
    }
  }, [scene, bodyParts])

  // Get the actual body part name for a mesh
  const getBodyPartName = (mesh: THREE.Mesh): string => {
    // Check if already mapped
    if (mesh.userData.bodyPartName) {
      return mesh.userData.bodyPartName
    }
    
    // If not mapped yet, map it on the fly (pass mesh for position-based detection)
    const meshName = mesh.name || mesh.userData.originalName || mesh.userData.originalMeshName || `mesh_${mesh.uuid.substring(0, 8)}`
    const bodyPartName = mapMeshNameToBodyPart(meshName, bodyParts, mesh)
    
    // Cache the mapping
    mesh.userData.bodyPartName = bodyPartName
    mesh.userData.originalMeshName = meshName
    
    // Update mapping state
    if (!meshMapping[meshName]) {
      setMeshMapping(prev => ({ ...prev, [meshName]: bodyPartName }))
    }
    
    console.log(`On-the-fly mapping: "${meshName}" -> "${bodyPartName}"`)
    return bodyPartName
  }

  // No hover effects - removed for cleaner interface

  // Add click handler to the group (optional - only if onBodyPartClick is provided)
  const handleGroupClick = (event: any) => {
    event.stopPropagation()
    // Only handle click if callback is provided (for optional exercise viewing)
    if (onBodyPartClick && event.intersections && event.intersections.length > 0) {
      const intersect = event.intersections[0]
      let clickedMeshObj: THREE.Mesh | null = null
      
      // Find the mesh from intersection
      if (intersect.object instanceof THREE.Mesh) {
        clickedMeshObj = intersect.object
      } else {
        // Traverse up to find mesh parent
        let obj: THREE.Object3D | null = intersect.object
        while (obj && !clickedMeshObj) {
          if (obj instanceof THREE.Mesh) {
            clickedMeshObj = obj
            break
          }
          obj = obj.parent
        }
      }
      
      if (clickedMeshObj) {
      const bodyPartName = getBodyPartName(clickedMeshObj)
      const originalMeshName = clickedMeshObj.userData.originalMeshName || clickedMeshObj.name || ''
      const position = intersect.point.clone()
      
        // Capture camera coordinates when clicking on model
        if (onCaptureCoordinates) {
          const cameraPos = camera.position.clone()
          const cameraRot = camera.rotation.clone()
          const target = new THREE.Vector3(0, 0, 0) // Target is origin for OrbitControls
          const distance = cameraPos.distanceTo(target)
          
          // Calculate zoom level (closer = more zoomed in, further = more zoomed out)
          // Default camera position is [0, 0, 8], so zoom level is relative to that
          const defaultDistance = 8
          const zoomLevel = ((defaultDistance / distance) * 100).toFixed(2) // Percentage zoom
          
          const coordinates = {
            position: {
              x: parseFloat(cameraPos.x.toFixed(2)),
              y: parseFloat(cameraPos.y.toFixed(2)),
              z: parseFloat(cameraPos.z.toFixed(2))
            },
            rotation: {
              x: parseFloat(THREE.MathUtils.radToDeg(cameraRot.x).toFixed(2)),
              y: parseFloat(THREE.MathUtils.radToDeg(cameraRot.y).toFixed(2)),
              z: parseFloat(THREE.MathUtils.radToDeg(cameraRot.z).toFixed(2))
            },
            distance: parseFloat(distance.toFixed(2)),
            zoomLevel: parseFloat(zoomLevel)
          }
          
          // Create JSON in database format
          const jsonData = {
            cameraPositionX: coordinates.position.x,
            cameraPositionY: coordinates.position.y,
            cameraPositionZ: coordinates.position.z,
            cameraRotationX: coordinates.rotation.x,
            cameraRotationY: coordinates.rotation.y,
            cameraRotationZ: coordinates.rotation.z,
            cameraDistance: coordinates.distance,
            zoomLevel: coordinates.zoomLevel
          }
          
          onCaptureCoordinates({
            ...coordinates,
            json: JSON.stringify(jsonData, null, 2)
          })
        }

        // No visual highlight on click - clean interface
        // Just handle the click to show exercises

      // Offset slightly above the surface for better visibility
      position.y += 0.3
      onBodyPartClick(bodyPartName, position, originalMeshName)
      }
    }
  }

  // No visual highlight to reset - removed for cleaner interface

  return (
    <group 
      ref={(ref) => {
        modelRef.current = ref
        if (ref && modelGroupRef) {
          modelGroupRef.current = ref
        }
      }} 
      onClick={handleGroupClick}
    >
      <primitive object={scene} scale={2.5} />
      {/* No hover effects or popups - clean interface */}
    </group>
  )
}

interface BodyPartMarkerProps {
  position: THREE.Vector3
  name: string
  onClick: () => void
}

function BodyPartMarker({ position, name, onClick }: BodyPartMarkerProps) {
  return (
    <Html position={position} center>
      <div
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg cursor-pointer text-center font-semibold text-sm hover:bg-blue-700 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        {name}
        <div className="text-xs mt-1 opacity-90">Click to view exercises</div>
      </div>
    </Html>
  )
}

export default function Model3DViewer({
  onBodyPartClick,
  selectedBodyPart,
  bodyParts = [],
  onCameraChange,
  onCaptureCoordinates,
}: Model3DViewerProps) {
  const [clickedBodyPart, setClickedBodyPart] = useState<{
    name: string
    position: THREE.Vector3
    meshName: string
  } | null>(null)
  const controlsRef = useRef<any>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)

  const handleBodyPartClick = (bodyPartName: string, position: THREE.Vector3, meshName: string) => {
    setClickedBodyPart({ name: bodyPartName, position, meshName })
    if (onBodyPartClick) {
      onBodyPartClick(bodyPartName, position, meshName)
    }
  }

  // Handle keyboard controls for up/down arrow keys to move model within frame
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Move the model group up/down instead of the camera
      // This keeps the model within the frame boundaries
      if (modelGroupRef.current) {
        const moveSpeed = 0.3 // Movement speed for model
        const currentY = modelGroupRef.current.position.y
        
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          // Move model up (increase Y position)
          // This will show upper parts, lower parts go out of view
          modelGroupRef.current.position.y = currentY + moveSpeed
          console.log('⬆️ Model moved up, Y position:', modelGroupRef.current.position.y.toFixed(2))
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          // Move model down (decrease Y position)
          // This will show lower parts (like legs), upper parts go out of view
          modelGroupRef.current.position.y = currentY - moveSpeed
          console.log('⬇️ Model moved down, Y position:', modelGroupRef.current.position.y.toFixed(2))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modelGroupRef])

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#ffffff', 
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <directionalLight position={[-10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.8} />
          <pointLight position={[10, -10, -5]} intensity={0.8} />
          <Model
            onBodyPartClick={handleBodyPartClick}
            selectedBodyPart={selectedBodyPart}
            bodyParts={bodyParts}
            onCameraChange={onCameraChange}
            controlsRef={controlsRef}
            onCaptureCoordinates={onCaptureCoordinates}
            modelGroupRef={modelGroupRef}
          />
          {/* Camera controller to animate and track coordinates */}
          <CameraController 
            targetBodyPart={selectedBodyPart} 
            onCameraChange={onCameraChange}
            controlsRef={controlsRef}
            bodyParts={bodyParts}
          />
          {/* No marker popup - removed for cleaner interface */}
        </Suspense>
        <OrbitControls
          ref={(controls) => {
            // Store controls reference for camera animation
            if (controls) {
              controlsRef.current = controls
            }
          }}
          enableZoom={true}
          enablePan={true}
          panSpeed={0.8}
          enableRotate={true} // Enable manual rotation with mouse drag
          minDistance={1}
          maxDistance={100}
          zoomSpeed={1.2}
          onChange={(e) => {
            // Additional tracking on OrbitControls change
            if (e?.target) {
              const controls = e.target as any
              const camera = controls.object
              if (camera && onCameraChange) {
                onCameraChange(camera.position.clone(), camera.rotation.clone())
              }
            }
          }}
        />
      </Canvas>
    </div>
  )
}



