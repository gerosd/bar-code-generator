'use client'

import React, { useState, useRef } from 'react'
import type { LabelElement, LabelElementType } from '@/lib/types/labelEditor'

interface DraggableElementProps {
    element: LabelElement
    onPositionChangeAction: (id: string, position: { x: number; y: number }) => void
    onSelectAction: (id: string) => void
    isSelected: boolean
    canvasScale: number
    sampleData?: Record<string, string>
}

const getElementDisplayName = (type: LabelElementType): string => {
    switch (type) {
        case 'productName': return 'Название товара'
        case 'productSize': return 'Размер'
        case 'nmId': return 'Артикул WB'
        case 'vendorCode': return 'Артикул продавца'
        case 'dataMatrix': return 'DataMatrix'
        default: return type
    }
}

const getElementContent = (type: LabelElementType, sampleData?: Record<string, string>): string => {
    if (!sampleData) {
        return getElementDisplayName(type)
    }

    switch (type) {
        case 'productName': return sampleData.productName || 'Название товара'
        case 'productSize': return sampleData.productSize || 'Размер'
        case 'nmId': return `Артикул: ${sampleData.nmId || '123456'}`
        case 'vendorCode': return `Артикул продавца:\n${sampleData.vendorCode || 'ART-001'}`
        case 'dataMatrix': return '[DataMatrix]'
        default: return getElementDisplayName(type)
    }
}

export default function DraggableElement({
    element,
    onPositionChangeAction,
    onSelectAction,
    isSelected,
    canvasScale,
    sampleData
}: DraggableElementProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const elementRef = useRef<HTMLDivElement>(null)

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        onSelectAction(element.id)
        setIsDragging(true)
        
        const rect = elementRef.current?.getBoundingClientRect()
        if (rect) {
            setDragStart({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            })
        }
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return

        const canvas = elementRef.current?.parentElement
        if (!canvas) return

        const canvasRect = canvas.getBoundingClientRect()
        const newX = (e.clientX - canvasRect.left - dragStart.x) / canvasScale
        const newY = (e.clientY - canvasRect.top - dragStart.y) / canvasScale

        // Ограничиваем перемещение границами канваса
        const elementWidth = (elementRef.current)
            ? elementRef.current.offsetWidth / canvasScale
            : 100
        const elementHeight = (elementRef.current)
            ? elementRef.current.offsetHeight / canvasScale
            : 30
        const maxX = canvas.clientWidth / canvasScale - elementWidth
        const maxY = canvas.clientHeight / canvasScale - elementHeight

        const clampedX = Math.max(0, Math.min(newX, maxX))
        const clampedY = Math.max(0, Math.min(newY, maxY))

        onPositionChangeAction(element.id, { x: clampedX, y: clampedY })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, dragStart, canvasScale])

    const elementStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.position.x * canvasScale,
        top: element.position.y * canvasScale,
        whiteSpace: "break-spaces",
        fontSize: element.fontSize ? element.fontSize * canvasScale : 16 * canvasScale,
        cursor: 'move',
        userSelect: 'none',
        border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
        borderRadius: '4px',
        padding: '4px 8px',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: element.visible ? 'block' : 'none',
        minWidth: '60px',
        minHeight: '20px'
    }

    if (element.type === 'dataMatrix') {
        return (
            <div
                ref={elementRef}
                style={{
                    ...elementStyle,
                    backgroundColor: '#f3f4f6',
                    border: isSelected ? '2px solid #3b82f6' : '2px dashed #9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12 * canvasScale,
                    color: '#6b7280',
                    width: `${canvasScale * 150}px`,
                    height: `${canvasScale * 150}px`,
                }}
                onMouseDown={handleMouseDown}
                title="DataMatrix код"
            >
                {getElementContent(element.type, sampleData)}
            </div>
        )
    }

    return (
        <div
            ref={elementRef}
            style={elementStyle}
            onMouseDown={handleMouseDown}
            title={getElementDisplayName(element.type)}
        >
            {getElementContent(element.type, sampleData)}
        </div>
    )
}