// Host adapter: original Folia bottom geometry and spring, without app stores.
import {useEffect} from 'react';
import {useMotionValue, useSpring, useTransform, type MotionValue} from 'framer-motion';
import {PLAYER_BOTTOM_BAR_BASE_OFFSET_PX, resolvePlayerSubtitleBottomFromPresence} from '../utils/playerBottomBarLayout';
export const usePlayerBottomBarBottomPx = (base = PLAYER_BOTTOM_BAR_BASE_OFFSET_PX): MotionValue<number> => useMotionValue(base);
export const usePlayerSubtitleBottomPx = (hidden: boolean): MotionValue<number> => {
    const presence = useSpring(hidden ? 0 : 1, {stiffness: 280, damping: 28});
    useEffect(() => {presence.set(hidden ? 0 : 1);}, [presence, hidden]);
    return useTransform(presence, value => resolvePlayerSubtitleBottomFromPresence(PLAYER_BOTTOM_BAR_BASE_OFFSET_PX, value));
};
