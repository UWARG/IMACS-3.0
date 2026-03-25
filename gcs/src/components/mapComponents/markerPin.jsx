/*
  A component to display a marker pin on a map
*/

// Base imports
import React from "react"

// Map and mantine imports
import { Tooltip } from "@mantine/core"
import { Marker } from "react-map-gl"
import { coordToInt } from "../../helpers/dataFormatters"

const MarkerPin = React.memo(
  ({
    id,
    lat,
    lon,
    colour,
    text = null,
    tooltipText = null,
    showOnTop = false,
    draggable = false,
    dragEndCallback = () => {},
    selected = false,
    onRightClick = () => {},
  }) => {
    return (
      <Marker
        latitude={lat}
        longitude={lon}
        className={showOnTop && "z-10"}
        draggable={draggable}
        onDragEnd={(e) => {
          dragEndCallback({
            id: id,
            x: coordToInt(e.lngLat.lat),
            y: coordToInt(e.lngLat.lng),
          })
        }}
      >
        <Tooltip disabled={tooltipText === null} label={tooltipText}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={selected ? "36" : "24"}
            height={selected ? "36" : "24"}
            viewBox="0 0 24 48"
            fill={selected ? "white" : colour}
            stroke={selected ? colour : "currentColor"}
            strokeWidth={selected ? "2" : "1"}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-map-pin h-16 w-16 text-black transition-all duration-150"
            style={selected ? { filter: `drop-shadow(0 0 6px ${colour})` } : {}}
            onContextMenu={(e) => {
              e.preventDefault()
              onRightClick(id, e.clientX, e.clientY)
            className="icon icon-tabler icons-tabler-outline icon-tabler-map-pin h-16 w-16 text-black"
            style={{ cursor: "pointer" }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation?.()
              onRightClick({
                lat,
                lon,
                clientX: e.clientX,
                clientY: e.clientY,
              })
            }}
            onPointerDown={(e) => {
              const btn = e?.button ?? e?.nativeEvent?.button
              const which = e?.nativeEvent?.which
              if (btn === 2 || which === 3) {
                e.preventDefault()
                e.stopPropagation?.()
                e.nativeEvent?.stopImmediatePropagation?.()
              }
            }}
            onMouseDown={(e) => {
              const btn = e?.button ?? e?.nativeEvent?.button
              const which = e?.nativeEvent?.which
              if (btn === 2 || which === 3) {
                e.preventDefault()
                e.stopPropagation?.()
                e.nativeEvent?.stopImmediatePropagation?.()
              }
            }}
          >
            <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
            {text && (
              <text textAnchor="middle" x="12" y="14" className="text-black" fill={selected ? colour : "currentColor"}>
                {text}
              </text>
            )}
          </svg>
        </Tooltip>
      </Marker>
    )
  },
)

export default MarkerPin
