import { useRef } from 'react';

// Two-tab control lifting `intent` to Home (per the homepage port plan §2/§5
// Phase 3). WAI-ARIA APG "tabs" pattern: role="tablist" wraps role="tab"
// buttons, roving tabindex (only the active tab is in the tab order), and
// arrow/Home/End keys move focus *and* selection (automatic-activation
// tabs — the simplest correct pattern for a two-item toggle). The single
// tabpanel this controls lives in HeroSection and is passed in as `panelId`.
const TABS = [
  { id: 'intent-tab-build', value: 'build', label: 'Build with HDK' },
  { id: 'intent-tab-partner', value: 'partner', label: 'Partner with Lloyal' },
];

const IntentToggle = ({ intent, onChange, panelId }) => {
  const tabRefs = useRef([]);
  const activeIndex = TABS.findIndex((tab) => tab.value === intent);

  const focusAndSelect = (index) => {
    const nextTab = TABS[index];
    onChange(nextTab.value);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusAndSelect((activeIndex + 1) % TABS.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusAndSelect((activeIndex - 1 + TABS.length) % TABS.length);
        break;
      case 'Home':
        event.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndSelect(TABS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div aria-label="Choose how you want to use Lloyal" className="intent-toggle" role="tablist">
      {TABS.map((tab, index) => {
        const isActive = tab.value === intent;
        return (
          <button
            key={tab.value}
            aria-controls={panelId}
            aria-selected={isActive}
            className={`intent-tab${isActive ? ' is-active' : ''}`}
            id={tab.id}
            onClick={() => onChange(tab.value)}
            onKeyDown={handleKeyDown}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default IntentToggle;
