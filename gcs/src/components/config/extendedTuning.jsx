/*
  Extended Tuning panel for the config page.

  Edits stage locally and only push to the drone via "Write Params".
*/

import { useEffect, useRef, useState } from "react"

import { Badge, Button, LoadingOverlay, NumberInput } from "@mantine/core"

import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../../../tailwind.config"

import {
  showErrorNotification,
  showSuccessNotification,
} from "../../helpers/notification"
import { socket } from "../../helpers/socket"

const tailwindColors = resolveConfig(tailwindConfig).theme.colors

const PARAM_GROUPS = [
  {
    title: "Stabilize P",
    accent: "text-emerald-400",
    params: [
      { id: "ATC_ANG_RLL_P", label: "Roll", step: 0.5, decimals: 3 },
      { id: "ATC_ANG_PIT_P", label: "Pitch", step: 0.5, decimals: 3 },
      { id: "ATC_ANG_YAW_P", label: "Yaw", step: 0.5, decimals: 3 },
    ],
  },
  {
    title: "Accel Max (cdeg/s²)",
    accent: "text-amber-400",
    params: [
      { id: "ATC_ACC_R_MAX", label: "Roll", step: 1000, decimals: 0 },
      { id: "ATC_ACC_P_MAX", label: "Pitch", step: 1000, decimals: 0 },
      { id: "ATC_ACC_Y_MAX", label: "Yaw", step: 1000, decimals: 0 },
    ],
  },
]

const TRACKED_PARAM_IDS = PARAM_GROUPS.flatMap((g) =>
  g.params.map((p) => p.id),
)

export default function ExtendedTuning() {
  const [paramData, setParamData] = useState({})
  const [modified, setModified] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const modifiedRef = useRef(modified)
  useEffect(() => {
    modifiedRef.current = modified
  }, [modified])

  useEffect(() => {
    setLoading(true)
    socket.emit("refresh_params")

    const onParams = (allParams) => {
      const map = {}
      for (const p of allParams) {
        if (TRACKED_PARAM_IDS.includes(p.param_id)) {
          map[p.param_id] = { value: p.param_value, type: p.param_type }
        }
      }
      setParamData(map)
      setLoading(false)
    }

    const onSetSuccess = (msg) => {
      showSuccessNotification(msg?.message ?? "Parameters saved")
      setParamData((prev) => {
        const next = { ...prev }
        for (const [id, value] of Object.entries(modifiedRef.current)) {
          if (next[id]) next[id] = { ...next[id], value: Number(value) }
        }
        return next
      })
      setModified({})
      setSaving(false)
    }

    const onError = (err) => {
      showErrorNotification(err?.message ?? "Parameter error")
      setLoading(false)
      setSaving(false)
    }

    socket.on("params", onParams)
    socket.on("param_set_success", onSetSuccess)
    socket.on("params_error", onError)

    return () => {
      socket.off("params", onParams)
      socket.off("param_set_success", onSetSuccess)
      socket.off("params_error", onError)
    }
  }, [])

  const modifiedCount = Object.keys(modified).length

  function setValue(id, raw) {
    setModified((prev) => {
      const next = { ...prev }
      const original = paramData[id]?.value
      if (raw === "" || raw === null || raw === undefined) {
        delete next[id]
      } else if (original !== undefined && Number(raw) === Number(original)) {
        delete next[id]
      } else {
        next[id] = raw
      }
      return next
    })
  }

  function getValue(id) {
    if (id in modified) return modified[id]
    return paramData[id]?.value ?? ""
  }

  function refresh() {
    setLoading(true)
    setModified({})
    socket.emit("refresh_params")
  }

  function discard() {
    setModified({})
  }

  function writeParams() {
    if (modifiedCount === 0) return
    setSaving(true)
    const payload = Object.entries(modified).map(([id, value]) => ({
      param_id: id,
      param_value: Number(value),
      param_type: paramData[id]?.type ?? 9,
    }))
    socket.emit("set_multiple_params", payload)
  }

  return (
    <div className="relative px-4 pb-8">
      <LoadingOverlay
        visible={loading}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Extended Tuning</h2>
          {modifiedCount > 0 && (
            <Badge color="yellow" variant="filled">
              {modifiedCount} unsaved
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={refresh}
            variant="default"
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            onClick={discard}
            variant="default"
            disabled={modifiedCount === 0 || saving}
          >
            Discard
          </Button>
          <Button
            onClick={writeParams}
            color={tailwindColors.green[700]}
            disabled={modifiedCount === 0 || saving}
            loading={saving}
          >
            Write Params
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {PARAM_GROUPS.map((group) => (
          <ParamGroupCard
            key={group.title}
            group={group}
            modified={modified}
            paramData={paramData}
            getValue={getValue}
            setValue={setValue}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  )
}

function ParamGroupCard({
  group,
  modified,
  paramData,
  getValue,
  setValue,
  disabled,
}) {
  return (
    <div className="rounded-md border border-gray-700 bg-gray-800/40 p-4">
      <h3 className={`font-semibold mb-3 ${group.accent}`}>{group.title}</h3>
      <div className="flex flex-col gap-2">
        {group.params.map((p) => {
          const isModified = p.id in modified
          const isAvailable = p.id in paramData
          return (
            <NumberInput
              key={p.id}
              label={p.label}
              description={p.id}
              value={getValue(p.id)}
              onChange={(v) => setValue(p.id, v)}
              step={p.step}
              decimalScale={p.decimals}
              stepHoldDelay={400}
              stepHoldInterval={60}
              disabled={disabled || !isAvailable}
              classNames={
                isModified
                  ? {
                      input:
                        "!border-yellow-500 !bg-yellow-500/10 !text-yellow-100",
                    }
                  : {}
              }
            />
          )
        })}
      </div>
    </div>
  )
}
