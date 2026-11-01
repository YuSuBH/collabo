/**
 * Manages a sandboxed iframe for isolated code execution.
 * The iframe runs without 'allow-same-origin', preventing access to
 * parent cookies, storage, and API endpoints.
 */

interface SandboxRequest {
  id: string;
  code: string;
  timeoutMs: number;
}

interface SandboxResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export class SandboxManager {
  private iframe: HTMLIFrameElement | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private pendingRequests = new Map<string, {
    resolve: (response: SandboxResponse) => void;
    reject: (error: Error) => void;
  }>();
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.readyPromise = this.init();
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create sandboxed iframe
        this.iframe = document.createElement('iframe');
        // CRITICAL: sandbox WITHOUT allow-same-origin prevents access to parent origin
        this.iframe.setAttribute('sandbox', 'allow-scripts');
        this.iframe.style.display = 'none';
        
        // Use the sandbox worker HTML from public folder
        this.iframe.src = '/sandbox-worker.html';
        
        // Message handler for iframe communication
        this.messageHandler = (event: MessageEvent) => {
          const { type, id, payload, error } = event.data;
          
          if (type === 'SANDBOX_READY') {
            this.ready = true;
            resolve();
            return;
          }
          
          if (type === 'EXEC_RESULT' && id) {
            const pending = this.pendingRequests.get(id);
            if (pending) {
              this.pendingRequests.delete(id);
              if (error) {
                pending.resolve({ success: false, error });
              } else {
                pending.resolve({ success: true, result: payload });
              }
            }
          }
        };
        
        window.addEventListener('message', this.messageHandler);
        
        // Timeout if iframe doesn't load
        const timeout = setTimeout(() => {
          reject(new Error('Sandbox iframe failed to initialize'));
        }, 5000);
        
        this.iframe.onload = () => {
          clearTimeout(timeout);
          // Wait for SANDBOX_READY message
        };
        
        document.body.appendChild(this.iframe);
      } catch (err) {
        reject(err);
      }
    });
  }

  async execute(code: string, timeoutMs: number): Promise<SandboxResponse> {
    await this.readyPromise;
    
    if (!this.iframe || !this.ready) {
      throw new Error('Sandbox not ready');
    }
    
    const id = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const request: SandboxRequest = { id, code, timeoutMs };
      
      this.iframe!.contentWindow?.postMessage({
        type: 'EXEC_REQUEST',
        id,
        payload: request
      }, '*');
      
      // Fallback timeout in case message is lost
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({
            success: false,
            error: 'Request timeout - no response from sandbox'
          });
        }
      }, timeoutMs + 1000);
    });
  }

  dispose(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
    if (this.iframe?.parentNode) {
      document.body.removeChild(this.iframe);
    }
    this.iframe = null;
    this.ready = false;
    this.pendingRequests.clear();
  }
}
