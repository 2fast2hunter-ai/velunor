/** Whether the device currently has a network. The web reads navigator.onLine. */
let up = typeof navigator === 'undefined' ? true : navigator.onLine !== false

export function lineUp(): boolean {
  return up
}

export function setLineUp(value: boolean): void {
  up = value
}

/** Online screens stay on the offline card while the line is down. */
export function blockOnline(area: 'arena' | 'trade' | 'guild' | 'chat' | 'ranks' | 'social' | 'sync'): boolean {
  return !lineUp() && (area === 'arena' || area === 'trade' || area === 'guild' || area === 'chat' || area === 'ranks' || area === 'social' || area === 'sync')
}
