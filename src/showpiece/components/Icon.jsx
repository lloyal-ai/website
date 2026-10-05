import {
  ArrowUp, Check, ChevronDown, Copy, Download, FileText, Folder, Globe,
  Image, Mic, Monitor, PanelLeft, Paperclip, Pause, Play, Projector,
  Search, Settings2, ShieldCheck, Sparkles, Square, Table2, Terminal, X,
} from 'lucide-react';

const icons = {
  attachment: Paperclip, arrow: ArrowUp, check: Check, mic: Mic, stop: Square,
  document: FileText, folder: Folder, projector: Projector, desktop: Monitor,
  terminal: Terminal, globe: Globe, play: Play, pause: Pause, close: X,
  settings: Settings2, chevron: ChevronDown, copy: Copy, panel: PanelLeft,
  download: Download, shield: ShieldCheck, search: Search, sparkles: Sparkles,
  image: Image, sheet: Table2,
};

/** Presentation icon. Buttons must provide their own accessible name. */
export function Icon({ name, size = 16, className = '', ...props }) {
  const Glyph = icons[name] ?? PanelLeft;
  return <Glyph size={size} strokeWidth={1.5} aria-hidden="true" className={className} {...props} />;
}
