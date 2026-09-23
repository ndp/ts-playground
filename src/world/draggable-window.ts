/**
 * draggable-window
 *
 * A simple floating window element that can be dragged around the viewport.
 * It stores its last position in localStorage keyed by its `id`, so multiple
 * instances can keep independent positions.
 *
 * Usage:
 *   <draggable-window id="settings-window">...</draggable-window>
 *
 * The element is positioned with `position: fixed` and keeps its last position
 * across reloads when it has an `id`.
 */
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder'

const DraggableWindow = new ComponentBwilder()
  .wTagName('draggable-window' as TagName)
  .wShadowDOM('none')
  .wAttr('id!')
  .wStateVar('dragShiftX', 0)
  .wStateVar('dragShiftY', 0)
  .wRender(function () {
    this.style.position = 'fixed'
    this.style.cursor = 'move'
    return {}
  })
  .wConnectedFn(function () {
    const isWithinViewport = (left: number, top: number) => {
      const right = left + this.offsetWidth
      const bottom = top + this.offsetHeight
      return left >= 0 && right <= window.innerWidth && top >= 0 && bottom <= window.innerHeight
    }

    const rememberPosition = () => {
      const id = this.state['id']
      const payload = {
        left: this.style.left,
        top: this.style.top,
      }
      localStorage.setItem(`draggable-window:${id}`, JSON.stringify(payload))
    }

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

      this.style.left = `${clientX - this.state.dragShiftX}px`
      this.style.top = `${clientY - this.state.dragShiftY}px`
    }

    const handlePointerUp = () => {
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('touchmove', handlePointerMove)
      document.removeEventListener('mouseup', handlePointerUp)
      document.removeEventListener('touchend', handlePointerUp)
      rememberPosition()
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

      this.state.dragShiftX = clientX - this.getBoundingClientRect().left
      this.state.dragShiftY = clientY - this.getBoundingClientRect().top

      document.addEventListener('mousemove', handlePointerMove)
      document.addEventListener('touchmove', handlePointerMove)
      document.addEventListener('mouseup', handlePointerUp)
      document.addEventListener('touchend', handlePointerUp)
    }

    const id = this.state['id']
    let parsedPosition: {left?: string, top?: string} | null = null
    const savedPosition = localStorage.getItem(`draggable-window:${id}`)
    if (savedPosition) {
      try {
        parsedPosition = JSON.parse(savedPosition) as {left?: string, top?: string}
      } catch {
        parsedPosition = null
      }
    }

    const left = parsedPosition?.left
    const top = parsedPosition?.top

    if (left && top) {
      const leftValue = Number.parseFloat(left)
      const topValue = Number.parseFloat(top)
      if (Number.isFinite(leftValue) && Number.isFinite(topValue) && isWithinViewport(leftValue, topValue)) {
        this.style.left = left
        this.style.top = top
      } else {
        this.style.left = `calc(95svw - ${this.offsetWidth}px)`
        this.style.top = `calc(95svh - ${this.offsetHeight}px)`
      }
    }

    this.addEventListener('mousedown', handlePointerDown)
    this.addEventListener('touchstart', handlePointerDown)

    return () => {
      this.removeEventListener('mousedown', handlePointerDown)
      this.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('touchmove', handlePointerMove)
      document.removeEventListener('mouseup', handlePointerUp)
      document.removeEventListener('touchend', handlePointerUp)
    }
  })
  .bwild()

export default DraggableWindow

export function initDraggableWindow() {}