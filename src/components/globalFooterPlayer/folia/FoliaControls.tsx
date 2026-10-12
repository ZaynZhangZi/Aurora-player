// Host callbacks around Folia's FloatingPlayerControls layout and motion constants.
import React, {useEffect, useRef, useState} from 'react';
import {motion} from 'framer-motion';
import {Pause, Play, Repeat, Repeat1, Shuffle, ListMusic} from 'lucide-react';
import ProgressBar from '../../../vendor/folia/src/components/ProgressBar';
import TrackTitleNavigator from '../../../vendor/folia/src/components/floating-player/TrackTitleNavigator';

export default function FoliaControls({options, currentTime, theme}) {
    const [hovered, setHovered] = useState(false);
    const expandTimer = useRef<number | undefined>(undefined);
    const collapseTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => {clearTimeout(expandTimer.current); clearTimeout(collapseTimer.current);}, []);
    const enter = () => {
        clearTimeout(collapseTimer.current);
        clearTimeout(expandTimer.current);
        expandTimer.current = window.setTimeout(() => setHovered(true), 20);
    };
    const leave = () => {
        clearTimeout(expandTimer.current);
        clearTimeout(collapseTimer.current);
        collapseTimer.current = window.setTimeout(() => setHovered(false), 100);
    };
    const expanded = hovered || !options.playing;
    const spring = {type: 'spring' as const, stiffness: 280, damping: 24};
    const RepeatIcon = options.playMode === 'shuffle' ? Shuffle : options.playMode === 'single' ? Repeat1 : Repeat;
    const progress = <ProgressBar currentTime={currentTime} duration={options.duration / 1000} onSeek={seconds => options.onSeek(seconds * 1000)} primaryColor={theme.primaryColor} secondaryColor={theme.secondaryColor} trackColor="rgba(255,255,255,0.1)" collapsed={!expanded} />;
    const actionClass = `rounded-full p-2 transition-colors opacity-40 hover:opacity-100 hover:bg-white/10`;
    return <div className="absolute left-1/2 -translate-x-1/2 z-60 w-full flex justify-center pointer-events-none max-w-[min(32rem,100vw)] px-4" style={{bottom: 32, fontFamily: 'Inter, sans-serif'}}>
        <div className="pointer-events-auto w-full flex justify-center" onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) leave();}} style={{paddingBottom: 32, marginBottom: -32}}>
            <motion.div data-folia-controls data-expanded={expanded} layout transition={{layout: spring}} onPointerDown={event => {if (event.pointerType === 'touch') enter();}} className={`backdrop-blur-xl shadow-2xl overflow-hidden rounded-full relative transition-colors duration-300 cursor-pointer ${expanded ? 'p-3 bg-black/40 border border-white/5 w-full' : 'px-4 py-2 bg-black/20 border border-white/5 hover:bg-black/30 w-[80%] md:w-[60%]'}`}>
                <motion.div layout transition={{layout: spring}} className="w-full">
                    {expanded ? <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                        <div className="col-span-3 row-start-1 min-w-0 px-2 sm:col-start-2 sm:col-span-1">
                            <TrackTitleNavigator title={options.musicName || '无音轨'} trackKey={options.trackKey || options.musicName} prevTitle={options.prevTitle || null} nextTitle={options.nextTitle || null} canPrev={options.canPrev} canNext={options.canNext} onPrev={options.onPrev} onNext={options.onNext} prevLabel="播放上一首" nextLabel="播放下一首" color={theme.primaryColor} />
                        </div>
                        <button type="button" aria-label={options.playing ? '暂停播放' : '开始播放'} onClick={options.onTogglePlay} className="folia-play-button col-start-2 row-start-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-none text-black shadow-lg transition-transform sm:col-start-1 sm:row-start-1 sm:row-span-2 hover:scale-105" style={{backgroundColor: theme.primaryColor, color: theme.backgroundColor}}>{options.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}</button>
                        <div className="contents sm:col-start-3 sm:row-start-1 sm:row-span-2 sm:flex sm:items-center sm:gap-1">
                            <button type="button" aria-label="切换播放模式" title="切换播放模式" onClick={options.onCycleRepeat} className={`${actionClass} col-start-1 row-start-2 justify-self-end sm:justify-self-auto ${options.playMode === 'single' ? 'bg-white/20 opacity-100' : ''}`} style={{color: theme.primaryColor}}><RepeatIcon size={20} className="sm:h-[18px] sm:w-[18px]" /></button>
                            <button type="button" aria-label="打开播放列表" title="打开播放列表" onClick={options.onPlaylist} className={`${actionClass} col-start-3 row-start-2 justify-self-start sm:justify-self-auto`} style={{color: theme.primaryColor}}><ListMusic size={20} className="sm:h-[18px] sm:w-[18px]" /></button>
                        </div>
                        <div className="col-span-3 row-start-3 w-full px-2 sm:col-start-2 sm:col-span-1 sm:row-start-2">{progress}</div>
                    </div> : progress}
                </motion.div>
            </motion.div>
        </div>
    </div>;
}
