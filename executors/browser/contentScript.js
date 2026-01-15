// Wire Agent - Browser Executor Content Script
// Executes DOM operations in page context

// ============================================================
// Element Selection
// ============================================================

function findElement(selector, selectorType = "css") {
  switch (selectorType) {
    case "css":
      return document.querySelector(selector);
    case "xpath":
      return document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    case "text":
      // Find element containing text
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.includes(selector)) {
          return walker.currentNode.parentElement;
        }
      }
      return null;
    case "accessibility":
      // Try aria-label, then id, then name
      return (
        document.querySelector(`[aria-label="${selector}"]`) ||
        document.querySelector(`[id="${selector}"]`) ||
        document.querySelector(`[name="${selector}"]`)
      );
    default:
      return document.querySelector(selector);
  }
}

function findAllElements(selector, selectorType = "css") {
  switch (selectorType) {
    case "css":
      return Array.from(document.querySelectorAll(selector));
    case "xpath":
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        elements.push(result.snapshotItem(i));
      }
      return elements;
    case "text":
      // Find all elements containing text
      const matches = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.includes(selector)) {
          const parent = walker.currentNode.parentElement;
          if (parent && !matches.includes(parent)) {
            matches.push(parent);
          }
        }
      }
      return matches;
    case "accessibility":
      // Try aria-label, then id, then name
      return Array.from(
        document.querySelectorAll(
          `[aria-label="${selector}"], [id="${selector}"], [name="${selector}"]`
        )
      );
    default:
      return Array.from(document.querySelectorAll(selector));
  }
}

// ============================================================
// Action Handlers
// ============================================================

const actionHandlers = {
  click: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    el.click();
    return { success: true };
  },

  doubleClick: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    const event = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(event);
    return { success: true };
  },

  rightClick: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
    });
    el.dispatchEvent(event);
    return { success: true };
  },

  hover: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    const mouseEnter = new MouseEvent("mouseenter", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    const mouseOver = new MouseEvent("mouseover", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(mouseEnter);
    el.dispatchEvent(mouseOver);
    return { success: true };
  },

  type: async ({ selector, selectorType, text, clearFirst }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) {
      return { success: false, error: "Element is not editable" };
    }

    el.focus();

    if (clearFirst) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = "";
      } else {
        el.textContent = "";
      }
    }

    // Simulate typing
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value += text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.textContent += text;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    }

    return { success: true };
  },

  scroll: async ({ direction, amount = 300, selector }) => {
    const target = selector ? findElement(selector) : window;
    if (selector && !target) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    const scrollOptions = { behavior: "smooth" };
    switch (direction) {
      case "up":
        scrollOptions.top = -amount;
        break;
      case "down":
        scrollOptions.top = amount;
        break;
      case "left":
        scrollOptions.left = -amount;
        break;
      case "right":
        scrollOptions.left = amount;
        break;
    }

    if (target === window) {
      window.scrollBy(scrollOptions);
    } else {
      target.scrollBy(scrollOptions);
    }

    return { success: true };
  },

  wait: async ({ selector, timeout = 5000, state = "visible" }) => {
    if (!selector) {
      // Just wait for duration
      await new Promise((resolve) => setTimeout(resolve, timeout));
      return { success: true };
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const el = findElement(selector);

      switch (state) {
        case "visible":
          if (el && el.offsetParent !== null) return { success: true };
          break;
        case "hidden":
          if (!el || el.offsetParent === null) return { success: true };
          break;
        case "attached":
          if (el) return { success: true };
          break;
        case "detached":
          if (!el) return { success: true };
          break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { success: false, error: `Timeout waiting for ${selector} to be ${state}` };
  },

  getContent: async ({ selector, includeHtml }) => {
    const el = selector ? findElement(selector) : document.body;
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    const data = includeHtml ? el.outerHTML : el.innerText;
    return { success: true, data };
  },

  getAttribute: async ({ selector, attribute }) => {
    const el = findElement(selector);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    const data = el.getAttribute(attribute);
    return { success: true, data };
  },

  eval: async ({ script }) => {
    try {
      // Create a function to execute the script
      const fn = new Function(script);
      const result = fn();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  keyboard: async ({ key, modifiers = [], selector, selectorType }) => {
    // Focus element if specified
    if (selector) {
      const el = findElement(selector, selectorType);
      if (!el) {
        return { success: false, error: `Element not found: ${selector}` };
      }
      el.focus();
    }

    const eventOptions = {
      key,
      code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
      bubbles: true,
      cancelable: true,
      ctrlKey: modifiers.includes("ctrl"),
      altKey: modifiers.includes("alt"),
      shiftKey: modifiers.includes("shift"),
      metaKey: modifiers.includes("meta"),
    };

    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
    target.dispatchEvent(new KeyboardEvent("keypress", eventOptions));
    target.dispatchEvent(new KeyboardEvent("keyup", eventOptions));

    return { success: true };
  },

  dragDrop: async ({ sourceSelector, targetSelector, selectorType }) => {
    const source = findElement(sourceSelector, selectorType);
    if (!source) {
      return { success: false, error: `Source element not found: ${sourceSelector}` };
    }
    const target = findElement(targetSelector, selectorType);
    if (!target) {
      return { success: false, error: `Target element not found: ${targetSelector}` };
    }

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Simulate drag events
    const dataTransfer = new DataTransfer();

    const dragStart = new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: sourceRect.left + sourceRect.width / 2,
      clientY: sourceRect.top + sourceRect.height / 2,
    });
    source.dispatchEvent(dragStart);

    const dragOver = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height / 2,
    });
    target.dispatchEvent(dragOver);

    const drop = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height / 2,
    });
    target.dispatchEvent(drop);

    const dragEnd = new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    source.dispatchEvent(dragEnd);

    return { success: true };
  },

  highlight: async ({ selector, selectorType, color = "rgba(255, 0, 0, 0.3)", duration = 2000 }) => {
    // Remove existing highlights if no selector provided
    if (!selector) {
      document.querySelectorAll(".wire-agent-highlight").forEach((el) => {
        el.style.outline = el.dataset.wireAgentOriginalOutline || "";
        el.style.backgroundColor = el.dataset.wireAgentOriginalBg || "";
        el.classList.remove("wire-agent-highlight");
        delete el.dataset.wireAgentOriginalOutline;
        delete el.dataset.wireAgentOriginalBg;
      });
      return { success: true, data: { cleared: true } };
    }

    const elements = findAllElements(selector, selectorType);
    if (elements.length === 0) {
      return { success: false, error: `No elements found: ${selector}` };
    }

    elements.forEach((el) => {
      // Store original styles
      el.dataset.wireAgentOriginalOutline = el.style.outline;
      el.dataset.wireAgentOriginalBg = el.style.backgroundColor;
      el.classList.add("wire-agent-highlight");

      // Apply highlight
      el.style.outline = `3px solid ${color}`;
      el.style.backgroundColor = color;

      // Remove after duration (if not permanent)
      if (duration > 0) {
        setTimeout(() => {
          el.style.outline = el.dataset.wireAgentOriginalOutline || "";
          el.style.backgroundColor = el.dataset.wireAgentOriginalBg || "";
          el.classList.remove("wire-agent-highlight");
          delete el.dataset.wireAgentOriginalOutline;
          delete el.dataset.wireAgentOriginalBg;
        }, duration);
      }
    });

    return { success: true, data: { count: elements.length } };
  },

  select: async ({ selector, value, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    if (!(el instanceof HTMLSelectElement)) {
      return { success: false, error: "Element is not a select element" };
    }

    const values = Array.isArray(value) ? value : [value];

    // Clear previous selection for single select
    if (!el.multiple) {
      el.selectedIndex = -1;
    }

    let selectedCount = 0;
    for (const opt of el.options) {
      if (values.includes(opt.value) || values.includes(opt.textContent)) {
        opt.selected = true;
        selectedCount++;
      }
    }

    if (selectedCount === 0) {
      return { success: false, error: `No options matched: ${JSON.stringify(values)}` };
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true, data: { selected: selectedCount } };
  },

  focus: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    el.focus();
    return { success: true };
  },

  blur: async ({ selector, selectorType }) => {
    const el = findElement(selector, selectorType);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` };
    }
    el.blur();
    return { success: true };
  },
};

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_ACTION") {
    const { action, params } = message;
    const handler = actionHandlers[action];

    if (!handler) {
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      return true;
    }

    handler(params)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // Keep channel open for async response
  }

  return false;
});

console.log("[WireAgent] Content script loaded");
