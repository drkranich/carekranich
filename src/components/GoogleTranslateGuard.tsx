import { useEffect } from "react";

declare global {
  interface Window {
    __careKranichTranslateGuard?: boolean;
  }
}

export function GoogleTranslateGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || window.__careKranichTranslateGuard) return;
    window.__careKranichTranslateGuard = true;

    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      try {
        if (child.parentNode !== this) return child;
        return originalRemoveChild.call(this, child) as T;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") return child;
        throw error;
      }
    };

    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      try {
        if (referenceNode && referenceNode.parentNode !== this) {
          return this.appendChild(newNode) as T;
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") {
          return this.appendChild(newNode) as T;
        }
        throw error;
      }
    };
  }, []);

  return null;
}
