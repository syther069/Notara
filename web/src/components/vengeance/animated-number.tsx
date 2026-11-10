import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Animated Number, adapted from Vengeance UI (https://www.vengenceui.com/components/animated-number).
// Changed for Notara: it takes formatted amounts ("1,250.50"), so separators and the decimal point stay
// still while the digits roll; digits are keyed from the right, so a longer number doesn't re-roll every
// place; under reduced motion the digits change without rolling.
function AnimatedNumber({ value, className }: { value: number | string, className?: string }) {
    const chars = value.toString().split("")
    return (
        <span className={cn("inline-flex items-center tabular-nums", className)} aria-label={value.toString()} role="text">
            <span className="flex relative items-center" aria-hidden>
                {chars.map((digit, index) => (
                    <SingleNumberHolder key={chars.length - index} value={digit} index={index} />
                ))}
            </span>
        </span>
    )
}

function SingleNumberHolder({ value, index }: { value: string, index: number }) {
    const [height, setHeight] = useState<string | null>(null)
    const containerRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (containerRef.current) {
            setHeight(getComputedStyle(containerRef.current).height)
        }
    }, [])

    void index
    const notANumber = isNaN(Number.parseInt(value))

    return (
        <span
            className="relative inline-block"
            style={{ height: height || "auto", overflowY: "hidden", overflowX: "clip" }}
            ref={containerRef as React.RefObject<HTMLSpanElement>}
        >
            {notANumber && <span>{value}</span>}
            {!notANumber && <RenderStrip value={value} eleHeight={height} />}
        </span>
    )
}

const zeroToNine = Array.from({ length: 10 }, (_, k) => k)

function RenderStrip({ eleHeight, value }: { eleHeight: string | null, value: string }) {
    const heightInNumber = Number.parseInt(eleHeight?.replace("px", "") || "48")
    const negative = heightInNumber * -1
    const pos = heightInNumber
    const prev = useRef(value)

    // Convert string values to numbers for comparison
    const currentVal = parseInt(value)
    const prevVal = parseInt(prev.current)

    // Calculate direction based on value change
    const diff = prevVal - currentVal
    const reduce = useReducedMotion()
    const dir = reduce ? 0 : currentVal > prevVal ? pos * diff * -1 : negative * diff

    // Update ref after calculation
    useEffect(() => {
        prev.current = value
    }, [value])

    return (
        <AnimatePresence mode='wait'>
            <motion.span
                key={value}
                initial={{ y: dir }}
                animate={{ y: 0 }}
                exit={{ y: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className='inline-flex relative flex-col'
            >
                {/* Numbers smaller than current */}
                <motion.span
                    layout
                    key={`negative-${value}`}
                    className={cn('flex flex-col items-center absolute bottom-full left-0')}
                >
                    {zeroToNine.filter(val => val < currentVal).map((val, idx) => (
                        <span key={`${val}_${idx}`}>{val}</span>
                    ))}
                </motion.span>

                {/* Current Number */}
                <span key={`current-${value}`}>{value}</span>

                {/* Numbers larger than current */}
                <motion.span
                    layout
                    key={`positive-${value}`}
                    className={cn('flex flex-col items-center absolute top-full left-0')}
                >
                    {zeroToNine.filter(val => val > currentVal).map((val, idx) => (
                        <span key={`${val}_${idx}`}>{val}</span>
                    ))}
                </motion.span>
            </motion.span>
        </AnimatePresence>
    )
}

export { AnimatedNumber }
