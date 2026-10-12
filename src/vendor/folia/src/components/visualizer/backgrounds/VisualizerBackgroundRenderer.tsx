// Host adapter: upstream Common / Latent backgrounds, without settings/mod registries.
import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import FluidBackground from './common/FluidBackground';
import GeometricBackground from './common/GeometricBackground';
import type { VisualizerBackgroundRenderProps } from './definition';

const LatentBackground = lazy(() => import('./latent/LatentBackground'));

export default function VisualizerBackgroundRenderer({config, theme, coverUrl, audioPower, audioBands, seed, staticMode, paused}: VisualizerBackgroundRenderProps) {
    if (config?.transparent) return null;
    // Upstream v0.7.17 defaults to Latent. The host explicitly chooses Common
    // for the linked preview presets; both render paths keep native defaults.
    if ((config?.mode ?? 'latent') !== 'common') return (
        <div data-folia-background="latent" className="absolute inset-0 z-0">
            <Suspense fallback={<div className="absolute inset-0" style={{backgroundColor: theme.backgroundColor}} />}>
                <LatentBackground theme={theme} coverUrl={coverUrl} audioPower={audioPower} audioBands={audioBands} staticMode={staticMode} paused={paused} tuning={config?.latent?.tuning} />
            </Suspense>
        </div>
    );
    const common = config?.common;
    const useCoverColorBg = common?.useCoverColorBg ?? false;
    return <div data-folia-background={useCoverColorBg ? 'cover' : 'reference'} className="absolute inset-0 z-0">
        {useCoverColorBg && <motion.div key="fluid-bg" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 1}} className="absolute inset-0 z-0"><FluidBackground coverUrl={coverUrl} theme={theme} /></motion.div>}
        <div className="absolute inset-0 z-0 transition-all duration-1000" style={{backgroundColor: theme.backgroundColor, opacity: useCoverColorBg ? common?.opacity ?? 0.75 : 1}} />
        {!staticMode && <div className="absolute inset-0 z-0"><GeometricBackground theme={theme} audioPower={audioPower} audioBands={audioBands} seed={seed} hideShapes={common?.disableGeometricBackground ?? false} disableVignette={common?.disableVignette ?? false} paused={paused} /></div>}
    </div>;
}
