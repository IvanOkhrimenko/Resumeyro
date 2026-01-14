"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface SkillsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SkillsInput({ value, onChange, placeholder }: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse skills from comma-separated string
  const skills = value
    ? value.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      const newSkills = [...skills, trimmed];
      onChange(newSkills.join(", "));
    }
    setInputValue("");
  };

  const removeSkill = (index: number) => {
    const newSkills = skills.filter((_, i) => i !== index);
    onChange(newSkills.join(", "));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === "Backspace" && !inputValue && skills.length > 0) {
      removeSkill(skills.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    // Split by comma, semicolon, or newline
    const pastedSkills = pastedText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (pastedSkills.length > 0) {
      const newSkills = [...skills, ...pastedSkills.filter(s => !skills.includes(s))];
      onChange(newSkills.join(", "));
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[60px] cursor-text rounded-md border border-zinc-200 bg-white p-2 transition-colors focus-within:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
    >
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="group inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
          >
            {skill}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeSkill(index);
              }}
              className="rounded p-0.5 opacity-60 transition-opacity hover:bg-zinc-200 hover:opacity-100 dark:hover:bg-zinc-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addSkill(inputValue);
            }
          }}
          placeholder={skills.length === 0 ? placeholder || "Type skill and press Enter" : ""}
          className="min-w-[80px] flex-1 bg-transparent text-xs text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-300"
        />
      </div>
      {skills.length === 0 && (
        <p className="mt-1.5 text-[10px] text-zinc-400">
          Press Enter or comma to add • Paste multiple skills at once
        </p>
      )}
    </div>
  );
}
