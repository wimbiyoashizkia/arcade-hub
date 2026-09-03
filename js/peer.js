class Multiplayer {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.playerName = '';
    this.onDataReceived = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
    this.onRoomCreated = null;
    this.onJoinError = null;
    this.peerId = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  generatePeerId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const name = this.playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${name}-${timestamp}-${random}`;
  }

  createRoom(playerName) {
    return new Promise((resolve, reject) => {
      this.playerName = playerName;
      this.retryCount = 0;
      
      const uniqueId = this.generatePeerId();
      console.log('[PEER] Creating room with ID:', uniqueId);
      
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      this.peer = new Peer(uniqueId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' },
            { urls: 'turn:turn.anyfirewall.com:443?transport=udp', username: 'webrtc', credential: 'webrtc' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('[PEER] Room created with ID:', id);
        this.roomId = id;
        this.peerId = id;
        this.isHost = true;
        if (this.onRoomCreated) this.onRoomCreated(id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        console.log('[PEER] Incoming connection from:', conn.peer);
        this.connections.push(conn);
        this.isConnected = true;

        conn.on('data', (data) => {
          console.log('[PEER] Data received from', conn.peer, data);
          if (this.onDataReceived) {
            this.onDataReceived(data, conn);
          }
        });

        conn.on('close', () => {
          console.log('[PEER] Connection closed by', conn.peer);
          this.connections = this.connections.filter(c => c.peer !== conn.peer);
          if (this.connections.length === 0) {
            this.isConnected = false;
          }
          if (this.onPeerDisconnected) this.onPeerDisconnected(conn);
        });

        if (this.onPeerConnected) this.onPeerConnected(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[PEER] Error:', err);
        if (err.type === 'unavailable-id') {
          this.retryCount++;
          if (this.retryCount < this.maxRetries) {
            console.log('[PEER] ID taken, retrying...', this.retryCount);
            this.peer.destroy();
            this.createRoom(playerName).then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to create room after ' + this.maxRetries + ' attempts'));
          }
        } else {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('[PEER] Disconnected from PeerJS server');
      });
    });
  }

  joinRoom(roomId, playerName) {
    return new Promise((resolve, reject) => {
      this.playerName = playerName;
      this.retryCount = 0;
      
      const uniqueId = this.generatePeerId();
      console.log('[PEER] Joining room with client ID:', uniqueId);
      
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      this.peer = new Peer(uniqueId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' },
            { urls: 'turn:turn.anyfirewall.com:443?transport=udp', username: 'webrtc', credential: 'webrtc' }
          ]
        }
      });

      this.peer.on('open', () => {
        console.log('[PEER] Peer opened, joining room:', roomId);
        this.roomId = roomId;
        this.peerId = this.peer.id;
        this.isHost = false;

        const conn = this.peer.connect(roomId, {
          reliable: true
        });
        console.log('[PEER] Attempting to connect to:', roomId);

        conn.on('open', () => {
          console.log('[PEER] Connection opened to:', roomId);
          this.connections = [conn];
          this.isConnected = true;
          resolve();

          conn.on('data', (data) => {
            console.log('[PEER] Data received from host:', data);
            if (this.onDataReceived) this.onDataReceived(data, conn);
          });

          conn.on('close', () => {
            console.log('[PEER] Connection closed by host');
            this.isConnected = false;
            if (this.onPeerDisconnected) this.onPeerDisconnected(conn);
          });

          if (this.onPeerConnected) this.onPeerConnected(conn);
        });

        conn.on('error', (err) => {
          console.error('[PEER] Connection error:', err);
          if (this.onJoinError) this.onJoinError(err.message);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[PEER] Peer error:', err);
        if (err.type === 'unavailable-id') {
          this.retryCount++;
          if (this.retryCount < this.maxRetries) {
            console.log('[PEER] ID taken, retrying...', this.retryCount);
            this.peer.destroy();
            this.joinRoom(roomId, playerName).then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to join room after ' + this.maxRetries + ' attempts'));
          }
        } else {
          if (this.onJoinError) this.onJoinError(err.message);
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('[PEER] Disconnected from PeerJS server');
      });
    });
  }

  send(data, targetConn = null) {
    if (targetConn) {
      if (targetConn && targetConn.open) {
        console.log('[PEER] Sending data to specific peer:', targetConn.peer, data);
        targetConn.send(data);
        return true;
      }
      return false;
    }

    if (this.connections.length > 0) {
      console.log('[PEER] Broadcasting data to all connections:', data);
      let sent = false;
      for (const conn of this.connections) {
        if (conn.open) {
          conn.send(data);
          sent = true;
        }
      }
      return sent;
    }
    console.warn('[PEER] Cannot send data - no connections');
    return false;
  }

  broadcast(data) {
    return this.send(data);
  }

  disconnect() {
    for (const conn of this.connections) {
      if (conn.open) conn.close();
    }
    this.connections = [];
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomId = null;
    this.peerId = null;
    this.retryCount = 0;
  }

  getStatus() {
    return {
      isHost: this.isHost,
      isConnected: this.isConnected,
      roomId: this.roomId,
      peerId: this.peerId,
      playerName: this.playerName,
      connectionCount: this.connections.length
    };
  }
}
