export const agents = [
  { id: 'root', name: 'Shared root', start: 0, from: 37, to: 37 },
  { id: '01', name: 'Research 01', start: 0, from: 38, to: 120 },
  { id: '02', name: 'Research 02', start: 0, from: 31, to: 112 },
  { id: '01a', name: '01a', start: 53, from: 4, to: 55, child: true },
  { id: '01b', name: '01b', start: 53, from: 4, to: 60, child: true },
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

export const cursorStops = [
  [0, 372, 514], [.5, 240, 327], [.9, 240, 327], [1.4, 311, 376],
  [5.6, 619, 457], [6.2, 619, 457], [7.3, 702, 488],
  [8.7, 326, 198], [9.3, 326, 198], [10, 506, 340],
  [15.6, 718, 342], [16.1, 718, 342], [17, 803, 511],
];
