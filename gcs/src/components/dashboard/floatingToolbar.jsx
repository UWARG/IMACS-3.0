/*
  Right hand side floating toolbar. This holds toggles like outside visibility mode and anchoring.
*/

// 3rd Party Imports
import { ActionIcon, Tooltip } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
import { centerOfMass, polygon } from "@turf/turf"
import {
  IconAnchor,
  IconAnchorOff,
  IconCrosshair,
  IconMapPins,
  IconSun,
  IconSunOff,
} from "@tabler/icons-react"

// Helper Functions
import { filterMissionItems } from "../../helpers/filterMissions"
import GetOutsideVisibilityColor from "../../helpers/outsideVisibility"

export default function FloatingToolbar({
  missionItems,
  centerMapOnDrone,
  gpsData,
  followDrone,
  setFollowDrone,
  mapRef,
}) {
  const filteredMissionItems = filterMissionItems(missionItems.mission_items)
  const [outsideVisibility, setOutsideVisibility] = useLocalStorage({
    key: "outsideVisibility",
    defaultValue: false,
  })

  function updateFollowDroneAction() {
    setFollowDrone(
      followDrone
        ? false
        : (() => {
            if (mapRef.current && gpsData?.lon !== 0 && gpsData?.lat !== 0) {
              let lat = parseFloat(gpsData.lat * 1e-7)
              let lon = parseFloat(gpsData.lon * 1e-7)
              mapRef.current.setCenter({ lng: lon, lat: lat })
            }
            return true
          })(),
    )
  }

  function centerMapOnMission() {
    if (filteredMissionItems.length > 0) {
      let points = filteredMissionItems.map((item) => [
        item.x * 1e-7,
        item.y * 1e-7,
      ])
      points.push(points[0]) // Close the polygon
      let geo = polygon([points])
      let center = centerOfMass(geo).geometry.coordinates
      let lat = parseFloat(center[0])
      let lon = parseFloat(center[1])
      mapRef.current.getMap().flyTo({
        center: [lon, lat],
      })
    }
    setFollowDrone(false)
  }

  return (
    <div
      className="absolute -translate-y-1/2 right-0 top-1/2 py-4 px-2 rounded-tl-md rounded-bl-md flex flex-col gap-2 z-30"
      style={{ backgroundColor: GetOutsideVisibilityColor() }}
    >
      {/* Follow Drone */}
      <Tooltip
        label={
          !gpsData.lon && !gpsData.lat
            ? "No GPS data"
            : followDrone
              ? "Stop following"
              : "Follow drone"
        }
      >
        <ActionIcon
          disabled={!gpsData.lon && !gpsData.lat}
          onClick={() => {
            updateFollowDroneAction()
          }}
        >
          {followDrone ? <IconAnchorOff /> : <IconAnchor />}
        </ActionIcon>
      </Tooltip>

      {/* Center Map on Drone */}
      <Tooltip
        label={!gpsData.lon && !gpsData.lat ? "No GPS data" : "Center on drone"}
      >
        <ActionIcon
          disabled={!gpsData.lon && !gpsData.lat}
          onClick={centerMapOnDrone}
        >
          <IconCrosshair />
        </ActionIcon>
      </Tooltip>

      {/* Center Map on full mission */}
      <Tooltip
        label={
          !filteredMissionItems.length > 0 ? "No mission" : "Center on mission"
        }
      >
        <ActionIcon
          disabled={filteredMissionItems.length <= 0}
          onClick={centerMapOnMission}
        >
          <IconMapPins />
        </ActionIcon>
      </Tooltip>

      {/* Set outside visibility */}
      <Tooltip
        label={
          outsideVisibility
            ? "Turn off outside text mode"
            : "Turn on outside text mode"
        }
      >
        <ActionIcon
          onClick={() => {
            setOutsideVisibility(!outsideVisibility)
          }}
        >
          {outsideVisibility ? <IconSun /> : <IconSunOff />}
        </ActionIcon>
      </Tooltip>
    </div>
  )
}
