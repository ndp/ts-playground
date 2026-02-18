// src/world/locale-buttons.test.ts
import assert from "node:assert/strict";
import {describe, it as test} from "node:test";
import LocaleButtons from "./locale-buttons.ts";

describe('locale-buttons basic behavior', () => {
    test('core locales present after connected', async () => {
        const c = new LocaleButtons();
        // simulate connected lifecycle
        await c.connectedCallback();
        for (const core of ['en-US', 'en', 'de', 'fr', 'es', 'ar', 'zh', 'es-ES']) {
            const el = c.querySelector(`[data-value="${core}"]`);
            assert.ok(el, `core locale ${core} should exist`);
        }
    });

    test('setting data-value selects or adds value', async () => {
        const c = new LocaleButtons();
        await c.connectedCallback();

        // add and select a new locale not in core
        c.setAttribute('data-value', 'pt-BR');
        const newEl = c.querySelector('[data-value="pt-BR"]') as HTMLElement | null;
        assert.ok(newEl, 'pt-BR should be added as an option');
        assert.equal(c.getAttribute('data-value'), 'pt-BR');

        // click should toggle off
        let fired = false;
        c.addEventListener('change', (e: any) => {
            fired = true;
            assert.strictEqual(e.detail.value, null);
        });
        // clicking selected element toggles off
        newEl!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        assert.ok(fired, 'change should have fired on toggle off');
    });

    test('suggested attribute adds bolded options', async () => {
        const c = new LocaleButtons();
        await c.connectedCallback();
        c.setAttribute('suggested', 'ja,ko,en-GB');

        // suggested should exist and have class 'suggested'
        for (const s of ['ja', 'ko', 'en-GB']) {
            const el = c.querySelector(`[data-value="${s}"]`) as HTMLElement | null;
            assert.ok(el, `suggested ${s} should be present`);
            assert.ok(el!.classList.contains('suggested'), `${s} should have suggested class`);
        }
    });

    test('alphabetical ordering maintained', async () => {
        const c = new LocaleButtons();
        await c.connectedCallback();
        c.setAttribute('suggested', 'zz,aa,mm');
        // get values order
        const opts = Array.from(c.querySelectorAll('[slot="option"][data-value]')) as HTMLElement[];
        const vals = opts.map(o => o.getAttribute('data-value') || '');
        const sorted = [...vals].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        assert.deepEqual(vals, sorted, 'options should be alphabetized');
    });

    test('enforce limit removes least-recent-non-core', async () => {
        const c = new LocaleButtons();
        await c.connectedCallback();

        // tighten limit
        c.maxOptionsCount = 9; // less than many we will add but >= core
        // add several extra locales to exceed limit
        const extras = ['aa', 'bb', 'cc', 'dd', 'ee'].reverse();
        for (const v of extras) {
            c.setAttribute('data-value', v);
            // mark selection so they become recently used
            const el = c.querySelector(`[data-value="${v}"]`) as HTMLElement | null;
            el?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        }

        // After adding extras, ensure core locales still present
        for (const core of ['en-US', 'en', 'de', 'fr', 'es', 'ar', 'zh', 'es-ES']) {
            assert.ok(c.querySelector(`[data-value="${core}"]`), `core ${core} must remain`);
        }

        // total options should not exceed maxOptions
        const total = c.querySelectorAll('[slot="option"][data-value]').length;
        assert.ok(total <= c.maxOptionsCount, `total (${total}) must be <= maxOptions (${c.maxOptionsCount})`);
    });
});
