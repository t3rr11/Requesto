import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = () => {};

// jsdom does not implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
