import { Logger } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server
 
  private readonly logger = new Logger(NotificationGateway.name)
  private userSockets: Map<number, Set<string>> = new Map()

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id)
        if (sockets.size === 0) {
          this.userSockets.delete(userId)
        }
        break
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { userId: number }) {
    console.log('handleJoin', payload)
    const { userId } = payload
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(client.id)
    this.logger.log(`User ${userId} joined with socket ${client.id}`)
    return { status: 'ok' }
  }

  // Gửi cho 1 user
  notifyUser(userId: number, payload: any) {
    const sockets = this.userSockets.get(userId)
    if (!sockets) {
      this.logger.debug(`User ${userId} not connected`)
      return
    }
    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('notification', payload)
    })
    this.logger.log(`Sent notification to user ${userId}`)
  }

  // Gửi cho nhiều user
  notifyUsers(userIds: number[], payload: any) {
    userIds.forEach((id) => this.notifyUser(id, payload))
  }

  // Broadcast tất cả
  broadcast(payload: any) {
    this.server.emit('notification', payload)
  }
}
