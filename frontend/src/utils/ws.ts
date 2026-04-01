const DEFAULT_DEV_BACKEND_ORIGIN = 'http://localhost:3000';
const DEV_SOCKET_CONNECT_DELAY_MS = 75;

const getBackendOrigin = (): string => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_BACKEND_ORIGIN || DEFAULT_DEV_BACKEND_ORIGIN;
  }

  return window.location.origin;
};

export const getWsUrl = (path: string): string => {
  const backendOrigin = getBackendOrigin();
  const wsOrigin = backendOrigin.replace(/^http/, 'ws');

  return `${wsOrigin}${path}`;
};

export const connectWebSocket = (
  path: string,
  onMessage: (event: MessageEvent<string>) => void,
  onError?: (event: Event) => void
) => {
  let socket: WebSocket | null = null;
  let isDisposed = false;

  const connect = () => {
    if (isDisposed) {
      return;
    }

    socket = new WebSocket(getWsUrl(path));
    socket.onmessage = onMessage;

    if (onError) {
      socket.onerror = onError;
    }
  };

  const timeoutId = window.setTimeout(
    connect,
    import.meta.env.DEV ? DEV_SOCKET_CONNECT_DELAY_MS : 0
  );

  return () => {
    isDisposed = true;
    window.clearTimeout(timeoutId);

    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close();
    }
  };
};
