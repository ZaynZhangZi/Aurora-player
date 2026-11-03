import React from 'react'
import {MorphIcon} from 'morphicons/react'
import {iconData} from './iconRegistry'

export function ReactIcon({name, filled=false, className='', strokeWidth=1.75, ...props}: {
  name: string
  filled?: boolean
  className?: string
  strokeWidth?: number
  [key: string]: any
}) {
  return <MorphIcon {...props} icon={iconData(name, filled)} strokeWidth={strokeWidth} className={`app-icon ${className}`} data-icon={name} spring="smooth" reducedMotion="user" />
}

const makeIcon=(name: string)=>(props: any)=><ReactIcon {...props} name={name} />
export const Play=makeIcon('play')
export const Pause=makeIcon('pause')
export const Repeat=makeIcon('repeat')
export const Repeat1=makeIcon('repeat-1')
export const Shuffle=makeIcon('shuffle')
export const ListMusic=makeIcon('list-music')
export const ChevronLeft=makeIcon('chevron-left')
export const ChevronRight=makeIcon('chevron-right')
export const Hourglass=makeIcon('hourglass')
