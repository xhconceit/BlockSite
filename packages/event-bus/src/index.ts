import type { EventMap } from "@blocksite/core";

type EventName = string & keyof EventMap;
type Listener<T> = (payload: T) => void;
type Unsubscribe = () => void;

class TypedEmitter {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<E extends EventName>(event: E, handler: Listener<EventMap[E]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Listener<unknown>);
    return () => this.off(event, handler);
  }

  off<E extends EventName>(event: E, handler: Listener<EventMap[E]>): void {
    this.listeners.get(event)?.delete(handler as Listener<unknown>);
  }

  emit<E extends EventName>(event: E, payload: EventMap[E]): void {
    const handlers = this.listeners.get(event);
    if (handlers === undefined) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }
}

export const emitter = new TypedEmitter();

// ── Cross-context wrapper ──

type RequestMessage = {
  type: "blocksite-request";
  id: string;
  event: string;
  payload: unknown;
};

type ResponseMessage = {
  type: "blocksite-response";
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
};

const pendingRequests = new Map<
  string,
  {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();

function isChromeRuntimeAvailable(): boolean {
  return typeof chrome !== "undefined" && chrome.runtime?.sendMessage !== undefined;
}

export function request<E extends EventName>(
  event: E,
  payload?: EventMap[E],
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!isChromeRuntimeAvailable()) {
      reject(new Error("chrome.runtime.sendMessage is not available"));
      return;
    }

    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request "${event}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timer });

    const message: RequestMessage = {
      type: "blocksite-request",
      id,
      event,
      payload,
    };

    chrome.runtime.sendMessage(message).catch((err: Error) => {
      clearTimeout(timer);
      pendingRequests.delete(id);
      reject(err);
    });
  });
}

export function respond<E extends EventName>(
  event: E,
  handler: (payload: EventMap[E]) => Promise<unknown> | unknown,
): Unsubscribe {
  const listener = (
    message: RequestMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ResponseMessage) => void,
  ) => {
    if (message.type !== "blocksite-request") return false;
    if (message.event !== event) return false;

    Promise.resolve(handler(message.payload as EventMap[E]))
      .then((data) => {
        sendResponse({ type: "blocksite-response", id: message.id, success: true, data });
      })
      .catch((err: Error) => {
        sendResponse({
          type: "blocksite-response",
          id: message.id,
          success: false,
          error: err.message,
        });
      });

    return true;
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

// Handle incoming responses from the background
if (isChromeRuntimeAvailable()) {
  chrome.runtime.onMessage.addListener((message: ResponseMessage) => {
    if (message.type !== "blocksite-response") return;
    const pending = pendingRequests.get(message.id);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    pendingRequests.delete(message.id);
    if (message.success) {
      pending.resolve(message.data);
    } else {
      pending.reject(new Error(message.error ?? "Unknown error"));
    }
  });
}

export type { EventName, Listener, Unsubscribe };
