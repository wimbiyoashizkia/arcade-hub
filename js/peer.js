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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.isReconnecting = false;
    this.servers = [
      { host: '0.peerjs.com', port: 443, secure: true },
      { host: 'peerjs-server.herokuapp.com', port: 443, secure: true },
      { host: 'eu0.peerjs.com', port: 443, secure: true }
    ];
    this.currentServerIndex = 0;
    this.browserInfo = window.getBrowserInfo ? window.getBrowserInfo() : { isSafari: false };
  }

  generatePeerId() {
    var timestamp = Date.now().toString(36);
    var random = Math.random().toString(36).substring(2, 8);
    var name = this.playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name + '-' + timestamp + '-' + random;
  }

  checkServerStatus() {
    var self = this;
    return new Promise(function(resolve) {
      var testPeer = new Peer({
        host: self.servers[self.currentServerIndex].host,
        port: self.servers[self.currentServerIndex].port,
        secure: self.servers[self.currentServerIndex].secure
      });
      
      var timeout = setTimeout(function() {
        testPeer.destroy();
        resolve(false);
      }, 5000);
      
      testPeer.on('open', function() {
        clearTimeout(timeout);
        testPeer.destroy();
        resolve(true);
      });
      
      testPeer.on('error', function() {
        clearTimeout(timeout);
        testPeer.destroy();
        resolve(false);
      });
    });
  }

  getPeerConfig() {
    var server = this.servers[this.currentServerIndex];
    var isSafari = this.browserInfo && this.browserInfo.isSafari;
    
    var config = {
      host: server.host,
      port: server.port,
      secure: server.secure,
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
          { urls: 'turn:turn.anyfirewall.com:443?transport=udp', username: 'webrtc', credential: 'webrtc' },
          { urls: 'turn:turn.viagenie.ca:443?transport=tcp', username: 'webrtc@live.com', credential: 'muazkh' }
        ]
      }
    };

    if (isSafari) {
      config.config.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' },
        { urls: 'turn:turn.viagenie.ca:443?transport=tcp', username: 'webrtc@live.com', credential: 'muazkh' }
      ];
    }

    return config;
  }

  tryNextServer() {
    this.currentServerIndex++;
    if (this.currentServerIndex >= this.servers.length) {
      this.currentServerIndex = 0;
      return false;
    }
    console.log('[PEER] Switching to server:', this.servers[this.currentServerIndex].host);
    if (this.onJoinError) {
      this.onJoinError('Switching to backup server...');
    }
    return true;
  }

  createRoom(playerName) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.playerName = playerName;
      self.retryCount = 0;
      self.currentServerIndex = 0;
      
      var uniqueId = self.generatePeerId();
      console.log('[PEER] Creating room with ID:', uniqueId);
      
      if (self.peer) {
        self.peer.destroy();
        self.peer = null;
      }

      var config = self.getPeerConfig();
      console.log('[PEER] Using server:', config.host);

      var isSafari = self.browserInfo && self.browserInfo.isSafari;
      var delay = isSafari ? 500 : 0;

      setTimeout(function() {
        self.peer = new Peer(uniqueId, config);

        self.peer.on('open', function(id) {
          console.log('[PEER] Room created with ID:', id);
          console.log('[PEER] Server used:', config.host);
          self.roomId = id;
          self.peerId = id;
          self.isHost = true;
          self.reconnectAttempts = 0;
          self.isReconnecting = false;
          if (self.onRoomCreated) self.onRoomCreated(id);
          resolve(id);
        });

        self.peer.on('connection', function(conn) {
          console.log('[PEER] Incoming connection from:', conn.peer);
          self.connections.push(conn);
          self.isConnected = true;
          self.isReconnecting = false;

          conn.on('data', function(data) {
            console.log('[PEER] Data received from', conn.peer, data);
            if (self.onDataReceived) {
              self.onDataReceived(data, conn);
            }
          });

          conn.on('close', function() {
            console.log('[PEER] Connection closed by', conn.peer);
            self.connections = self.connections.filter(function(c) { return c.peer !== conn.peer; });
            if (self.connections.length === 0) {
              self.isConnected = false;
              self.handleReconnect();
            }
            if (self.onPeerDisconnected) self.onPeerDisconnected(conn);
          });

          if (self.onPeerConnected) self.onPeerConnected(conn);
        });

        self.peer.on('error', function(err) {
          console.error('[PEER] Error:', err);
          
          if (err.type === 'unavailable-id') {
            self.retryCount++;
            if (self.retryCount < self.maxRetries) {
              console.log('[PEER] ID taken, retrying...', self.retryCount);
              self.peer.destroy();
              self.createRoom(playerName).then(resolve).catch(reject);
            } else {
              reject(new Error('Failed to create room after ' + self.maxRetries + ' attempts'));
            }
          } else if (err.type === 'server-error' || err.message.includes('timeout')) {
            console.log('[PEER] Server error, trying next server...');
            self.peer.destroy();
            if (self.tryNextServer()) {
              self.createRoom(playerName).then(resolve).catch(reject);
            } else {
              if (self.onJoinError) self.onJoinError('All PeerJS servers are currently unavailable. Please wait and try again.');
              reject(new Error('All servers failed'));
            }
          } else {
            reject(err);
          }
        });

        self.peer.on('disconnected', function() {
          console.log('[PEER] Disconnected from PeerJS server');
          self.handleReconnect();
        });
      }, delay);
    });
  }

  joinRoom(roomId, playerName) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.playerName = playerName;
      self.retryCount = 0;
      self.currentServerIndex = 0;
      
      function attemptJoin() {
        var uniqueId = self.generatePeerId();
        console.log('[PEER] Joining room with client ID:', uniqueId);
        
        if (self.peer) {
          self.peer.destroy();
          self.peer = null;
        }

        var config = self.getPeerConfig();
        console.log('[PEER] Using server:', config.host);

        var isSafari = self.browserInfo && self.browserInfo.isSafari;
        var delay = isSafari ? 500 : 0;

        setTimeout(function() {
          self.peer = new Peer(uniqueId, config);

          var connectionAttempted = false;
          var timeoutId = null;
          var conn = null;

          self.peer.on('open', function() {
            console.log('[PEER] Peer opened, joining room:', roomId);
            console.log('[PEER] Server used:', config.host);
            self.roomId = roomId;
            self.peerId = self.peer.id;
            self.isHost = false;
            self.reconnectAttempts = 0;
            self.isReconnecting = false;

            if (connectionAttempted) return;
            connectionAttempted = true;

            conn = self.peer.connect(roomId, {
              reliable: true
            });
            console.log('[PEER] Attempting to connect to:', roomId);

            timeoutId = setTimeout(function() {
              console.error('[PEER] Connection timeout after 30 seconds');
              if (conn && conn.open) {
                console.log('[PEER] Connection is actually open, ignoring timeout');
                return;
              }
              self.retryCount++;
              if (self.retryCount < 3) {
                console.log('[PEER] Timeout, retry attempt', self.retryCount);
                if (self.onJoinError) {
                  self.onJoinError('Retrying connection... (' + self.retryCount + '/3)');
                }
                self.peer.destroy();
                setTimeout(attemptJoin, 2000);
              } else {
                if (self.onJoinError) self.onJoinError('Connection timeout - Host may be offline. Please try again.');
                reject(new Error('Connection timeout - Host may be offline'));
              }
            }, 30000);

            conn.on('open', function() {
              console.log('[PEER] Connection opened to:', roomId);
              clearTimeout(timeoutId);
              self.connections = [conn];
              self.isConnected = true;
              self.isReconnecting = false;
              self.retryCount = 0;
              resolve();

              conn.on('data', function(data) {
                console.log('[PEER] Data received from host:', data);
                if (self.onDataReceived) self.onDataReceived(data, conn);
              });

              conn.on('close', function() {
                console.log('[PEER] Connection closed by host');
                self.isConnected = false;
                self.handleReconnect();
                if (self.onPeerDisconnected) self.onPeerDisconnected(conn);
              });

              if (self.onPeerConnected) self.onPeerConnected(conn);
            });

            conn.on('error', function(err) {
              console.error('[PEER] Connection error:', err);
              clearTimeout(timeoutId);
              self.retryCount++;
              if (self.retryCount < 3) {
                console.log('[PEER] Error, retry attempt', self.retryCount);
                if (self.onJoinError) {
                  self.onJoinError('Retrying connection... (' + self.retryCount + '/3)');
                }
                self.peer.destroy();
                setTimeout(attemptJoin, 2000);
              } else {
                if (self.onJoinError) self.onJoinError(err.message);
                reject(err);
              }
            });
          });

          self.peer.on('error', function(err) {
            console.error('[PEER] Peer error:', err);
            clearTimeout(timeoutId);
            
            if (err.type === 'unavailable-id') {
              self.retryCount++;
              if (self.retryCount < self.maxRetries) {
                console.log('[PEER] ID taken, retrying...', self.retryCount);
                self.peer.destroy();
                setTimeout(attemptJoin, 1000);
              } else {
                if (self.onJoinError) self.onJoinError('Failed to join after ' + self.maxRetries + ' attempts');
                reject(new Error('Failed to join room after ' + self.maxRetries + ' attempts'));
              }
            } else if (err.type === 'server-error' || err.message.includes('timeout')) {
              console.log('[PEER] Server error, trying next server...');
              self.peer.destroy();
              if (self.tryNextServer()) {
                setTimeout(attemptJoin, 1000);
              } else {
                if (self.onJoinError) self.onJoinError('All PeerJS servers are currently unavailable. Please wait and try again.');
                reject(new Error('All servers failed'));
              }
            } else if (err.message && err.message.includes('Could not connect to peer')) {
              self.retryCount++;
              if (self.retryCount < 3) {
                console.log('[PEER] Could not connect, retry attempt', self.retryCount);
                if (self.onJoinError) {
                  self.onJoinError('Retrying connection... (' + self.retryCount + '/3)');
                }
                self.peer.destroy();
                setTimeout(attemptJoin, 2000);
              } else {
                if (self.onJoinError) self.onJoinError('Host not found - Please check Room ID and try again');
                reject(new Error('Host not found'));
              }
            } else {
              if (self.onJoinError) self.onJoinError(err.message);
              reject(err);
            }
          });

          self.peer.on('disconnected', function() {
            console.log('[PEER] Disconnected from PeerJS server');
            clearTimeout(timeoutId);
            self.handleReconnect();
          });
        }, delay);
      }

      attemptJoin();
    });
  }

  handleReconnect() {
    var self = this;
    if (this.isReconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[PEER] Max reconnect attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    console.log('[PEER] Attempting to reconnect...', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(function() {
      if (self.peer) {
        self.peer.reconnect();
        self.isReconnecting = false;
      }
    }, 3000);
  }

  send(data, targetConn) {
    targetConn = targetConn || null;
    
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
      var sent = false;
      for (var i = 0; i < this.connections.length; i++) {
        var conn = this.connections[i];
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    
    for (var i = 0; i < this.connections.length; i++) {
      var conn = this.connections[i];
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
    this.currentServerIndex = 0;
  }

  getStatus() {
    return {
      isHost: this.isHost,
      isConnected: this.isConnected,
      roomId: this.roomId,
      peerId: this.peerId,
      playerName: this.playerName,
      connectionCount: this.connections.length,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      currentServer: this.servers[this.currentServerIndex],
      browser: this.browserInfo
    };
  }
}
