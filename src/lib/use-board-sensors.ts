"use client"

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react"
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Activators,
  type KeyboardCodes,
  type KeyboardSensorOptions,
  type MouseSensorOptions,
  type TouchSensorOptions,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"

/** Elements that never start a drag: typing, editing and explicit opt-outs (buttons inside draggable cards). */
const NO_DRAG_SELECTOR = "input, textarea, select, [contenteditable='true'], [data-no-dnd]"

export function isNoDragTarget(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && !!target.closest(NO_DRAG_SELECTOR)
}

/** Mouse drag after 6px (shorter = click); never from inputs or `data-no-dnd` controls (spec §3.1). */
export class BoardMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: ReactMouseEvent, { onActivation }: MouseSensorOptions) => {
        if (event.button !== 0 || isNoDragTarget(event.target)) return false
        onActivation?.({ event })
        return true
      },
    },
  ]
}

/** Touch drag after a 200ms long press (a swipe keeps scrolling). */
export class BoardTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent, { onActivation }: TouchSensorOptions) => {
        if (event.touches.length > 1 || isNoDragTarget(event.target)) return false
        onActivation?.({ event })
        return true
      },
    },
  ]
}

/** Space picks up / drops, arrows move, Escape cancels; Enter stays free for the click action. */
const KEYBOARD_CODES: KeyboardCodes = { start: ["Space"], cancel: ["Escape"], end: ["Space"] }

export class BoardKeyboardSensor extends KeyboardSensor {
  static activators: Activators<KeyboardSensorOptions> = [
    {
      eventName: "onKeyDown",
      handler: (event: ReactKeyboardEvent, options, context) => {
        if (isNoDragTarget(event.nativeEvent.target) || event.nativeEvent.target !== event.currentTarget) return false
        return KeyboardSensor.activators[0].handler(event, options, context)
      },
    },
  ]
}

export const MOUSE_ACTIVATION = { distance: 6 }
export const TOUCH_ACTIVATION = { delay: 200, tolerance: 6 }

/** Sensors shared by the preset board and the favorite roster; `keyboard: false` for lists with button alternatives. */
export function useBoardSensors({ keyboard = true }: { keyboard?: boolean } = {}) {
  const mouse = useSensor(BoardMouseSensor, { activationConstraint: MOUSE_ACTIVATION })
  const touch = useSensor(BoardTouchSensor, { activationConstraint: TOUCH_ACTIVATION })
  const keys = useSensor(BoardKeyboardSensor, { keyboardCodes: KEYBOARD_CODES, coordinateGetter: sortableKeyboardCoordinates })
  return useSensors(mouse, touch, ...(keyboard ? [keys] : []))
}
