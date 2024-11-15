import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

interface TokenMatch {
  index: number;
  input: string;
  groups: { [key: string]: string };
  [n: number]: string;
}

@Directive({
  selector: '[appTokenHighlight]',
  standalone: true
})
export class TokenHighlightDirective {
  private readonly TOKEN_PATTERN = /\[date\]/gi;
  private isProcessing = false;
  private lastCaretPosition: number = 0;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('input', ['$event'])
  onInput(event: InputEvent) {
    if (this.isProcessing) {
      return; 
    }

    // Ensure selection and range are valid before proceeding
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return;
    }

    this.lastCaretPosition = this.getCaretPosition();
    this.processContent();
    this.restoreCaretPosition();
  }

  private getCaretPosition(): number {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return 0;
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.el.nativeElement);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  private processContent() {
    this.isProcessing = true;
    const content = this.el.nativeElement.innerText;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    // Use a more robust way to iterate through matches, handling potential errors
    let match;
    while ((match = this.TOKEN_PATTERN.exec(content)) !== null) {
      // Handle potential null values in match or match.index
      if (match && typeof match.index === 'number') {
        // Add text before the token, checking for valid indices
        if (match.index > lastIndex) {
          const textNode = document.createTextNode(content.slice(lastIndex, match.index));
          fragment.appendChild(textNode);
        }

        // Create the token span
        const span = this.renderer.createElement('span');
        this.renderer.addClass(span, 'custom-token');
        span.textContent = match[0]; 
        fragment.appendChild(span);

        // Update lastIndex, handling potential null or undefined in match.index or match[0]
        lastIndex = (match.index || 0) + (match[0]?.length || 0);
      } else {
        // Handle cases where match or match.index are not as expected
        break; // or throw an error, depending on desired behavior
      }
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      const textNode = document.createTextNode(content.slice(lastIndex));
      fragment.appendChild(textNode);
    }

    this.el.nativeElement.innerHTML = '';
    this.el.nativeElement.appendChild(fragment);
    this.isProcessing = false;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        return;
      }

      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      const currentOffset = range.startOffset;
      let targetRange = range;

      // Check if at the boundary of a span, with added null checks
      if (currentNode.nodeType === Node.TEXT_NODE && 
          currentNode.parentElement && currentNode.parentElement.classList.contains('token') &&
          currentOffset === (currentNode.textContent?.length || 0)) {
        targetRange = document.createRange();
        targetRange.setStartAfter(currentNode.parentElement);
        targetRange.collapse(true);
      }

      const spaceNode = document.createTextNode('\u00A0');
      targetRange.insertNode(spaceNode);

      const newRange = document.createRange();
      newRange.setStartAfter(spaceNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      this.lastCaretPosition = this.getCaretPosition();
    }
  }

  private restoreCaretPosition() {
    const pos = this.lastCaretPosition;
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    let currentPos = 0;
    let lastNode: Node | null = null;

    const findLastTextNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        lastNode = node;
        currentPos += node.textContent?.length || 0;
      }

      // Use Array.from to ensure compatibility with various NodeList implementations
      const children = Array.from(node.childNodes); 
      for (const child of children) {
        findLastTextNode(child);
      }
    };

    const walker = document.createTreeWalker(
      this.el.nativeElement,
      NodeFilter.SHOW_TEXT
    );

    let node: Node | null = walker.nextNode();
    let found = false;

    while (node) {
      const length = node.textContent?.length || 0;
      if (currentPos + length >= pos) {
        const range = document.createRange();
        // Ensure pos - currentPos is within the valid range of the node's text content
        const startOffset = Math.max(0, Math.min(pos - currentPos, length)); 
        range.setStart(node, startOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        found = true;
        break;
      }
      currentPos += length;
      lastNode = node;
      node = walker.nextNode();
    }

    if (!found && lastNode) {
      const range = document.createRange();
      range.setStart(lastNode, lastNode.textContent?.length || 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

