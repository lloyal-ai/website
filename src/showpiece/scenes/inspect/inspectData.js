// Illustrative elapsed seconds, not captured performance measurements.
export const timelineDuration = 90;
export const agents = [
  { id: 'root', name: 'Shared root', start: 0, end: 16 },
  { id: '01', name: 'Research 01', parent: 'root', start: 16, end: 82 },
  { id: '02', name: 'Research 02', parent: 'root', start: 16, end: 78 },
  { id: '01a', name: '01a', parent: '01', start: 58, end: 84 },
  { id: '01b', name: '01b', parent: '01', start: 58, end: 88 },
];

export const actions = [
  { id: 'web_search', symbol: '↗', label: 'Market outlook', at: 2.2, inspectAt: 3.1 },
  { id: 'fetch_page', symbol: '↙', label: 'Primary evidence', at: 4.7, inspectAt: 6.3 },
  { id: 'report', symbol: '↗', label: 'Findings', at: 17.1, inspectAt: null },
];

// Identity stays attached to the source as its rank changes.
export const passages = [
  { id: '01', label: 'Background' },
  { id: '02', label: 'Market signals' },
  { id: '03', label: 'Costs' },
  { id: '04', label: 'Alternatives' },
  { id: '05', label: 'Primary evidence' },
];

export const rankedPassageIds = ['05', '03', '01', '04', '02'];
