// Base imports
import React, { useEffect, useLayoutEffect, useRef, useState } from "react"

// Hooks and helpers
import { useClipboard } from "@mantine/hooks"
import { showNotification } from "../../helpers/notification"
import useContextMenu from "../mapComponents/useContextMenu"

// UI components
import ContextMenuItem from "../mapComponents/contextMenuItem"

const coordsFractionDigits = 7

export function useMissionContextMenu() {
  const contextMenuRef = useRef()
  const { clicked, setClicked, points, setPoints } = useContextMenu()
  const [contextMenuPositionCalculationInfo, setContextMenuPositionCalculationInfo] = useState()
  const [clickedGpsCoords, setClickedGpsCoords] = useState({ lng: 0, lat: 0 })
  const [savedCoordinates, setSavedCoordinates] = useState([])
  const [showSubmenu, setShowSubmenu] = useState(false)
  const clipboard = useClipboard({ timeout: 500 })

  // Position before paint to avoid flash from old to new position
  useLayoutEffect(() => {
    if (contextMenuRef.current && contextMenuPositionCalculationInfo) {
      const contextMenuWidth = Math.round(
        contextMenuRef.current.getBoundingClientRect().width,
      )
      const contextMenuHeight = Math.round(
        contextMenuRef.current.getBoundingClientRect().height,
      )
      let x = contextMenuPositionCalculationInfo.clickedPoint.x
      let y = contextMenuPositionCalculationInfo.clickedPoint.y

      if (
        contextMenuWidth + contextMenuPositionCalculationInfo.clickedPoint.x >
        contextMenuPositionCalculationInfo.canvasSize.width
      ) {
        x = contextMenuPositionCalculationInfo.clickedPoint.x - contextMenuWidth
      }
      if (
        contextMenuHeight + contextMenuPositionCalculationInfo.clickedPoint.y >
        contextMenuPositionCalculationInfo.canvasSize.height
      ) {
        y =
          contextMenuPositionCalculationInfo.clickedPoint.y - contextMenuHeight
      }

      setPoints({ x, y })
      setIsPositioned(true)
    }
  }, [contextMenuPositionCalculationInfo])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clicked && contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setClicked(false)
        setShowSubmenu(false)
        setClickedWaypointId(null)
        setIsPositioned(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [clicked])

  const handleContextMenu = (e, waypointId = null) => {
    e.preventDefault()
    setClicked(true)
    setShowSubmenu(false)
    setClickedWaypointId(waypointId)
    
    // Log waypoint ID if clicked on a waypoint
    if (waypointId !== null) {
      console.log("Right-clicked waypoint ID:", waypointId)
    }
    
    setClickedGpsCoords(e.lngLat)
    // Identify waypoint id (if right-clicked on a waypoint element)
    const el = e.originalEvent?.target
    const idEl = el?.closest?.('[data-waypoint-id], [data-id]')
    const waypointId = idEl?.dataset?.waypointId ?? idEl?.dataset?.id ?? null
    setClickedWaypointId(waypointId ?? null)
    console.log('Right-click waypoint id:', waypointId ?? null)
    // Save coordinates for future use
    setSavedCoordinates(prev => [...prev, {
      lat: e.lngLat.lat,
      lng: e.lngLat.lng,
      timestamp: new Date().toISOString(),
      waypointId: waypointId
    }])
    setContextMenuPositionCalculationInfo({
      clickedPoint: e.point,
      canvasSize: {
        height: e.originalEvent.target.clientHeight,
        width: e.originalEvent.target.clientWidth,
      },
    })
  }

  return {
    // state
    clicked,
    setClicked,
    points,
    clickedGpsCoords,
    savedCoordinates,
    showSubmenu,
    setShowSubmenu,
    // refs
    contextMenuRef,
    // handlers
    handleContextMenu,
    // helpers
    clipboard,
  }
}

export default function MissionContextMenuOverlay({ ctx }) {
  if (!ctx.clicked) return null
  
  return (
    <div
      ref={ctx.contextMenuRef}
      className="absolute bg-falcongrey-700 rounded-md p-1 min-w-[180px]"
      style={{ top: ctx.points.y, left: ctx.points.x }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Copy Coordinates */}
      <ContextMenuItem
        onClick={(e) => {
          e.stopPropagation()
          ctx.clipboard.copy(
            `${ctx.clickedGpsCoords.lat}, ${ctx.clickedGpsCoords.lng}`,
          )
          showNotification("Copied to clipboard")
          ctx.setClicked(false)
        }}
      >
        <div className="w-full flex justify-between gap-2">
          <p>
            {ctx.clickedGpsCoords.lat.toFixed(coordsFractionDigits)}, {" "}
            {ctx.clickedGpsCoords.lng.toFixed(coordsFractionDigits)}
          </p>
          <svg
            className="relative -right-1"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M9 18q-.825 0-1.412-.587T7 16V4q0-.825.588-1.412T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.587 1.413T18 18zm0-2h9V4H9zm-4 6q-.825 0-1.412-.587T3 20V7q0-.425.288-.712T4 6t.713.288T5 7v13h10q.425 0 .713.288T16 21t-.288.713T15 22zm4-6V4z"
            />
          </svg>
        </div>
      </ContextMenuItem>

      {/* Divider */}
      <div className="border-t border-falcongrey-600 my-1"></div>

      {/* Insert Command */}
      <div className="relative">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation()
            ctx.setShowSubmenu(!ctx.showSubmenu)
          }}
        >
          <div className="w-full flex justify-between gap-2">
            <span>Insert Command</span>
            <svg
              className={`transform transition-transform ${ctx.showSubmenu ? 'rotate-90' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6l-1.41-1.41z"
              />
            </svg>
          </div>
        </ContextMenuItem>

        {/* Insert Submenu */}
        {ctx.showSubmenu && (
          <div
            className="absolute left-full top-0 ml-1 bg-falcongrey-700 rounded-md p-1 min-w-[140px] shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                console.log("Insert Waypoint at:", ctx.clickedGpsCoords)
                ctx.setClicked(false)
                ctx.setShowSubmenu(false)
              }}
            >
              <span>Waypoint</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                console.log("Insert Land at:", ctx.clickedGpsCoords)
                ctx.setClicked(false)
                ctx.setShowSubmenu(false)
              }}
            >
              <span>Land</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                console.log("Insert Takeoff at:", ctx.clickedGpsCoords)
                ctx.setClicked(false)
                ctx.setShowSubmenu(false)
              }}
            >
              <span>Takeoff</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                console.log("Insert Return to Launch at:", ctx.clickedGpsCoords)
                ctx.setClicked(false)
                ctx.setShowSubmenu(false)
              }}
            >
              <span>Return to Launch</span>
            </ContextMenuItem>
          </div>
        )}
      </div>

      {/* Delete Command */}
      <ContextMenuItem
        onClick={(e) => {
          e.stopPropagation()
          console.log("Delete command at:", ctx.clickedGpsCoords)
          ctx.setClicked(false)
        }}
      >
        <div className="w-full flex justify-between gap-2">
          <span>Delete Command</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z"
            />
          </svg>
        </div>
      </ContextMenuItem>
    </div>
  )
}

