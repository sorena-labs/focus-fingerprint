import { afterEach, describe, expect, it } from "vitest";
import { find, fingerprint } from "./index";

const draw = (html: string, root = document.createElement("div")) => {
  root.innerHTML = html;
  if (!root.isConnected) document.body.append(root);
  return root;
};

afterEach(() => document.body.replaceChildren());

describe("fingerprint", () => {
  it("records nothing for no element, the root itself, or an element outside it", () => {
    const root = draw("<button>Open</button>");
    const outside = draw("<button>Open</button>").firstElementChild;
    expect(fingerprint(null, root)).toBeUndefined();
    expect(fingerprint(root.firstElementChild, null)).toBeUndefined();
    expect(fingerprint(root, root)).toBeUndefined();
    expect(fingerprint(outside, root)).toBeUndefined();
  });
});

describe("find", () => {
  it("returns the element itself while it is still there", () => {
    const root = draw("<ul><li><button>Open</button></li></ul>");
    const button = root.querySelector("button")!;
    const print = fingerprint(button, root);
    button.textContent = "Renamed";
    expect(find(print, root)).toBe(button);
  });

  it("finds a replaced element at the same place, with the same tag and name", () => {
    const root = draw("<ul><li><button>One</button></li><li><button>Two</button></li></ul>");
    const print = fingerprint(root.querySelectorAll("button")[1], root);
    draw("<ul><li><button>One</button></li><li><button>Two</button></li></ul>", root);
    expect(find(print, root)).toBe(root.querySelectorAll("button")[1]);
  });

  it("finds a replaced element by its id when it has moved", () => {
    const root = draw('<button id="a:1">Open</button><button>Other</button>');
    const print = fingerprint(root.querySelector("button"), root);
    draw('<p>New</p><button>Other</button><button id="a:1">Open</button>', root);
    expect(find(print, root)).toBe(root.lastElementChild);
  });

  it("finds the id inside root when an earlier element outside it has the same id", () => {
    draw('<button id="x">Open</button>');
    const root = draw('<p></p><button id="x">Open</button>');
    const print = fingerprint(root.lastElementChild, root);
    draw('<button id="x">Open</button><p></p>', root);
    expect(find(print, root)).toBe(root.firstElementChild);
  });

  it("finds a replaced element by its id inside a shadow root", () => {
    const shadow = draw("").attachShadow({ mode: "open" });
    const root = document.createElement("div");
    shadow.append(root);
    draw('<button id="x">Open</button>', root);
    const print = fingerprint(root.firstElementChild, root);
    draw('<p></p><button id="x">Open</button>', root);
    expect(find(print, root)).toBe(root.lastElementChild);
  });

  it("finds a replaced element in a new root", () => {
    const old = draw("<section><a href='#'>Next</a></section>");
    const print = fingerprint(old.querySelector("a"), old);
    old.remove();
    const root = draw("<section><a href='#'>Next</a></section>");
    expect(find(print, root)).toBe(root.querySelector("a"));
  });

  it("finds a replaced element when a row is added above it", () => {
    const root = draw("<ul><li><button>One</button></li><li><button>Two</button></li></ul>");
    const print = fingerprint(root.querySelectorAll("button")[1], root);
    draw("<ul><li><button>New</button></li><li><button>One</button></li><li><button>Two</button></li></ul>", root);
    expect(find(print, root)).toBe(root.querySelectorAll("button")[2]);
  });

  it("finds a replaced element when the list is sorted again", () => {
    const root = draw("<ul><li><button>One</button></li><li><button>Two</button></li></ul>");
    const print = fingerprint(root.querySelectorAll("button")[1], root);
    draw("<ul><li><button>Two</button></li><li><button>One</button></li></ul>", root);
    expect(find(print, root)).toBe(root.querySelectorAll("button")[0]);
  });

  it("refuses to guess when two elements elsewhere have the same tag and name", () => {
    const root = draw("<ul><li><button>Edit</button></li><li><button>Edit</button></li></ul>");
    const print = fingerprint(root.querySelector("button"), root);
    draw("<ul><li><button>New</button></li><li><button>Edit</button></li><li><button>Edit</button></li></ul>", root);
    expect(find(print, root)).toBeUndefined();
  });

  it("still prefers the id, then the place, over look-alikes elsewhere in root", () => {
    const root = draw('<button id="a">Open</button><button>Open</button>');
    const byId = fingerprint(root.firstElementChild, root);
    const byPlace = fingerprint(root.lastElementChild, root);
    draw('<button>Open</button><button>Open</button><button id="a">Open</button>', root);
    expect(find(byId, root)).toBe(root.lastElementChild);
    expect(find(byPlace, root)).toBe(root.children[1]);
  });

  it("refuses a different element at the same place", () => {
    const root = draw("<button>Open</button>");
    const print = fingerprint(root.firstElementChild, root);
    draw("<button>Close</button>", root);
    expect(find(print, root)).toBeUndefined();
    draw("<a>Open</a>", root);
    expect(find(print, root)).toBeUndefined();
  });

  it("refuses an id match with a different name, and falls back to the place", () => {
    const root = draw('<button id="x">Open</button>');
    const print = fingerprint(root.firstElementChild, root);
    draw('<button>Open</button><button id="x">Close</button>', root);
    expect(find(print, root)).toBe(root.firstElementChild);
  });

  it("matches on aria-label before text", () => {
    const root = draw('<button aria-label="Close">x</button>');
    const print = fingerprint(root.firstElementChild, root);
    draw('<button aria-label="Close">Close</button>', root);
    expect(find(print, root)).toBe(root.firstElementChild);
  });

  it("skips elements that are inert, hidden from assistive technology, or outside root", () => {
    const root = draw("<div><button>Open</button></div>");
    const button = root.querySelector("button")!;
    const print = fingerprint(button, root);
    root.firstElementChild!.setAttribute("inert", "");
    expect(find(print, root)).toBeUndefined();
    root.firstElementChild!.removeAttribute("inert");
    button.setAttribute("aria-hidden", "true");
    expect(find(print, root)).toBeUndefined();
    button.removeAttribute("aria-hidden");
    expect(find(print, root)).toBe(button);
    expect(find(print, draw("<p></p>"))).toBeUndefined();
  });

  it("refuses a disabled element, which cannot take focus", () => {
    const root = draw("<fieldset><button>Open</button></fieldset>");
    const button = root.querySelector("button")!;
    const print = fingerprint(button, root);
    button.disabled = true;
    expect(find(print, root)).toBeUndefined();
    button.disabled = false;
    root.firstElementChild!.setAttribute("disabled", "");
    expect(find(print, root)).toBeUndefined();
    draw("<fieldset><button disabled>Open</button></fieldset>", root);
    expect(find(print, root)).toBeUndefined();
  });

  it("keeps an aria-disabled element, which can still take focus", () => {
    const root = draw("<button>Open</button>");
    const print = fingerprint(root.firstElementChild, root);
    draw('<button aria-disabled="true">Open</button>', root);
    expect(find(print, root)).toBe(root.firstElementChild);
  });

  it("returns undefined when the element is gone", () => {
    const root = draw("<button>Open</button>");
    const print = fingerprint(root.firstElementChild, root);
    draw("<p>Empty</p>", root);
    expect(find(print, root)).toBeUndefined();
    expect(find(undefined, root)).toBeUndefined();
    expect(find(print, null)).toBeUndefined();
  });

  describe("with fallback", () => {
    const rows = (...names: string[]) => `<ul>${names.map((name) => `<li><span>${name}</span><button>Delete ${name}</button></li>`).join("")}</ul>`;
    const button = (root: Element, name: string) => [...root.querySelectorAll("button")].find((el) => el.textContent === `Delete ${name}`);

    it("gives the next row when a middle row is deleted", () => {
      const root = draw(rows("One", "Two", "Three"));
      const print = fingerprint(button(root, "Two"), root);
      draw(rows("One", "Three"), root);
      expect(find(print, root)).toBeUndefined();
      expect(find(print, root, { fallback: true })).toBe(button(root, "Three"));
    });

    it("gives the previous row when the last row is deleted", () => {
      const root = draw(rows("One", "Two", "Three"));
      const print = fingerprint(button(root, "Three"), root);
      draw(rows("One", "Two"), root);
      expect(find(print, root, { fallback: true })).toBe(button(root, "Two"));
    });

    it("gives root when the list is emptied", () => {
      const root = draw(rows("One"));
      const print = fingerprint(button(root, "One"), root);
      draw(rows(), root);
      expect(find(print, root, { fallback: true })).toBe(root);
    });

    it("skips rows that are inert or hidden from assistive technology", () => {
      const root = draw(rows("One", "Two", "Three"));
      const print = fingerprint(button(root, "Two"), root);
      draw(rows("One", "Three"), root);
      root.querySelectorAll("li")[1]!.setAttribute("aria-hidden", "true");
      expect(find(print, root, { fallback: true })).toBe(button(root, "One"));
      draw(rows("One", "Three"), root);
      root.querySelectorAll("li")[1]!.setAttribute("inert", "");
      expect(find(print, root, { fallback: true })).toBe(button(root, "One"));
    });

    it("still prefers the replaced element", () => {
      const root = draw(rows("One", "Two"));
      const print = fingerprint(button(root, "Two"), root);
      draw(rows("One", "Two"), root);
      expect(find(print, root, { fallback: true })).toBe(button(root, "Two"));
    });
  });

  it("uses the name function the fingerprint was taken with", () => {
    const root = draw('<button data-key="save">Save</button>');
    const name = (el: Element) => el.getAttribute("data-key") ?? "";
    const print = fingerprint(root.firstElementChild, root, { name });
    draw('<button data-key="save">Saved</button>', root);
    expect(find(print, root)).toBe(root.firstElementChild);
  });
});
