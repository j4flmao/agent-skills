# Animation Accessibility

## Reduced Motion Support

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion.matches)

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    prefersReducedMotion.addEventListener('change', handler)
    return () => prefersReducedMotion.removeEventListener('change', handler)
  }, [])

  return reduced
}

function ConditionalAnimation({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <div className={reduced ? 'no-animation' : 'animated'}>
      {children}
    </div>
  )
}
```

## Accessible Transitions

```typescript
interface AccessibleTransitionProps {
  in: boolean
  duration?: number
  children: React.ReactNode
  onEnter?: () => void
  onExit?: () => void
}

function AccessibleTransition({
  in: show,
  duration = 300,
  children,
  onEnter,
  onExit,
}: AccessibleTransitionProps) {
  const reduced = useReducedMotion()

  return (
    <CSSTransition
      in={show}
      timeout={reduced ? 0 : duration}
      classNames="accessible-fade"
      onEnter={onEnter}
      onExit={onExit}
    >
      {children}
    </CSSTransition>
  )
}
```

## Animation Notifications

```typescript
interface AnimationNotificationProps {
  message: string
  type: 'polite' | 'assertive'
  visible: boolean
}

function AnimationNotification({ message, type, visible }: AnimationNotificationProps) {
  return (
    <div
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {visible && <span>{message}</span>}
    </div>
  )
}
```

## Focus Management During Animations

```typescript
function FocusTrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length > 0) {
      ;(focusableElements[0] as HTMLElement).focus()
    }
  }, [active])

  return <div ref={containerRef}>{children}</div>
}

function AnimatedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion()

  return (
    <FocusTrap active={open}>
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={reduced ? 'dialog-static' : 'dialog-animated'}
      >
        <button onClick={onClose}>Close</button>
      </div>
    </FocusTrap>
  )
}
```

## CSS Media Query

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

## Key Points

- Respect prefers-reduced-motion with zero-duration fallbacks
- Use aria-live regions to announce dynamic content changes
- Trap focus inside animated modals and dialogs
- Provide equivalent information without reliance on motion
- Avoid flashing animations that could trigger seizures
- Test animations with reduced motion enabled
- Allow users to disable non-essential animations
- Ensure animations do not obscure interactive elements
- Provide visible focus indicators during transitions
- Keep animation short to avoid disorienting users
- Pause auto-playing animations on focus or hover
- Document animation behavior for screen reader users
