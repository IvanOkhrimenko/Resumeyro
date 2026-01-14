"use client";

import { useRef, KeyboardEvent } from "react";

interface BulletTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function BulletTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: BulletTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = value;

      // Get the current line
      const beforeCursor = currentValue.slice(0, start);
      const afterCursor = currentValue.slice(end);

      // Check if current line starts with bullet
      const lines = beforeCursor.split("\n");
      const currentLine = lines[lines.length - 1];
      const hasBullet = currentLine.trim().startsWith("•");

      // If current line is empty bullet, remove it
      if (currentLine.trim() === "•") {
        const newValue = beforeCursor.slice(0, -currentLine.length) + afterCursor;
        onChange(newValue);
        // Set cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - currentLine.length;
        }, 0);
        return;
      }

      // Add new line with bullet
      const newLine = hasBullet || currentLine.trim() ? "\n• " : "• ";
      const newValue = beforeCursor + newLine + afterCursor;
      onChange(newValue);

      // Set cursor position after bullet
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + newLine.length;
      }, 0);
    }
  };

  // Auto-add bullet on focus if empty
  const handleFocus = () => {
    if (!value) {
      onChange("• ");
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 2;
        }
      }, 0);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder || "• Start typing your achievements..."}
        rows={rows}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        style={{ lineHeight: 1.6 }}
      />
      <p className="mt-1 text-[10px] text-zinc-400">
        Press Enter for new bullet point
      </p>
    </div>
  );
}
