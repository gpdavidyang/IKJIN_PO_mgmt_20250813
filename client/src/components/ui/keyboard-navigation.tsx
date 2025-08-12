import React from "react";
import { cn } from "@/lib/utils";

// Enhanced keyboard navigation hook
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  enabled: boolean = true
) {
  const containerRef = React.useRef<T>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [focusableElements, setFocusableElements] = React.useState<HTMLElement[]>([]);

  // Update focusable elements when container changes
  React.useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])',
      '[role="menuitem"]:not([disabled])',
      '[role="tab"]:not([disabled])'
    ].join(',');

    const elements = Array.from(
      containerRef.current.querySelectorAll(selector)
    ) as HTMLElement[];

    // Filter out hidden elements
    const visibleElements = elements.filter(element => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             element.offsetParent !== null;
    });

    setFocusableElements(visibleElements);
    setCurrentIndex(0);
  }, [enabled]);

  // Focus management
  const focusElement = React.useCallback((index: number) => {
    if (focusableElements[index]) {
      focusableElements[index].focus();
      setCurrentIndex(index);
    }
  }, [focusableElements]);

  const focusFirst = React.useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = React.useCallback(() => {
    focusElement(focusableElements.length - 1);
  }, [focusElement, focusableElements.length]);

  const focusNext = React.useCallback(() => {
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusElement(nextIndex);
  }, [currentIndex, focusElement, focusableElements.length]);

  const focusPrevious = React.useCallback(() => {
    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusElement(prevIndex);
  }, [currentIndex, focusElement, focusableElements.length]);

  // Keyboard event handler
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (!enabled || focusableElements.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        focusNext();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        focusFirst();
        break;
      case 'End':
        event.preventDefault();
        focusLast();
        break;
      case 'Tab':
        // Let natural tab behavior work, but update our index
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement;
          const index = focusableElements.indexOf(activeElement);
          if (index !== -1) {
            setCurrentIndex(index);
          }
        }, 0);
        break;
    }
  }, [enabled, focusableElements, focusNext, focusPrevious, focusFirst, focusLast]);

  return {
    containerRef,
    currentIndex,
    focusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    handleKeyDown
  };
}

// Enhanced form navigation component
interface FormKeyboardNavigationProps {
  children: React.ReactNode;
  className?: string;
  onSubmit?: () => void;
  enabled?: boolean;
}

export function FormKeyboardNavigation({
  children,
  className,
  onSubmit,
  enabled = true
}: FormKeyboardNavigationProps) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation<HTMLFormElement>(enabled);

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Ctrl+Enter for form submission
    if (event.ctrlKey && event.key === 'Enter' && onSubmit) {
      event.preventDefault();
      onSubmit();
      return;
    }

    handleKeyDown(event);
  };

  return (
    <form
      ref={containerRef}
      className={cn("space-y-4", className)}
      onKeyDown={handleFormKeyDown}
      role="form"
    >
      {children}
    </form>
  );
}

// Table keyboard navigation component
interface TableKeyboardNavigationProps {
  children: React.ReactNode;
  className?: string;
  onRowSelect?: (rowIndex: number) => void;
  onRowActivate?: (rowIndex: number) => void;
  enabled?: boolean;
}

export function TableKeyboardNavigation({
  children,
  className,
  onRowSelect,
  onRowActivate,
  enabled = true
}: TableKeyboardNavigationProps) {
  const containerRef = React.useRef<HTMLTableElement>(null);
  const [currentRow, setCurrentRow] = React.useState(0);
  const [currentCol, setCurrentCol] = React.useState(0);
  const [tableData, setTableData] = React.useState<HTMLElement[][]>([]);

  // Update table structure
  React.useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const rows = Array.from(containerRef.current.querySelectorAll('tbody tr'));
    const data = rows.map(row => 
      Array.from(row.querySelectorAll('td, th')).filter(cell => {
        const focusable = cell.querySelector('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        return focusable !== null;
      }) as HTMLElement[]
    );

    setTableData(data);
    setCurrentRow(0);
    setCurrentCol(0);
  }, [enabled, children]);

  const focusCell = React.useCallback((row: number, col: number) => {
    if (tableData[row] && tableData[row][col]) {
      const cell = tableData[row][col];
      const focusable = cell.querySelector('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusable) {
        focusable.focus();
        setCurrentRow(row);
        setCurrentCol(col);
        onRowSelect?.(row);
      }
    }
  }, [tableData, onRowSelect]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!enabled || tableData.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentRow < tableData.length - 1) {
          focusCell(currentRow + 1, currentCol);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentRow > 0) {
          focusCell(currentRow - 1, currentCol);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (currentCol < tableData[currentRow]?.length - 1) {
          focusCell(currentRow, currentCol + 1);
        } else if (currentRow < tableData.length - 1) {
          focusCell(currentRow + 1, 0);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentCol > 0) {
          focusCell(currentRow, currentCol - 1);
        } else if (currentRow > 0) {
          const prevRowLength = tableData[currentRow - 1]?.length || 0;
          focusCell(currentRow - 1, prevRowLength - 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        focusCell(currentRow, 0);
        break;
      case 'End':
        event.preventDefault();
        focusCell(currentRow, (tableData[currentRow]?.length || 1) - 1);
        break;
      case 'PageUp':
        event.preventDefault();
        focusCell(0, currentCol);
        break;
      case 'PageDown':
        event.preventDefault();
        focusCell(tableData.length - 1, currentCol);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onRowActivate?.(currentRow);
        break;
    }
  };

  return (
    <table
      ref={containerRef}
      className={cn("w-full", className)}
      onKeyDown={handleKeyDown}
      role="grid"
      aria-rowcount={tableData.length}
    >
      {children}
    </table>
  );
}

// Menu keyboard navigation component
interface MenuKeyboardNavigationProps {
  children: React.ReactNode;
  className?: string;
  onItemSelect?: (index: number) => void;
  orientation?: "vertical" | "horizontal";
  enabled?: boolean;
}

export function MenuKeyboardNavigation({
  children,
  className,
  onItemSelect,
  orientation = "vertical",
  enabled = true
}: MenuKeyboardNavigationProps) {
  const { containerRef, handleKeyDown, focusFirst, currentIndex } = useKeyboardNavigation<HTMLUListElement>(enabled);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (!enabled) return;

    // Handle specific menu navigation
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onItemSelect?.(currentIndex);
        break;
      case 'Escape':
        event.preventDefault();
        // Allow parent to handle escape
        break;
      default:
        // Adjust arrow key behavior based on orientation
        if (orientation === "horizontal") {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // In horizontal menus, up/down might close the menu
            return;
          }
        }
        handleKeyDown(event);
    }
  };

  // Focus first item when menu opens
  React.useEffect(() => {
    if (enabled) {
      setTimeout(focusFirst, 0);
    }
  }, [enabled, focusFirst]);

  return (
    <ul
      ref={containerRef}
      className={cn("focus:outline-none", className)}
      onKeyDown={handleMenuKeyDown}
      role="menu"
      aria-orientation={orientation}
    >
      {children}
    </ul>
  );
}

// Skip links component for better navigation
export function SkipLinks() {
  const skipLinks = [
    { href: "#main-content", label: "본문으로 이동" },
    { href: "#navigation", label: "네비게이션으로 이동" },
    { href: "#search", label: "검색으로 이동" },
    { href: "#footer", label: "하단으로 이동" }
  ];

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-white border border-gray-300 rounded-br-lg shadow-lg">
        {skipLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// Breadcrumb navigation component
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNavigation({
  items,
  className
}: BreadcrumbNavigationProps) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation<HTMLElement>(true);

  return (
    <nav
      ref={containerRef}
      className={cn("flex", className)}
      aria-label="Breadcrumb"
      onKeyDown={handleKeyDown}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <a
                href={item.href}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-current={item.current ? "page" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <span
                className="text-sm font-medium text-gray-500"
                aria-current={item.current ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Global keyboard shortcut manager
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useGlobalKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === event.key.toLowerCase() &&
        !!s.ctrlKey === event.ctrlKey &&
        !!s.altKey === event.altKey &&
        !!s.shiftKey === event.shiftKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Keyboard shortcut help component
interface KeyboardShortcutHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelp({
  shortcuts,
  isOpen,
  onClose
}: KeyboardShortcutHelpProps) {
  React.useEffect(() => {
    if (isOpen) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatKey = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">키보드 단축키</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                  {formatKey(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}