// src/components/engage/visual-editor/ElementOverlay.jsx
// Draggable overlay for positioning elements on the iframe preview

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Move, Edit2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

const SNAP_GRID = 10 // Snap to 10px grid
const SNAP_THRESHOLD = 5 // Snap when within 5px of grid line

export default function ElementOverlay({
  element,
  device,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit
}) {
  const overlayRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const getInitialPosition = () => {
    if (element.position_data) {
      return element.position_data
    }
    
    // Default positions based on element type and position setting
    switch (element.position) {
      case 'center':
        return { x: 'calc(50% - 200px)', y: 'calc(50% - 150px)' }
      case 'top-center':
        return { x: 'calc(50% - 200px)', y: '20px' }
      case 'bottom-center':
        return { x: 'calc(50% - 200px)', y: 'calc(100% - 200px)' }
      case 'top-bar':
        return { x: '0', y: '0' }
      case 'bottom-bar':
        return { x: '0', y: 'calc(100% - 60px)' }
      case 'bottom-right':
        return { x: 'calc(100% - 340px)', y: 'calc(100% - 200px)' }
      case 'bottom-left':
        return { x: '20px', y: 'calc(100% - 200px)' }
      case 'top-right':
        return { x: 'calc(100% - 340px)', y: '20px' }
      case 'top-left':
        return { x: '20px', y: '20px' }
      default:
        return { x: 'calc(50% - 200px)', y: 'calc(50% - 150px)' }
    }
  }
  
  const snapToGrid = (value) => {
    const remainder = value % SNAP_GRID
    if (Math.abs(remainder) < SNAP_THRESHOLD) {
      return value - remainder
    }
    if (Math.abs(remainder - SNAP_GRID) < SNAP_THRESHOLD) {
      return value + (SNAP_GRID - remainder)
    }
    return value
  }
  
  const handleDragStart = useCallback((e) => {
    if (!overlayRef.current) return
    
    const rect = overlayRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    onDragStart?.()
  }, [onDragStart])
  
  const handleDrag = useCallback((e, info) => {
    const newX = snapToGrid(info.point.x - dragOffset.x)
    const newY = snapToGrid(info.point.y - dragOffset.y)
    setPosition({ x: newX, y: newY })
  }, [dragOffset])
  
  const handleDragEnd = useCallback((e, info) => {
    onDragEnd?.({
      x: position.x,
      y: position.y,
      anchor: detectAnchor(position)
    })
  }, [position, onDragEnd])
  
  // Detect which anchor point is closest
  const detectAnchor = (pos) => {
    // Simplified - could be expanded for smarter snapping
    if (pos.y < 100) return 'top'
    if (pos.y > 500) return 'bottom'
    return 'center'
  }
  
  const initialPos = getInitialPosition()
  const { headline, body, cta_text, appearance } = element
  const {
    backgroundColor = '#ffffff',
    textColor = '#1a1a1a',
    primaryColor = '#4bbf39',
    borderRadius = 12,
    shadow = 'lg'
  } = appearance || {}
  
  const shadowClass = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }[shadow]
  
  const getElementWidth = () => {
    switch (element.element_type) {
      case 'banner':
        return '100%'
      case 'nudge':
        return '280px'
      case 'slide-in':
        return '320px'
      case 'popup':
      default:
        return '400px'
    }
  }
  
  return (
    <motion.div
      ref={overlayRef}
      className={cn(
        "absolute z-50",
        isDragging && "cursor-grabbing",
        !isDragging && "cursor-grab"
      )}
      style={{
        left: typeof initialPos.x === 'number' ? `${initialPos.x}px` : initialPos.x,
        top: typeof initialPos.y === 'number' ? `${initialPos.y}px` : initialPos.y,
        width: getElementWidth()
      }}
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
    >
      {/* Drag Handle */}
      <div 
        className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--brand-primary)] text-white px-2 py-1 rounded-md text-xs shadow-lg"
      >
        <GripVertical className="h-3 w-3" />
        <span>Drag to position</span>
      </div>
      
      {/* Selection Border */}
      <div 
        className={cn(
          "absolute -inset-2 border-2 border-dashed rounded-lg transition-colors",
          isDragging ? "border-blue-500" : "border-[var(--brand-primary)]"
        )}
      />
      
      {/* Resize Handles */}
      {element.element_type !== 'banner' && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-[var(--brand-primary)] rounded-sm cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-[var(--brand-primary)] rounded-sm cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-[var(--brand-primary)] rounded-sm cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-[var(--brand-primary)] rounded-sm cursor-se-resize" />
        </>
      )}
      
      {/* Action Buttons */}
      <div className="absolute -right-12 top-0 flex flex-col gap-1">
        <button
          onClick={onEdit}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="Edit content"
        >
          <Edit2 className="h-4 w-4 text-gray-600" />
        </button>
        <button
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="Move"
        >
          <Move className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      
      {/* Element Preview */}
      <div
        className={cn(shadowClass, "overflow-hidden")}
        style={{
          backgroundColor,
          color: textColor,
          borderRadius: `${borderRadius}px`
        }}
      >
        {element.element_type === 'banner' ? (
          // Banner layout
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="font-semibold">{headline}</span>
              <span className="text-sm opacity-80">{body}</span>
            </div>
            <button
              style={{ backgroundColor: primaryColor }}
              className="text-white px-4 py-1.5 rounded text-sm font-medium"
            >
              {cta_text}
            </button>
          </div>
        ) : (
          // Popup/Slide-in/Nudge layout
          <div className="p-6 text-center">
            {/* Media */}
            {element.media?.length > 0 && element.media[0].type === 'image' && (
              <img 
                src={element.media[0].url} 
                alt="" 
                className="w-full h-32 object-cover rounded-lg mb-4" 
              />
            )}
            
            {/* Content */}
            <h2 
              className="font-bold mb-2 cursor-text"
              style={{ fontSize: element.element_type === 'nudge' ? '16px' : '24px' }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.()
              }}
            >
              {headline}
            </h2>
            <p 
              className="text-sm opacity-80 mb-4 cursor-text"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.()
              }}
            >
              {body}
            </p>
            
            {/* CTA */}
            <button
              style={{ backgroundColor: primaryColor }}
              className="text-white px-6 py-2.5 rounded-md font-semibold text-sm w-full"
            >
              {cta_text}
            </button>
            
            {/* Close button indicator */}
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs">
              ✕
            </div>
          </div>
        )}
      </div>
      
      {/* Position Indicator */}
      {isDragging && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs">
          {Math.round(position.x)}px, {Math.round(position.y)}px
        </div>
      )}
    </motion.div>
  )
}
