const clearChildren = (target: HTMLElement) => {
  while (target.firstChild) {
    target.removeChild(target.firstChild);
  }
};

export default clearChildren;
