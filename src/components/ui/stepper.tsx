"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Circle } from "lucide-react"

interface StepperProps {
  steps: Array<{
    id: string
    title: string
    description?: string
  }>
  currentStep: number
  completedSteps?: number[]
  className?: string
}

interface StepperItemProps {
  step: {
    id: string
    title: string
    description?: string
  }
  index: number
  currentStep: number
  isCompleted: boolean
  isLast: boolean
}

const StepperItem = ({ step, index, currentStep, isCompleted, isLast }: StepperItemProps) => {
  const isActive = index + 1 === currentStep
  const isPending = index + 1 > currentStep

  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center flex-1">
        {/* Step Indicator */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
            isActive
              ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-110"
              : isCompleted
              ? "bg-green-500 text-white"
              : "bg-zinc-800 text-zinc-500 border-2 border-zinc-600"
          )}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : isActive ? (
            <span>{index + 1}</span>
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>

        {/* Step Title */}
        <p
          className={cn(
            "text-xs font-medium mt-2 text-center transition-colors",
            isActive
              ? "text-white"
              : isCompleted
              ? "text-green-400"
              : "text-zinc-500"
          )}
        >
          {step.title}
        </p>

        {/* Step Description */}
        {step.description && (
          <p
            className={cn(
              "text-[10px] text-center mt-1 transition-colors",
              isActive ? "text-zinc-300" : "text-zinc-600"
            )}
          >
            {step.description}
          </p>
        )}
      </div>

      {/* Separator */}
      {!isLast && (
        <div
          className={cn(
            "flex-1 h-0.5 mx-4 transition-all duration-300",
            isCompleted ? "bg-green-500" : isActive ? "bg-red-500/50" : "bg-zinc-700"
          )}
        />
      )}
    </div>
  )
}

const Stepper = ({ steps, currentStep, completedSteps = [], className }: StepperProps) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <StepperItem
            key={step.id}
            step={step}
            index={index}
            currentStep={currentStep}
            isCompleted={completedSteps.includes(index + 1) || index + 1 < currentStep}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      {/* Progress Percentage */}
      <div className="text-right mt-2 flex justify-between items-center">
        {currentStep > steps.length && (
          <span className="text-xs font-bold text-green-400">
            ✓ Complete
          </span>
        )}
        <span className="text-xs font-bold text-red-500 ml-auto">
          {currentStep > steps.length 
            ? 100 
            : Math.max(0, Math.round(((currentStep - 1) / (steps.length - 1 || 1)) * 100))}%
        </span>
      </div>
    </div>
  )
}

export { Stepper, type StepperProps }