"use client";
import FeatureIcon from "./FeatureIcon";
import FloatingPanel from "./FloatingPanel";
export default function CreationChoiceDialog({
  title,
  options,
  onChoose,
  onClose,
}: {
  title: string;
  options: { id: string; label: string }[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <FloatingPanel open onClose={onClose} label={title}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="min-h-11 rounded-lg p-3 text-left hover:bg-zinc-500/10"
            onClick={() => onChoose(option.id)}
          >
            <FeatureIcon feature={option.id} className="mr-3" />
            {option.label}
          </button>
        ))}
      </div>
    </FloatingPanel>
  );
}
