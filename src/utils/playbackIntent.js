let cancelPending = () => {}
const listeners=new Set()
export function registerPlaybackCancellation(handler) {cancelPending=handler}
export function cancelPlaybackIntent() {cancelPending()}
export function subscribePlaybackIntent(handler) {listeners.add(handler);return ()=>listeners.delete(handler)}
export function announcePlaybackIntent() {listeners.forEach(handler=>handler())}
