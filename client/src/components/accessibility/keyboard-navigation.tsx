import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

// Keyboard shortcuts hook
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: (e: KeyboardEvent) => void;
  description: string;
  global?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return;
      }

      shortcuts.forEach(shortcut => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === e.ctrlKey;
        const altMatch = !!shortcut.altKey === e.altKey;
        const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
        const metaMatch = !!shortcut.metaKey === e.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          e.preventDefault();
          shortcut.action(e);
        }
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Keyboard navigation for custom components
interface KeyboardNavigableProps {
  children: React.ReactNode;
  onNavigate?: (direction: "up" | "down" | "left" | "right") => void;
  onSelect?: () => void;
  onEscape?: () => void;
  className?: string;
}

export function KeyboardNavigable({
  children,
  onNavigate,
  onSelect,
  onEscape,
  className
}: KeyboardNavigableProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        onNavigate?.("up");
        break;
      case "ArrowDown":
        e.preventDefault();
        onNavigate?.("down");
        break;
      case "ArrowLeft":
        e.preventDefault();
        onNavigate?.("left");
        break;
      case "ArrowRight":
        e.preventDefault();
        onNavigate?.("right");
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onSelect?.();
        break;
      case "Escape":
        e.preventDefault();
        onEscape?.();
        break;
    }
  };

  return (
    <div
      className={cn("focus:outline-none", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Enhanced dropdown menu with keyboard navigation
interface KeyboardDropdownProps {
  trigger: React.ReactNode;
  items: Array<{
    id: string;
    content: React.ReactNode;
    onSelect: () => void;
    disabled?: boolean;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function KeyboardDropdown({
  trigger,
  items,
  open,
  onOpenChange,
  className
}: KeyboardDropdownProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Reset selection when opening
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    }
  }, [open]);

  // Focus selected item
  useEffect(() => {
    if (open && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.focus();
    }
  }, [selectedIndex, open]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      onOpenChange(true);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case "Home":
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setSelectedIndex(items.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!items[index].disabled) {
          items[index].onSelect();
          onOpenChange(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className="absolute z-50 min-w-[200px] bg-white border border-gray-200 rounded-md shadow-lg py-1 mt-1"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => (itemRefs.current[index] = el)}
              role="menuitem"
              className={cn(
                "w-full px-3 py-2 text-left text-sm",
                "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedIndex === index && "bg-gray-100"
              )}
              onClick={() => {
                if (!item.disabled) {
                  item.onSelect();
                  onOpenChange(false);
                }
              }}
              onKeyDown={(e) => handleItemKeyDown(e, index)}
              disabled={item.disabled}
              tabIndex={-1}
            >
              {item.content}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Tab management for complex interfaces
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface KeyboardTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function KeyboardTabs({
  tabs,
  activeTab,
  onTabChange,
  className
}: KeyboardTabsProps) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        const prevIndex = index === 0 ? tabs.length - 1 : index - 1;
        const prevTab = tabs[prevIndex];
        if (!prevTab.disabled) {
          onTabChange(prevTab.id);
          tabRefs.current[prevIndex]?.focus();
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        const nextIndex = (index + 1) % tabs.length;
        const nextTab = tabs[nextIndex];
        if (!nextTab.disabled) {
          onTabChange(nextTab.id);
          tabRefs.current[nextIndex]?.focus();
        }
        break;
      case "Home":
        e.preventDefault();
        const firstTab = tabs[0];
        if (!firstTab.disabled) {
          onTabChange(firstTab.id);
          tabRefs.current[0]?.focus();
        }
        break;
      case "End":
        e.preventDefault();
        const lastIndex = tabs.length - 1;
        const lastTab = tabs[lastIndex];
        if (!lastTab.disabled) {
          onTabChange(lastTab.id);
          tabRefs.current[lastIndex]?.focus();
        }
        break;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab List */}
      <div role="tablist" className="flex border-b border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`panel-${tab.id}`}
            tabIndex={tab.id === activeTab ? 0 : -1}
            disabled={tab.disabled}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              tab.id === activeTab
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="focus:outline-none"
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// Global keyboard shortcuts display
interface KeyboardShortcutsModalProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  shortcuts,
  isOpen,
  onClose
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">키보드 단축키</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{shortcut.description}</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {[
                  shortcut.ctrlKey && "Ctrl",
                  shortcut.altKey && "Alt",
                  shortcut.shiftKey && "Shift",
                  shortcut.metaKey && "Cmd",
                  shortcut.key
                ].filter(Boolean).join(" + ")}
              </code>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          닫기
        </button>
      </div>
    </div>
  );
}