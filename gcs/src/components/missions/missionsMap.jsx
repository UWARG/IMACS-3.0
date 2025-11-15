/*
  The missions map.

  This uses maplibre to load the map, currently (as of 16/03/2025) this needs an internet
  connection to load but this will be addressed in later versions of FGCS. Please check
  docs/changelogs if this description has not been updated.
*/

// Base imports
import React, { useEffect, useRef, useState } from "react"

// Maplibre and mantine imports
import {
  useClipboard,
  useLocalStorage,
  usePrevious,
  useSessionStorage,
} from "@mantine/hooks"
import "maplibre-gl/dist/maplibre-gl.css"
import Map from "react-map-gl/maplibre"

// Helper scripts
import { intToCoord, coordToInt } from "../../helpers/dataFormatters"
import { filterMissionItems } from "../../helpers/filterMissions"
import { showNotification } from "../../helpers/notification"
import { useSettings } from "../../helpers/settings"

// Other dashboard imports
import DrawLineCoordinates from "../mapComponents/drawLineCoordinates"
import DroneMarker from "../mapComponents/droneMarker"
import HomeMarker from "../mapComponents/homeMarker"
import MarkerPin from "../mapComponents/markerPin"

// Tailwind styling
import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../../../tailwind.config"
const tailwindColors = resolveConfig(tailwindConfig).theme.colors

const coordsFractionDigits = 7

function MapSectionNonMemo({
  passedRef,
  data,
  heading,
  desiredBearing,
  missionItems,
  homePosition,
  onDragstart,
  getFlightMode,
  currentTab,
  markerDragEndCallback,
  rallyDragEndCallback,
  mapId = "dashboard",
}) {
  const [connected] = useSessionStorage({
    key: "connectedToDrone",
    defaultValue: false,
  })
  const [guidedModePinData] = useSessionStorage({
    key: "guidedModePinData",
    defaultValue: null,
  })

  const [position, setPosition] = useState(null)
  const { getSetting } = useSettings()

  // Check if maps should be synchronized (from settings)
  const syncMaps = getSetting("General.syncMapViews") || false

  // Use either a shared key or a unique key based on the setting
  const viewStateKey = syncMaps
    ? "initialViewState"
    : `initialViewState_${mapId}`

  const [initialViewState, setInitialViewState] = useLocalStorage({
    key: viewStateKey,
    defaultValue: { latitude: 53.381655, longitude: -1.481434, zoom: 17 },
    getInitialValueInEffect: false,
  })
  const previousHomePositionValue = usePrevious(homePosition)

  const [missionItemsList, setMissionItemsList] = useState(
    missionItems.mission_items,
  )
  const [filteredMissionItems, setFilteredMissionItems] = useState([])

  const contextMenuRef = useRef()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [showInsert, setShowInsert] = useState(false)
  const [
    contextMenuPositionCalculationInfo,
    setContextMenuPositionCalculationInfo,
  ] = useState()
  const [clickedGpsCoords, setClickedGpsCoords] = useState({ lng: 0, lat: 0 })
  const [disableMarkerDrag, setDisableMarkerDrag] = useState(false)

  const clipboard = useClipboard({ timeout: 500 })

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setIsMenuOpen(false)
    }
    function onMouseDown(e) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setIsMenuOpen(false)
        setShowInsert(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener("keydown", onKeyDown)
      document.addEventListener("mousedown", onMouseDown)
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onMouseDown)
    }
  }, [isMenuOpen])

  useEffect(() => {
    return () => {}
  }, [connected])

  // Re-enable marker dragging on global pointer up
  useEffect(() => {
    const onPointerUp = () => setDisableMarkerDrag(false)
    window.addEventListener("pointerup", onPointerUp, true)
    return () => {
      window.removeEventListener("pointerup", onPointerUp, true)
    }
  }, [])

  // Ensure right-click on markers opens context menu instead of initiating drag
  useEffect(() => {
    const mapObj = passedRef?.current?.getMap?.()
    if (!mapObj) return
    const container = mapObj.getContainer()

    const blockRightClickDrag = (ev) => {
      const isRightButton =
        ev?.button === 2 || ev?.which === 3 || ev?.buttons === 2
      if (!isRightButton) return
      const target = ev.target
      const insideMap =
        container &&
        (target === container || container.contains(target))
      // If right click originated on a marker, block drag initiation
      const isMarker =
        !!(
          target?.closest &&
          (target.closest(".maplibregl-marker") ||
            target.closest(".mapboxgl-marker") ||
            target.closest(".icon-tabler-map-pin"))
        )
      if (insideMap && isMarker) {
        ev.stopPropagation()
        ev.preventDefault()
      }
    }

    document.addEventListener("mousedown", blockRightClickDrag, true)
    document.addEventListener("pointerdown", blockRightClickDrag, true)
    return () => {
      document.removeEventListener("mousedown", blockRightClickDrag, true)
      document.removeEventListener("pointerdown", blockRightClickDrag, true)
    }
  }, [passedRef])

  useEffect(() => {
    // Check latest data point is valid
    if (isNaN(data.lat) || isNaN(data.lon) || data.lon === 0 || data.lat === 0)
      return

    // Move drone icon on map
    let lat = intToCoord(data.lat)
    let lon = intToCoord(data.lon)
    setPosition({ latitude: lat, longitude: lon })
  }, [data])

  useEffect(() => {
    setFilteredMissionItems(filterMissionItems(missionItemsList))
  }, [missionItemsList])

  useEffect(() => {
    setMissionItemsList((prev) => {
      const previousList = Array.isArray(prev) ? prev : []
      const incomingList = Array.isArray(missionItems?.mission_items)
        ? missionItems.mission_items
        : []

      // Preserve locally added items (id starts with "local-")
      const localItems = previousList.filter(
        (it) => String(it?.id ?? "").startsWith("local-"),
      )
      const remoteItems = incomingList.filter(
        (it) => !String(it?.id ?? "").startsWith("local-"),
      )

      // Ensure local items have seq numbers after remote items to avoid clashes
      const maxRemoteSeq = remoteItems.reduce((max, it) => {
        const seq = isNaN(it?.seq) ? 0 : Number(it.seq)
        return seq > max ? seq : max
      }, 0)
      const adjustedLocals = localItems.map((it, idx) => {
        const seqNum = isNaN(it?.seq) ? 0 : Number(it.seq)
        if (seqNum <= maxRemoteSeq) {
          return { ...it, seq: maxRemoteSeq + idx + 1 }
        }
        return it
      })

      return [...remoteItems, ...adjustedLocals]
    })
  }, [missionItems])

  useEffect(() => {
    if (!contextMenuPositionCalculationInfo) return
    if (contextMenuRef.current) {
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

      setMenuPosition({ x, y })
    }
  }, [contextMenuPositionCalculationInfo])

  function handleInsertCommand() {
    setIsMenuOpen(false)
  }

  function handleDeleteNearest() {
    setIsMenuOpen(false)
  }

  function openMenuAtClient(lat, lon, clientX, clientY) {
    const mapObj = passedRef?.current?.getMap?.()
    const container = mapObj?.getContainer?.()
    const rect = container?.getBoundingClientRect?.()
    const x = rect ? clientX - rect.left : clientX
    const y = rect ? clientY - rect.top : clientY
    setShowInsert(false)
    setClickedGpsCoords({ lat, lng: lon })
    setMenuPosition({ x, y })
    setIsMenuOpen(true)
    setContextMenuPositionCalculationInfo({
      clickedPoint: { x, y },
      canvasSize: {
        width: container?.clientWidth || 0,
        height: container?.clientHeight || 0,
      },
    })
  }

  useEffect(() => {
    // center map on home point only on first instance of home point being
    // received from the drone
    if (
      passedRef.current &&
      homePosition !== null &&
      previousHomePositionValue === null
    ) {
      setInitialViewState({
        latitude: intToCoord(homePosition.lat),
        longitude: intToCoord(homePosition.lon),
        zoom: initialViewState.zoom,
      })
      passedRef.current.getMap().flyTo({
        center: [intToCoord(homePosition.lon), intToCoord(homePosition.lat)],
        zoom: initialViewState.zoom,
      })
    }
  }, [homePosition])

  return (
    <div className="w-initial h-full" id="map">
      <Map
        initialViewState={initialViewState}
        mapStyle={`https://api.maptiler.com/maps/${getSetting("General.mapStyle") || "hybrid"}/style.json?key=${getSetting("General.maptilerAPIKey") || import.meta.env.VITE_MAPTILER_API_KEY}`}
        ref={passedRef}
        attributionControl={false}
        dragRotate={false}
        touchRotate={false}
        onMoveEnd={(newViewState) =>
          setInitialViewState({
            latitude: newViewState.viewState.latitude,
            longitude: newViewState.viewState.longitude,
            zoom: newViewState.viewState.zoom,
          })
        }
        onDragStart={onDragstart}
        onContextMenu={(e) => {
          e.preventDefault()
          setDisableMarkerDrag(true)
          setShowInsert(false)
          setClickedGpsCoords(e.lngLat)
          // Set position immediately to avoid flashing at previous location
          setMenuPosition({ x: e.point.x, y: e.point.y })
          setIsMenuOpen(true)
          setContextMenuPositionCalculationInfo({
            clickedPoint: e.point,
            canvasSize: {
              height: e.originalEvent.target.clientHeight,
              width: e.originalEvent.target.clientWidth,
            },
          })
        }}
        onPointerDownCapture={(e) => {
          // React-level fallback to block right-button drag start on markers
          const isRightButton =
            e?.button === 2 || e?.nativeEvent?.which === 3 || e?.nativeEvent?.button === 2
          if (!isRightButton) return
          const target = e.target
          if (
            target?.closest?.(".maplibregl-marker") ||
            target?.closest?.(".mapboxgl-marker") ||
            target?.closest?.(".icon-tabler-map-pin")
          ) {
            setDisableMarkerDrag(true)
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        cursor="default"
      >
        {/* Show marker on map if the position is set */}
        {position !== null &&
          !isNaN(position?.latitude) &&
          !isNaN(position?.longitude) && (
            <DroneMarker
              lat={position.latitude}
              lon={position.longitude}
              heading={heading ?? 0}
              zoom={initialViewState.zoom}
              showHeadingLine={true}
              desiredBearing={desiredBearing ?? 0}
            />
          )}

        {/* Mission items as markers only (no connecting lines) */}
        {filteredMissionItems.map((item, index) => {
          return (
            <MarkerPin
              key={index}
              id={item.id}
              lat={intToCoord(item.x)}
              lon={intToCoord(item.y)}
              colour={tailwindColors.yellow[400]}
              text={item.seq}
              tooltipText={item.z ? `Alt: ${item.z}` : null}
              draggable={currentTab === "mission" && !disableMarkerDrag && !isMenuOpen}
              dragEndCallback={markerDragEndCallback}
              onRightClick={({ lat, lon, clientX, clientY }) =>
                openMenuAtClient(lat, lon, clientX, clientY)
              }
            />
          )
        })}

        {/* Polyline connecting mission items in sequence (no wrap-around) */}
        {(() => {
          const lineCoords = [...filteredMissionItems]
            .sort((a, b) => (isNaN(a?.seq) ? 0 : a.seq) - (isNaN(b?.seq) ? 0 : b.seq))
            .map((it) => [intToCoord(it.y), intToCoord(it.x)])
          return lineCoords.length > 1 ? (
            <DrawLineCoordinates
              coordinates={lineCoords}
              colour={tailwindColors.yellow[400]}
            />
          ) : null
        })()}

        {/* Show mission geo-fence MARKERS */}
        {missionItems.fence_items.map((item, index) => {
          return (
            <MarkerPin
              key={index}
              lat={intToCoord(item.x)}
              lon={intToCoord(item.y)}
              colour={tailwindColors.blue[400]}
            />
          )
        })}

        {/* Show geo-fence outlines */}
        {missionItems.fence_items.length > 0 && (
          <DrawLineCoordinates
            coordinates={[
              ...missionItems.fence_items.map((item) => [
                intToCoord(item.y),
                intToCoord(item.x),
              ]),
              [
                intToCoord(missionItems.fence_items[0].y),
                intToCoord(missionItems.fence_items[0].x),
              ],
            ]}
            colour={tailwindColors.blue[200]}
            lineProps={{ "line-dasharray": [2, 2] }}
          />
        )}

        {/* Show mission rally point */}
        {missionItems.rally_items.map((item, index) => {
          return (
            <MarkerPin
              key={index}
              id={item.id}
              lat={intToCoord(item.x)}
              lon={intToCoord(item.y)}
              colour={tailwindColors.purple[400]}
              tooltipText={item.z ? `Alt: ${item.z}` : null}
              draggable={currentTab === "rally" && !disableMarkerDrag && !isMenuOpen}
              dragEndCallback={rallyDragEndCallback}
              onRightClick={({ lat, lon, clientX, clientY }) =>
                openMenuAtClient(lat, lon, clientX, clientY)
              }
            />
          )
        })}

        {getFlightMode() === "Guided" && guidedModePinData !== null && (
          <MarkerPin
            lat={guidedModePinData.lat}
            lon={guidedModePinData.lon}
            colour={tailwindColors.pink[500]}
            tooltipText={
              guidedModePinData.alt ? `Alt: ${guidedModePinData.alt}` : null
            }
          />
        )}

        {/* Show home position */}
        {homePosition !== null && (
          <HomeMarker
            lat={intToCoord(homePosition.lat)}
            lon={intToCoord(homePosition.lon)}
          />
        )}

        {isMenuOpen && (
          <div
            ref={contextMenuRef}
            className="absolute bg-falcongrey-700 rounded-md p-1"
            style={{ top: menuPosition.y, left: menuPosition.x }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <button
              onClick={() => {
                clipboard.copy(
                  `${clickedGpsCoords.lat}, ${clickedGpsCoords.lng}`,
                )
                showNotification("Copied to clipboard")
                setIsMenuOpen(false)
              }}
              className="block w-full text-left px-2 py-1 hover:bg-falcongrey-600 rounded"
            >
              <div className="w-full flex justify-between gap-2">
                <p>
                  {clickedGpsCoords.lat.toFixed(coordsFractionDigits)},{" "}
                  {clickedGpsCoords.lng.toFixed(coordsFractionDigits)}
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
            </button>

            <div
              className="relative"
              onMouseEnter={() => setShowInsert(true)}
              onMouseLeave={() => setShowInsert(false)}
            >
              <button
                className="flex w-full items-center justify-between px-2 py-1 hover:bg-falcongrey-600 rounded"
                onClick={() => setShowInsert((v) => !v)}
              >
                <span>Insert</span>
                <span className="ml-4">▸</span>
              </button>
              {showInsert && (
                <div className="absolute left-full top-0 bg-falcongrey-700 rounded-md p-1 shadow-lg">
                  <button
                    onClick={() => {
                      handleInsertCommand(16, "Waypoint")
                    }}
                    className="block w-full text-left px-2 py-1 hover:bg-falcongrey-600 rounded whitespace-nowrap"
                  >
                    Waypoint
                  </button>
                  <button
                    onClick={() => {
                      handleInsertCommand(22, "Takeoff")
                    }}
                    className="block w-full text-left px-2 py-1 hover:bg-falcongrey-600 rounded whitespace-nowrap"
                  >
                    Takeoff
                  </button>
                  <button
                    onClick={() => {
                      handleInsertCommand(21, "Land")
                    }}
                    className="block w-full text-left px-2 py-1 hover:bg-falcongrey-600 rounded whitespace-nowrap"
                  >
                    Land
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                handleDeleteNearest()
              }}
              className="block w-full text-left px-2 py-1 hover:bg-falcongrey-600 rounded"
            >
              Delete
            </button>
          </div>
        )}
      </Map>
    </div>
  )
}

function propsAreEqual(prev, next) {
  return JSON.stringify(prev) === JSON.stringify(next)
}
const MissionsMapSection = React.memo(MapSectionNonMemo, propsAreEqual)

export default MissionsMapSection


