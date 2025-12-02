/*
  Drone connection component. This handles the full workflow of connecting to a drone, 
  including managing socket events, listing COM ports, selecting connection type (serial or network),
  showing the connection modal, and providing connect/disconnect controls.

  All connection state and logic is contained here, so the parent component only needs 
  to render <Drone /> without handling any of the connection details.
*/

// Base imports
import { useEffect, useCallback } from "react"

// Third party imports
import {
  Button,
  Checkbox,
  Group,
  LoadingOverlay,
  Modal,
  SegmentedControl,
  Select,
  Tabs,
  TextInput,
  Tooltip,
} from "@mantine/core"
import {
  useDisclosure,
} from "@mantine/hooks"
import { IconInfoCircle, IconRefresh } from "@tabler/icons-react"

// Local imports
import { AddCommand } from "../spotlight/commandHandler.js"

// Helper imports
import { useDroneConnection } from "../../helpers/useDroneConnection.js"

// Styling imports
import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../../../tailwind.config.js"
const tailwindColors = resolveConfig(tailwindConfig).theme.colors

export default function DroneConnect() {
  const [opened, { open, close }] = useDisclosure(false)

  const {
    connected,
    connectedToSocket,
    connecting,
    setConnecting,
    wireless,
    setWireless,
    selectedBaudRate,
    setSelectedBaudRate,
    droneConnectionStatusMessage,
    ConnectionType,
    connectionType,
    setConnectionType,
    networkType,
    setNetworkType,
    ip,
    setIp,
    port,
    setPort,
    comPorts,
    selectedComPort,
    setSelectedComPort,
    fetchingComPorts,
    getComPorts,
    connectToDrone,
    disconnect,
  } = useDroneConnection()

  function connectToDroneFromButton() {
    getComPorts()
    open()
  }

  const memoizedConnect = useCallback(connectToDroneFromButton, [getComPorts, open])
  const memoizedDisconnect = useCallback(disconnect, [disconnect])

  useEffect(() => {
    AddCommand("connect_to_drone", memoizedConnect)
    AddCommand("disconnect_from_drone", memoizedDisconnect)
  }, [memoizedConnect, memoizedDisconnect])

  useEffect(() => {
    if (connected) {
      close()
    }
  }, [connected, close])

  return (
    <Modal
        opened={opened}
        onClose={() => {
          close()
          setConnecting(false)
        }}
        title="Connect to aircraft"
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          content: {
            borderRadius: "0.5rem",
          },
        }}
        withCloseButton={false}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            connectToDrone(connectionType)
          }}
        >
          <Tabs value={connectionType} onChange={setConnectionType}>
            <Tabs.List grow>
              <Tabs.Tab value={ConnectionType.Serial}>
                Serial Connection
              </Tabs.Tab>
              <Tabs.Tab value={ConnectionType.Network}>
                Network Connection
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={ConnectionType.Serial} className="py-4">
              <LoadingOverlay visible={fetchingComPorts} />
              <div className="flex flex-col space-y-4">
                <Select
                  label="COM Port"
                  description="Select a COM Port from the ones available"
                  placeholder={
                    comPorts.length ? "Select a COM port" : "No COM ports found"
                  }
                  data={comPorts}
                  value={selectedComPort}
                  onChange={setSelectedComPort}
                  rightSectionPointerEvents="all"
                  rightSection={<IconRefresh />}
                  rightSectionProps={{
                    onClick: getComPorts,
                    className: "hover:cursor-pointer hover:bg-transparent/50",
                  }}
                />
                <Select
                  label="Baud Rate"
                  description="Select a baud rate for the specified COM Port"
                  data={[
                    "300",
                    "1200",
                    "4800",
                    "9600",
                    "19200",
                    "13400",
                    "38400",
                    "57600",
                    "74880",
                    "115200",
                    "230400",
                    "250000",
                  ]}
                  value={selectedBaudRate}
                  onChange={setSelectedBaudRate}
                />
                <div className="flex flex-row gap-2">
                  <Checkbox
                    label="Wireless Connection"
                    checked={wireless}
                    onChange={(event) =>
                      setWireless(event.currentTarget.checked)
                    }
                  />
                  <Tooltip label="Wireless connection mode reduces the telemetry data rates to save bandwidth">
                    <IconInfoCircle size={20} />
                  </Tooltip>
                </div>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value={ConnectionType.Network} className="py-4">
              <div className="flex flex-col space-y-4">
                <SegmentedControl
                  label="Network Connection type"
                  description="Select a network connection type"
                  value={networkType}
                  onChange={setNetworkType}
                  data={[
                    { value: "tcp", label: "TCP" },
                    { value: "udp", label: "UDP" },
                  ]}
                />
                <TextInput
                  label="IP Address"
                  description="Enter the IP Address"
                  placeholder="127.0.0.1"
                  value={ip}
                  onChange={(event) => setIp(event.currentTarget.value)}
                  data-autofocus
                />
                <TextInput
                  label="Port"
                  description="Enter the port number"
                  placeholder="5760"
                  value={port}
                  onChange={(event) => setPort(event.currentTarget.value)}
                />
              </div>
            </Tabs.Panel>
          </Tabs>

          <Group justify="space-between" className="pt-4">
            <Button
              variant="filled"
              color={tailwindColors.red[600]}
              onClick={() => {
                close()
                setConnecting(false)
              }}
            >
              Close
            </Button>
            <Button
              variant="filled"
              type="submit"
              color={tailwindColors.green[600]}
              disabled={
                !connectedToSocket ||
                (connectionType == ConnectionType.Serial &&
                  selectedComPort === null)
              }
              loading={connecting}
            >
              Connect
            </Button>
          </Group>
        </form>

        {connecting && droneConnectionStatusMessage !== null && (
          <p className="text-center mt-4">{droneConnectionStatusMessage}</p>
        )}
      </Modal>
  )
}