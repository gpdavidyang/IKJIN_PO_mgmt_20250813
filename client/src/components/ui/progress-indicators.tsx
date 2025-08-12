import React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, AlertCircle, Clock, CheckCircle } from "lucide-react";

// Step interface for multi-step processes
export interface Step {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "upcoming" | "error";
  optional?: boolean;
}

// Linear progress indicator
interface LinearProgressProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  animated?: boolean;
}

export function LinearProgress({
  value,
  max = 100,
  className,
  showPercentage = false,
  size = "md",
  variant = "default",
  animated = false
}: LinearProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  };

  const variantClasses = {
    default: "bg-blue-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "w-full bg-gray-200 rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            variantClasses[variant],
            animated && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`진행률 ${Math.round(percentage)}%`}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-right">
          <span className="text-xs text-gray-600">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Circular progress indicator
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  showPercentage = true,
  variant = "default"
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: "stroke-blue-500",
    success: "stroke-green-500",
    warning: "stroke-yellow-500",
    error: "stroke-red-500"
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`원형 진행률 ${Math.round(percentage)}%`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-300 ease-out", variantColors[variant])}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Step progress indicator
interface StepProgressProps {
  steps: Step[];
  currentStep?: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
  showConnectors?: boolean;
  clickable?: boolean;
  onStepClick?: (stepId: string) => void;
}

export function StepProgress({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
  showConnectors = true,
  clickable = false,
  onStepClick
}: StepProgressProps) {
  const handleStepClick = (step: Step) => {
    if (clickable && onStepClick && step.status !== "upcoming") {
      onStepClick(step.id);
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step.status) {
      case "completed":
        return <Check className="h-4 w-4 text-white" />;
      case "current":
        return <div className="h-2 w-2 bg-white rounded-full" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-white" />;
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
    }
  };

  const getStepClasses = (step: Step) => {
    const baseClasses = "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200";
    
    switch (step.status) {
      case "completed":
        return cn(baseClasses, "bg-green-500 border-green-500");
      case "current":
        return cn(baseClasses, "bg-blue-500 border-blue-500");
      case "error":
        return cn(baseClasses, "bg-red-500 border-red-500");
      default:
        return cn(baseClasses, "bg-gray-100 border-gray-300");
    }
  };

  const getConnectorClasses = (step: Step, index: number) => {
    const isCompleted = step.status === "completed" || 
      (steps[index + 1] && steps[index + 1].status === "completed");
    
    if (orientation === "horizontal") {
      return cn(
        "flex-1 h-0.5 mx-2",
        isCompleted ? "bg-green-500" : "bg-gray-300"
      );
    } else {
      return cn(
        "w-0.5 h-8 my-2 ml-4",
        isCompleted ? "bg-green-500" : "bg-gray-300"
      );
    }
  };

  return (
    <div className={cn(
      orientation === "horizontal" ? "flex items-center" : "flex flex-col",
      className
    )}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={cn(
            orientation === "horizontal" ? "flex flex-col items-center" : "flex items-start",
            "relative"
          )}>
            <button
              onClick={() => handleStepClick(step)}
              disabled={!clickable || step.status === "upcoming"}
              className={cn(
                getStepClasses(step),
                clickable && step.status !== "upcoming" && "hover:scale-105 cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              )}
              aria-label={`단계 ${index + 1}: ${step.title}`}
              aria-current={step.status === "current" ? "step" : undefined}
            >
              {getStepIcon(step)}
            </button>
            
            <div className={cn(
              orientation === "horizontal" ? "mt-2 text-center" : "ml-4 -mt-8 pl-4",
              "max-w-xs"
            )}>
              <div className={cn(
                "text-sm font-medium",
                step.status === "current" ? "text-blue-600" :
                step.status === "completed" ? "text-green-600" :
                step.status === "error" ? "text-red-600" :
                "text-gray-500"
              )}>
                {step.title}
                {step.optional && (
                  <span className="ml-1 text-xs text-gray-400">(선택)</span>
                )}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
          
          {showConnectors && index < steps.length - 1 && (
            <div className={getConnectorClasses(step, index)} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Form progress indicator for multi-step forms
interface FormProgressProps {
  totalSteps: number;
  currentStep: number;
  stepTitles?: string[];
  className?: string;
  showStepNumbers?: boolean;
}

export function FormProgress({
  totalSteps,
  currentStep,
  stepTitles = [],
  className,
  showStepNumbers = true
}: FormProgressProps) {
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          단계 {currentStep} / {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(percentage)}% 완료
        </span>
      </div>
      
      <LinearProgress 
        value={percentage} 
        className="mb-4"
        animated={currentStep < totalSteps}
      />
      
      {stepTitles.length > 0 && (
        <div className="flex justify-between text-xs text-gray-500">
          {stepTitles.map((title, index) => (
            <span
              key={index}
              className={cn(
                "flex-1 text-center",
                index + 1 === currentStep && "text-blue-600 font-medium",
                index + 1 < currentStep && "text-green-600"
              )}
            >
              {showStepNumbers && `${index + 1}. `}{title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Task progress indicator
interface Task {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  progress?: number;
  startTime?: Date;
  endTime?: Date;
}

interface TaskProgressProps {
  tasks: Task[];
  className?: string;
  showProgress?: boolean;
  showTiming?: boolean;
}

export function TaskProgress({
  tasks,
  className,
  showProgress = true,
  showTiming = false
}: TaskProgressProps) {
  const getTaskIcon = (task: Task) => {
    switch (task.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTaskClasses = (task: Task) => {
    switch (task.status) {
      case "completed":
        return "text-green-700 bg-green-50 border-green-200";
      case "in-progress":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "failed":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return "";
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
    return `${seconds}초`;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "p-4 rounded-lg border transition-all duration-200",
            getTaskClasses(task)
          )}
        >
          <div className="flex items-center space-x-3">
            {getTaskIcon(task)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium truncate">
                  {task.title}
                </h4>
                {showTiming && task.startTime && (
                  <span className="text-xs text-gray-500">
                    {formatDuration(task.startTime, task.endTime)}
                  </span>
                )}
              </div>
              
              {showProgress && task.status === "in-progress" && task.progress !== undefined && (
                <div className="mt-2">
                  <LinearProgress
                    value={task.progress}
                    size="sm"
                    showPercentage={true}
                    variant={task.status === "failed" ? "error" : "default"}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// File upload progress indicator
interface FileUploadProgressProps {
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function FileUploadProgress({
  fileName,
  progress,
  status,
  error,
  onRetry,
  onCancel,
  className
}: FileUploadProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "success";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <div className={cn("p-4 border rounded-lg", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate flex-1 mr-2">
          {fileName}
        </span>
        <span className="text-xs text-gray-500">
          {status === "completed" ? "완료" : `${Math.round(progress)}%`}
        </span>
      </div>
      
      <LinearProgress
        value={progress}
        variant={getStatusColor()}
        size="sm"
        animated={status === "uploading"}
      />
      
      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      )}
      
      {status === "error" && (onRetry || onCancel) && (
        <div className="mt-3 flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              재시도
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
          )}
        </div>
      )}
    </div>
  );
}