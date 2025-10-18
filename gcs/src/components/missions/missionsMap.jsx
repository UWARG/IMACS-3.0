/*
  The missions map.

  This uses maplibre to load the map, currently (as of 16/03/2025) this needs an internet
  connection to load but this will be addressed in later versions of FGCS. Please check
  docs/changelogs if this description has not been updated.
*/

// Base imports
import React, { useEffect, useState } from "react"

// Maplibre and mantine imports
import {
  useLocalStorage,
  usePrevious,
  useSessionStorage,
} from "@mantine/hooks"
import "maplibre-gl/dist/maplibre-gl.css"
import Map from "react-map-gl/maplibre"

// Helper scripts
import { intToCoord } from "../../helpers/dataFormatters"
import { filterMissionItems } from "../../helpers/filterMissions"
import { useSettings } from "../../helpers/settings"

// Other dashboard imports
import MissionContextMenuOverlay, { useMissionContextMenu } from "./missionContextMenu"
import DrawLineCoordinates from "../mapComponents/drawLineCoordinates"
import DroneMarker from "../mapComponents/droneMarker"
import HomeMarker from "../mapComponents/homeMarker"
import MarkerPin from "../mapComponents/markerPin"
import MissionItems from "../mapComponents/missionItems"

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

  const ctx = useMissionContextMenu()

  useEffect(() => {
    return () => {}
  }, [connected])

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
    setMissionItemsList(missionItems.mission_items)
  }, [missionItems])

  // Context menu positioning is handled inside useMissionContextMenu

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

  // Context menu close logic is handled inside useMissionContextMenu

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
        onContextMenu={ctx.handleContextMenu}
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

        <MissionItems
          missionItems={missionItemsList}
          editable={currentTab === "mission"}
          dragEndCallback={markerDragEndCallback}
          onMarkerContextMenu={ctx.handleContextMenu}
        />

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
              draggable={currentTab === "rally"}
              dragEndCallback={rallyDragEndCallback}
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
            lineTo={
              filteredMissionItems.length > 0 && [
                intToCoord(filteredMissionItems[0].y),
                intToCoord(filteredMissionItems[0].x),
              ]
            }
          />
        )}

        <MissionContextMenuOverlay ctx={ctx} />
      </Map>
    </div>
  )
}

function propsAreEqual(prev, next) {
  return JSON.stringify(prev) === JSON.stringify(next)
}
const MissionsMapSection = React.memo(MapSectionNonMemo, propsAreEqual)

export default MissionsMapSection
