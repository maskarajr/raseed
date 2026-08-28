import type { WebSocket } from 'ws'
import type { WsEvent } from '@wholesale/shared'

// Simple room-based hub over raw WebSockets.
// Rooms: "admin" and "salesman:<userId>".
class WsHub {
  private rooms = new Map<string, Set<WebSocket>>()
  private socketRooms = new Map<WebSocket, Set<string>>()

  join(room: string, socket: WebSocket): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set())
    this.rooms.get(room)!.add(socket)
    if (!this.socketRooms.has(socket)) this.socketRooms.set(socket, new Set())
    this.socketRooms.get(socket)!.add(room)
  }

  leaveAll(socket: WebSocket): void {
    const rooms = this.socketRooms.get(socket)
    if (rooms) {
      for (const r of rooms) this.rooms.get(r)?.delete(socket)
    }
    this.socketRooms.delete(socket)
  }

  emit(room: string, event: WsEvent): void {
    const sockets = this.rooms.get(room)
    if (!sockets) return
    const msg = JSON.stringify(event)
    for (const s of sockets) {
      if (s.readyState === 1) s.send(msg)
    }
  }

  emitAdmin(event: WsEvent): void {
    this.emit('admin', event)
  }

  emitSalesman(salesmanId: string, event: WsEvent): void {
    this.emit(`salesman:${salesmanId}`, event)
  }
}

export const hub = new WsHub()
