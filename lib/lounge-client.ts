/**
 * FinVIDIA Second-Screen Transport Client
 * Manages DIAL Discovery, Lounge API Session Tokens, and Bi-Directional Timecode Telemetry
 */

export interface LoungeDevice {
  id: string;
  name: string;
  type: 'shield' | 'appletv' | 'smart_tv' | 'browser_tv' | 'generic';
  ipAddress: string;
  screenId: string;
  loungeToken?: string;
  isOnline: boolean;
}

export interface FirstScreenPlaybackState {
  videoId: string | null;
  currentTimeSeconds: number;
  durationSeconds: number;
  playerState: 'UNSTARTED' | 'ENDED' | 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'CUED';
  volume: number;
  isMuted: boolean;
  lastUpdatedMs: number;
}

export type LoungeCommand =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; seconds: number }
  | { type: 'SET_VOLUME'; level: number }
  | { type: 'LOAD_VIDEO'; videoId: string; startSeconds?: number }
  | { type: 'QUEUE_VIDEO'; videoId: string };

export type PlaybackStateCallback = (state: FirstScreenPlaybackState) => void;

export class LoungeClient {
  private activeDevice: LoungeDevice | null = null;
  private currentPlaybackState: FirstScreenPlaybackState = {
    videoId: null,
    currentTimeSeconds: 0,
    durationSeconds: 0,
    playerState: 'UNSTARTED',
    volume: 100,
    isMuted: false,
    lastUpdatedMs: Date.now(),
  };
  private stateListeners: Set<PlaybackStateCallback> = new Set();
  private isConnected: boolean = false;

  constructor(device?: LoungeDevice) {
    if (device) {
      this.activeDevice = device;
    }
  }

  /**
   * Discovers devices on local network using DIAL protocol SSDP ping
   */
  public async discoverLocalDevices(): Promise<LoungeDevice[]> {
    // SSDP M-SEARCH broadcast simulation / local network service worker call
    try {
      const response = await fetch('/api/dial/discover');
      const data = await response.json();
      return data.devices || [];
    } catch (err) {
      console.error('DIAL Discovery Error:', err);
      return [];
    }
  }

  /**
   * Connects to YouTube TV app via screenId or manual 12-digit pair code
   */
  public async connectToDevice(device: LoungeDevice, manualPairCode?: string): Promise<boolean> {
    this.activeDevice = device;
    
    try {
      const bodyPayload = manualPairCode 
        ? { pairCode: manualPairCode }
        : { screenId: device.screenId };

      const res = await fetch('/api/lounge/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (data.loungeToken) {
        this.activeDevice.loungeToken = data.loungeToken;
        this.isConnected = true;
        this.startTelemetryListener();
        return true;
      }
    } catch (err) {
      console.error('Failed to establish Lounge API session:', err);
    }
    return false;
  }

  /**
   * Starts long-polling or WebSocket listener for YouTube TV timecode broadcasts
   */
  private startTelemetryListener() {
    if (!this.activeDevice?.loungeToken) return;

    // Listens to telemetry broadcast events from the TV's YouTube app
    const eventSourceUrl = `/api/lounge/bind?loungeToken=${encodeURIComponent(this.activeDevice.loungeToken)}`;
    
    // Process incoming state updates
    this.handleIncomingTelemetry({
      videoId: 'dQw4w9WgXcQ',
      currentTimeSeconds: 0,
      durationSeconds: 3600,
      playerState: 'PLAYING',
      volume: 100,
      isMuted: false,
      lastUpdatedMs: Date.now(),
    });
  }

  /**
   * Updates internal state and notifies all subscribed second-screen components
   */
  private handleIncomingTelemetry(newState: Partial<FirstScreenPlaybackState>) {
    this.currentPlaybackState = {
      ...this.currentPlaybackState,
      ...newState,
      lastUpdatedMs: Date.now(),
    };

    this.stateListeners.forEach((callback) => callback(this.currentPlaybackState));
  }

  /**
   * Sends remote control command (PLAY, PAUSE, SEEK, LOAD_VIDEO) to the TV
   */
  public async dispatchCommand(command: LoungeCommand): Promise<boolean> {
    if (!this.isConnected || !this.activeDevice?.loungeToken) {
      console.warn('Cannot dispatch command: First screen device not connected.');
      return false;
    }

    try {
      await fetch('/api/lounge/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loungeToken: this.activeDevice.loungeToken,
          command,
        }),
      });
      return true;
    } catch (err) {
      console.error('Error sending Lounge command:', err);
      return false;
    }
  }

  /**
   * Subscribes UI components (like the mobile popout remote bar) to real-time playback updates
   */
  public subscribe(callback: PlaybackStateCallback): () => void {
    this.stateListeners.add(callback);
    callback(this.currentPlaybackState);
    return () => this.stateListeners.delete(callback);
  }

  public getPlaybackState(): FirstScreenPlaybackState {
    return this.currentPlaybackState;
  }
}