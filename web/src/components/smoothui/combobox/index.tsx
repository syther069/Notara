// Combobox, adapted from SmoothUI (https://smoothui.dev/docs/primitives/combobox).
// Changed for Notara: role names map to the design tokens; icons come from the product's icon set; the
// panel opens with a height spring and a 40ms stagger on its options (and no motion under reduced motion);
// options can carry a description; the search field can be hidden for short lists; a typed value can be
// offered as an option (recipient pickers); picking the selected option again keeps it unless clearable.
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { Check as CheckIcon, ChevronsUpDown as ChevronsUpDownIcon, LoaderCircle as LoaderIcon, Search as SearchIcon } from "@/components/icons";
import { motion, useReducedMotion } from "motion/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import SmoothButton from "../smooth-button";

export interface ComboboxOption {
  /** A quieter second line under the label. */
  description?: string;
  /** Whether the option is disabled */
  disabled?: boolean;
  /** The display label for the option */
  label: string;
  /** The value of the option */
  value: string;
}

export interface ComboboxProps {
  /** Offer what was typed as a value. Return the label for it, or null if it isn't valid. */
  allowCustom?: (query: string) => string | null;
  /** Picking the selected option again clears it. */
  clearable?: boolean;
  id?: string;
  /** Show the search field. Off for short, fixed lists. */
  searchable?: boolean;
  /** Accessible label for the combobox */
  "aria-label"?: string;
  /** ID of element that labels this combobox */
  "aria-labelledby"?: string;
  /** Additional CSS class names for the trigger button */
  className?: string;
  /** Additional CSS class names for the popover content */
  contentClassName?: string;
  /** Initially selected value when uncontrolled */
  defaultValue?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Text shown when no results match */
  emptyText?: string;
  /** Async search callback — receives the query string, returns filtered options */
  onSearch?: (query: string) => Promise<ComboboxOption[]>;
  /** Callback when the selected value changes */
  onValueChange?: (value: string) => void;
  /** Static list of options (used when onSearch is not provided) */
  options?: ComboboxOption[];
  /** Placeholder text for the trigger button */
  placeholder?: string;
  /** Debounce delay in ms for the onSearch callback */
  searchDebounce?: number;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** The controlled selected value. Omit for uncontrolled use. */
  value?: string;
}

/* ------------------------------------------------------------------ */
/*  Thin cmdk + radix wrappers (no @repo/shadcn-ui)                    */
/* ------------------------------------------------------------------ */

const Popover = ({
  ...props
}: ComponentProps<typeof PopoverPrimitive.Root>) => (
  <PopoverPrimitive.Root data-slot="popover" {...props} />
);

const PopoverTrigger = ({
  ...props
}: ComponentProps<typeof PopoverPrimitive.Trigger>) => (
  <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
);

const PopoverContent = ({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      className={cn(
        "nt z-[85] w-72 origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-xl border border-border bg-overlay text-foreground shadow-pop outline-hidden",
        className
      )}
      data-slot="popover-content"
      sideOffset={sideOffset}
      {...props}
    />
  </PopoverPrimitive.Portal>
);

const Command = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive>) => (
  <CommandPrimitive
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-overlay text-foreground",
      className
    )}
    data-slot="command"
    {...props}
  />
);

const CommandInput = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) => (
  <div
    className="flex h-10 items-center gap-2 border-b border-border px-3"
    data-slot="command-input-wrapper"
  >
    <SearchIcon className="size-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-base outline-none focus-visible:!outline-none placeholder:text-muted/70 disabled:cursor-not-allowed disabled:text-muted/60 md:text-sm",
        className
      )}
      data-slot="command-input"
      {...props}
    />
  </div>
);

const CommandList = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List
    className={cn(
      "max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden",
      className
    )}
    data-slot="command-list"
    {...props}
  />
);

const CommandEmpty = ({
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty
    className="py-6 text-center text-sm"
    data-slot="command-empty"
    {...props}
  />
);

const CommandGroup = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:text-xs",
      className
    )}
    data-slot="command-group"
    {...props}
  />
);

const CommandItem = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-foreground/10 data-[disabled=true]:text-muted/60 data-[selected=true]:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className
    )}
    data-slot="command-item"
    {...props}
  />
);

export default function Combobox({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  options: staticOptions,
  onSearch,
  searchDebounce = 300,
  placeholder = "Select an option…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled = false,
  searchable = true,
  clearable = false,
  allowCustom,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ComboboxProps) {
  const shouldReduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = valueProp ?? internalValue;
  const [query, setQuery] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents empty search results from re-triggering the initial `onSearch("")`. */
  const hasLoadedInitialRef = useRef(false);

  const displayOptions = onSearch ? asyncOptions : (staticOptions ?? []);

  /** Prefer full option lists so a filtered/async view cannot blank the trigger. */
  const selectedLabel = (() => {
    const pools = [staticOptions, asyncOptions, displayOptions].filter(
      (list): list is ComboboxOption[] => Boolean(list?.length)
    );
    for (const pool of pools) {
      const match = pool.find((opt) => opt.value === value);
      if (match) {
        return match.label;
      }
    }
  })();

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      if (!onSearch) {
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await onSearch(searchQuery);
          setAsyncOptions(results);
        } finally {
          setLoading(false);
        }
      }, searchDebounce);
    },
    [onSearch, searchDebounce]
  );

  // Load initial async options once when the popover first opens
  useEffect(() => {
    if (!(open && onSearch) || hasLoadedInitialRef.current || loading) {
      return;
    }
    hasLoadedInitialRef.current = true;
    setLoading(true);
    onSearch("")
      .then((results) => {
        setAsyncOptions(results);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, onSearch, loading]);

  // Clean up debounce on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const customLabel = allowCustom && query.trim() && !displayOptions.some((o) => o.value === query.trim()) ? allowCustom(query.trim()) : null;

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value && clearable ? "" : selectedValue;
    setInternalValue(newValue);
    onValueChange?.(newValue);
    setQuery("");
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <SmoothButton
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-border bg-surface px-3.5 py-2 text-left text-[15px] font-medium",
            !selectedLabel && "text-muted",
            shouldReduceMotion && "!transition-none !duration-0",
            className
          )}
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span
            className={cn(
              "truncate transition-colors",
              !selectedLabel && "text-muted/70"
            )}
          >
            {selectedLabel ?? (value || placeholder)}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50 transition-colors" />
        </SmoothButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-0",
          shouldReduceMotion && "!animate-none !transition-none !duration-0",
          contentClassName
        )}
      >
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        >
        <Command shouldFilter={!onSearch} filter={(v, search, keywords) => (v.startsWith("custom ") || [v, ...(keywords ?? [])].join(" ").toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          {searchable ? (
            <CommandInput
              onValueChange={handleSearch}
              placeholder={searchPlaceholder}
              value={query}
            />
          ) : null}
          <CommandList className="relative">
            {loading ? (
              <div
                aria-busy="true"
                aria-live="polite"
                className="absolute inset-0 z-10 flex min-h-[7.5rem] items-center justify-center bg-overlay/80"
              >
                <LoaderIcon className="size-4 animate-spin text-muted" />
                <span className="ml-2 text-muted text-sm">
                  Loading…
                </span>
              </div>
            ) : null}

            {!loading && !customLabel && <CommandEmpty>{emptyText}</CommandEmpty>}

            {!loading && customLabel ? (
              <CommandGroup forceMount>
                <CommandItem forceMount onSelect={() => handleSelect(query.trim())} value={`custom ${query}`}>
                  <CheckIcon className="size-4 shrink-0 opacity-0" />
                  {customLabel}
                </CommandItem>
              </CommandGroup>
            ) : null}

            {!loading && displayOptions.length > 0 ? (
              <CommandGroup>
                {displayOptions.map((option, index) => (
                  <CommandItem
                    disabled={option.disabled}
                    key={option.value}
                    keywords={[option.label, option.value]}
                    onSelect={() => handleSelect(option.value)}
                    value={`${option.label} ${option.value}`}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-w-0 flex-col"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.description ? <span className="truncate text-muted text-xs">{option.description}</span> : null}
                    </motion.span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
