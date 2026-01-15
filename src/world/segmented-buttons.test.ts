import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './segmented-buttons.ts'; // registers component

describe('segmented-buttons component', () => {
    let host: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        host = document.createElement('segmented-buttons');
        const a = document.createElement('div');
        a.setAttribute('data-value', 'a');
        a.textContent = 'A';
        const b = document.createElement('div');
        b.setAttribute('data-value', 'b');
        b.textContent = 'B';
        host.appendChild(a);
        host.appendChild(b);
        document.body.appendChild(host);
    });

    it('selects first, selects second, toggles off on second click and emits change events', () => {
        const first = host.querySelector('[data-value="a"]') as HTMLElement;
        const second = host.querySelector('[data-value="b"]') as HTMLElement;
        let changes = 0;
        host.addEventListener('change', () => changes++);

        // select first
        first.click();
        assert.strictEqual(first.classList.contains('selected'), true);
        assert.strictEqual(host.getAttribute('data-value'), 'a');
        assert.strictEqual(changes, 1);

        // select second
        second.click();
        assert.strictEqual(first.classList.contains('selected'), false);
        assert.strictEqual(second.classList.contains('selected'), true);
        assert.strictEqual(host.getAttribute('data-value'), 'b');
        assert.strictEqual(changes, 2);

        // click second again -> deselect
        second.click();
        assert.strictEqual(second.classList.contains('selected'), false);
        assert.strictEqual(host.hasAttribute('data-value'), false);
        assert.strictEqual(changes, 3);
    });
});
