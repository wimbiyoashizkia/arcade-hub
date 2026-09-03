class Multiplayer {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.playerName = '';
    this.onDataReceived = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
    this.onRoomCreated = null;
    this.onJoinError = null;
  }

  createRoom(playerName) {
    return new Promise((resolve, reject) => {
      this.playerName = playerName;
      this.peer = new Peer(undefined, {
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
        this.roomId = id;
        this.isHost = true;
        if (this.onRoomCreated) this.onRoomCreated(id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.connection = conn;
        this.isConnected = true;

        conn.on('data', (data) => {
          if (this.onDataReceived) this.onDataReceived(data);
        });

        conn.on('close', () => {
          this.isConnected = false;
          if (this.onPeerDisconnected) this.onPeerDisconnected();
        });

        if (this.onPeerConnected) this.onPeerConnected();
      });

      this.peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  joinRoom(roomId, playerName) {
    return new Promise((resolve, reject) => {
      this.playerName = playerName;
      this.peer = new Peer(undefined, {
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
        this.roomId = roomId;
        this.isHost = false;

        const conn = this.peer.connect(roomId);

        conn.on('open', () => {
          this.connection = conn;
          this.isConnected = true;
          resolve();

          conn.on('data', (data) => {
            if (this.onDataReceived) this.onDataReceived(data);
          });

          conn.on('close', () => {
            this.isConnected = false;
            if (this.onPeerDisconnected) this.onPeerDisconnected();
          });

          if (this.onPeerConnected) this.onPeerConnected();
        });

        conn.on('error', (err) => {
          if (this.onJoinError) this.onJoinError(err.message);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        if (this.onJoinError) this.onJoinError(err.message);
        reject(err);
      });
    });
  }

  send(data) {
    if (this.connection && this.isConnected) {
      this.connection.send(data);
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomId = null;
  }

  getStatus() {
    return {
      isHost: this.isHost,
      isConnected: this.isConnected,
      roomId: this.roomId,
      peerId: this.peer ? this.peer.id : null,
      playerName: this.playerName
    };
  }
}
