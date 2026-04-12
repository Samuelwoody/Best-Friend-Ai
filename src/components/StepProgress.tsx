interface StepProgressProps {
  activeStep: number;
  totalSteps: number;
}

export function StepProgress({ activeStep, totalSteps }: StepProgressProps) {
  return (
    <div className="step-progress" aria-label="Agent creation progress">
      {Array.from({ length: totalSteps }, (_, idx) => {
        const stepNumber = idx + 1;
        const className = stepNumber <= activeStep ? 'step-dot active' : 'step-dot';

        return <span key={stepNumber} className={className} aria-current={stepNumber === activeStep} />;
      })}
    </div>
  );
}
