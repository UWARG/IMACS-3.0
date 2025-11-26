import { useEffect, useState } from "react"
import { useLocalStorage, useSessionStorage } from "@mantine/hooks"
import { socket } from "./socket.js"
import { showErrorNotification } from "./notification.js"

export function useDroneConnection() {
  const [connected, setConnected] = useSessionStorage({
    key: "connectedToDrone",
    defaultValue: false,
  })
  const [connectedToSocket, setConnectedToSocket] = useSessionStorage({
    key: "socketConnection",
    defaultValue: false,
  })

  const [connecting, setConnecting] = useState(false)

  const [wireless, setWireless] = useLocalStorage({
    key: "wirelessConnection",
    defaultValue: true,
  })

  const [selectedBaudRate, setSelectedBaudRate] = useLocalStorage({
    key: "baudrate",
    defaultValue: "9600",
  })
  const [droneConnectionStatusMessage, setDroneConnectionStatusMessage] = useState(null)

  const [aircraftType, setAircraftType] = useLocalStorage({
    key: "aircraftType",
    defaultValue: 0,
  })

  const ConnectionType = {
    Serial: "serial",
    Network: "network",
  }

  const [connectionType, setConnectionType] = useLocalStorage({
    key: "connectionType",
    defaultValue: ConnectionType.Serial,
  })

  const [networkType, setNetworkType] = useLocalStorage({
    key: "networkType",
    defaultValue: "tcp",
  })
  const [ip, setIp] = useLocalStorage({
    key: "ip",
    defaultValue: "127.0.0.1",
  })
  const [port, setPort] = useLocalStorage({
    key: "port",
    defaultValue: "5760",
  })

  const [comPorts, setComPorts] = useState([])
  const [selectedComPort, setSelectedComPort] = useSessionStorage({
    key: "selectedComPort",
    defaultValue: null,
  })
  const [fetchingComPorts, setFetchingComPorts] = useState(false)

  function getComPorts() {
    if (!connectedToSocket) return
    socket.emit("get_com_ports")
    setFetchingComPorts(true)
  }

  useEffect(() => {
    if (selectedComPort === null) {
      socket.emit("is_connected_to_drone")
    }

    socket.on("connect", () => {
      setConnectedToSocket(true)
    })

    socket.on("disconnect", () => {
      setConnectedToSocket(false)
    })

    socket.on("is_connected_to_drone", (msg) => {
      if (msg) {
        setConnected(true)
      } else {
        setConnected(false)
        setConnecting(false)
        getComPorts()
      }
    })

    socket.on("list_com_ports", (msg) => {
      setFetchingComPorts(false)
      setComPorts(msg)
      if (selectedComPort === null || !msg.includes(selectedComPort)) {
        const possibleComPort = msg.find(
          (port) =>
            port.toLowerCase().includes("mavlink") ||
            port.toLowerCase().includes("ardupilot"),
        )
        if (possibleComPort !== undefined) {
          setSelectedComPort(possibleComPort)
        } else if (msg.length > 0) {
          setSelectedComPort(msg[0])
        }
      }
    })

    socket.on("connected_to_drone", (data) => {
      setAircraftType(data.aircraft_type)
      if (data.aircraft_type != 1 && data.aircraft_type != 2) {
        showErrorNotification("Aircraft not of type quadcopter or plane")
      }
      setConnected(true)
      setConnecting(false)
    })

    socket.on("disconnected_from_drone", () => {
      console.log("disconnected_from_drone")
      setConnected(false)
    })

    socket.on("disconnect", () => {
      setConnected(false)
      setConnecting(false)
    })

    socket.on("connection_error", (msg) => {
      console.log(msg.message)
      showErrorNotification(msg.message)
      setConnecting(false)
      setConnected(false)
    })

    socket.on("drone_connect_status", (msg) => {
      setDroneConnectionStatusMessage(msg.message)
    })

    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("is_connected_to_drone")
      socket.off("list_com_ports")
      socket.off("connected_to_drone")
      socket.off("disconnected_from_drone")
      socket.off("disconnect")
      socket.off("connection_error")
      socket.off("drone_connect_status")
    }
  }, [])

  function connectToDrone(type) {
    if (type === ConnectionType.Serial) {
      socket.emit("connect_to_drone", {
        port: selectedComPort,
        baud: parseInt(selectedBaudRate),
        wireless: wireless,
        connectionType: type,
      })
    } else if (type === ConnectionType.Network) {
      if (ip === "" || port === "") {
        showErrorNotification("IP Address and Port cannot be empty")
        return
      }
      const networkString = `${networkType}:${ip}:${port}`
      socket.emit("connect_to_drone", {
        port: networkString,
        baud: 115200,
        wireless: true,
        connectionType: type,
      })
    } else {
      return
    }
    setConnecting(true)
  }

  function disconnect() {
    socket.emit("disconnect_from_drone")
  }

  return {
    connected,
    connectedToSocket,
    connecting,
    setConnecting,
    wireless,
    setWireless,
    selectedBaudRate,
    setSelectedBaudRate,
    droneConnectionStatusMessage,
    aircraftType,
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
  }
}
