export interface PendingAction {
    action: () => Promise<string>;
    description: string;
    expiresAt: number;        // Date.now() + config timeout
    agentName: string;
}

const pendingActions = new Map<number, PendingAction>();

export function setPending(userId: number, pending: PendingAction): void {
    pendingActions.set(userId, pending);
}

export function getPending(userId: number): PendingAction | undefined {
    const p = pendingActions.get(userId);
    if (!p) return undefined;
    if (Date.now() > p.expiresAt) {
        pendingActions.delete(userId);
        return undefined;
    }
    return p;
}

export function clearPending(userId: number): void {
    pendingActions.delete(userId);
}
