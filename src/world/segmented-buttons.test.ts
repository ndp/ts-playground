import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './segmented-buttons.ts'; // registers component

describe('segmented-buttons component', () => {
    let host: HTMLElement;

    function makeOption(value: string, label = value): HTMLElement {
        const el = document.createElement('div');
        el.setAttribute('data-value', value);
        el.setAttribute('slot', 'option');
        el.textContent = label;
        return el;
    }

    beforeEach(() => {
        document.body.innerHTML = '';
        host = document.createElement('segmented-buttons');
        host.appendChild(makeOption('a', 'A'));
        host.appendChild(makeOption('b', 'B'));
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

    describe('required attribute not present', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
            host = document.createElement('segmented-buttons');
        });


        it('does not auto-select when required is absent', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            assert.strictEqual(host.hasAttribute('data-value'), false);
            const first = host.querySelector('[data-value="a"]') as HTMLElement;
            assert.strictEqual(first.classList.contains('selected'), false);
        });

        it('allows deselecting the currently selected option', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            const first = host.querySelector('[data-value="a"]') as HTMLElement;
            assert.strictEqual(first.classList.contains('selected'), false);

            first.click();

            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.strictEqual(first.classList.contains('selected'), true);

            first.click();

            assert.strictEqual(host.hasAttribute('data-value'), false);
            assert.strictEqual(first.classList.contains('selected'), false);
        });
    })

    describe('required attribute set', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
            host = document.createElement('segmented-buttons');
            host.setAttribute('required', '');
        });

        it('auto-selects first option when required and no initial selection', () => {
            host.appendChild(makeOption('x', 'X'));
            host.appendChild(makeOption('y', 'Y'));
            document.body.appendChild(host);

            assert.strictEqual(host.getAttribute('data-value'), 'x');
            const first = host.querySelector('[data-value="x"]') as HTMLElement;
            assert.strictEqual(first.classList.contains('selected'), true);
        });

        it('respects an explicit initial selection when required', () => {
            const a = makeOption('a', 'A');
            const b = makeOption('b', 'B');
            b.setAttribute('selected', '');
            host.appendChild(a);
            host.appendChild(b);
            document.body.appendChild(host);

            assert.strictEqual(host.getAttribute('data-value'), 'b');
            assert.strictEqual((host.querySelector('[data-value="b"]') as HTMLElement).classList.contains('selected'), true);
        });

        it('prevents deselecting the currently selected option when required', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            const first = host.querySelector('[data-value="a"]') as HTMLElement;
            // already selected via auto-select; clicking again should not deselect
            first.click();

            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.strictEqual(first.classList.contains('selected'), true);
        });

        it('does not emit a change event when blocking deselect due to required', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            let changes = 0;
            host.addEventListener('change', () => changes++);

            const first = host.querySelector('[data-value="a"]') as HTMLElement;
            first.click(); // blocked, no change
            assert.strictEqual(changes, 0);
        });

        it('still allows switching selection between options when required', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            let changes = 0;
            host.addEventListener('change', () => changes++);

            const second = host.querySelector('[data-value="b"]') as HTMLElement;
            second.click();

            assert.strictEqual(host.getAttribute('data-value'), 'b');
            assert.strictEqual(second.classList.contains('selected'), true);
            assert.strictEqual(changes, 1);
        });

        it('auto-selects first option when a new option is added and nothing is selected', () => {
            // Start required with no options → no data-value
            document.body.appendChild(host);
            assert.strictEqual(host.hasAttribute('data-value'), false);

            host.appendChild(makeOption('z', 'Z'));
            host.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'));
            assert.strictEqual(host.getAttribute('data-value'), 'z');
        });

    });

    describe('multi attribute', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
            host = document.createElement('segmented-buttons');
            host.setAttribute('multi', '');
        });

        it('allows multiple selections and independent toggling', () => {
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            host.appendChild(makeOption('c', 'C'));
            document.body.appendChild(host);

            const events: Array<string[]> = [];
            host.addEventListener('change', (ev: Event) => events.push((ev as CustomEvent).detail.value));

            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;
            const c = host.querySelector('[data-value="c"]') as HTMLElement;

            a.click();
            assert.deepStrictEqual(events[0], ['a']);
            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.strictEqual(a.classList.contains('selected'), true);

            b.click();
            assert.deepStrictEqual(events[1], ['a', 'b']);
            assert.strictEqual(host.getAttribute('data-value'), 'a,b');
            assert.strictEqual(b.classList.contains('selected'), true);

            a.click();
            assert.deepStrictEqual(events[2], ['b']);
            assert.strictEqual(host.getAttribute('data-value'), 'b');
            assert.strictEqual(a.classList.contains('selected'), false);

            c.click();
            assert.deepStrictEqual(events[3], ['b', 'c']);
            assert.strictEqual(host.getAttribute('data-value'), 'b,c');
            assert.strictEqual(c.classList.contains('selected'), true);
        });

        it('enforces at least one selection when multi and required', () => {
            host.setAttribute('required', '');
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;

            // auto-selected first
            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.strictEqual(a.classList.contains('selected'), true);

            const events: Array<string[]> = [];
            host.addEventListener('change', (ev: Event) => events.push((ev as CustomEvent).detail.value));

            b.click();
            assert.deepStrictEqual(events[0], ['a', 'b']);
            assert.strictEqual(host.getAttribute('data-value'), 'a,b');

            a.click();
            assert.deepStrictEqual(events[1], ['b']);
            assert.strictEqual(host.getAttribute('data-value'), 'b');

            b.click(); // blocked because required would lead to empty
            assert.strictEqual(events.length, 2);
            assert.strictEqual(host.getAttribute('data-value'), 'b');
            assert.strictEqual(b.classList.contains('selected'), true);
        });

        it('adopts multiple initially selected options in multi mode', () => {
            const a = makeOption('a', 'A');
            const b = makeOption('b', 'B');
            a.setAttribute('selected', '');
            b.setAttribute('selected', '');
            host.appendChild(a);
            host.appendChild(b);
            document.body.appendChild(host);

            assert.strictEqual(host.getAttribute('data-value'), 'a,b');
            assert.strictEqual(a.classList.contains('selected'), true);
            assert.strictEqual(b.classList.contains('selected'), true);
        });

        it('orders multi selections by click sequence (existing stay first, new append)', () => {
            host.appendChild(makeOption('c', 'C'));
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            document.body.appendChild(host);

            const c = host.querySelector('[data-value="c"]') as HTMLElement;
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;

            c.click();
            a.click();
            b.click();
            assert.strictEqual(host.getAttribute('data-value'), 'c,a,b');

            a.click(); // toggle off; order of remaining values stays intact
            assert.strictEqual(host.getAttribute('data-value'), 'c,b');

            a.click(); // selecting again appends it to the end
            assert.strictEqual(host.getAttribute('data-value'), 'c,b,a');
        });
    });

    describe('suggested attribute', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
            host = document.createElement('segmented-buttons');
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            host.appendChild(makeOption('c', 'C'));
            document.body.appendChild(host);
        });

        it('applies suggested class to matching options', () => {
            host.setAttribute('suggested', 'a,c');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;
            const c = host.querySelector('[data-value="c"]') as HTMLElement;
            assert.ok(a.classList.contains('suggested'), 'a should have suggested class');
            assert.ok(!b.classList.contains('suggested'), 'b should not have suggested class');
            assert.ok(c.classList.contains('suggested'), 'c should have suggested class');
        });

        it('removes suggested class when attribute is updated', () => {
            host.setAttribute('suggested', 'a,b');
            host.setAttribute('suggested', 'b');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;
            assert.ok(!a.classList.contains('suggested'), 'a should lose suggested class');
            assert.ok(b.classList.contains('suggested'), 'b should still have suggested class');
        });

        it('clears all suggested classes when attribute is removed', () => {
            host.setAttribute('suggested', 'a,b,c');
            host.removeAttribute('suggested');
            for (const val of ['a', 'b', 'c']) {
                const el = host.querySelector(`[data-value="${val}"]`) as HTMLElement;
                assert.ok(!el.classList.contains('suggested'), `${val} should not have suggested class`);
            }
        });

        it('suggested class does not affect selection behavior', () => {
            host.setAttribute('suggested', 'a');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            a.click();
            assert.ok(a.classList.contains('selected'), 'a should be selected after click');
            assert.ok(a.classList.contains('suggested'), 'a should still have suggested class when selected');
        });
    });

    describe('lockable attribute', () => {

        beforeEach(() => {
            document.body.innerHTML = '';
            host = document.createElement('segmented-buttons');
            host.setAttribute('lockable', '');
            host.appendChild(makeOption('a', 'A'));
            host.appendChild(makeOption('b', 'B'));
            host.appendChild(makeOption('c', 'C'));
            document.body.appendChild(host);
        });

        it('cycles a button through unselected → selected → locked → unselected', () => {
            const a = host.querySelector('[data-value="a"]') as HTMLElement;

            // unselected → selected
            a.click();
            assert.ok(a.classList.contains('selected'), 'a should be selected');
            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.ok(!a.classList.contains('locked'), 'a should not be locked yet');

            // selected → locked
            a.click();
            assert.ok(!a.classList.contains('selected'), 'a should not be selected after second click');
            assert.ok(a.classList.contains('locked'), 'a should have locked class');
            assert.ok(a.hasAttribute('locked'), 'a should have locked attr');
            assert.ok(host.hasAttribute('locked'), 'host should have locked attr');
            assert.strictEqual(host.getAttribute('data-locked'), 'a');
            assert.strictEqual(host.getAttribute('data-value'), null);

            // locked → unselected
            a.click();
            assert.ok(!a.classList.contains('locked'), 'a should not be locked after third click');
            assert.ok(!a.hasAttribute('locked'), 'a should not have locked attr');
            assert.ok(!host.hasAttribute('locked'), 'host locked attr should be removed');
            assert.strictEqual(host.getAttribute('data-locked'), null);
        });

        it('buttons cycle independently of each other', () => {
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;

            a.click(); // a: selected
            b.click(); // b: selected — a stays selected
            assert.ok(a.classList.contains('selected'), 'a should still be selected');
            assert.ok(b.classList.contains('selected'), 'b should be selected too');
            assert.strictEqual(host.getAttribute('data-value'), 'a,b');

            a.click(); // a: locked — b stays selected
            assert.ok(a.classList.contains('locked'), 'a should be locked');
            assert.ok(b.classList.contains('selected'), 'b should remain selected');
            assert.strictEqual(host.getAttribute('data-locked'), 'a');
            assert.strictEqual(host.getAttribute('data-value'), 'b');
        });

        it('data-locked and data-value track their respective states', () => {
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;
            const c = host.querySelector('[data-value="c"]') as HTMLElement;

            a.click(); a.click(); // a → locked
            b.click();            // b → selected
            // c stays unselected

            assert.strictEqual(host.getAttribute('data-locked'), 'a');
            assert.strictEqual(host.getAttribute('data-value'), 'b');
            assert.ok(!c.classList.contains('selected'));
            assert.ok(!c.classList.contains('locked'));
        });

        it('required prevents cycling the last selected button to locked', () => {
            host.setAttribute('required', '');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;

            a.click(); // a: selected (only selection)
            assert.strictEqual(host.getAttribute('data-value'), 'a');

            // Try to move a from selected → locked: should be blocked
            a.click();
            assert.ok(a.classList.contains('selected'), 'a should stay selected');
            assert.strictEqual(host.getAttribute('data-value'), 'a');
            assert.ok(!host.hasAttribute('locked'), 'nothing should be locked');
        });

        it('required allows selected → locked when another button is also selected', () => {
            host.setAttribute('required', '');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;

            a.click(); // a: selected
            b.click(); // b: selected

            // Now move a to locked — b is still selected so this is allowed
            a.click();
            assert.ok(a.classList.contains('locked'), 'a should be locked');
            assert.ok(b.classList.contains('selected'), 'b should still be selected');
            assert.strictEqual(host.getAttribute('data-value'), 'b');
        });

        it('locked → unselected is always allowed even with required', () => {
            host.setAttribute('required', '');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;

            b.click(); // b: selected (satisfies required)
            a.click(); a.click(); // a: locked

            // Unlock a — b still satisfies required
            a.click();
            assert.ok(!a.classList.contains('locked'), 'a should be unlocked');
            assert.ok(!a.hasAttribute('locked'), 'a should not have locked attr');
            assert.ok(b.classList.contains('selected'), 'b still selected');
        });

        it('host locked attr is removed when last locked button is unlocked', () => {
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            a.click(); a.click(); // a: locked
            assert.ok(host.hasAttribute('locked'));

            a.click(); // a: unselected
            assert.ok(!host.hasAttribute('locked'), 'host locked attr should be gone');
        });

        it('works with multi attribute: multiple selected and locked independently', () => {
            host.setAttribute('multi', '');
            const a = host.querySelector('[data-value="a"]') as HTMLElement;
            const b = host.querySelector('[data-value="b"]') as HTMLElement;
            const c = host.querySelector('[data-value="c"]') as HTMLElement;

            a.click(); b.click(); // a, b: selected
            c.click(); c.click(); // c: locked

            assert.strictEqual(host.getAttribute('data-value'), 'a,b');
            assert.strictEqual(host.getAttribute('data-locked'), 'c');
            assert.ok(host.hasAttribute('locked'));
        });
    });
});
